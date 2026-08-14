// Aggregation over usage rows. All date math uses local time (the product
// page shows calendar days in the user's timezone). Days are also mapped to
// an integer "days since epoch" so streak arithmetic never trips on DST.

/** Gap (ms) between events that still counts as the same chat session. */
const DEFAULT_GAP_MS = 30 * 60 * 1000

function localParts(ts) {
  const d = new Date(ts)
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
}

/** Integer day number (days since 1970-01-01) for a timestamp, local tz. */
export function dayNum(ts) {
  const { y, m, d } = localParts(ts)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

/** 'YYYY-MM-DD' (local) for a day number. */
export function dayKeyFromNum(num) {
  const d = new Date(num * 86400000 + 12 * 3600000) // noon UTC keeps local date stable
  const { y, m, d: dd } = localParts(d.getTime())
  return `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

export function dayKey(ts) {
  return dayKeyFromNum(dayNum(ts))
}

/** Monday (local midnight) of the week containing the given timestamp. */
function mondayOf(ts) {
  const { y, m, d } = localParts(ts)
  const date = new Date(y, m - 1, d)
  const offset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - offset)
  return date.getTime()
}

function isoWeek(ts) {
  const d = new Date(Date.UTC(localParts(ts).y, localParts(ts).m - 1, localParts(ts).d))
  const dayNumW = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNumW)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/**
 * Per-session breakdown for one calendar day (the heatmap drill-down).
 * Sessions that share the same DSH-generated title are merged into one row
 * (tokens/steps summed, `sessions` counts how many), so repeated titles like
 * "使用 read_image 工具读取..." collapse instead of listing every session.
 *
 * @param {Array<object>} rows - usage rows.
 * @param {string} dateKey - local 'YYYY-MM-DD'.
 * @param {(sessionId: string) => string} [titleOf] - resolves a session title.
 * @returns {Array<{title:string, session:string, workspace:string, tokens:number, steps:number, sessions:number}>} sorted by tokens desc.
 */
export function computeDayBreakdown(rows, dateKey, titleOf = () => '') {
  const bySession = new Map()
  for (const r of rows) {
    if (dayKey(r.ts) !== dateKey) continue
    let e = bySession.get(r.session)
    if (!e) {
      e = { session: r.session, workspace: r.workspace, tokens: 0, steps: 0 }
      bySession.set(r.session, e)
    }
    e.tokens += r.input + r.output + r.cacheRead + r.cacheWrite
    e.steps += 1
  }
  const merged = new Map()
  for (const s of bySession.values()) {
    const title = titleOf(s.session)
    const key = title || s.session
    let m = merged.get(key)
    if (!m) {
      m = { title, session: s.session, workspace: s.workspace, tokens: 0, steps: 0, sessions: 0 }
      merged.set(key, m)
    }
    m.tokens += s.tokens
    m.steps += s.steps
    m.sessions += 1
    if (!m.workspace && s.workspace) m.workspace = s.workspace
  }
  return [...merged.values()].sort((a, b) => b.tokens - a.tokens)
}

/**
 * Light per-session summary for the live header badge.
 *
 * @param {Array<object>} rows - usage rows.
 * @param {string} sessionId
 * @returns {object}
 */
export function computeSessionStats(rows, sessionId) {
  const list = rows.filter((r) => r.session === sessionId)
  const byModel = new Map()
  let input = 0
  let output = 0
  let cacheRead = 0
  let cacheWrite = 0
  let reasoning = 0
  let firstTs = 0
  let lastTs = 0
  for (const r of list) {
    input += r.input
    output += r.output
    cacheRead += r.cacheRead
    cacheWrite += r.cacheWrite
    reasoning += r.reasoning
    if (!firstTs || r.ts < firstTs) firstTs = r.ts
    if (r.ts > lastTs) lastTs = r.ts
    if (r.model) {
      const e = byModel.get(r.model) ?? { tokens: 0, steps: 0 }
      e.tokens += r.input + r.output + r.cacheRead + r.cacheWrite
      e.steps += 1
      byModel.set(r.model, e)
    }
  }
  return {
    session: sessionId,
    workspace: list[0]?.workspace ?? '',
    tokens: { input, output, cacheRead, cacheWrite, reasoning, total: input + output + cacheRead + cacheWrite },
    steps: list.length,
    turns: new Set(list.map((r) => r.turn)).size,
    firstTs,
    lastTs,
    byModel: [...byModel.entries()].map(([model, e]) => ({ model, tokens: e.tokens, steps: e.steps })),
  }
}

/** Compute the full stats snapshot from usage rows. */
export function computeStats(rows, config = {}) {
  const gapMs = config.gapMs ?? DEFAULT_GAP_MS
  const windowMonths = config.windowMonths ?? 12

  const totalOf = (r) => r.input + r.output + r.cacheRead + r.cacheWrite

  // ---- cumulative + per-session + per-model/workspace ----
  let input = 0
  let output = 0
  let cacheRead = 0
  let cacheWrite = 0
  let reasoning = 0
  let totalSteps = rows.length
  const sessions = new Map() // sessionId -> { tokens, minTs, maxTs, workspace, turns }
  const byModel = new Map()
  const byWorkspace = new Map()
  const byProvider = new Map()
  let firstTs = Number.POSITIVE_INFINITY
  let lastTs = 0

  for (const r of rows) {
    const total = totalOf(r)
    input += r.input
    output += r.output
    cacheRead += r.cacheRead
    cacheWrite += r.cacheWrite
    reasoning += r.reasoning
    if (r.ts < firstTs) firstTs = r.ts
    if (r.ts > lastTs) lastTs = r.ts

    let s = sessions.get(r.session)
    if (!s) {
      s = { tokens: 0, minTs: r.ts, maxTs: r.ts, workspace: r.workspace, turns: new Set(), steps: 0 }
      sessions.set(r.session, s)
    }
    s.tokens += total
    s.steps += 1
    if (r.ts < s.minTs) s.minTs = r.ts
    if (r.ts > s.maxTs) s.maxTs = r.ts
    s.turns.add(r.turn)

    const bump = (map, k, total, isWorkspace) => {
      if (!k) return
      let e = map.get(k)
      if (!e) {
        e = isWorkspace ? { tokens: 0, sessions: new Set() } : { tokens: 0, steps: 0 }
        map.set(k, e)
      }
      e.tokens += total
      if (isWorkspace) e.sessions.add(r.session)
      else e.steps += 1
    }
    bump(byModel, r.model, total)
    bump(byProvider, r.provider, total)
    bump(byWorkspace, r.workspace, total, true)
  }

  // ---- peak (per-session total) ----
  let peak = { tokens: 0, session: '', ts: 0, workspace: '' }
  for (const [id, s] of sessions) {
    if (s.tokens > peak.tokens) {
      peak = { tokens: s.tokens, session: id, ts: s.minTs, workspace: s.workspace }
    }
  }

  // ---- longest chat: cluster per session by idle gap ----
  let longestChat = { ms: 0, session: '', startTs: 0, endTs: 0, workspace: '' }
  const bySession = new Map()
  for (const r of rows) {
    let list = bySession.get(r.session)
    if (!list) {
      list = []
      bySession.set(r.session, list)
    }
    list.push(r)
  }
  for (const [id, list] of bySession) {
    list.sort((a, b) => a.ts - b.ts)
    let start = list[0].ts
    let prev = start
    for (let i = 1; i < list.length; i++) {
      if (list[i].ts - prev > gapMs) {
        const ms = prev - start
        if (ms > longestChat.ms) {
          longestChat = { ms, session: id, startTs: start, endTs: prev, workspace: list[i - 1].workspace }
        }
        start = list[i].ts
      }
      prev = list[i].ts
    }
    const ms = prev - start
    if (ms > longestChat.ms) {
      longestChat = { ms, session: id, startTs: start, endTs: prev, workspace: list[list.length - 1].workspace }
    }
  }

  // ---- today's usage ----
  const todayNum = dayNum(Date.now())
  let todayTokens = 0
  let todaySteps = 0
  for (const r of rows) {
    if (dayNum(r.ts) === todayNum) {
      todayTokens += totalOf(r)
      todaySteps += 1
    }
  }

  // ---- top sessions by token total ----
  const topSessions = [...sessions.entries()]
    .map(([id, s]) => ({
      session: id,
      workspace: s.workspace,
      tokens: s.tokens,
      turns: s.turns.size,
      steps: s.steps,
      firstTs: s.minTs,
      lastTs: s.maxTs,
    }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, Math.max(1, Number(config.topSessions) || 8))

  // ---- streaks from active days ----
  const active = new Set()
  for (const r of rows) active.add(dayNum(r.ts))

  const today = dayNum(Date.now())
  let cursor = active.has(today) ? today : today - 1
  let currentStreak = 0
  while (active.has(cursor)) {
    currentStreak++
    cursor--
  }

  let longestStreak = 0
  let run = 0
  let prevDay = null
  for (const day of [...active].sort((a, b) => a - b)) {
    if (prevDay !== null && day === prevDay + 1) run += 1
    else run = 1
    if (run > longestStreak) longestStreak = run
    prevDay = day
  }

  // ---- heatmap window: rolling N months ending this month ----
  const now = new Date()
  const winStart = new Date(now.getFullYear(), now.getMonth() - (windowMonths - 1), 1)
  const winStartDay = dayNum(winStart.getTime())
  const winEndDay = dayNum(now.getTime())

  const dayTokens = new Map() // dayNum -> { tokens, steps }
  for (const r of rows) {
    const n = dayNum(r.ts)
    if (n < winStartDay || n > winEndDay) continue
    let e = dayTokens.get(n)
    if (!e) {
      e = { tokens: 0, steps: 0 }
      dayTokens.set(n, e)
    }
    e.tokens += totalOf(r)
    e.steps += 1
  }

  const daily = []
  const cumulative = []
  const weekly = new Map() // isoWeek -> { tokens, steps, startTs }
  let running = 0
  for (let n = winStartDay; n <= winEndDay; n++) {
    const e = dayTokens.get(n)
    const tokens = e ? e.tokens : 0
    const steps = e ? e.steps : 0
    const key = dayKeyFromNum(n)
    daily.push({ date: key, tokens, steps })
    running += tokens
    cumulative.push({ date: key, tokens: running })
    const wKey = isoWeek(new Date(n * 86400000 + 12 * 3600000))
    let w = weekly.get(wKey)
    if (!w) {
      w = { tokens: 0, steps: 0, startTs: mondayOf(new Date(n * 86400000 + 12 * 3600000).getTime()) }
      weekly.set(wKey, w)
    }
    w.tokens += tokens
    w.steps += steps
  }
  const weeklySeries = [...weekly.values()]
    .sort((a, b) => a.startTs - b.startTs)
    .map((w) => ({ startDate: dayKey(w.startTs), tokens: w.tokens, steps: w.steps }))

  const sortedModel = [...byModel.entries()]
    .map(([model, e]) => ({ model, tokens: e.tokens, steps: e.steps }))
    .sort((a, b) => b.tokens - a.tokens)
  const sortedProvider = [...byProvider.entries()]
    .map(([provider, e]) => ({ provider, tokens: e.tokens, steps: e.steps }))
    .sort((a, b) => b.tokens - a.tokens)
  const sortedWorkspace = [...byWorkspace.entries()]
    .map(([workspace, e]) => ({ workspace, tokens: e.tokens, sessions: e.sessions.size }))
    .sort((a, b) => b.tokens - a.tokens)

  const distinctTurns = [...sessions.values()].reduce((acc, s) => acc + s.turns.size, 0)

  return {
    updatedAt: Date.now(),
    firstTs: Number.isFinite(firstTs) ? firstTs : 0,
    lastTs: lastTs || 0,
    sessionCount: sessions.size,
    totalSteps,
    totalTurns: distinctTurns,
    activeDays: active.size,
    cumulative: { total: input + output + cacheRead + cacheWrite, input, output, cacheRead, cacheWrite, reasoning },
    today: { tokens: todayTokens, steps: todaySteps },
    peak,
    longestChat,
    currentStreak,
    longestStreak,
    topSessions,
    byModel: sortedModel,
    byProvider: sortedProvider,
    byWorkspace: sortedWorkspace,
    heatmap: { windowMonths, daily, weekly: weeklySeries, cumulative },
  }
}
