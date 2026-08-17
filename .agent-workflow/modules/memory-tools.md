<!-- MODULE: memory-tools -->
<!-- MODULE_GROUP: - -->
<!-- INVOLVED_CHAINS: - -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-08-17 -->
<!-- ANALYZER_VERSION: 1.6 -->

# 记忆工具注册模块（memory-tools）

> 负责把全局记忆能力暴露给 DSH agent 与用户：4 个 `memory_*` 工具 + 2 个 slash 命令 + 会话首 step 自动注入条目级索引。
>
> **档案层级说明**（v1.9 新增）：
>
> - `MODULE_GROUP` = 所属大模块 Group ID；顶层单模块填 `-`
> - `INVOLVED_CHAINS` = 本模块参与的调用链 slug（英文逗号分隔），由 16 号 Step 6.7 反向索引自动维护；无涉及链路填 `-`

---

## 功能概述

<!-- CONTENT_START: overview -->

- `src/index.ts` 注册 `memory_save` / `memory_recall` / `memory_search` / `memory_delete` 四个工具
- 注册 `/memory_save` / `/memory_delete` 用户命令：直接落盘，不经 LLM，结果不进模型历史
- 通过 `agent/pre-step` 事件在每会话首 step 注入一次条目级索引快照（user-role 消息，`source.kind = "memory-index"`，不受 preset `includeRuntimeContext: false` 抑制）

<!-- CONTENT_END: overview -->

---

## 入口点（Entry Points）

<!-- CONTENT_START: entry_points -->

| 类型     | 入口标识             | 触发函数        | 说明                               |
| -------- | -------------------- | --------------- | ---------------------------------- |
| CLI      | `/memory_save`       | command handler | 用户直接保存记忆                   |
| CLI      | `/memory_delete`     | command handler | 用户直接删除记忆                   |
| 内部函数 | `apply(ctx, config)` | 同名            | 插件入口，注册工具/命令/上下文注入 |

<!-- CONTENT_END: entry_points -->

---

## 数据流向

<!-- CONTENT_START: data_flow -->

模型工具调用 → `memory_*` 工具 execute → 调用 `store.ts` 读写；用户命令 → command handler → 调用 `store.ts` 读写，并清除该会话索引快照缓存；`agent/pre-step` 首次放行后读取 `index.json` 渲染索引快照，追加为 user-role 消息注入历史。

<!-- CONTENT_END: data_flow -->

---

## 核心接口

<!-- CONTENT_START: core_interfaces -->

- 工具 schema：`memory_save` / `memory_recall` / `memory_search` / `memory_delete`
- 命令：`/memory_save <key> <content...>`、`/memory_delete <key>`
- 上下文注入：`ctx.on('agent/pre-step')` 追加 user-role 消息（`source.kind = 'memory-index'`）

<!-- CONTENT_END: core_interfaces -->

---

## 上游依赖（我依赖谁）

<!-- CONTENT_START: upstream_dependencies -->

- `@deepseek-ai/dsh-tools`（defineTool）
- `cordis`（Context）
- `schemastery`（Config schema）
- 内部 `src/store.ts`

<!-- CONTENT_END: upstream_dependencies -->

---

## 下游使用方（谁依赖我）

<!-- CONTENT_START: downstream_dependencies -->

- DSH agent：通过工具调用读写记忆
- DSH UI：通过 slash 命令读写记忆

<!-- CONTENT_END: downstream_dependencies -->

---

## 数据结构

<!-- CONTENT_START: data_structures -->

- 工具参数/输出 schema；无独立持久化数据结构（数据模型见 `memory-store`）

<!-- CONTENT_END: data_structures -->

---

## 已知坑点 / 备注

<!-- CONTENT_START: notes -->

- 注入的索引快照按 session 缓存；工具路径 save/delete 不刷新，命令路径刷新
- 索引注入失败时静默跳过（返回原 decision），不阻塞 pre-step 链路
- 根 `index.js` 为 loader 导入兼容 shim（dev_inject_plugin 需要）

<!-- CONTENT_END: notes -->
