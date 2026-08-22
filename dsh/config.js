// Plugin configuration: defaults, then `$DSH_HOME/token-stats/config.json`
// overrides, then cordis patch config (apply's second argument) — later wins.
// Exposed to the client through /token-stats/api/config.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const DEFAULT_CONFIG = {
  /** Split a session into separate chats after this much inactivity (ms). */
  gapMs: 30 * 60 * 1000,
  /** Periodic reconciliation interval for the session-log scan (ms). */
  rescanIntervalMs: 30 * 1000,
  /** Balance query cache TTL (ms). Short, because the client refreshes on
   * usage-driven triggers and ?force=1 bypasses it entirely. */
  balanceCacheMs: 15 * 1000,
  /** Rolling heatmap window in months (the full series served to the client). */
  windowMonths: 12,
  /** Client-side default heatmap range: '12m' | '3m' | '30d'. */
  defaultRange: '3m',
  /** Warn (red) when the account balance drops below this amount (¥). */
  balanceWarnThreshold: 5,
  /** Max rows in the (now removed) top-sessions ranking; kept for API compat. */
  topSessions: 8,
}

const RANGES = new Set(['12m', '3m', '30d'])

/**
 * Merge cordis patch config + config.json + defaults into one normalized
 * config object.
 *
 * @param {object} config - apply(ctx, config) config (patch layer, highest priority).
 * @param {string} dataDir - token-stats data directory (config.json lives here).
 */
export function loadConfig(config = {}, dataDir) {
  let fileCfg = {}
  const file = join(dataDir, 'config.json')
  if (existsSync(file)) {
    try {
      fileCfg = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      // malformed config.json: ignore and fall through to defaults
    }
  }
  const merged = { ...DEFAULT_CONFIG, ...fileCfg, ...config }
  merged.gapMs = Math.max(1000, Number(merged.gapMs) || DEFAULT_CONFIG.gapMs)
  merged.rescanIntervalMs = Math.max(5000, Number(merged.rescanIntervalMs) || DEFAULT_CONFIG.rescanIntervalMs)
  merged.balanceCacheMs = Math.max(1000, Number(merged.balanceCacheMs) || DEFAULT_CONFIG.balanceCacheMs)
  merged.windowMonths = Math.max(1, Number(merged.windowMonths) || DEFAULT_CONFIG.windowMonths)
  merged.balanceWarnThreshold = Math.max(0, Number(merged.balanceWarnThreshold) || DEFAULT_CONFIG.balanceWarnThreshold)
  merged.topSessions = Math.max(1, Number(merged.topSessions) || DEFAULT_CONFIG.topSessions)
  if (!RANGES.has(merged.defaultRange)) merged.defaultRange = DEFAULT_CONFIG.defaultRange
  return merged
}
