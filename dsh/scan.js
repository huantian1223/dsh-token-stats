// Session-log scanning: enumerate `data/sessions/**/session.jsonl.zstd`,
// decompress, and extract per-turn provider usage rows. Rows are keyed by
// `session|turn|step` with last-wins semantics, so the final
// `assistant/message` usage replaces the earlier `assistant/chunk` samples
// for the same turn/step (the durable log's canonical accounting, mirroring
// the harness token-meter: usage chunks count, and a final assistant-message
// usage replaces that sample instead of double-counting it).

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { decompressSessionArtifact } from './zstd.js'

/** All `*.zstd` files under a sessions root, with mtime, in walk order. */
export function walkSessionArtifacts(root) {
  const files = []
  const stack = [root]
  while (stack.length > 0) {
    const dir = stack.pop()
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      continue // missing/removed root mid-scan: nothing to do
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
      } else if (entry.isFile() && entry.name.endsWith('.zstd')) {
        let st
        try {
          st = statSync(full)
        } catch {
          continue
        }
        files.push({ path: full, mtimeMs: st.mtimeMs })
      }
    }
  }
  return files
}

/**
 * Parse one decompressed session artifact into usage rows.
 *
 * @param {string} text - concatenated frame plaintext (JSONL).
 * @param {string} fallbackId - session id to use when the header is absent.
 * @returns {{ sessionId: string, workspace: string, title: string, rows: Map<string, object> }}
 */
export function parseSessionArtifact(text, fallbackId) {
  const rows = new Map()
  let sessionId = fallbackId
  let workspace = ''
  let title = ''
  let header = null // last request/header {provider, model}

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    let ev
    try {
      ev = JSON.parse(trimmed)
    } catch {
      continue // torn tail of a flushed batch: skip the line
    }
    const type = ev.type
    if (type === 'session') {
      sessionId = ev.id ?? sessionId
      workspace = typeof ev.cwd === 'string' ? ev.cwd : workspace
      continue
    }
    if (type === 'session/title') {
      // Later events overwrite earlier ones (fallback -> provider title).
      if (typeof ev.data?.title === 'string' && ev.data.title.trim() !== '') {
        title = ev.data.title.trim()
      }
      continue
    }
    if (type === 'request/header') {
      const config = ev.data?.header?.config
      if (config) {
        header = {
          provider: typeof config.provider === 'string' ? config.provider : header?.provider,
          model: typeof config.model === 'string' ? config.model : header?.model,
        }
      }
      continue
    }
    let usage = null
    if (type === 'assistant/message') {
      usage = ev.data?.usage ?? null
    } else if (type === 'assistant/chunk' && ev.data?.chunk?.type === 'usage') {
      usage = ev.data.chunk.usage ?? null
    }
    if (!usage) continue
    const turn = ev.data?.turn
    const step = ev.data?.step
    if (typeof turn !== 'number' || typeof step !== 'number') continue
    const key = `${sessionId}|${turn}|${step}`
    rows.set(key, {
      key,
      session: sessionId,
      workspace,
      ts: typeof ev.time === 'number' ? ev.time : 0,
      seq: typeof ev.seq === 'number' ? ev.seq : 0,
      turn,
      step,
      input: usage.inputTokens ?? 0,
      output: usage.outputTokens ?? 0,
      cacheRead: usage.cacheReadTokens ?? 0,
      cacheWrite: usage.cacheWriteTokens ?? 0,
      reasoning: usage.reasoningTokens ?? 0,
      provider: header?.provider ?? '',
      model: header?.model ?? '',
    })
  }
  return { sessionId, workspace, title, rows }
}

/**
 * Scan only artifacts whose mtime changed since the last pass.
 *
 * @param {string} sessionsRoot - dsh sessions directory.
 * @param {Record<string, number>} stateFiles - path -> last-scanned mtimeMs.
 * @returns {{ rows: object[], titles: Map<string, string>, files: Record<string, number> }}
 */
export function scanChangedArtifacts(sessionsRoot, stateFiles = {}) {
  const files = walkSessionArtifacts(sessionsRoot)
  const rows = []
  const titles = new Map()
  for (const file of files) {
    if (stateFiles[file.path] === file.mtimeMs) continue
    let raw
    try {
      raw = readFileSync(file.path)
    } catch {
      continue
    }
    let text
    try {
      text = decompressSessionArtifact(raw)
    } catch (error) {
      // Corrupt artifact: keep its previous state so a later pass retries.
      console.warn(`[token-stats] skip corrupt artifact ${file.path}: ${error}`)
      continue
    }
    const parsed = parseSessionArtifact(text, file.path)
    if (parsed.title) titles.set(parsed.sessionId, parsed.title)
    for (const row of parsed.rows.values()) rows.push(row)
  }
  const next = { ...stateFiles }
  for (const file of files) next[file.path] = file.mtimeMs
  return { rows, titles, files: next }
}

/** Derive a display name from a workspace slug fallback (rare path). */
export function workspaceFromSlug(filePath) {
  const base = filePath.replace(/\\/g, '/')
  const m = base.match(/sessions\/([^/]+)\//)
  if (!m) return ''
  return m[1].replace(/~([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/**
 * Build one usage row from a single raw session-log event, or `null` when
 * the event carries no usage. Used by the live `session/event` capture; the
 * model/provider are left blank (an earlier request/header supplied them)
 * and the next reconciliation scan upgrades the row in place.
 *
 * @param {string} sessionId
 * @param {object} ev - raw log event ({type, seq, time, data}).
 * @param {string} workspace
 */
export function usageRowFromEvent(sessionId, ev, workspace = '') {
  if (!ev || typeof ev !== 'object') return null
  let usage = null
  if (ev.type === 'assistant/message') {
    usage = ev.data?.usage ?? null
  } else if (ev.type === 'assistant/chunk' && ev.data?.chunk?.type === 'usage') {
    usage = ev.data.chunk.usage ?? null
  }
  if (!usage) return null
  const turn = ev.data?.turn
  const step = ev.data?.step
  if (typeof turn !== 'number' || typeof step !== 'number') return null
  const id = sessionId || ''
  return {
    key: `${id}|${turn}|${step}`,
    session: id,
    workspace: typeof workspace === 'string' ? workspace : '',
    ts: typeof ev.time === 'number' ? ev.time : 0,
    seq: typeof ev.seq === 'number' ? ev.seq : 0,
    turn,
    step,
    input: usage.inputTokens ?? 0,
    output: usage.outputTokens ?? 0,
    cacheRead: usage.cacheReadTokens ?? 0,
    cacheWrite: usage.cacheWriteTokens ?? 0,
    reasoning: usage.reasoningTokens ?? 0,
    provider: '',
    model: '',
  }
}
