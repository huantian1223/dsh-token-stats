import { describe, expect, it, afterEach, vi } from 'vitest'
import { createBalanceService } from '../dsh/balance.js'

describe('balance service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches, caches, and flags a low balance', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        is_available: true,
        balance_infos: [{ currency: 'CNY', total_balance: '3.2', granted_balance: '0', topped_up_balance: '3.2' }],
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = { get: () => ({ resolve: async () => ({ value: 'k' }) }) }
    const svc = createBalanceService(ctx, { balanceCacheMs: 60000, balanceWarnThreshold: 5 })

    const live = await svc.get(true)
    expect(live.ok).toBe(true)
    expect(live.total).toBe(3.2)
    expect(live.low).toBe(true)
    expect(live.warnThreshold).toBe(5)
    expect(live.source).toBe('live')

    const cached = await svc.get(false)
    expect(cached.source).toBe('cache')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const forced = await svc.get(true)
    expect(forced.source).toBe('live')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('reports NO_API_KEY without a configured key', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const ctx = { get: () => undefined }
    const svc = createBalanceService(ctx, {})
    const res = await svc.get(true)
    expect(res.ok).toBe(false)
    expect(res.error).toBe('NO_API_KEY')
  })

  it('falls back to a stale cache when the network fails', async () => {
    let calls = 0
    const fetchMock = vi.fn(async () => {
      calls++
      if (calls === 1) {
        return { ok: true, json: async () => ({ is_available: true, balance_infos: [{ total_balance: '10' }] }) }
      }
      throw new Error('network down')
    })
    vi.stubGlobal('fetch', fetchMock)
    const ctx = { get: () => ({ resolve: async () => ({ value: 'k' }) }) }
    const svc = createBalanceService(ctx, { balanceCacheMs: 60000 })
    await svc.get(true)
    const res = await svc.get(true) // force -> live -> fails
    expect(res.ok).toBe(true) // stale cache served
    expect(res.source).toBe('cache')
    expect(res.staleError).toBeTruthy()
  })
})
