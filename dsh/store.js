// Durable store for token-stats: an append-only JSONL of usage rows plus a
// small scan-state file (last-scanned artifact mtime per path). Rows are
// keyed by `session|turn|step`; the in-memory Map is the dedupe authority, so
// re-appending (rescan, crash recovery) is a no-op.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const USAGE_FILE = 'usage.jsonl'
const SCAN_STATE_FILE = 'scan-state.json'
const VERSION_FILE = 'store-version.json'
const TITLES_FILE = 'titles.json'

/** Bump when the row schema or dedupe semantics change and the store should
 * be rebuilt from the session logs (e.g. the model-attribution fix: rows
 * captured live before v2 never carried a model and were never upgraded). */
export const STORE_VERSION = 2

export function storePaths(dataDir) {
  return { usage: join(dataDir, USAGE_FILE), scanState: join(dataDir, SCAN_STATE_FILE), version: join(dataDir, VERSION_FILE), titles: join(dataDir, TITLES_FILE) }
}

/** Load the sessionId -> title map (session/title events from the logs). */
export function loadTitles(dataDir) {
  const { titles: titlesPath } = storePaths(dataDir)
  const map = new Map()
  if (!existsSync(titlesPath)) return map
  try {
    const parsed = JSON.parse(readFileSync(titlesPath, 'utf8'))
    if (parsed && typeof parsed === 'object') {
      for (const [id, title] of Object.entries(parsed)) {
        if (typeof title === 'string' && title !== '') map.set(id, title)
      }
    }
  } catch {
    // ignore malformed titles; next scan rewrites it
  }
  return map
}

export function saveTitles(dataDir, titles) {
  const { titles: titlesPath } = storePaths(dataDir)
  const obj = {}
  for (const [id, title] of titles) obj[id] = title
  const tmp = `${titlesPath}.tmp`
  writeFileSync(tmp, JSON.stringify(obj))
  renameSync(tmp, titlesPath)
}

/**
 * Load the usage Map from disk. Duplicate keys collapse last-wins.
 *
 * @param {string} dataDir
 * @returns {{ map: Map<string, object>, usagePath: string }}
 */
export function loadStore(dataDir) {
  mkdirSync(dataDir, { recursive: true })
  const { usage } = storePaths(dataDir)
  const map = new Map()
  if (existsSync(usage)) {
    for (const line of readFileSync(usage, 'utf8').split('\n')) {
      const t = line.trim()
      if (t === '') continue
      try {
        const row = JSON.parse(t)
        if (row && typeof row.key === 'string') map.set(row.key, row)
      } catch {
        // ignore malformed line; next full rewrite repairs the file
      }
    }
  }
  return { map, usagePath: usage }
}

/**
 * Append rows not already present, or strictly better than the stored row
 * (per the optional merge predicate), then persist durably.
 *
 * @param {Map<string, object>} map - in-memory dedupe authority.
 * @param {object[]} rows - candidate rows.
 * @param {string} usagePath - append target.
 * @param {(existing: object, row: object) => boolean} [merge] - return true
 *   when `row` should REPLACE the existing entry (e.g. a scan row carries the
 *   model/workspace a live-captured row lacks).
 * @returns {number} appended rows.
 */
export function persistNewRows(map, rows, usagePath, merge) {
  const fresh = []
  for (const row of rows) {
    if (typeof row?.key !== 'string') continue
    const existing = map.get(row.key)
    if (existing !== undefined && !(merge && merge(existing, row))) continue
    map.set(row.key, row)
    fresh.push(row)
  }
  if (fresh.length === 0) return 0
  // Append, then repair-on-load handles any torn tail (last line may be
  // partial if the process dies mid-append; loadStore skips malformed lines).
  writeFileSync(usagePath, fresh.map((r) => JSON.stringify(r)).join('\n') + '\n', { flag: 'a' })
  return fresh.length
}

/** Rewrite the whole store file (repair / compaction). */
export function rewriteStore(map, usagePath) {
  const lines = [...map.values()].map((r) => JSON.stringify(r)).join('\n') + '\n'
  const tmp = `${usagePath}.tmp`
  writeFileSync(tmp, lines)
  renameSync(tmp, usagePath)
}

export function loadScanState(dataDir) {
  const { scanState } = storePaths(dataDir)
  if (!existsSync(scanState)) return { files: {} }
  try {
    const parsed = JSON.parse(readFileSync(scanState, 'utf8'))
    return { files: parsed && typeof parsed.files === 'object' ? parsed.files : {} }
  } catch {
    return { files: {} }
  }
}

export function saveScanState(dataDir, state) {
  const { scanState } = storePaths(dataDir)
  const tmp = `${scanState}.tmp`
  writeFileSync(tmp, JSON.stringify(state))
  renameSync(tmp, scanState)
}

/** Current store schema version, or 0 when the marker is absent (pre-v2). */
export function loadStoreVersion(dataDir) {
  const { version } = storePaths(dataDir)
  if (!existsSync(version)) return 0
  try {
    const parsed = JSON.parse(readFileSync(version, 'utf8'))
    return Number.isInteger(parsed?.version) ? parsed.version : 0
  } catch {
    return 0
  }
}

export function saveStoreVersion(dataDir, version) {
  const { version: versionPath } = storePaths(dataDir)
  const tmp = `${versionPath}.tmp`
  writeFileSync(tmp, JSON.stringify({ version }))
  renameSync(tmp, versionPath)
}
