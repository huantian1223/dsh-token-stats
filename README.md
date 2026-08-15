# dsh-token-stats

[English](README.en.md) | 中文

DeepSeek Harness（DSH）的 Token 用量统计插件。直接解析 DSH 会话日志（`session.jsonl.zstd`）中的真实 provider usage 数据，在 Web GUI 内提供完整的用量统计：累计/今日/峰值 Token、最长聊天时长、连续使用天数，以及 12 个月的活动热力图（每日/每周/累计），并按模型、工作区拆分明细。

![Token 使用统计](docs/screenshot.png)

## 功能

### 统计卡片（6 张，3×2 布局）

页面顶部以 3 列 × 2 行对称展示六项核心指标，窄屏自动降为 2 列：

| 卡片 | 含义 |
|---|---|
| 累计 Token 数 | 输入 + 输出 + 缓存读取 + 缓存写入 的全量累计 |
| 今日 Token | 今天截至当前的用量，副标题含调用次数与**占累计比例** |
| 峰值 Token 数 | 单个会话的最高消耗，标注发生日期 |
| 最长聊天时长 | 单次连续会话的最长时长（会话按 30 分钟无活动切分） |
| 当前连续天数 | 从今天（或昨天）往前连续有使用的天数 |
| 最长连续天数 | 历史最长连续使用记录 |

「活跃日」定义：当天有任何 token 消耗即算活跃。

### Token 活动热力图

GitHub 风格的 7 行日历网格（周一至周日），滚动 12 个月窗口，两个维度可自由组合：

- **三种视图**：
  - **每日**：每个格子 = 当天用量
  - **每周**：每个格子 = 所在周的合计（整列 7 格同色，一眼看出"这一周有活动"）
  - **累计**：每个格子 = 截至当天的累计值（左暗右亮，形成递增渐变）
- **时间范围**：12个月 / 3个月 / 30天 切换，默认 3 个月（数据稀疏时日历不至于大片空白）
- **悬停预览**：气泡显示「8月13日 使用了 6391.7万个 Token（58 次调用）」，空格子显示「无使用」
- **点击下钻**：在每日视图点击任意日期格子，弹出当日明细弹窗——列出当天各会话的 Token 与调用次数，**显示会话标题**（一眼认出是哪个会话），重复标题的多个会话**自动合并**并标注 ×N，超过 10 条自动**分页**；弹窗打开时可点其他日期直接切换
- **导出 CSV**：一键导出当前范围的按日数据（日期 / Token / 调用次数），带 UTF-8 BOM，Excel 打开不乱码

### 消耗构成

输入 / 输出 / 缓存读取 / 缓存写入 / 推理 五项明细，**完整精确数字**（千分位），不做万/亿简写——查具体数值时一目了然。（缓存读取为 DeepSeek 前缀缓存命中，通常占比极高但计费远低于输入。）

### 按模型 / 工作区

各模型、各工作区的消耗排名，完整精确数字；可一眼看出消耗集中在哪个模型、哪个项目目录。

### 会话头部实时角标

对话界面标题栏右侧常驻两个胶囊：

- **本会话 X**：当前会话已用 Token，10 秒轮询刷新；点击弹出本会话明细（总计/输入/输出/缓存/推理 + 按模型拆分 + **会话标题**），底部可一键打开完整统计
- **¥余额**：DeepSeek 账户余额，15 分钟轮询；点击即**强制刷新余额**并打开独立余额弹窗

### DeepSeek 账户余额

余额共三处显示，语义各归其位：

1. **角标余额胶囊**：会话标题栏右侧，随时可见
2. **独立余额弹窗**：点击胶囊打开——大金额 + 可用状态、充值/赠送明细、**刷新余额**按钮、数据来源与更新时间
3. **完整统计页余额面板**：热力图下方通栏，含刷新按钮

刷新行为：点击刷新走 `?force=1` 强制查询 DeepSeek 开放平台（`/user/balance`），按钮带「刷新中…」反馈；平时 15 分钟自动轮询；请求失败时回退到上次缓存值，不闪断。**API Key 通过 DSH 凭证服务解析，仅在 host 进程内使用，绝不下发浏览器**。

**余额预警**：当余额低于配置阈值（默认 ¥5，`balanceWarnThreshold` 可调，0 关闭）时——角标余额胶囊的圆点变红、余额弹窗与统计页面板的状态改为红色「余额不足」并提示充值，防止余额耗尽导致调用静默失败。

### 独立统计页

`http://127.0.0.1:3080/token-stats`：与 GUI 内完整统计同款的深色页面（不依赖 GUI 也能直接访问），15 秒自动刷新，热力图/余额/明细/导出/下钻功能齐全。

## 数据来源

所有数字均来自 DSH 会话日志中记录的真实 provider usage（`inputTokens` / `outputTokens` / `cacheReadTokens` / `cacheWriteTokens` / `reasoningTokens`），不估算、不抓包。插件在启动时回放历史会话日志，并通过 `session/event` 实时捕获新用量，30 秒增量复核。

数据存储于 `$DSH_HOME/token-stats/usage.jsonl`（`$DSH_HOME` 即 DSH 数据根目录，默认 `~/.dsh`，也可通过 `DSH_HOME` 环境变量指定）。

## 配置

插件的可调参数通过 `$DSH_HOME/token-stats/config.json` 覆盖（默认值如下，缺省即用默认）：

```json
{
  "gapMs": 1800000,
  "rescanIntervalMs": 30000,
  "balanceCacheMs": 900000,
  "windowMonths": 12,
  "defaultRange": "3m",
  "balanceWarnThreshold": 5
}
```

| 键 | 默认 | 说明 |
|---|---|---|
| `gapMs` | 1800000（30 分钟） | 会话切分为"单次连续聊天"的空闲阈值 |
| `rescanIntervalMs` | 30000（30 秒） | 会话日志增量复核周期 |
| `balanceCacheMs` | 900000（15 分钟） | 余额查询缓存时长 |
| `windowMonths` | 12 | 热力图完整时间窗口（月） |
| `defaultRange` | `3m` | 热力图默认显示范围（`12m`/`3m`/`30d`） |
| `balanceWarnThreshold` | 5（¥） | 余额低于该值触发红色预警（0 关闭） |

修改后重启 DSH 生效；当前生效配置可在 `GET /token-stats/api/config` 查看。

## 测试

```bash
pnpm test
```

vitest 测试覆盖 zstd 多帧解码、日志解析、聚合统计、存储去重/合并、配置合并与余额服务（24 个用例，构造数据、不依赖真实日志）。

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
| `GET /token-stats/api/balance` | DeepSeek 账户余额（15 分钟缓存，`?force=1` 强制刷新） |
| `GET /token-stats/api/day?date=YYYY-MM-DD` | 指定日期的按会话用量明细（热力图下钻） |
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
