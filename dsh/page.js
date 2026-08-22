// Self-contained stats page served at /token-stats. Deep-dark theme using
// the Web UI's design tokens where available, with a neutral fallback.

export function renderPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Token 使用统计 · DeepSeek Harness</title>
<style>
  :root {
    --bg: #151517;
    --bg-card: #353638;
    --bg-cell: #232324;
    --border: rgba(255, 255, 255, 0.12);
    --text: #f9fafb;
    --text-dim: #adb2b8;
    --accent: #679efe;
    --accent-soft: rgba(103, 158, 254, 0.14);
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px 20px 64px;
    background: var(--bg); color: var(--text);
    font-family: -apple-system, "Segoe UI", "Microsoft YaHei", system-ui, sans-serif;
  }
  .wrap { max-width: 980px; margin: 0 auto; }
  header { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 22px; flex-wrap: wrap; }
  h1 { font-size: 20px; margin: 0; font-weight: 650; letter-spacing: .2px; }
  .sub { color: var(--text-dim); font-size: 13px; margin-top: 6px; }
  .live { display: inline-flex; align-items: center; gap: 7px; color: var(--text-dim); font-size: 12px; font-variant-numeric: tabular-nums; }
  .live .dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.18); }
  .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 26px; }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px 16px 14px; min-width: 0; }
  .card .k { font-size: 12px; color: var(--text-dim); margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card .v { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -.4px; line-height: 1.2; white-space: nowrap; }
  .card .d { font-size: 11px; line-height: 16px; color: var(--text-dim); margin-top: 6px; }
  .card .d b { color: var(--text); font-weight: 600; }
  @media (max-width: 720px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 18px; margin-bottom: 18px; }
  .panel h2 { font-size: 14px; margin: 0 0 14px; font-weight: 600; }
  .tabs { display: flex; gap: 28px; border: 0; background: transparent; padding: 0; margin-bottom: 16px; }
  .tab { border: 0; background: transparent; color: var(--text-dim); font: inherit; font-size: 13px; font-weight: 500; line-height: 16px; padding: 0 0 8px; cursor: pointer; position: relative; }
  .tab:hover { color: var(--text); }
  .tab:after { content: ""; background: transparent; border-radius: 2px; height: 2px; position: absolute; bottom: 0; left: 0; right: 0; }
  .tab.active { color: var(--accent); }
  .tab.active:after { background: var(--accent); }
  .hm { overflow-x: auto; }
  .hm-inner { display: inline-block; }
  .hm-months { display: flex; }
  .hm-months span { flex: 1 0 0; font-size: 11px; color: var(--text-dim); white-space: nowrap; }
  .hm-grid { display: flex; gap: 3px; }
  .hm-col { display: flex; flex-direction: column; gap: 3px; }
  .hm-cell { width: 12px; height: 12px; border-radius: 3px; background: var(--bg-cell); }
  .tip { position: fixed; z-index: 1300; pointer-events: none; opacity: 0; transition: opacity .08s ease; background: #2c2c2e; border: 1px solid rgba(255,255,255,.06); color: #f9fafb; font-size: 12px; line-height: 18px; padding: 5px 9px; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,.45); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .hm-cell.l1 { background: color-mix(in srgb, var(--accent) 14%, transparent); } .hm-cell.l2 { background: color-mix(in srgb, var(--accent) 28%, transparent); }
  .hm-cell.l3 { background: color-mix(in srgb, var(--accent) 44%, transparent); } .hm-cell.l4 { background: color-mix(in srgb, var(--accent) 66%, transparent); }
  .hm-cell.l5 { background: var(--accent); }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  @media (max-width: 860px) { .grid2 { grid-template-columns: 1fr; } }
  .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0 0 14px; }
  .panel-head h2 { margin: 0; }
  .head-actions { display: inline-flex; align-items: center; gap: 8px; }
  .day-detail { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); }
  .day-detail-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
  .day-detail-head b { font-size: 13px; font-weight: 600; color: var(--text); }
  .refresh-btn:disabled { opacity: .55; cursor: default; }
  .day-pager { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 12px; }
  .day-pager-info { font-size: 12px; color: var(--text-dim); font-variant-numeric: tabular-nums; }
  .range-tabs { display: inline-flex; gap: 2px; background: var(--bg-cell); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
  .range { border: 0; background: transparent; color: var(--text-dim); font: inherit; font-size: 12px; line-height: 18px; padding: 2px 10px; border-radius: 6px; cursor: pointer; }
  .range:hover { color: var(--text); }
  .range.active { background: rgba(255,255,255,.08); color: var(--text); }
  .bal-strip { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 28px; }
  .bal-strip .bal-row { display: inline-flex; justify-content: flex-start; gap: 8px; line-height: 28px; }
  .bal-strip .bal-note { flex-basis: 100%; margin-top: 2px; }
  .bal-hero { display: flex; align-items: baseline; gap: 10px; }
  .bal-hero b { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -.4px; color: var(--text); }
  .bal-status { font-size: 12px; color: #22c55e; }
  .bal-status-low { color: #f25a5a; }
  .bal-note-low { color: #f25a5a; }
  .bal-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 12px; line-height: 24px; color: var(--text-dim); }
  .bal-note { font-size: 11px; line-height: 18px; color: var(--text-dim); margin-top: 6px; }
  .refresh-btn { border: 1px solid var(--border); background: transparent; color: var(--text-dim); font: inherit; font-size: 12px; line-height: 20px; padding: 2px 10px; border-radius: 999px; cursor: pointer; }
  .refresh-btn:hover { background: rgba(255,255,255,.08); color: var(--text); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--border); font-variant-numeric: tabular-nums; }
  th { color: var(--text-dim); font-weight: 500; font-size: 12px; }
  td.v { text-align: right; }
  .muted { color: var(--text-dim); }
  .err { color: #f87171; font-size: 13px; padding: 12px; border: 1px solid rgba(248,113,113,.35); border-radius: 10px; }
  .skeleton { color: var(--text-dim); font-size: 13px; padding: 30px 0; text-align: center; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <h1>Token 使用统计</h1>
      <div class="sub" id="sub">正在读取…</div>
    </div>
    <div class="live"><span class="dot"></span><span id="live">连接中</span></div>
  </header>

  <div class="cards" id="cards"></div>

  <div class="panel">
    <div class="panel-head">
      <h2>Token 活动</h2>
      <div class="head-actions">
        <div class="range-tabs" id="rangeTabs">
          <button class="range" data-range="12m">12个月</button>
          <button class="range active" data-range="3m">3个月</button>
          <button class="range" data-range="30d">30天</button>
        </div>
        <button class="refresh-btn" id="exportCsv" type="button">导出 CSV</button>
      </div>
    </div>
    <div class="tabs" id="tabs">
      <button class="tab active" data-view="daily">每日</button>
      <button class="tab" data-view="weekly">每周</button>
      <button class="tab" data-view="cumulative">累计</button>
    </div>
    <div class="hm" id="hm"></div>
    <div class="tip" id="tip"></div>
    <div class="day-detail" id="dayDetail" hidden>
      <div class="day-detail-head"><b id="dayDetailTitle"></b><button class="refresh-btn" id="dayDetailClose" type="button">关闭</button></div>
      <div id="dayDetailBody"></div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <h2>DeepSeek 余额</h2>
      <button class="refresh-btn" id="balanceRefresh" type="button">刷新</button>
    </div>
    <div id="balance"><div class="skeleton">加载中…</div></div>
  </div>

  <div class="grid2">
    <div class="panel"><h2>消耗构成</h2><div id="breakdown"><div class="skeleton">加载中…</div></div></div>
    <div class="panel"><h2>按模型 / 工作区</h2><div id="models"><div class="skeleton">加载中…</div></div></div>
  </div>
</div>

<script>
const $ = (s) => document.querySelector(s)
let STATE = null
let VIEW = 'daily'
let RANGE = '3m'
let LAST_TOTAL = null
let LAST_BALANCE_FORCE = 0

const fmt = (n) => {
  if (!Number.isFinite(n)) return '—'
  if (n >= 1e8) return (n % 1e8 === 0 ? (n / 1e8).toFixed(0) : (n / 1e8).toFixed(1)) + '亿'
  if (n >= 1e4) return (n % 1e4 === 0 ? (n / 1e4).toFixed(0) : (n / 1e4).toFixed(1)) + '万'
  return String(Math.round(n))
}
const fmtDur = (ms) => {
  const s = Math.round(ms / 1000)
  if (s < 60) return s + ' 秒'
  const m = Math.floor(s / 60), r = s % 60
  if (m < 60) return m + ' 分 ' + r + ' 秒'
  const h = Math.floor(m / 60)
  return h + ' 小时 ' + (m % 60) + ' 分'
}
const fmtDate = (d) => { const [y, m, dd] = d.split('-'); return Number(m) + '月' + Number(dd) + '日' }
const fmtDay = (d) => { const [y, m, dd] = d.split('-'); return y + '-' + m + '-' + dd }
/** Full-precision display for detail tables: thousand-separated digits. */
const fmtFull = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—')

function levelFor(v, max) {
  if (!(v > 0) || !(max > 0)) return 0
  if (v === max) return 5
  const f = Math.log10(v) / Math.log10(max)
  return Math.max(1, Math.min(5, Math.ceil(f * 5)))
}

function dayNumOf(dateStr) { return Math.floor(Date.parse(dateStr + 'T12:00:00') / 86400000) }
function dayStr(num) { const d = new Date(num * 86400000 + 12 * 3600000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
function localDayStr(ts) { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }

function renderCards() {
  const c = STATE.cumulative
  const today = STATE.today
  const todayPct = today && c.total > 0 ? Math.round((today.tokens / c.total) * 100) : null
  const cards = [
    { k: '累计 Token 数', v: fmt(c.total) },
    { k: '今日 Token', v: today ? fmt(today.tokens) : '—', d: today ? '今天 · ' + today.steps + ' 次调用' + (todayPct !== null ? ' · 占累计 ' + todayPct + '%' : '') : '—' },
    { k: '峰值 Token 数', v: fmt(STATE.peak.tokens), d: '单会话最高' + (STATE.peak.ts ? ' · ' + fmtDate(localDayStr(STATE.peak.ts)) : '') },
    { k: '最长聊天时长', v: STATE.longestChat.ms > 0 ? fmtDur(STATE.longestChat.ms) : '—', d: STATE.longestChat.ms > 0 ? fmtDate(localDayStr(STATE.longestChat.startTs)) + ' 的单次会话' : '暂无数据' },
    { k: '当前连续天数', v: STATE.currentStreak + ' 天', d: '今天' + (STATE.currentStreak > 0 ? '仍在坚持' : '尚未使用') },
    { k: '最长连续天数', v: STATE.longestStreak + ' 天', d: '历史最佳' },
  ]
  $('#cards').innerHTML = cards.map((x) => '<div class="card"><div class="k">' + x.k + '</div><div class="v">' + x.v + '</div>' + (x.d ? '<div class="d">' + x.d + '</div>' : '') + '</div>').join('')
}

function windowDaily(h, range) {
  let daily = h.daily
  let cumulative = h.cumulative
  if (range !== '12m') {
    const endNum0 = dayNumOf(daily[daily.length - 1].date)
    const span = range === '30d' ? 30 : 92
    const cutoff = endNum0 - span
    daily = daily.filter((d) => dayNumOf(d.date) >= cutoff)
    let run = 0
    cumulative = daily.map((d) => {
      run += d.tokens
      return { date: d.date, tokens: run }
    })
  }
  return { daily, cumulative }
}

function renderHeatmap() {
  const box = $('#hm')
  const inner = document.createElement('div')
  inner.className = 'hm-inner'
  const h = STATE.heatmap
  const { daily, cumulative } = windowDaily(h, RANGE)
  // One shared 7-row calendar grid for every view (每日/每周/累计); only the
  // per-cell value and tooltip change, so switching tabs never jumps.
  const byDate = new Map(daily.map((d) => [d.date, d]))
  const cumByDate = new Map(cumulative.map((d) => [d.date, d.tokens]))
  const startNum = dayNumOf(daily[0].date)
  const endNum = dayNumOf(daily[daily.length - 1].date)
  const first = new Date(startNum * 86400000 + 12 * 3600000)
  const cursor0 = startNum - ((first.getDay() + 6) % 7)
  const mondayOf = (n) => n - ((new Date(n * 86400000 + 12 * 3600000).getDay() + 6) % 7)
  const weekTokens = new Map()
  for (const d of daily) {
    const mon = mondayOf(dayNumOf(d.date))
    weekTokens.set(mon, (weekTokens.get(mon) ?? 0) + d.tokens)
  }
  const valueOf = (n) => {
    if (VIEW === 'daily') return byDate.get(dayStr(n))?.tokens ?? 0
    if (VIEW === 'weekly') return weekTokens.get(mondayOf(n)) ?? 0
    return cumByDate.get(dayStr(n)) ?? 0
  }
  const tipOf = (n) => {
    const key = dayStr(n)
    const v = valueOf(n)
    if (VIEW === 'daily') {
      const e = byDate.get(key)
      return e
        ? fmtDate(key) + ' 使用了 ' + fmt(v) + '个 Token' + (e.steps > 0 ? '（' + e.steps + ' 次调用）' : '')
        : fmtDate(key) + ' 无使用'
    }
    if (VIEW === 'weekly') return '周 ' + fmtDate(dayStr(mondayOf(n))) + ' 合计 ' + fmt(v) + ' 个 Token'
    return '截至 ' + fmtDate(key) + ' 累计 ' + fmt(v) + ' 个 Token'
  }
  let max
  if (VIEW === 'daily') max = Math.max(1, ...daily.map((d) => d.tokens))
  else if (VIEW === 'weekly') max = Math.max(1, ...weekTokens.values())
  else max = Math.max(1, cumByDate.get(dayStr(endNum)) ?? 1)
  const weeks = []
  for (let c = cursor0; c <= endNum; c += 7) {
    const col = []
    for (let i = 0; i < 7; i++) col.push(c + i)
    weeks.push(col)
  }
  let monthHtml = ''
  let prevMonth = null
  weeks.forEach((col) => {
    const d = new Date(col[0] * 86400000 + 12 * 3600000)
    const m = d.getMonth()
    monthHtml += '<span>' + (m !== prevMonth ? (m + 1) + '月' : '') + '</span>'
    prevMonth = m
  })
  let grid = '<div class="hm-grid">'
  weeks.forEach((col) => {
    grid += '<div class="hm-col">'
    col.forEach((n) => {
      const lv = levelFor(valueOf(n), max)
      const dateAttr = VIEW === 'daily' ? ' data-date="' + dayStr(n) + '"' : ''
      grid += '<div class="hm-cell l' + lv + '" data-tip="' + tipOf(n) + '"' + dateAttr + '></div>'
    })
    grid += '</div>'
  })
  grid += '</div>'
  inner.innerHTML = '<div class="hm-months">' + monthHtml + '</div>' + grid
  box.innerHTML = ''
  box.appendChild(inner)
}

function renderBreakdown() {
  const c = STATE.cumulative
  const rows = [
    ['输入 (input)', c.input], ['输出 (output)', c.output],
    ['缓存读取 (cache read)', c.cacheRead], ['缓存写入 (cache write)', c.cacheWrite],
    ['其中推理 (reasoning)', c.reasoning],
  ]
  $('#breakdown').innerHTML = '<table>' + rows.map(([k, v]) => '<tr><td>' + k + '</td><td class="v">' + fmtFull(v) + '</td></tr>').join('') + '</table>'
}

function renderModels() {
  const modelRows = STATE.byModel.slice(0, 8).map((m) => '<tr><td>' + (m.model || '未知') + '</td><td class="v">' + fmtFull(m.tokens) + '</td></tr>').join('')
  const wsRows = STATE.byWorkspace.slice(0, 5).map((w) => '<tr><td title="' + w.workspace + '">' + (w.workspace.split(/[\\\\/]/).pop() || w.workspace) + '</td><td class="v">' + fmtFull(w.tokens) + '</td></tr>').join('')
  $('#models').innerHTML = '<table><tr><th>模型</th><th class="v">Token</th></tr>' + modelRows + '<tr><td colspan="2" style="height:8px;border:0"></td></tr><tr><th>工作区</th><th class="v">Token</th></tr>' + wsRows + '</table>'
}

function render() {
  if (!STATE) return
  const subBits = []
  subBits.push(STATE.sessionCount + ' 个会话')
  subBits.push(STATE.totalTurns + ' 轮对话')
  subBits.push(STATE.totalSteps + ' 次模型调用')
  if (STATE.firstTs) subBits.push('首条记录 ' + fmtDate(localDayStr(STATE.firstTs)))
  $('#sub').textContent = subBits.join(' · ')
  $('#live').textContent = '更新于 ' + new Date(STATE.updatedAt).toLocaleTimeString('zh-CN', { hour12: false })
  renderCards()
  renderHeatmap()
  renderBreakdown()
  renderModels()
}

async function load() {
  try {
    const r = await fetch('/token-stats/api/stats', { cache: 'no-store' })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    STATE = await r.json()
    if (STATE.lastError) console.warn('[token-stats] last scan error:', STATE.lastError)
    render()
    // Usage-driven balance refresh: when the cumulative total moves, pull a
    // fresh balance (throttled inside loadBalance).
    if (LAST_TOTAL !== null && LAST_TOTAL !== STATE.cumulative.total) loadBalance(true)
    LAST_TOTAL = STATE.cumulative.total
  } catch (e) {
    $('#live').textContent = '加载失败'
    $('#cards').innerHTML = '<div class="err" style="grid-column:1/-1">无法读取统计：' + e.message + '</div>'
  }
}

document.querySelectorAll('#tabs .tab').forEach((b) => b.addEventListener('click', () => {
  VIEW = b.dataset.view
  document.querySelectorAll('#tabs .tab').forEach((x) => x.classList.toggle('active', x === b))
  renderHeatmap()
}))
document.querySelectorAll('#rangeTabs .range').forEach((b) => b.addEventListener('click', () => {
  RANGE = b.dataset.range
  document.querySelectorAll('#rangeTabs .range').forEach((x) => x.classList.toggle('active', x === b))
  renderHeatmap()
}))

// Custom hover preview for heatmap cells (delegated; survives innerHTML swaps).
const hmBox = $('#hm')
const tipEl = $('#tip')
if (hmBox && tipEl) {
  hmBox.addEventListener('mousemove', (e) => {
    const cell = e.target && e.target.closest ? e.target.closest('.hm-cell') : null
    if (!cell) {
      tipEl.style.opacity = '0'
      return
    }
    const text = cell.dataset.tip || ''
    if (tipEl.textContent !== text) tipEl.textContent = text
    tipEl.style.opacity = '1'
    const r = tipEl.getBoundingClientRect()
    let x = e.clientX + 14
    let y = e.clientY + 16
    if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - 14
    if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - 16
    tipEl.style.left = x + 'px'
    tipEl.style.top = y + 'px'
  })
  hmBox.addEventListener('mouseleave', () => {
    tipEl.style.opacity = '0'
  })
}

load()
setInterval(load, 15000)

// DeepSeek account balance (server-side key, 15s cache via ?force=1).
async function loadBalance(force) {
  // Throttle usage-driven force refreshes (but never a manual click).
  if (force && Date.now() - LAST_BALANCE_FORCE < 5000) return
  if (force) LAST_BALANCE_FORCE = Date.now()
  const btn = $('#balanceRefresh')
  if (force && btn) {
    btn.disabled = true
    btn.textContent = '刷新中…'
  }
  try {
    const r = await fetch('/token-stats/api/balance' + (force ? '?force=1' : ''), { cache: 'no-store' })
    if (!r.ok) return
    const j = await r.json()
    if (!j.ok) return
    const money = (n) => (j.currency && j.currency !== 'CNY' ? j.currency + ' ' : '¥') + Number(n ?? 0).toFixed(2)
    const statusText = j.low ? '余额不足' : (j.isAvailable ? '可用' : '不可用')
    const statusClass = j.low ? ' bal-status-low' : ''
    const note = j.low
      ? '⚠ 余额不足（低于 ' + money(j.warnThreshold) + '），请注意充值'
      : '数据来自 DeepSeek 开放平台 /user/balance · 15 分钟缓存'
    $('#balance').innerHTML =
      '<div class="bal-strip">' +
      '<div class="bal-hero"><b>' + money(j.total) + '</b><span class="bal-status' + statusClass + '">' + statusText + '</span></div>' +
      '<div class="bal-row"><span>充值余额</span><span>' + money(j.toppedUp) + '</span></div>' +
      '<div class="bal-row"><span>赠送余额</span><span>' + money(j.granted) + '</span></div>' +
      '<div class="bal-note' + (j.low ? ' bal-note-low' : '') + '">' + note + '</div>' +
      '</div>'
  } catch {
    $('#balance').innerHTML = ''
  } finally {
    if (btn) {
      btn.disabled = false
      btn.textContent = '刷新'
    }
  }
}
loadBalance()
setInterval(() => loadBalance(), 15 * 60 * 1000)
$('#balanceRefresh').addEventListener('click', () => loadBalance(true))

// CSV export of the current heatmap window.
$('#exportCsv').addEventListener('click', () => {
  if (!STATE) return
  const { daily } = windowDaily(STATE.heatmap, RANGE)
  const lines = [['日期', 'Token', '调用次数']]
  for (const d of daily) lines.push([d.date, d.tokens, d.steps])
  const csv = '\\ufeff' + lines.map((r) => r.join(',')).join('\\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'token-usage-' + RANGE + '.csv'
  a.click()
  URL.revokeObjectURL(a.href)
})

// Day drill-down: click a heatmap cell (daily view) to see that day's sessions.
let DAY_PAGE = 0
let DAY_ALL = []

function renderDayRows() {
  const perPage = 10
  const pages = Math.max(1, Math.ceil(DAY_ALL.length / perPage))
  const cur = Math.min(DAY_PAGE, pages - 1)
  const pageRows = DAY_ALL.slice(cur * perPage, cur * perPage + perPage)
  const rowsHtml = pageRows.map((s) => {
    const label = s.title || (s.session || '').replace(/^session-/, '').slice(0, 8) + '…'
    const shown = s.title && s.title.length > 18 ? s.title.slice(0, 18) + '…' : label
    return '<tr><td title="' + (s.title || s.session) + '">' + shown + '</td>' +
      '<td title="' + s.workspace + '">' + ((s.workspace || '').split(/[\\/]/).pop() || '—') + '</td>' +
      '<td class="v">' + fmtFull(s.tokens) + '</td><td class="v">' + s.steps + (s.sessions > 1 ? ' ×' + s.sessions : '') + '</td></tr>'
  }).join('')
  $('#dayDetailBody').innerHTML =
    '<table><tr><th>会话</th><th>工作区</th><th class="v">Token</th><th class="v">调用</th></tr>' +
    (DAY_ALL.length === 0 ? '<tr><td colspan="4" class="skeleton">当天无使用记录</td></tr>' : rowsHtml) +
    '</table>' +
    '<div class="day-pager"><button class="refresh-btn" id="dayPrev" type="button"' + (cur <= 0 ? ' disabled' : '') + '>上一页</button>' +
    '<span class="day-pager-info">第 ' + (cur + 1) + ' / ' + pages + ' 页 · 共 ' + DAY_ALL.length + ' 条</span>' +
    '<button class="refresh-btn" id="dayNext" type="button"' + (cur >= pages - 1 ? ' disabled' : '') + '>下一页</button></div>'
  $('#dayPrev').addEventListener('click', () => { DAY_PAGE = cur - 1; renderDayRows() })
  $('#dayNext').addEventListener('click', () => { DAY_PAGE = cur + 1; renderDayRows() })
}

async function loadDay(date) {
  const box = $('#dayDetail')
  if (!box) return
  box.hidden = false
  DAY_PAGE = 0
  DAY_ALL = []
  $('#dayDetailTitle').textContent = fmtDate(date) + ' Token 明细'
  $('#dayDetailBody').innerHTML = '<div class="skeleton">加载中…</div>'
  try {
    const r = await fetch('/token-stats/api/day?date=' + encodeURIComponent(date), { cache: 'no-store' })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const text = await r.text()
    if (!text.trim().startsWith('{')) {
      // HTML body = the host route is not registered (SPA fallback) — DSH
      // has not been restarted since the endpoint was added.
      throw new Error('后端接口未加载——请重启 DSH 后重试')
    }
    const j = JSON.parse(text)
    DAY_ALL = j.rows || []
    renderDayRows()
  } catch (e) {
    $('#dayDetailBody').innerHTML = '<div class="err">无法读取当日明细：' + e.message + '</div>'
  }
}
$('#dayDetailClose').addEventListener('click', () => {
  $('#dayDetail').hidden = true
})
if (hmBox) {
  hmBox.addEventListener('click', (e) => {
    const cellEl = e.target && e.target.closest ? e.target.closest('.hm-cell[data-date]') : null
    if (cellEl && cellEl.dataset.date) loadDay(cellEl.dataset.date)
  })
}
</script>
</body>
</html>`
}
