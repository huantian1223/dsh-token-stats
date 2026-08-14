// dsh-token-stats client half (hand-authored bundle in the web shell's
// loader format: window.__ModuleLoader__.load({id, factory}) — the same shape
// the first-party client plugins ship). Registers the "Token 统计" page into
// Web Settings (`settings.section`) and polls the host stats API.
window.__ModuleLoader__.load({
  id: 'dsh-token-stats',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')

    //#region styles (scoped .tks-* classes, design tokens from the shell)
    const CSS = `
.tks-page{max-width:940px;color:var(--dsw-alias-label-primary,#e6e9ee);font-size:14px}
.tks-head{display:flex;align-items:baseline;justify-content:space-between;gap:14px;margin-bottom:16px;flex-wrap:wrap}
.tks-title{font-size:17px;font-weight:650;margin:0}
.tks-sub{color:var(--dsw-alias-label-tertiary,#8b95a3);font-size:12px;margin-top:4px}
.tks-live{display:inline-flex;align-items:center;gap:7px;color:var(--dsw-alias-label-tertiary,#8b95a3);font-size:12px;font-variant-numeric:tabular-nums}
.tks-live .tks-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#22c55e);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-success-primary,#22c55e) 18%,transparent)}
.tks-cards{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:18px}
.tks-card{background:var(--dsw-alias-bg-layer-3,#171c22);border:1px solid var(--dsw-alias-border-l2,#262e38);border-radius:12px;padding:14px;min-width:0}
.tks-card .k{font-size:12px;color:var(--dsw-alias-label-tertiary,#8b95a3);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tks-card .v{font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.4px;line-height:1.1}
.tks-card .d{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#8b95a3);margin-top:6px}
.tks-panel{background:var(--dsw-alias-bg-layer-3,#171c22);border:1px solid var(--dsw-alias-border-l2,#262e38);border-radius:12px;padding:16px;margin-bottom:14px}
.tks-panel h2{font-size:14px;margin:0 0 12px;font-weight:600}
.tks-tabs{display:flex;gap:28px;border:0;background:transparent;padding:0;margin-bottom:14px}
.tks-tab{border:0;background:transparent;color:var(--dsw-alias-label-tertiary,#8b95a3);font:inherit;font-size:13px;font-weight:500;line-height:16px;padding:0 0 8px;cursor:pointer;position:relative}
.tks-tab:hover{color:var(--dsw-alias-label-primary,#e6e9ee)}
.tks-tab:after{content:"";background:transparent;border-radius:2px;height:2px;position:absolute;bottom:0;left:0;right:0}
.tks-tab.tks-active{color:var(--dsw-alias-state-business-primary,#4cc2ff)}
.tks-tab.tks-active:after{background:var(--dsw-alias-state-business-primary,#4cc2ff)}
.tks-hm{overflow-x:auto}
.tks-hm-inner{display:inline-block}
.tks-hm-months{display:flex;margin-left:0}
.tks-hm-months span{flex:1 0 0;font-size:11px;color:var(--dsw-alias-label-tertiary,#8b95a3);white-space:nowrap}
.tks-hm-grid{display:flex;gap:3px}
.tks-hm-col{display:flex;flex-direction:column;gap:3px}
.tks-hm-cell{width:12px;height:12px;border-radius:3px;background:var(--dsw-alias-bg-layer-1,#232324);cursor:default}
.tks-tip{position:fixed;z-index:1300;pointer-events:none;opacity:0;transition:opacity .08s ease;background:var(--dsw-specific-menu,#2c2c2e);border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.06));color:var(--dsw-alias-label-primary,#f9fafb);font-size:12px;line-height:18px;padding:5px 9px;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.45);white-space:nowrap;font-variant-numeric:tabular-nums}
.tks-hm-cell.l1{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4cc2ff) 14%,transparent)}.tks-hm-cell.l2{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4cc2ff) 28%,transparent)}.tks-hm-cell.l3{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4cc2ff) 44%,transparent)}.tks-hm-cell.l4{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4cc2ff) 66%,transparent)}.tks-hm-cell.l5{background:var(--dsw-alias-state-business-primary,#4cc2ff)}
.tks-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.tks-table{width:100%;border-collapse:collapse;font-size:13px}
.tks-table th,.tks-table td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l2,#262e38);font-variant-numeric:tabular-nums}
.tks-table th{color:var(--dsw-alias-label-tertiary,#8b95a3);font-weight:500;font-size:12px}
.tks-table td.v,.tks-table th.v{text-align:right;white-space:nowrap}
.tks-err{color:var(--dsw-alias-state-error-primary,#f87171);font-size:13px;padding:12px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary,#f87171) 35%,transparent);border-radius:10px}
.tks-skeleton{color:var(--dsw-alias-label-tertiary,#8b95a3);font-size:13px;padding:26px 0;text-align:center}
.tks-badge{display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;height:32px;color:var(--dsw-alias-label-primary,#e6e9ee);font:var(--dsw-font-xs-13,13px);font-variant-numeric:tabular-nums;background:0 0;border:1px solid var(--dsw-alias-border-l2,#262e38);border-radius:18px;padding:0 12px;cursor:pointer;white-space:nowrap}
.tks-badge:hover{background:var(--dsw-alias-interactive-bg-hover)}
.tks-badge .tks-badge-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-business-primary,#4cc2ff);flex:none}
.tks-badge b{color:var(--dsw-alias-label-primary,#e6e9ee);font-weight:600}
.tks-badge-group{display:inline-flex;align-items:center;gap:6px}
.tks-balance{display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;height:32px;color:var(--dsw-alias-label-primary,#e6e9ee);font:var(--dsw-font-xs-13,13px);font-variant-numeric:tabular-nums;background:0 0;border:1px solid var(--dsw-alias-border-l2,#262e38);border-radius:18px;padding:0 12px;cursor:pointer;white-space:nowrap}
.tks-balance:hover{background:var(--dsw-alias-interactive-bg-hover)}
.tks-balance-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#22c55e);flex:none}
.tks-balance-box{margin-top:14px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l2,#262e38)}
.tks-balance-row{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:12px;line-height:24px;color:var(--dsw-alias-label-secondary,#cfd3d6)}
.tks-balance-row b{color:var(--dsw-alias-label-primary,#f9fafb);font-weight:600;font-variant-numeric:tabular-nums}
.tks-balance-note{font-size:11px;line-height:18px;color:var(--dsw-alias-label-tertiary,#adb2b8);margin-top:6px}
.tks-balance-hero{display:flex;align-items:baseline;gap:10px;margin:2px 0 10px}
.tks-balance-hero-amt{font-size:28px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.5px;color:var(--dsw-alias-label-primary,#f9fafb)}
.tks-balance-hero-status{font-size:12px;color:var(--dsw-alias-state-success-primary,#22c55e)}
.tks-overlay{position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.5);backdrop-filter:blur(3px);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto}
.tks-overlay-panel{background:var(--dsw-alias-bg-layer-2,#151a21);border:1px solid var(--dsw-alias-border-l1,#2c3540);border-radius:12px;box-shadow:0 18px 56px rgba(0,0,0,.5);width:100%;max-width:980px;max-height:calc(100vh - 80px);display:flex;flex-direction:column;overflow:hidden;margin:auto 0}
.tks-overlay-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex:none;padding:16px 20px;border-bottom:1px solid var(--dsw-alias-border-l2,#262e38)}
.tks-overlay-title{font-size:16px;font-weight:500;color:var(--dsw-alias-label-primary,#e6e9ee)}
.tks-overlay-desc{color:var(--dsw-alias-label-tertiary,#8b95a3);font-size:12px;margin-top:3px}
.tks-overlay-close{display:grid;place-items:center;border:0;background:transparent;color:var(--dsw-alias-label-tertiary,#8b95a3);cursor:pointer;width:28px;height:28px;border-radius:999px;flex:none}
.tks-overlay-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary,#e6e9ee)}
.tks-overlay-body{overflow:auto;padding:16px 18px 20px}
.tks-overlay-footer{display:flex;justify-content:flex-end;align-items:center;gap:8px;flex:none;padding:12px 18px;border-top:1px solid var(--dsw-alias-border-l2,#262e38)}
.tks-primary-btn{border:0;cursor:pointer;font:inherit;font-size:13px;font-weight:600;height:34px;border-radius:17px;padding:0 18px;background:var(--dsw-alias-button-primary-fill,#2563eb);color:var(--dsw-alias-label-primary-foreground,#fff)}
.tks-primary-btn:hover{filter:brightness(1.08)}
@media (max-width:860px){.tks-cards{grid-template-columns:repeat(2,1fr)}.tks-grid2{grid-template-columns:1fr}}
`
    const CSS_ID = 'dsh-token-stats/token-stats.css'
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + CSS_ID + '"]') === null) {
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-token-stats'
      tag.dataset.pluginCss = CSS_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
    }
    //#endregion

    //#region formatting + heatmap builders (shared with the /token-stats page)
    const fmt = (n) => {
      if (!Number.isFinite(n)) return '—'
      if (n >= 1e8) return (n % 1e8 === 0 ? (n / 1e8).toFixed(0) : (n / 1e8).toFixed(1)) + '亿'
      if (n >= 1e4) return (n % 1e4 === 0 ? (n / 1e4).toFixed(0) : (n / 1e4).toFixed(1)) + '万'
      return String(Math.round(n))
    }
    /** Full-precision display for detail tables: thousand-separated digits. */
    const fmtFull = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—')
    /** Money display: ¥ for CNY, otherwise the currency code prefix. */
    const fmtMoney = (n, currency) => {
      const v = Number(n ?? 0)
      const s = v.toFixed(2)
      return (currency && currency !== 'CNY' ? currency + ' ' : '¥') + s
    }
    const fmtDur = (ms) => {
      const s = Math.round(ms / 1000)
      if (s < 60) return s + ' 秒'
      const m = Math.floor(s / 60)
      const r = s % 60
      if (m < 60) return m + ' 分 ' + r + ' 秒'
      return Math.floor(m / 60) + ' 小时 ' + (m % 60) + ' 分'
    }
    const fmtDate = (d) => {
      const parts = d.split('-')
      return Number(parts[1]) + '月' + Number(parts[2]) + '日'
    }
    const dayNumOf = (dateStr) => Math.floor(Date.parse(dateStr + 'T12:00:00') / 86400000)
    const dayStr = (num) => {
      const d = new Date(num * 86400000 + 12 * 3600000)
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    }
    const localDayStr = (ts) => {
      const d = new Date(ts)
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    }
    const levelFor = (v, max) => {
      if (!(v > 0) || !(max > 0)) return 0
      if (v === max) return 5
      return Math.max(1, Math.min(5, Math.ceil((Math.log10(v) / Math.log10(max)) * 5)))
    }
    const cell = (lv, tip) => '<div class="tks-hm-cell l' + lv + '" data-tip="' + tip + '"></div>'

    function heatmapHtml(stats, view) {
      const h = stats.heatmap
      // One shared 7-row calendar grid for every view (每日/每周/累计); only
      // the per-cell value and tooltip change, so switching tabs never jumps.
      const byDate = new Map(h.daily.map((d) => [d.date, d]))
      const cumByDate = new Map(h.cumulative.map((d) => [d.date, d.tokens]))
      const startNum = dayNumOf(h.daily[0].date)
      const endNum = dayNumOf(h.daily[h.daily.length - 1].date)
      const first = new Date(startNum * 86400000 + 12 * 3600000)
      const cursor0 = startNum - ((first.getDay() + 6) % 7)
      const mondayOf = (n) => n - ((new Date(n * 86400000 + 12 * 3600000).getDay() + 6) % 7)
      // per-week totals keyed by the week's Monday day number
      const weekTokens = new Map()
      for (const d of h.daily) {
        const mon = mondayOf(dayNumOf(d.date))
        weekTokens.set(mon, (weekTokens.get(mon) ?? 0) + d.tokens)
      }
      const valueOf = (n) => {
        if (view === 'daily') return byDate.get(dayStr(n))?.tokens ?? 0
        if (view === 'weekly') return weekTokens.get(mondayOf(n)) ?? 0
        return cumByDate.get(dayStr(n)) ?? 0
      }
      const tipOf = (n) => {
        const key = dayStr(n)
        const v = valueOf(n)
        if (view === 'daily') {
          const e = byDate.get(key)
          return e
            ? fmtDate(key) + ' 使用了 ' + fmt(v) + '个 Token' + (e.steps > 0 ? '（' + e.steps + ' 次调用）' : '')
            : fmtDate(key) + ' 无使用'
        }
        if (view === 'weekly') return '周 ' + fmtDate(dayStr(mondayOf(n))) + ' 合计 ' + fmt(v) + ' 个 Token'
        return '截至 ' + fmtDate(key) + ' 累计 ' + fmt(v) + ' 个 Token'
      }
      let max
      if (view === 'daily') max = Math.max(1, ...h.daily.map((d) => d.tokens))
      else if (view === 'weekly') max = Math.max(1, ...weekTokens.values())
      else max = Math.max(1, cumByDate.get(dayStr(endNum)) ?? 1)
      const weeks = []
      for (let c = cursor0; c <= endNum; c += 7) {
        const col = []
        for (let i = 0; i < 7; i++) col.push(c + i)
        weeks.push(col)
      }
      let months = ''
      let prev = null
      weeks.forEach((col) => {
        const d = new Date(col[0] * 86400000 + 12 * 3600000)
        const m = d.getMonth()
        months += '<span>' + (m !== prev ? m + 1 + '月' : '') + '</span>'
        prev = m
      })
      let grid = '<div class="tks-hm-grid">'
      weeks.forEach((col) => {
        grid += '<div class="tks-hm-col">'
        col.forEach((n) => {
          const v = valueOf(n)
          grid += cell(levelFor(v, max), tipOf(n))
        })
        grid += '</div>'
      })
      grid += '</div>'
      return '<div class="tks-hm-months">' + months + '</div>' + grid
    }
    //#endregion

    //#region React page
    const NS = 'tokenStats'
    const zh = { tab: 'Token 统计' }
    const en = { tab: 'Token stats' }

    function TokenStatsPage(props) {
      // When embedded in the full-stats dialog the dialog's own title bar
      // already says "Token 使用统计"; hide the in-page heading to avoid the
      // duplicated title (the meta line and live clock stay).
      const hideTitle = props?.hideTitle === true
      const [stats, setStats] = React.useState(null)
      const [view, setView] = React.useState('daily')
      const [err, setErr] = React.useState(null)
      const [updatedAt, setUpdatedAt] = React.useState(null)
      const [balance, setBalance] = React.useState(null)
      const hmRef = React.useRef(null)
      const tipRef = React.useRef(null)
      React.useEffect(() => {
        let alive = true
        const load = async () => {
          try {
            const r = await fetch('/token-stats/api/stats', { cache: 'no-store' })
            if (!r.ok) throw new Error('HTTP ' + r.status)
            const j = await r.json()
            if (!alive) return
            setStats(j)
            setUpdatedAt(j.updatedAt)
            setErr(j.lastError ? '最近一次扫描出错：' + j.lastError : null)
          } catch (e) {
            if (alive) setErr(String(e && e.message ? e.message : e))
          }
        }
        load()
        const t = setInterval(load, 15000)
        return () => {
          alive = false
          clearInterval(t)
        }
      }, [])

      // Custom heatmap hover preview: delegated events on the container so it
      // survives innerHTML swaps on tab changes. Native title tooltips are
      // unreliable here, hence the positioned bubble driven by data-tip.
      // NOTE: this effect must stay above the early returns below — React
      // requires every render to call the same hooks in the same order.
      React.useEffect(() => {
        const box = hmRef.current
        const tip = tipRef.current
        if (!box || !tip) return undefined
        const hide = () => {
          tip.style.opacity = '0'
        }
        const move = (e) => {
          const cell = e.target && e.target.closest ? e.target.closest('.tks-hm-cell') : null
          if (!cell) {
            hide()
            return
          }
          const text = cell.dataset.tip || ''
          if (tip.textContent !== text) tip.textContent = text
          tip.style.opacity = '1'
          const r = tip.getBoundingClientRect()
          let x = e.clientX + 14
          let y = e.clientY + 16
          if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - 14
          if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - 16
          tip.style.left = x + 'px'
          tip.style.top = y + 'px'
        }
        box.addEventListener('mousemove', move)
        box.addEventListener('mouseleave', hide)
        return () => {
          box.removeEventListener('mousemove', move)
          box.removeEventListener('mouseleave', hide)
        }
        // Dep on the loaded flag, NOT []: on first mount stats is still null
        // and the heatmap container does not exist yet (early return), so the
        // refs are null and the listeners would never be attached. The effect
        // must re-run the moment stats loads.
      }, [!!stats])

      // DeepSeek account balance: slow-moving, polled on a long interval.
      // Must stay above the early returns (hooks order stability).
      React.useEffect(() => {
        let alive = true
        const load = async () => {
          try {
            const r = await fetch('/token-stats/api/balance', { cache: 'no-store' })
            if (!r.ok) return
            const j = await r.json()
            if (alive) setBalance(j)
          } catch {
            // next poll retries
          }
        }
        load()
        const t = setInterval(load, 15 * 60 * 1000)
        return () => {
          alive = false
          clearInterval(t)
        }
      }, [])

      const h = React.createElement
      if (err && !stats) return h('div', { className: 'tks-page' }, h('div', { className: 'tks-err' }, '无法读取统计：' + err))
      if (!stats) return h('div', { className: 'tks-page' }, h('div', { className: 'tks-skeleton' }, '正在读取…'))

      const c = stats.cumulative
      const cards = [
        { k: '累计 Token 数', v: fmt(c.total) },
        { k: '今日 Token', v: stats.today ? fmt(stats.today.tokens) : '—', d: stats.today ? '今天 · ' + stats.today.steps + ' 次调用' : '重启后显示' },
        { k: '峰值 Token 数', v: fmt(stats.peak.tokens), d: stats.peak.ts ? '单会话最高 · ' + fmtDate(localDayStr(stats.peak.ts)) : '暂无' },
        { k: '最长聊天时长', v: stats.longestChat.ms > 0 ? fmtDur(stats.longestChat.ms) : '—', d: stats.longestChat.ms > 0 ? '单次连续会话' : '暂无数据' },
        { k: '当前连续天数', v: stats.currentStreak + ' 天', d: stats.currentStreak > 0 ? '今天仍在坚持' : '今天尚未使用' },
        { k: '最长连续天数', v: stats.longestStreak + ' 天', d: '历史最佳' },
      ]
      const cardEls = cards.map((x) =>
        h('div', { className: 'tks-card', key: x.k },
          h('div', { className: 'k' }, x.k),
          h('div', { className: 'v' }, x.v),
          x.d ? h('div', { className: 'd' }, x.d) : null,
        ),
      )
      const breakdownRows = [
        ['输入 (input)', c.input],
        ['输出 (output)', c.output],
        ['缓存读取 (cache read)', c.cacheRead],
        ['缓存写入 (cache write)', c.cacheWrite],
        ['其中推理 (reasoning)', c.reasoning],
      ].map(([k, v]) => h('tr', { key: k }, h('td', null, k), h('td', { className: 'v' }, fmtFull(v))))
      const modelRows = stats.byModel.slice(0, 8).map((m) =>
        h('tr', { key: m.model || '?' }, h('td', null, m.model || '未知'), h('td', { className: 'v' }, fmtFull(m.tokens))),
      )
      const wsRows = stats.byWorkspace.slice(0, 5).map((w) => {
        const name = (w.workspace || '').split(/[\\/]/).pop() || w.workspace
        return h('tr', { key: w.workspace }, h('td', { title: w.workspace }, name), h('td', { className: 'v' }, fmtFull(w.tokens)))
      })

      return h('div', { className: 'tks-page' },
        h('div', { className: 'tks-head' },
          h('div', null,
            hideTitle
              ? null
              : h('div', { className: 'tks-title' }, 'Token 使用统计'),
            h('div', { className: 'tks-sub' },
              stats.sessionCount + ' 个会话 · ' + stats.totalTurns + ' 轮对话 · ' + stats.totalSteps + ' 次模型调用' +
              (stats.activeDays ? ' · ' + stats.activeDays + ' 个活跃日' : ''),
            ),
          ),
          h('div', { className: 'tks-live' },
            h('span', { className: 'tks-dot' }),
            h('span', null, updatedAt ? '更新于 ' + new Date(updatedAt).toLocaleTimeString('zh-CN', { hour12: false }) : '连接中'),
          ),
        ),
        h('div', { className: 'tks-cards' }, cardEls),
        h('div', { className: 'tks-panel' },
          h('h2', null, 'Token 活动'),
          h('div', { className: 'tks-tabs' },
            ['daily', 'weekly', 'cumulative'].map((v) =>
              h('button', {
                key: v,
                className: 'tks-tab' + (view === v ? ' tks-active' : ''),
                onClick: () => setView(v),
              }, { daily: '每日', weekly: '每周', cumulative: '累计' }[v]),
            ),
          ),
          h('div', { className: 'tks-hm', ref: hmRef },
            h('div', { className: 'tks-hm-inner', dangerouslySetInnerHTML: { __html: heatmapHtml(stats, view) } }),
          ),
          h('div', { className: 'tks-tip', ref: tipRef }),
          err ? h('div', { className: 'tks-err', style: { marginTop: 12 } }, err) : null,
        ),
        h('div', { className: 'tks-grid2' },
          h('div', { className: 'tks-panel' },
            h('h2', null, '消耗构成'),
            h('table', { className: 'tks-table' }, h('tbody', null, breakdownRows)),
          ),
          h('div', { className: 'tks-panel' },
            h('h2', null, '按模型 / 工作区'),
            h('table', { className: 'tks-table' },
              h('tbody', null,
                h('tr', null, h('th', null, '模型'), h('th', { className: 'v' }, 'Token')),
                modelRows,
                h('tr', null, h('td', { colSpan: 2, style: { height: 8, border: 0 } })),
                h('tr', null, h('th', null, '工作区'), h('th', { className: 'v' }, 'Token')),
                wsRows,
              ),
            ),
          ),
        ),
        balance && balance.ok
          ? h('div', { className: 'tks-panel' },
            h('h2', null, 'DeepSeek 余额'),
            h('div', { className: 'tks-balance-hero' },
              h('span', { className: 'tks-balance-hero-amt' }, fmtMoney(balance.total, balance.currency)),
              h('span', { className: 'tks-balance-hero-status' }, balance.isAvailable ? '可用' : '不可用'),
            ),
            h('div', { className: 'tks-balance-row' },
              h('span', null, '充值余额'),
              h('span', null, fmtMoney(balance.toppedUp, balance.currency)),
            ),
            h('div', { className: 'tks-balance-row' },
              h('span', null, '赠送余额'),
              h('span', null, fmtMoney(balance.granted, balance.currency)),
            ),
            h('div', { className: 'tks-balance-note' },
              '数据来自 DeepSeek 开放平台 /user/balance，15 分钟缓存',
            ),
          )
          : null,
      )
    }

    const inject = ['slots', 'locale']

    /** Minimal in-GUI overlay panel (mask + centered card). Styled entirely
     * by this bundle's own CSS so it never depends on the shell's modal
     * chrome. Escape and mask click close; inner clicks are contained. */
    function TksOverlay(props) {
      const { open, onClose, title, description, children, footer, width } = props
      const h = React.createElement
      React.useEffect(() => {
        if (!open) return undefined
        const onKey = (e) => {
          if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [open, onClose])
      if (!open) return null
      return h('div', { className: 'tks-overlay', onClick: onClose },
        h('div', {
          className: 'tks-overlay-panel',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': title,
          style: typeof width === 'number' ? { maxWidth: width } : undefined,
          onClick: (e) => e.stopPropagation(),
        },
          h('div', { className: 'tks-overlay-head' },
            h('div', null,
              h('div', { className: 'tks-overlay-title' }, title),
              description ? h('div', { className: 'tks-overlay-desc' }, description) : null,
            ),
            h('button', {
              type: 'button',
              className: 'tks-overlay-close',
              'aria-label': '关闭',
              onClick: onClose,
            },
              h('svg', {
                width: 16,
                height: 16,
                viewBox: '0 0 16 16',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 1.5,
                strokeLinecap: 'round',
                'aria-hidden': 'true',
              },
                h('path', { d: 'M4 4l8 8M12 4l-8 8' }),
              ),
            ),
          ),
          h('div', { className: 'tks-overlay-body' }, children),
          footer ? h('div', { className: 'tks-overlay-footer' }, footer) : null,
        ),
      )
    }

    /** Live per-session usage badge in the conversation header utilities.
     * Clicking it opens an in-GUI panel with this session's breakdown; the
     * panel's "打开完整统计" opens the full stats page in another in-GUI
     * panel (no tab navigation). */
    function TokenBadge(props) {
      const sessionId = props?.sessionId
      const [info, setInfo] = React.useState(null)
      const [balance, setBalance] = React.useState(null)
      const [open, setOpen] = React.useState(false)
      const [fullOpen, setFullOpen] = React.useState(false)
      React.useEffect(() => {
        if (!sessionId) return undefined
        let alive = true
        const load = async () => {
          try {
            const r = await fetch('/token-stats/api/session/' + encodeURIComponent(String(sessionId)), { cache: 'no-store' })
            if (!r.ok) return
            const j = await r.json()
            if (alive && j && j.tokens) setInfo(j)
          } catch {
            // transient; next poll retries
          }
        }
        load()
        const t = setInterval(load, 10000)
        return () => {
          alive = false
          clearInterval(t)
        }
      }, [sessionId])
      // DeepSeek account balance: slow-moving, polled on a long interval.
      React.useEffect(() => {
        let alive = true
        const load = async () => {
          try {
            const r = await fetch('/token-stats/api/balance', { cache: 'no-store' })
            if (!r.ok) return
            const j = await r.json()
            if (alive) setBalance(j)
          } catch {
            // next poll retries
          }
        }
        load()
        const t = setInterval(load, 15 * 60 * 1000)
        return () => {
          alive = false
          clearInterval(t)
        }
      }, [])
      const h = React.createElement
      const total = info?.tokens?.total ?? 0
      if (!info || total <= 0) return null
      const tk = info.tokens
      const tip =
        '本会话 Token\n输入 ' + fmt(tk.input) +
        ' · 输出 ' + fmt(tk.output) +
        ' · 缓存读 ' + fmt(tk.cacheRead) +
        ' · 推理 ' + fmt(tk.reasoning) +
        '\n' + info.steps + ' 次调用 · ' + info.turns + ' 轮' +
        (info.byModel && info.byModel.length > 0 ? '\n模型：' + info.byModel.map((m) => m.model).join(', ') : '')
      const breakdownRows = [
        ['总计', fmtFull(tk.total)],
        ['输入 (input)', fmtFull(tk.input)],
        ['输出 (output)', fmtFull(tk.output)],
        ['缓存读取 (cache read)', fmtFull(tk.cacheRead)],
        ['缓存写入 (cache write)', fmtFull(tk.cacheWrite)],
        ['其中推理 (reasoning)', fmtFull(tk.reasoning)],
      ].map(([k, v]) => h('tr', { key: k }, h('td', null, k), h('td', { className: 'v' }, v)))
      const modelRows = (info.byModel || []).map((m) =>
        h('tr', { key: m.model || '?' }, h('td', null, m.model || '未知'), h('td', { className: 'v' }, fmtFull(m.tokens))),
      )
      const shortId = String(sessionId).replace(/^session-/, '').slice(0, 8)
      const openFull = () => {
        setOpen(false)
        setFullOpen(true)
      }
      const balanceTip =
        balance && balance.ok
          ? 'DeepSeek 余额' +
            '\n总余额 ' + fmtMoney(balance.total, balance.currency) +
            '\n充值 ' + fmtMoney(balance.toppedUp, balance.currency) +
            '\n赠送 ' + fmtMoney(balance.granted, balance.currency) +
            (balance.isAvailable ? '' : '\n当前不可用')
          : null
      return h(React.Fragment, null,
        h('div', { className: 'tks-badge-group' },
          h('button', {
            type: 'button',
            className: 'tks-badge',
            title: tip,
            onClick: () => setOpen(true),
          },
            h('span', { className: 'tks-badge-dot' }),
            h('span', null, '本会话 '),
            h('b', null, fmt(total)),
          ),
          balance && balance.ok
            ? h('button', {
              type: 'button',
              className: 'tks-balance',
              title: balanceTip,
              onClick: () => setOpen(true),
            },
              h('span', { className: 'tks-balance-dot' }),
              h('span', null, fmtMoney(balance.total, balance.currency)),
            )
            : null,
        ),
        h(TksOverlay, {
          open,
          onClose: () => setOpen(false),
          title: '本会话 Token',
          description: '会话 ' + shortId + '… · ' + info.steps + ' 次调用 · ' + info.turns + ' 轮',
          width: 440,
          footer: h('button', { type: 'button', className: 'tks-primary-btn', onClick: openFull }, '打开完整统计'),
        },
          h('table', { className: 'tks-table' },
            h('tbody', null,
              breakdownRows,
              modelRows.length > 0 ? h('tr', null, h('td', { colSpan: 2, style: { height: 8, border: 0 } })) : null,
              h('tr', null, h('th', null, '模型'), h('th', { className: 'v' }, 'Token')),
              modelRows,
            ),
          ),
          balance && balance.ok
            ? h('div', { className: 'tks-balance-box' },
              h('div', { className: 'tks-balance-row' },
                h('span', null, 'DeepSeek 余额'),
                h('b', null, fmtMoney(balance.total, balance.currency)),
              ),
              h('div', { className: 'tks-balance-row' },
                h('span', null, '其中充值'),
                h('span', null, fmtMoney(balance.toppedUp, balance.currency)),
              ),
              h('div', { className: 'tks-balance-row' },
                h('span', null, '其中赠送'),
                h('span', null, fmtMoney(balance.granted, balance.currency)),
              ),
              h('div', { className: 'tks-balance-note' },
                balance.isAvailable ? '可用，可正常调用' : '当前不可用（余额不足或账户受限）',
              ),
            )
            : null,
        ),
        h(TksOverlay, {
          open: fullOpen,
          onClose: () => setFullOpen(false),
          title: 'Token 使用统计',
          width: 980,
        },
          h(TokenStatsPage, { hideTitle: true }),
        ),
      )
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'token-stats: dictionaries')
      const t = ctx.locale.bind(NS)
      ctx.slots.inject('settings.section', () =>
        ctx.slots.register({
          name: 'settings.section',
          id: 'token-stats',
          order: 60,
          label: () => t('tab'),
          locale: NS,
        }, TokenStatsPage),
      )
      // The header badge is an enhancement: if the conversation slot ever
      // changes shape, keep the stats page alive instead of failing the fiber.
      try {
        ctx.slots.inject('conversation.session.header.utilities', () =>
          ctx.slots.register({
            name: 'conversation.session.header.utilities',
            id: 'token-stats-badge',
            locale: NS,
          }, TokenBadge),
        )
      } catch (error) {
        console.error('[token-stats] header badge registration skipped:', error)
      }
    }
    //#endregion

    exports.name = 'token-stats'
    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
