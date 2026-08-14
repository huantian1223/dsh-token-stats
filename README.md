# dsh-token-stats

DeepSeek Harness（DSH）的 Token 用量统计插件。直接解析 DSH 会话日志（`session.jsonl.zstd`）中的真实 provider usage 数据，在 Web GUI 内提供完整的用量统计：累计/今日/峰值 Token、最长聊天时长、连续使用天数，以及 12 个月的活动热力图（每日/每周/累计），并按模型、工作区拆分明细。

## 功能

- **六张统计卡片**：累计 Token 数、今日 Token、峰值 Token（单会话最高）、最长聊天时长、当前/最长连续天数
- **Token 活动热力图**：GitHub 风格 7 行日历网格，支持 每日 / 每周 / 累计 三种视图，悬停显示当天用量
- **消耗构成**：输入 / 输出 / 缓存读取 / 缓存写入 / 推理，完整精确数字
- **按模型 / 工作区**：各模型、各工作区消耗拆分
- **会话头部实时角标**：当前会话已用 Token，点击弹出本会话明细，可一键打开完整统计
- **独立统计页**：`http://127.0.0.1:3080/token-stats`（深色主题，15 秒自动刷新）

## 数据来源

所有数字均来自 DSH 会话日志中记录的真实 provider usage（`inputTokens` / `outputTokens` / `cacheReadTokens` / `cacheWriteTokens` / `reasoningTokens`），不估算、不抓包。插件在启动时回放历史会话日志，并通过 `session/event` 实时捕获新用量，30 秒增量复核。

数据存储于 `$DSH_HOME/token-stats/usage.jsonl`（`$DSH_HOME` 即 DSH 数据根目录，默认 `~/.dsh`，也可通过 `DSH_HOME` 环境变量指定）。

## 安装

插件通过 DSH 的 profile 插件机制安装（`dsh plugin` 管理，与 `@liustack/modlens` 同机制）：

1. 在 web profile 的 `package.json` 添加依赖并加入 bundles 列表：

```jsonc
// data/profiles/web/package.json
{
  "dependencies": {
    "dsh-token-stats": "link:../../路径/dsh-token-stats"   // 或 file: 或发布到 npm 后直接写版本号
  },
  "dsh": {
    "profile": {
      "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-token-stats"]
    }
  }
}
```

2. 在 profile 目录执行 `pnpm install`
3. 重启 DSH（退出 → 启动）

## HTTP API

| 端点 | 说明 |
|---|---|
| `GET /token-stats/api/stats` | 完整统计快照（卡片/热力图/明细所需全部数据） |
| `GET /token-stats/api/session/<sessionId>` | 单个会话的用量摘要（角标/弹窗用） |
| `GET /token-stats` | 独立统计页（HTML） |

## 包结构

```
dsh-token-stats/
├── package.json          # dsh.bundle.patch（host 挂载）+ dsh.client（浏览器半）
├── cordis.patch.yml      # 插件装载配置
├── dsh/                  # host 半：日志扫描、聚合、HTTP 路由
│   ├── index.js          # apply(ctx)：启动回填 + 实时捕获 + 路由
│   ├── scan.js           # 会话日志扫描与 usage 抽取
│   ├── stats.js          # 聚合（累计/峰值/热力图/连续天数/今日/会话）
│   ├── zstd.js           # 多帧 zstd 解码（会话日志为逐帧追加压缩）
│   ├── store.js          # usage.jsonl 持久化与迁移
│   ├── home.js           # DSH 数据根目录解析
│   └── page.js           # 独立统计页
└── client/               # 浏览器半：设置页 + 会话角标 + 弹窗
    └── bundle.js         # web shell loader 格式，手写无构建步骤
```

## 许可

[MIT](LICENSE)
