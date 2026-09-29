<!-- MODULE: session-migration -->
<!-- MODULE_GROUP: - -->
<!-- INVOLVED_CHAINS: - -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-09-30 -->
<!-- ANALYZER_VERSION: 1.6 -->

# 会话 source 兼容迁移模块（session-migration）

> 插件加载时、任何会话被打开之前，把本插件历史写出的、当前 runtime 不再接纳的 `source.kind` 规范化为 v4 producer-owned 形态；原文件先备份，迁移幂等。

---

## 功能概述

<!-- CONTENT_START: overview -->

- `src/session-migration.ts` 扫描 `$DSH_HOME/sessions`，改写本插件历史 source kind
- 覆盖两代历史载荷：
  - `{ kind: 'memory-index', plugin: <本插件名> }`（v0.0.3 及以前的自定义 kind）
  - `{ kind: 'plugin', plugin: <本插件名> }`（v0.0.4 的 v3 包裹形态）
- 统一改写为 `plugin:@dsh-external/dsh-global-memory`（即官方 v3→v4 迁移的提升结果）
- 改写前为每个文件保留 `.bak-dsh-global-memory-<MIGRATION_VERSION>` 备份；完成后写 marker，幂等

<!-- CONTENT_END: overview -->

---

## 入口点（Entry Points）

<!-- CONTENT_START: entry_points -->

| 类型     | 入口标识                                 | 触发函数            | 说明                                   |
| -------- | ---------------------------------------- | ------------------- | -------------------------------------- |
| 内部函数 | `migrateLegacySessionSources(memoryDir)` | 同名                | 扫描并修复，返回统计结果               |
| 内部函数 | `decodeSessionArtifact(buffer)`          | 同名                | 多帧 zstd 解码（容忍 torn frame 报错） |
| 插件钩子 | `apply()` 开头                           | `src/index.ts` 调用 | 加载期先修复，再注册工具/命令          |

<!-- CONTENT_END: entry_points -->

---

## 数据流向

<!-- CONTENT_START: data_flow -->

`$DSH_HOME/sessions/**/session.jsonl.zstd` → 多帧 zstd 解码 → 按行 JSON 解析 → 递归改写本插件过期
`source.kind` → 逐行重新压缩（保留 zstd checksum）→ 备份原文件 → 临时文件 + rename 原子替换 → 写 marker。

<!-- CONTENT_END: data_flow -->

---

## 核心接口

<!-- CONTENT_START: core_interfaces -->

- `migrateLegacySessionSources(memoryDir): LegacySessionMigrationResult`
  - `scannedFiles` / `changedFiles` / `changedSources` / `changedKinds` / `backups` / `errors`
- `decodeSessionArtifact(buffer): Buffer`（多帧 zstd → 明文，供迁移与测试复用）

<!-- CONTENT_END: core_interfaces -->

---

## 上游依赖（我依赖谁）

<!-- CONTENT_START: upstream_dependencies -->

- Node 内置：`node:fs` / `node:path` / `node:zlib`（`zstdCompressSync` / `zstdDecompressSync`，需 Node ≥ 22.15 / 24）
- 无第三方依赖（刻意不 import DSH 包，保证在会话加载前即可独立运行）

<!-- CONTENT_END: upstream_dependencies -->

---

## 下游使用方（谁依赖我）

<!-- CONTENT_START: downstream_dependencies -->

- `src/index.ts` 的 `apply()`：插件加载期调用一次
- 现有会话的加载链路（隐式）：修复后的 `source.kind` 才能被 DSH 会话格式 v4 原生准入接纳

<!-- CONTENT_END: downstream_dependencies -->

---

## 数据结构

<!-- CONTENT_START: data_structures -->

- `LegacySessionMigrationResult`：迁移统计
- `MigrationMarker`（`.legacy-session-source-migration.json`）：`version` / `completedAt` / `changedFiles` / `changedSources`
- `ZstdFrame`：多帧 zstd 的帧边界（`start` / `end`）

<!-- CONTENT_END: data_structures -->

---

## 已知坑点 / 备注

<!-- CONTENT_START: notes -->

- **改写目标是 `plugin:<完整插件名>`，不是 `plugin`**：DSH 0.2.x 的 v4 原生准入明确拒绝
  `kind === "plugin"`（`format v4 message requires a producer-owned source kind`）。v0.0.4 把
  `memory-index` 改写成 `plugin`，在 v3 runtime 下正确，但在 v4 会话上会让整轮运行失败。
- 该形态在 v3 / v4 都合法，因此迁移**不需要**判定工件自身的格式版本；只有真正含过期 source
  的文件才写入（其余 `changedSources === 0` 直接跳过）。
- 只改写 `plugin` 字段等于本插件名的记录；**其他插件**的 `plugin` source 一律不动。
- 与官方 v3→v4 提升保持一致：只替换 `kind`，其余 own 属性（含 `plugin`、`form` 等）原样保留。
- 单文件失败不写 marker，下次启动重试；失败会进 `errors` 并以 warn 日志输出，不阻断插件加载。
- **每个会话目录只处理当前代次的活跃工件**：DSH 把各代次并排存放
  （`session.jsonl.zstd` / `session.v3.jsonl.zstd` / `session.v4.jsonl.zstd`……），取 `.v<n>` 最大者。
  v0.0.4 的收集器只认无后缀名，而真实活跃工件**带** `.v<n>` 后缀，导致迁移从未命中任何真实文件（死代码）；
  同时旧的「存在 `session.v3.jsonl.zstd` 就跳过」分支在最高代次选择下恒为自跳过，且真实 v4 会话会长期
  保留 v3 兄弟文件，会把所有修复都挡掉 —— 两者均已移除。
- 迁移版本号见 `MIGRATION_VERSION`（当前 2；v1 的 marker 会自动过期重跑一次）。
- zstd 多帧 + 逐行压缩是为兼容 DSH 的追加式写入；压缩参数必须带 checksum flag。
- **`cordis` 类型缺口**：本包 peerDependency 写的是 `cordis`，但 DSH 实际提供 vendored fork
  `@deepseek-ai/cordis`（4.0.4），公开 registry 的 `cordis@4.0.0-rc.x` 根入口不导出 `Context`，
  导致 `npm run typecheck`（husky pre-commit 门禁）在宿主之外恒失败。现阶段由
  `src/cordis.d.ts` 提供最小 ambient 声明补齐（只覆盖插件实际用到的成员；源码里仅有
  `import type`，编译后完全擦除，不影响运行期）。根治方向见该文件头注释。

<!-- CONTENT_END: notes -->
