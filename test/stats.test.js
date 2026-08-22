import { describe, expect, it } from 'vitest'
import { computeStats, computeDayBreakdown, computeSessionStats, dayKey } from '../dsh/stats.js'

/** Build a usage row whose date is `offsetDays` days before today, anchored to
 * local NOON so the day-key math is stable regardless of when the suite runs. */
const NOON_TODAY = (() => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  return d.getTime()
})()
const day = (offsetDays, session, input, output, cacheRead = 0, extra = {}) => ({
  key: `${session}|1|1`,
  session,
  workspace: 'w',
  ts: NOON_TODAY - offsetDays * 86400000,
  turn: 1,
  step: 1,
  input,
  output,
  cacheRead,
  cacheWrite: 0,
  reasoning: 0,
  provider: 'p',
  model: 'm',
  ...extra,
})

const TODAY = dayKey(Date.now())

describe('stats.computeStats', () => {
  it('computes cumulative, today and steps', () => {
    const rows = [day(1, 's1', 100, 50), day(0, 's1', 200, 100)]
    const stats = computeStats(rows, {})
    expect(stats.cumulative.total).toBe(450)
    expect(stats.cumulative.input).toBe(300)
    expect(stats.cumulative.output).toBe(150)
    expect(stats.today.tokens).toBe(300)
    expect(stats.totalSteps).toBe(2)
    expect(stats.sessionCount).toBe(1)
    expect(stats.byModel[0].tokens).toBe(450)
  })

  it('computes streaks from active days', () => {
    const rows = [day(2, 's1', 1, 0), day(1, 's1', 1, 0), day(0, 's1', 1, 0)]
    const stats = computeStats(rows, {})
    expect(stats.activeDays).toBe(3)
    expect(stats.currentStreak).toBe(3)
    expect(stats.longestStreak).toBe(3)
  })

  it('heatmap cumulative series ends at the total', () => {
    const rows = [day(1, 's1', 100, 0), day(0, 's1', 50, 0, 10)]
    const stats = computeStats(rows, {})
    const last = stats.heatmap.cumulative[stats.heatmap.cumulative.length - 1]
    expect(last.tokens).toBe(stats.cumulative.total)
  })
})

describe('stats.computeDayBreakdown', () => {
  it('merges sessions that share a title', () => {
    const rows = [day(0, 's1', 100, 0), day(0, 's2', 50, 0)]
    const merged = computeDayBreakdown(rows, TODAY, () => '重复标题')
    expect(merged.length).toBe(1)
    expect(merged[0].tokens).toBe(150)
    expect(merged[0].sessions).toBe(2)
  })

  it('keeps differently-titled sessions separate', () => {
    const rows = [day(0, 's1', 100, 0), day(0, 's2', 50, 0)]
    const merged = computeDayBreakdown(rows, TODAY, (id) => (id === 's1' ? '标题A' : '标题B'))
    expect(merged.length).toBe(2)
    expect(merged[0].tokens).toBeGreaterThan(merged[1].tokens)
  })

  it('ignores rows outside the requested day', () => {
    const rows = [day(0, 's1', 100, 0), day(1, 's2', 50, 0)]
    const merged = computeDayBreakdown(rows, TODAY, () => '')
    expect(merged.length).toBe(1)
    expect(merged[0].session).toBe('s1')
  })
})

describe('stats.computeSessionStats', () => {
  it('summarizes one session', () => {
    const rows = [day(0, 's1', 100, 50), day(0, 's2', 10, 0)]
    const sum = computeSessionStats(rows, 's1')
    expect(sum.tokens.total).toBe(150)
    expect(sum.steps).toBe(1)
  })
})
