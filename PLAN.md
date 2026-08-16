# dsh-global-memory 实现计划

> 面向 DSH Agent 的跨会话全局记忆插件。数据仅存本机 `$DSH_HOME/memory/`，不进入任何业务仓库。

## 1. 项目定位

- 包名：`@dsh-external/dsh-global-memory`
- 仓库目录：`D:\workbench\projects\dsh-global-memory`（与 `dsh-desktop` 同级）
- 插件形态：toolkit（工具包）
- 运行位置：host 平面，装配到 profile 后对所有会话可用
- 数据位置：`$DSH_HOME/memory/`（默认 `~/.dsh/memory/`）

## 2. 核心原则

1. **会话开始自动注入条目级索引，不注入全文**：会话开始后，插件向上下文自动注入一次全部记忆的轻量索引（按分类分组，列出 key 与 tags）；记忆全文只有在模型主动 `memory_recall(key)` 时，作为当轮工具结果返回，不持久注入。
2. **显式写入**：不自动记录对话内容；只有用户明确要求“帮我记一下”，或模型判断这是应当全局保存的信息时，才调用 `memory_save` 落盘。
3. **模型自行查阅**：用户不负责要求模型 recall；模型在工作过程中发现记忆里可能有相关内容时，自行调用 `memory_recall(key)` 或 `memory_search` 查阅。
4. **索引快照按路径区分刷新策略**：工具路径的 `memory_save` / `memory_delete` 只更新 `index.json` 持久化数据，不刷新模型当前上下文中的索引快照（模型刚保存或删除的内容，其本身已在当前上下文中，无需再更新索引）；用户命令路径的 `/memory_save` / `/memory_delete` 落盘后清除该会话的索引缓存，使下一次模型活动（pre-step）自动注入更新后的索引（仅 key+tags，不含 content）。新会话开始时自然看到新索引。
5. **本机私有**：记忆文件只在 `$DSH_HOME` 下，永远不进 git 仓库，也不会上传到远端。
6. **简单可靠**：文件级存储，单文件单记忆，原子写入；不用数据库。
7. **安全边界**：key/category 做白名单校验，内容限制大小，路径防穿越。

## 3. 数据模型

目录结构：

```
$DSH_HOME/memory/
  index.json                  # 索引缓存，可由 m*.json 重建
  m0001_dev-env-proxy.json
  m0002_git-commit-sop.json
```

- 文件名：`m<NNNN>_<key>.json`，4 位编号从 `0001` 递增，删除后不回收；覆盖已有 key 时复用原编号。
- `index.json`：`{ "version": 1, "nextId": 4, "items": [ { "id", "key", "category", "summary", "tags", "updated" } ] }`

单个记忆文件内容：

```json
{
  "key": "dev-env-proxy",
  "category": "dev-env",
  "content": "git push 走本机代理 127.0.0.1:10809 ...",
  "summary": "git 网络不稳时使用本机 VPN 代理",
  "tags": ["network", "local"],
  "created": "2026-08-17T00:00:00.000Z",
  "updated": "2026-08-17T00:00:00.000Z"
}
```

规则：

- `key`：仅允许 `[a-zA-Z0-9_-]`，长度 1–64；非法字符拒绝或安全化处理。
- `category`：由模型在 `memory_save` 时自行总结，仅允许 `[a-zA-Z0-9_-]`，长度 1–32。
- `content`：UTF-8 文本，单条上限 256 KB。
- `summary`：可选一句话摘要；缺省自动截取 content 首行或前 80 字。用于 `memory_search` 结果展示，不进入自动注入的索引。
- `tags`：可选字符串数组，单 tag 长度 ≤ 32。
- 时间字段由插件写入，调用方不可伪造。

## 4. 工具与自动注入设计

### 4.1 会话开始自动注入条目级索引

- 使用 `ctx.systemPrompt.context` 注册动态上下文：`name: "memory:index"`, `order: 150`。
- 快照作为 user-role 运行时上下文进入会话历史，位于 **system prompt + tools 之后**（中后段，不抢前段）。
- 每会话首 step 注入一次；按 session 缓存渲染结果。**工具路径的 save/delete 不刷新该快照；命令路径的 save/delete 清除 session 缓存，使下一次 pre-step 注入更新后的索引。**
- 注入的是全部记忆的**轻量索引（key + tags，按分类分组）**，不含 summary、日期和全文。示例：

```text
[global memory] 12 条记忆。需要时 memory_recall(key=...) 查全文；不确定 key 用 memory_search。
- dev-env (4) #network #proxy
  - dev-env-proxy
  - toolchain
  - ssh-config
  - build-env
- git (5) #commit #branch
  - commit-sop
  - branch-strategy
  - merge-conflict
  - release-flow
  - pr-template
- general (3) #meeting #notes
  - weekly-meeting
  - daily-standup
  - reading-notes
```

- 分类 ≤ 30 个全列；超过后按条目数/最近更新排序，列前 20 个分类，并提示“其余 N 个分类的 key 可用 memory_search 检索”。

### 4.2 工具

| 工具名 | 参数 | 行为 |
|---|---|---|
| `memory_save` | `key*`, `category*`, `content*`, `summary?`, `tags?` | 创建或覆盖一条记忆，返回保存状态；只更新 `index.json`，不刷新模型当前上下文中的索引快照 |
| `memory_recall` | `key*` | 按 key 返回该条完整内容；仅在当轮作为工具结果返回，用完即止 |
| `memory_search` | `query*`, `category?`, `tag?`, `limit?` | 对 key/content/tags 做大小写不敏感子串搜索，返回带 summary 的结果 |
| `memory_delete` | `key*` | 删除一条记忆；只更新 `index.json`，不刷新模型当前上下文中的索引快照 |

说明：

- `memory_recall` 只负责“按 key 取全文”，不再承担“列出当前有哪些记忆”的职责——后者由会话开始自动注入的索引完成。
- 所有 `memory_*` 工具都不在会话开始时自动注入内容，只有模型主动调用时才产生当轮工具结果。

### 4.3 用户 slash 命令

- 使用 `ctx.commands.register` 注册用户命令；命令在 UI 命令面执行，**内容不经过 LLM**，结果只显示在 UI，不进模型历史、不占 token。
- v1 注册两个命令：

| 命令 | 语法 | 行为 |
|---|---|---|
| `/memory_save` | `/memory_save <key> <content...>` | 第一个词为 key，其余为 content；category 默认 `general`，summary 自动截取；直接落盘 |
| `/memory_delete` | `/memory_delete <key>` | 直接删除一条记忆 |

- 命令与工具共用同一套 `store.ts` 读写逻辑，保证行为一致。
- 命令保存/删除后，清除该会话的索引快照缓存；模型下一次活动（pre-step）时自动注入更新后的索引，且只含 key+tags，不含 content。

## 5. 实现步骤

### Step 1 · 工作区初始化

- `git init`，创建独立仓库
- 生成 scaffold：`dev_scaffold_plugin`（toolkit 形态）
- 补齐 `README.md`、`.gitignore`、`tsconfig.json`、`package.json`

### Step 2 · 核心存储模块 `src/store.ts`

实现：

- `resolveMemoryDir(env)`：读取 `DSH_HOME`，拼接 `memory/`
- `safeKey(raw)` / `safeCategory(raw)`：白名单校验与安全化
- `loadIndex(dir)` / `rebuildIndex(dir)`：读取索引；缺失或损坏时从 `m*.json` 重建
- `saveMemory(record)`：原子写入记忆文件（temp + rename），同步更新 `index.json`
- `readMemory(key)`：读取单条完整记忆
- `searchMemories(query, options)`：返回带 summary 的搜索结果
- `deleteMemory(key)`：删除并同步更新索引
- `renderMemoryIndex()`：渲染条目级轻量索引（按分类分组，只含 key 与 tags，含分类折叠策略）
- 全部返回可 JSON 化的结果对象

### Step 3 · 工具注册 `src/index.ts`

- 注入 `tools` 服务
- 用 `ctx.effect` 注册 4 个 `memory_*` 工具：`memory_save` / `memory_recall` / `memory_search` / `memory_delete`
- 注入 `commands` 服务，注册 `/memory_save` 与 `/memory_delete` 用户命令；命令直接落盘，不经 LLM，结果不进模型历史
- 用 `ctx.systemPrompt.context` 注册 `memory:index`（order 150），每会话首 step 自动注入一次；渲染结果按 session 缓存；工具路径不刷新，命令路径清除缓存后于下一次 pre-step 刷新
- 工具 `description` 保持短句，详细说明放 README 或静态引导文本
- `output` 统一返回结构化文本，便于 agent 阅读

### Step 4 · 构建与类型检查

- `npm run typecheck`
- `dev_build_plugin` 生成 `lib/`

### Step 5 · 单元测试

- 用 `node:test` 覆盖存储模块：
  - key/category 安全化 / 非法 key
  - save/recall/search/delete 往返
  - search 命中与未命中
  - 原子写入不丢数据（模拟临时目录）
  - 内容大小限制
  - 索引缺失时从文件重建
  - `renderMemoryIndex()` 分组与分类折叠
- 测试使用临时 `DSH_HOME`，不污染真实环境

### Step 6 · 本地装配与冒烟测试

- `dev_inject_plugin` 注入到当前 profile
- 验证：
  - `dev_plugin_status` 显示 `dsh-global-memory` active
  - 新会话首个 step 自动注入条目级索引（含 key，不含全文）
  - `memory_save` 写入一条测试记忆后，模型当前上下文中的索引快照不刷新，但 `index.json` 已更新
  - `memory_recall(key=...)` 按需读到全文
  - `memory_search` 能搜到
  - `memory_delete` 删除后 `index.json` 无该条
  - `/memory_save <key> <content>` 命令直接落盘，不进模型历史；清除该会话索引缓存，下一次 pre-step 注入更新后的索引
  - `/memory_delete <key>` 命令删除后 `index.json` 无该条；同样清除该会话索引缓存
- 测试数据放在临时 `DSH_HOME` 下，验证后清理

### Step 7 · 文档

- README：用途、安装、工具参数、数据位置、隐私说明
- 明确写入：该插件只做显式记忆，不自动采集对话；会话开始只注入轻量索引，不注入全文

## 6. 后续可扩展（v2+）

- `memory_append`：追加到已有记忆
- 相似度检索：在合适的时机自动检索并注入相关记忆全文（需重新评估上下文策略）
- 多级目录索引 / 分类独立索引
- 时间范围过滤、按 tag 过滤
- 记忆过期 / 归档
- 可选加密
- 可选自动总结会话写入长期记忆（默认关闭）

## 7. 发布方式

- 内部使用：`dev_build_plugin` + `dev_inject_plugin` / `dsh plugin add`
- 若公开：独立 GitHub 仓库 + GitHub Actions 构建，发布 tgz 到 Release；不进 `dsh-desktop` 仓库

## 8. 当前状态

- [x] 项目目录创建
- [x] 实现计划写入
- [ ] 工作区初始化（git init + scaffold）
- [ ] 核心存储模块
- [ ] 工具注册与索引注入
- [ ] 构建与类型检查
- [ ] 单元测试
- [ ] 本地装配与冒烟测试
- [ ] README 文档
