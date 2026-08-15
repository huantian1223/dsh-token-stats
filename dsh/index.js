// dsh-token-stats host plugin.
//
// Records real provider token usage (input/output/cache-read/cache-write/
// reasoning per model turn) from the durable session logs and serves
// aggregated statistics:
//
//   GET /token-stats/api/stats  -> JSON snapshot for the Web UI
//   GET /token-stats            -> self-contained stats page (fallback view)
//
// Data flow: a boot-time scan replays every session artifact under
// `$DSH_HOME/sessions` (multi-frame zstd, see zstd.js); a `session/event`
// listener captures new usage live; a periodic rescan reconciles anything the
// firehose missed (events written before the plugin loaded, crash-torn
// frames, sessions born in another process). Rows are keyed by
// `session|turn|step` and stored append-only under
// `$DSH_HOME/token-stats/usage.jsonl`.

import { mkdirSync } from 'node:fs'
import { dshHomePath } from './home.js'
import { scanChangedArtifacts } from './scan.js'
import { usageRowFromEvent } from './scan.js'
import { computeStats, computeSessionStats, computeDayBreakdown } from './stats.js'
import { loadStore, persistNewRows, loadScanState, saveScanState, rewriteStore, loadStoreVersion, saveStoreVersion, STORE_VERSION, loadTitles, saveTitles } from './store.js'
import { renderPage } from './page.js'
import { createBalanceService } from './balance.js'
import { loadConfig } from './config.js'

export const name = 'token-stats'
export const inject = ['webServer', 'credentials']

/** Replace an existing row when the incoming one carries strictly more info
 * (a scan row has the model/workspace a live-captured row may lack). */
function improveRow(existing, row) {
  if (!existing.model && row.model) return true
  if (!existing.workspace && row.workspace) return true
  if (!existing.ts && row.ts) return true
  return false
}

export function apply(ctx, config = {}) {
  const sessionsRoot = config.sessionsRoot ?? dshHomePath('sessions')
  const dataDir = config.dataDir ?? dshHomePath('token-stats')
  mkdirSync(dataDir, { recursive: true })
  const cfg = loadConfig(config, dataDir)

  const { map: rows, usagePath } = loadStore(dataDir)
  let scanState = loadScanState(dataDir)
  const titles = loadTitles(dataDir)
  let scanPromise = null
  let lastError = null

  const log = (level, msg) => {
    try {
      ctx.logger?.[level]?.(`[token-stats] ${msg}`)
    } catch {
      console[level === 'warn' ? 'warn' : 'log'](`[token-stats] ${msg}`)
    }
  }

  const scan = async (force = false) => {
    const t0 = Date.now()
    try {
      const stateFiles = force ? {} : scanState.files
      const { rows: found, titles: foundTitles, files } = scanChangedArtifacts(sessionsRoot, stateFiles)
      const appended = persistNewRows(rows, found, usagePath, improveRow)
      let titleAdded = 0
      for (const [id, title] of foundTitles) {
        if (titles.get(id) !== title) {
          titles.set(id, title)
          titleAdded++
        }
      }
      if (titleAdded > 0) saveTitles(dataDir, titles)
      scanState = { files }
      saveScanState(dataDir, scanState)
      lastError = null
      log('info', `scan ${force ? '(full) ' : ''}+${appended} rows, +${titleAdded} titles in ${Date.now() - t0}ms (total ${rows.size})`)
    } catch (error) {
      lastError = error
      log('warn', `scan failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // One-time store migration: older stores hold live-captured rows without a
  // model (persistNewRows used to ignore its merge predicate). Rebuild the
  // store from the session logs once so per-model stats reconcile with the
  // totals, then bump the marker. New installs (no store yet) also land here
  // and simply build from scratch.
  if (loadStoreVersion(dataDir) !== STORE_VERSION) {
    const t0 = Date.now()
    try {
      const { rows: allRows, titles: allTitles, files } = scanChangedArtifacts(sessionsRoot, {})
      rows.clear()
      for (const r of allRows) rows.set(r.key, r)
      rewriteStore(rows, usagePath)
      for (const [id, title] of allTitles) titles.set(id, title)
      saveTitles(dataDir, titles)
      scanState = { files }
      saveScanState(dataDir, scanState)
      saveStoreVersion(dataDir, STORE_VERSION)
      log('info', `store migrated to v${STORE_VERSION}: ${rows.size} rows rebuilt in ${Date.now() - t0}ms`)
    } catch (error) {
      log('warn', `store migration failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  scanPromise = scan(true)

  // Live capture: usage events streamed by the session store.
  try {
    ctx.on('session/event', (session, event) => {
      try {
        const row = usageRowFromEvent(session?.id ?? '', event, session?.cwd ?? '')
        if (row) persistNewRows(rows, [row], usagePath, improveRow)
      } catch {
        // never let a capture failure affect the session loop
      }
    })
  } catch (error) {
    log('warn', `session/event subscription unavailable: ${error}`)
  }

  // Periodic reconciliation (mtime-based, cheap when nothing changed).
  const intervalMs = cfg.rescanIntervalMs
  const timer = setInterval(() => {
    void scan(false)
  }, intervalMs)
  timer.unref?.()
  ctx.effect(() => () => clearInterval(timer), 'token-stats rescan')

  // ---- HTTP surface ----
  const webServer = ctx.webServer
  const routeDisposers = []
  if (webServer && typeof webServer.register === 'function') {
    const send = (res, status, body, type) => {
      res.statusCode = status
      res.setHeader('content-type', type)
      res.setHeader('cache-control', 'no-store')
      res.end(body)
    }
    const statsHandler = async (req, res) => {
      try {
        await scanPromise
        const stats = computeStats([...rows.values()], cfg)
        stats.lastError = lastError ? String(lastError?.message ?? lastError) : null
        send(res, 200, JSON.stringify(stats), 'application/json; charset=utf-8')
      } catch (error) {
        send(res, 500, JSON.stringify({ error: String(error?.message ?? error) }), 'application/json; charset=utf-8')
      }
    }
    const balanceService = createBalanceService(ctx, cfg)
    const balanceHandler = async (req, res) => {
      try {
        const force = (req.url ?? '').includes('force=1')
        const data = await balanceService.get(force)
        send(res, 200, JSON.stringify(data), 'application/json; charset=utf-8')
      } catch (error) {
        send(res, 500, JSON.stringify({ ok: false, error: String(error?.message ?? error) }), 'application/json; charset=utf-8')
      }
    }
    routeDisposers.push(webServer.register({ kind: 'exact', path: '/token-stats/api/stats', handler: statsHandler }))
    routeDisposers.push(
      webServer.register({
        kind: 'exact',
        path: '/token-stats/api/config',
        handler: (req, res) => {
          send(res, 200, JSON.stringify(cfg), 'application/json; charset=utf-8')
        },
      }),
    )
    routeDisposers.push(webServer.register({ kind: 'exact', path: '/token-stats/api/balance', handler: balanceHandler }))
    routeDisposers.push(
      webServer.register({
        kind: 'exact',
        path: '/token-stats/api/day',
        handler: async (req, res) => {
          await scanPromise
          const date = new URL(req.url ?? '/', 'http://x').searchParams.get('date') ?? ''
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            send(res, 400, JSON.stringify({ error: 'bad date, expected YYYY-MM-DD' }), 'application/json; charset=utf-8')
            return
          }
          send(res, 200, JSON.stringify({ date, rows: computeDayBreakdown([...rows.values()], date, (sid) => titles.get(sid) || '') }), 'application/json; charset=utf-8')
        },
      }),
    )
    routeDisposers.push(
      webServer.register({
        kind: 'prefix',
        path: '/token-stats/api/session',
        handler: async (req, res) => {
          await scanPromise
          const id = decodeURIComponent((req.url ?? '').slice('/token-stats/api/session/'.length))
          if (!id) {
            send(res, 400, JSON.stringify({ error: 'missing session id' }), 'application/json; charset=utf-8')
            return
          }
          const summary = computeSessionStats([...rows.values()], id)
          summary.title = titles.get(id) || ''
          send(res, 200, JSON.stringify(summary), 'application/json; charset=utf-8')
        },
      }),
    )
    routeDisposers.push(
      webServer.register({
        kind: 'exact',
        path: '/token-stats',
        handler: async (req, res) => {
          await scanPromise
          send(res, 200, renderPage(), 'text/html; charset=utf-8')
        },
      }),
    )
    log('info', 'routes registered: /token-stats, /token-stats/api/stats, /token-stats/api/balance, /token-stats/api/session/*')
  } else {
    log('warn', 'no ctx.webServer; API routes not registered')
  }

  // Route disposers run first so the webserver route tables never outlive
  // this fiber (the host invariant checks exactly that on teardown).
  ctx.effect(() => () => {
    for (const dispose of routeDisposers) {
      try {
        dispose()
      } catch {
        // best effort
      }
    }
  }, 'token-stats routes')

  // Compaction on dispose: rewrite the store without stale rows (repair).
  ctx.effect(() => () => {
    try {
      clearInterval(timer)
      rewriteStore(rows, usagePath)
    } catch {
      // best effort
    }
  }, 'token-stats store flush')

  return { scan: () => scan(true) }
}
