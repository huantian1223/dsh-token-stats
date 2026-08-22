// DeepSeek account balance query for the /token-stats/api/balance endpoint.
//
// The API key is resolved through the credentials seam (the same
// `ctx.get("credentials").resolve("DEEPSEEK_API_KEY")` path the official
// dsh-llm-deepseek provider uses) and never leaves the host process. The
// balance endpoint is read-only and free; results are cached because the
// figure changes very slowly.

const BALANCE_URL = 'https://api.deepseek.com/user/balance'
const DEFAULT_CACHE_MS = 15 * 1000

/**
 * @param {object} ctx - cordis context (credentials seam via ctx.get).
 * @param {object} [config] - { balanceCacheMs, balanceWarnThreshold }.
 * @returns {{ get: (force?: boolean) => Promise<object> }}
 */
export function createBalanceService(ctx, config = {}) {
  const cacheMs = Math.max(1000, Number(config.balanceCacheMs) || DEFAULT_CACHE_MS)
  const warnThreshold = Math.max(0, Number(config.balanceWarnThreshold) || 0)
  let cache = null // { at, data }

  const resolveApiKey = async () => {
    try {
      const credentials = ctx.get?.('credentials')
      if (credentials && typeof credentials.resolve === 'function') {
        const hit = await credentials.resolve('DEEPSEEK_API_KEY')
        if (hit?.value) return hit.value
      }
    } catch {
      // fall through to the ambient env fallback
    }
    return process.env.DEEPSEEK_API_KEY || ''
  }

  const fetchLive = async () => {
    const apiKey = await resolveApiKey()
    if (!apiKey) {
      return { ok: false, error: 'NO_API_KEY' }
    }
    const res = await fetch(BALANCE_URL, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` }
    }
    const data = await res.json()
    const info = Array.isArray(data.balance_infos) ? data.balance_infos[0] : null
    const total = Number(info?.total_balance ?? 0)
    return {
      ok: true,
      currency: info?.currency ?? 'CNY',
      total,
      granted: Number(info?.granted_balance ?? 0),
      toppedUp: Number(info?.topped_up_balance ?? 0),
      isAvailable: data.is_available !== false,
      low: warnThreshold > 0 && total < warnThreshold,
      warnThreshold,
    }
  }

  /**
   * Read the balance, serving a cached value within the TTL.
   * Never throws: network/provider failures degrade to `{ ok:false, error }`,
   * falling back to a stale cache when one exists.
   *
   * @param {boolean} [force] - bypass the cache.
   */
  const get = async (force = false) => {
    const now = Date.now()
    if (!force && cache && now - cache.at < cacheMs) {
      return { ...cache.data, source: 'cache' }
    }
    try {
      const data = await fetchLive()
      cache = { at: now, data }
      return { ...data, source: 'live' }
    } catch (error) {
      const err = { ok: false, error: String(error?.message ?? error) }
      if (cache) {
        return { ...cache.data, source: 'cache', staleError: err.error }
      }
      return { ...err, source: 'live' }
    }
  }

  return { get, resolveApiKey }
}
