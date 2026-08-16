<!-- MODULE: memory-store -->
<!-- MODULE_GROUP: - -->
<!-- INVOLVED_CHAINS: - -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-08-17 -->
<!-- ANALYZER_VERSION: 1.6 -->

# 记忆存储模块（memory-store）

> 负责跨会话全局记忆的文件级持久化：`$DSH_HOME/memory/` 下 `m<NNNN>_<key>.json` 单文件单记忆 + `index.json` 索引缓存，原子写入，不用数据库。
>
> **档案层级说明**（v1.9 新增）：
>
> - `MODULE_GROUP` = 所属大模块 Group ID；顶层单模块填 `-`
> - `INVOLVED_CHAINS` = 本模块参与的调用链 slug（英文逗号分隔），由 16 号 Step 6.7 反向索引自动维护；无涉及链路填 `-`

---

## 功能概述

<!-- CONTENT_START: overview -->

- `src/store.ts` 提供全部存储能力：`resolveMemoryDir` / `safeKey` / `safeCategory` / `loadIndex` / `rebuildIndex` / `saveMemory` / `readMemory` / `searchMemories` / `deleteMemory` / `renderMemoryIndex`
- 数据仅存本机 `$DSH_HOME/memory/`（默认 `~/.dsh/memory/`），不进入业务仓库
- 原子写入：temp 文件 + rename；`index.json` 缺失/损坏时从 `m*.json` 重建

<!-- CONTENT_END: overview -->

---

## 入口点（Entry Points）

<!-- CONTENT_START: entry_points -->

| 类型     | 入口标识            | 触发函数 | 说明                         |
| -------- | ------------------- | -------- | ---------------------------- |
| 内部函数 | `saveMemory`        | 同名     | 创建/覆盖一条记忆并更新索引  |
| 内部函数 | `readMemory`        | 同名     | 按 key 读取完整记忆          |
| 内部函数 | `searchMemories`    | 同名     | 大小写不敏感子串搜索         |
| 内部函数 | `deleteMemory`      | 同名     | 删除记忆并更新索引           |
| 内部函数 | `renderMemoryIndex` | 同名     | 渲染会话注入的条目级轻量索引 |

<!-- CONTENT_END: entry_points -->

---

## 数据流向

<!-- CONTENT_START: data_flow -->

`memory_save`/`/memory_save` → `saveMemory` → 写 `m<NNNN>_<key>.json`（原子）→ 更新 `index.json`（原子）→ 后续会话首 step 由 `renderMemoryIndex` 读取 `index.json` 注入模型上下文。

<!-- CONTENT_END: data_flow -->

---

## 核心接口

<!-- CONTENT_START: core_interfaces -->

- `saveMemory(dir, input): Promise<SaveMemoryResult>`
- `readMemory(dir, key): Promise<MemoryRecord | null>`
- `searchMemories(dir, query, options): Promise<SearchResult>`
- `deleteMemory(dir, key): Promise<{ ok: true; key: string }>`
- `loadIndex(dir)` / `loadIndexSync(dir)`：索引读取与重建
- `renderMemoryIndex(index): string`

<!-- CONTENT_END: core_interfaces -->

---

## 上游依赖（我依赖谁）

<!-- CONTENT_START: upstream_dependencies -->

- `node:fs/promises` / `node:fs` / `node:os` / `node:path`
- 无第三方运行时依赖

<!-- CONTENT_END: upstream_dependencies -->

---

## 下游使用方（谁依赖我）

<!-- CONTENT_START: downstream_dependencies -->

- `src/index.ts`：工具执行与命令 handler 调用本模块读写

<!-- CONTENT_END: downstream_dependencies -->

---

## 数据结构

<!-- CONTENT_START: data_structures -->

- `MemoryRecord`：`{ key, category, content, summary, tags, created, updated }`
- `MemoryIndex`：`{ version: 1, nextId, items: MemoryIndexItem[] }`

<!-- CONTENT_END: data_structures -->

---

## 已知坑点 / 备注

<!-- CONTENT_START: notes -->

- `content` 上限 256 KB，超限抛 `MemoryError`
- key/category 白名单 `[a-zA-Z0-9_-]`，路径防穿越
- 损坏的记忆文件在重建索引时跳过，保留在磁盘上

<!-- CONTENT_END: notes -->
