# dsh-token-stats

Token usage statistics plugin for DeepSeek Harness (DSH). It parses real provider usage data from DSH session logs (`session.jsonl.zstd`) and provides complete usage statistics inside the Web GUI: cumulative / today / peak tokens, longest chat duration, streak days, and a 12-month activity heatmap (daily / weekly / cumulative), broken down by model and workspace.

## Features

- **Six stat cards**: cumulative tokens, today's tokens (with share-of-total), peak tokens (highest single session), longest chat duration, current / longest streak days; the card grid adapts its column count to the container width (5-6 columns on wide surfaces, fewer in narrow ones) so titles and figures never truncate
- **Activity heatmap**: GitHub-style 7-row calendar grid with daily / weekly / cumulative views and a 12-month / 3-month / 30-day range switch (3 months by default); hover a cell to preview that day's usage, **click a day cell to drill into that day's per-session usage (session titles shown, repeated titles auto-merged, paginated 10 rows per page)**, and export the current window as CSV
- **Consumption breakdown**: input / output / cache read / cache write / reasoning, with full-precision numbers
- **By model / workspace**: per-model and per-workspace token totals
- **Live session badge** in the conversation header: current session token usage; click for a detail dialog (showing the session title, so you can tell which session it is) with a shortcut to the full statistics
- **DeepSeek account balance** in three places: a balance pill (¥) next to the badge; a **dedicated balance dialog** opened by clicking the pill (total / topped-up / granted balance, availability, refresh button, last-updated time); and a balance panel on the full stats page (with its own refresh button). Clicking refresh forces a live query (`?force=1`) with a refreshing state; a 15-minute poll is the baseline. The API key stays in the host process, never sent to the browser
- **Standalone stats page**: `http://127.0.0.1:3080/token-stats` (dark theme, 15-second auto-refresh)

## Data source

All figures come from real provider usage recorded in DSH session logs (`inputTokens` / `outputTokens` / `cacheReadTokens` / `cacheWriteTokens` / `reasoningTokens`) — no estimation, no traffic interception. On startup the plugin replays historical session logs, captures new usage live via `session/event`, and reconciles incrementally every 30 seconds.

Data is stored at `$DSH_HOME/token-stats/usage.jsonl` (`$DSH_HOME` is the DSH data root; it defaults to `~/.dsh` or the `DSH_HOME` environment variable).

## Installation

The plugin mounts through DSH's profile plugin mechanism (managed by `dsh plugin`, the same mechanism as `@liustack/modlens`):

1. Add the dependency and bundle entry in the web profile's `package.json`:

```jsonc
// data/profiles/web/package.json
{
  "dependencies": {
    "dsh-token-stats": "link:../../path/to/dsh-token-stats"   // or file:, or a version once published to npm
  },
  "dsh": {
    "profile": {
      "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-token-stats"]
    }
  }
}
```

2. Run `pnpm install` in the profile directory
3. Restart DSH (exit and relaunch)

## HTTP API

| Endpoint | Description |
|---|---|
| `GET /token-stats/api/stats` | Full stats snapshot (everything the cards / heatmap / breakdowns need) |
| `GET /token-stats/api/balance` | DeepSeek account balance (15-minute cache; `?force=1` to bypass) |
| `GET /token-stats/api/day?date=YYYY-MM-DD` | Per-session usage for one date (heatmap drill-down) |
| `GET /token-stats/api/session/<sessionId>` | Single-session usage summary (used by the badge / dialog) |
| `GET /token-stats` | Standalone stats page (HTML) |

## Package structure

```
dsh-token-stats/
├── package.json          # dsh.bundle.patch (host mount) + dsh.client (browser half)
├── cordis.patch.yml      # plugin loading config
├── dsh/                  # host half: log scanning, aggregation, HTTP routes
│   ├── index.js          # apply(ctx): boot backfill + live capture + routes
│   ├── scan.js           # session-log scanning and usage extraction
│   ├── stats.js          # aggregation (cumulative / peak / heatmap / streaks / today / sessions)
│   ├── zstd.js           # multi-frame zstd decoding (session logs are frame-appended)
│   ├── store.js          # usage.jsonl persistence and migration
│   ├── home.js           # DSH data root resolution
│   └── page.js           # standalone stats page
└── client/               # browser half: settings page + session badge + dialogs
    └── bundle.js         # web shell loader format, hand-written, no build step
```

## License

[MIT](LICENSE)
