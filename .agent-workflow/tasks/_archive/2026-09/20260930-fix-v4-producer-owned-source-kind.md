<!-- TASK_ID: 20260930-fix-v4-producer-owned-source-kind -->
<!-- TASK_TYPE: bugfix -->
<!-- STATUS: DONE -->
<!-- CREATED: 2026-09-30 -->
<!-- LAST_UPDATED: 2026-09-30 00:13 -->
<!-- OWNER: IriskaDev -->
<!-- BRANCH: bugfix/fix-v4-producer-owned-source-kind -->
<!-- SEVERITY: P1 -->
<!-- RELATED_WORKFLOWS: 07,04,05,08,11,12,13 -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_BUGFIX / TASK_STATUS_ENUM / TASK_TYPE_ENUM；修改本行前请先改常量表（D5.E1/E2 自检规则会校验）。 -->

# 插件在 DSH 0.2.x（会话格式 v4）下写入非法 message source，导致整轮运行失败

> DSH 桌面版 0.2.0-rc.2 中，global-memory 注入索引快照后本轮回合直接报
> `format v4 message requires a producer-owned source kind`，会话不可用。
>
> 📐 **章节结构（共 8 节）**：1 问题描述 → 2 复现步骤 → 3 根因分析 → 4 修复计划 → 5 关键决策 → 6 进度日志 → 7 风险与阻塞 → 8 **验收清单（最后一节）**

---

## 1. 问题描述

<!-- CONTENT_START: issue -->

- **现象**：安装 global-memory 后，DSH 桌面版会话「本轮运行失败」，错误行显示
  `format v4 message requires a producer-owned source kind`；会话不可用。
- **预期行为**：插件注入的索引快照应被会话格式接纳，回合正常运行。
- **影响范围**：所有在 DSH **0.2.x（会话格式 v4）**上使用本插件的会话；v3 runtime 不受影响。
  一旦某会话已是 v4，**每次**注入都会失败，属 100% 复现。
- **严重等级**：P1（核心阻塞，插件在目标 runtime 上不可用）
- **首次发现**：2026-09-29 用户反馈（桌面版界面截图）
- **关联资料**：用户现场截图（会话内多个步骤正常，末尾红字报错）

<!-- CONTENT_END: issue -->

---

## 2. 复现步骤

<!-- CONTENT_START: reproduce -->

**环境**：DSH Desktop 0.2.0-rc.2（内置 runtime，`desktopVersion: 0.2.0-rc.2`）；
会话格式 v4；插件 `@dsh-external/dsh-global-memory` v0.0.4（`link:` 装入 desktop profile）。

**步骤**：

1. 在 desktop profile 中装配本插件（`agent/pre-step` 注入生效）。
2. 打开/新建一个已是 **v4** 的会话。
3. 发送任意一条消息，等待 pre-step 注入索引快照。

**实际结果**：

```
本轮运行失败  format v4 message requires a producer-owned source kind
处理失败
```

**复现率**：100%（v4 会话 + 插件注入）

**已落地的确定性复现**（不依赖 GUI，直接打真实 runtime 校验器）：

```
$ node verify-source.mjs
FAIL  OLD  { kind: "plugin", plugin: "@dsh-external/dsh-global-memory" }
        SessionFormatError: format v4 message requires a producer-owned source kind
PASS  NEW  { kind: "plugin:@dsh-external/dsh-global-memory" }
```

<!-- CONTENT_END: reproduce -->

---

## 3. 根因分析（RCA）

<!-- CONTENT_START: rca -->

- **直接原因**：`src/index.ts` 的 `createMemoryIndexMessage()` 把注入消息写成 v3 的包裹式
  source：`{ kind: 'plugin', plugin: '@dsh-external/dsh-global-memory' }`。

- **runtime 侧判定**（`@deepseek-ai/dsh-session-format-v3-to-v4` 0.2.0-rc.2，`lib/index.js`）：

  ```js
  function source(message) {
    const value = message['source']
    if (
      !isSessionFormatJsonObject(value) ||
      typeof value['kind'] !== 'string' ||
      value['kind'].length === 0 ||
      value['kind'] === 'plugin'
    )
      throw new SessionFormatError('format v4 message requires a producer-owned source kind')
  }
  ```

  即 **v4 原生准入明确拒绝 `kind === "plugin"`**，要求 producer-owned kind。

- **底层原因（版本语义迁移盲区）**：v3 允许 `{ kind: 'plugin', plugin }` 包裹形态，v3→v4 迁移会
  自动把它「提升」为 `plugin:<完整插件名>`（`producerKind()` → `plugin:${plugin}`，并移除
  `plugin` 字段）。**但该提升只在读盘做 v3→v4 迁移时发生**；会话一旦已经是 v4，插件经
  `agent/pre-step` 新写入的消息不会被提升，于是直接撞上原生准入。
  即：历史数据能被自动修复，**新写入的数据不能**。

- **触发条件**：会话格式已是 v4（DSH 0.2.x）+ 本插件注入 user-role 索引快照。

- **为什么之前「看起来已经修过」**：v0.0.3→v0.0.4 针对的失败发生在 **v2→v3** 时代——那时
  `memory-index` 这个自定义 kind 会被 v2→v3 的白名单拒绝，所以 v0.0.4 把它改写成
  `plugin` 包裹形态，**在 v3 下是正确的**。0.2.x 把目标提到 v4 后，同一个 `plugin` 包裹形态
  反而成了非法值。`session-migration.ts` 的 v1 迁移因此反而把 v3 会话「修」成了对 v4 不友好的
  形态（对已是 v3 的 runtime 无害，对 v4 则必须再修一次）。

- **类似风险点**：
  1. `session-migration.ts` 的迁移方向（`memory-index` → `plugin`）需同步改为 v4 形态；
  2. 任何「插件自定义 message source」都应直接写 producer-owned 形态，不要依赖 runtime 迁移；
  3. 插件 README/模块文档中的 kind 描述已过期（本次一并更新）。

- **影响数据**：v0.0.4 在 v3 会话里写下的 `{ kind: 'plugin', plugin: <本插件名> }` 记录。
  经排查本机 `~/.dsh/sessions`：v3 归档会话中存在该形态（每个会话 1 条本插件记录），
  v4 会话中没有（均已被官方迁移提升为 `plugin:@dsh-external/...`）。**需要数据修复**。

- **旁证（已核对真实文件）**：

  | 会话                   | 头部版本 | `kind:"plugin"` 条数 | `kind:"plugin:@dsh-external/..."` |
  | ---------------------- | :------: | :------------------: | :-------------------------------: |
  | archive v3 会话        |    3     | 3–4（含本插件 1 条） |                 0                 |
  | archive 已升级 v4 会话 |    4     |          0           |                 1                 |
  | tmp 已升级 v4 会话     |    4     |          0           |                 1                 |

<!-- CONTENT_END: rca -->

---

## 4. 修复计划（Step List）

<!-- CONTENT_START: steps -->

- [x] 4.1 在本地稳定复现（用真实 runtime 校验器打 `restoreReleasedV4Artifact`）
- [x] 4.2 定位根因，确认修复方案
- [x] 4.3 实施代码修复
  - [x] `createMemoryIndexMessage()` 改写为 `kind: 'plugin:<完整插件名>'`
  - [x] `session-migration.ts` 迁移目标同步为 producer-owned 形态；新增 `kind: 'plugin'` 载荷修复；
        `MIGRATION_VERSION` 1 → 2（旧 marker 自动过期重跑）；新增 `changedKinds` 统计
  - [x] **附带修复**：工件收集器原本只认 `session.jsonl[.zstd]`，而真实 `$DSH_HOME/sessions`
        的活跃工件带 `.v<n>` 后缀（`session.v4.jsonl.zstd`），导致迁移**从未命中任何真实文件**（死代码）。
        改为「每个会话目录取代次最高的活跃工件」，旧代次备份不动
  - [x] 移除已失效的 `session.v3.jsonl.zstd` 旁路跳过（最高代次选择下它恒为自跳过；真实 v4 会话
        长期保留 v3 兄弟文件，该跳过会挡掉所有修复）
- [x] 4.4 添加回归测试用例（修复前失败、修复后通过）
  - [x] v0.0.4 `kind:'plugin'` 载荷修复（本次 bug 的直接回归）
  - [x] 嵌套 `agent/inbox/spliced` 载荷
  - [x] 其他插件的 `plugin` source 不被误改写
  - [x] 已是当前 kind 时不产生写入
  - [x] 多代次目录只改活跃工件、旧代次逐字节不变
- [x] 4.5 本地编译通过（`npm run build` 通过；`cordis` 类型缺口已由 `src/cordis.d.ts` 补齐）
- [x] 4.6 本地完整测试通过（`npm test` 20/20）+ eslint + prettier
- [x] 4.7 同类风险点排查与修复（README/模块文档 kind 描述、迁移方向、收集器匹配规则）
- [x] 4.8 数据修复验证（在真实 `~/.dsh/sessions` 的沙箱副本上 dry run + 通过真实 catalog 打开验证；
      真实写入与回归已在桌面版重启后核对通过）
- [x] 4.9 更新模块文档（新增 `modules/session-migration.md`，同步 `modules/index.md` 与 `memory-tools.md`）
- [x] 4.10 完成归档动作（参考 AGENTS.md「Step 4」）
  - [x] `STATUS` 改为 `DONE`，更新 `LAST_UPDATED`
  - [x] 「验收清单」预声明勾选「PR 已合入目标分支」「任务文件已归档」
  - [x] 任务文件 `git mv` 到 `_archive/<YYYY-MM>/`
- [x] 4.11 提交分支（推送到 `bugfix/fix-v4-producer-owned-source-kind`，参考 `workflows/11-branch-commit.md`）
- [x] 4.12 创建 PR（[#4](https://github.com/IriskaDev/dsh-global-memory/pull/4)，参考 `workflows/12-pull-request.md`）
- [x] 4.13 CI 通过 + PR 合入主干（CI `lint-and-format` pass；rebase 合入 `master` = `0d89ec9`；
      发布 tag `v0.0.5` 已推送，参考 `workflows/13-ci-cd-pipeline.md`）

<!-- CONTENT_END: steps -->

---

## 5. 关键决策记录

<!-- CONTENT_START: decisions -->

|  #  | 决策点                                     | 选项                                                                                                          | 选择  | 原因                                                                                                             | 时间       |
| :-: | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------- | ---------- |
|  1  | 注入消息写哪种 kind                        | A：继续 `{kind:'plugin',plugin}` 并等 runtime 提升<br>B：直接写 `plugin:<插件名>`<br>C：自定义 `memory-index` | **B** | v4 原生准入拒绝 A；C 会被 v2→v3 白名单拒绝（历史教训）。B 同时被 v3/v4 接纳，且与官方迁移产物一致                | 2026-09-30 |
|  2  | 迁移是否按工件格式版本分支                 | A：读头部版本，按 v3/v4 分别处理<br>B：不分版本，统一改写                                                     | **B** | `plugin:<插件名>` 在 v3/v4 都合法，无需分支；只有真正含过期 source 的文件才写入                                  | 2026-09-30 |
|  3  | 是否移除 source 里的 `plugin` 字段         | A：移除<br>B：保留（仅替换 `kind`）                                                                           | **B** | 与官方 `rewritePluginSource()` 的提升语义一致（只替换 kind，保留其余 own 属性），结果与 runtime 迁移产物逐字一致 | 2026-09-30 |
|  4  | 扫描范围是否纳入 `session.v<n>.jsonl.zstd` | A：纳入<br>B：维持只扫 `session.jsonl[.zstd]`                                                                 | **B** | 旧代备份由 runtime 自己维护，改写只会制造无谓 diff，且 `session.v3.jsonl.zstd` 的旁路语义依赖它们留在原位        | 2026-09-30 |

<!-- CONTENT_END: decisions -->

---

## 6. 进度日志（Append-Only）

<!-- CONTENT_START: log -->

- `2026-09-30 00:02` 创建任务，记录初始现象（桌面版 v4 会话无法运行）
- `2026-09-30 00:02` 从 app.asar 解出内置 runtime 0.2.0-rc.2，定位到
  `dsh-session-format-v3-to-v4/lib/index.js` 的 `source()` 明确拒绝 `kind === "plugin"`
- `2026-09-30 00:02` 用真实校验器 `restoreReleasedV4Artifact()` 复现：OLD 拒绝 / NEW 接纳，根因确认
- `2026-09-30 00:02` 完成代码修复（`src/index.ts`、`src/session-migration.ts`）
- `2026-09-30 00:02` 端到端验证：真实 v4 工件「旧形态 → 迁移 → 校验」由 REJECTED 变 ACCEPTED，且保留备份
- `2026-09-30 00:02` 测试 20/20 通过；eslint / prettier 通过；模块文档与索引已同步
- `2026-09-30 00:15` **发现收集器缺陷**：对真实 `~/.dsh/sessions` 做沙箱 dry run 时 `scannedFiles = 0`——
  真实活跃工件叫 `session.v4.jsonl.zstd`，而旧收集器只认 `session.jsonl[.zstd]`，迁移一直是死代码。
  排查前 dry run 还显示 V4 会话被 `session.v3.jsonl.zstd` 旁路整体跳过（真实 v4 会话会长期保留 v3 兄弟文件）。
  已改为「每个会话目录取代次最高的活跃工件」并移除该旁路。
- `2026-09-30 00:15` 修复后 dry run（真实会话的沙箱副本）：`scannedFiles=47`、`changedFiles=16`、
  `changedSources=16`、`changedKinds={"plugin":16}`、`errors=0`；受影响文件全部是 archive 下的 v3 会话。
- `2026-09-30 00:15` **兼容性验证**：取真实 v3 会话 `session.v3.jsonl.zstd`，用真实 catalog
  （`createSessionFormatCatalogWithChildren([]).createRestore(..., {validation:'current'})`）
  逐行打开——修复前后均 `OK → v4, 121 events`，确认迁移不会破坏会话加载。
- `2026-09-30 00:15` 版本号 0.0.4 → 0.0.5；README「历史会话兼容迁移」章节重写
- `2026-09-30 00:07` **真实环境回归通过**（用户重启并启用插件后）：
  - 插件以 `0.0.5` 加载（profile `link:` 生效），索引快照正常注入，`memory_*` 工具面正常；
  - marker 写入 `version: 2, changedFiles: 16, changedSources: 16`，生成 16 个 `.bak-dsh-global-memory-2` 备份；
  - 数据核对：16 个被修复文件的过期 source **全部清除**（16/16），16 个备份**逐字节保留原样**（16/16）；
  - 16 个修复后的会话用真实 catalog（`createSessionFormatCatalogWithChildren([]).createRestore(..., {validation:'current'})`）
    重新打开：**16/16 全部成功**（含 v3→v4 提升）；
  - 当前 GUI 会话 `session-9524c6c5` 里持久化的注入消息实测为
    `source.kind = "plugin:@dsh-external/dsh-global-memory"` —— 写入路径已彻底修正，不再报
    `format v4 message requires a producer-owned source kind`；
  - 幂等性：marker v2 已写，再次调用迁移返回全 0，不再触碰任何文件。
- `2026-09-30 00:07` 复核剩余 2 个仍含 `kind:"plugin"` 的本插件记录：均为**已被 v4 取代的 v3 旧代次文件**
  （同目录存在更新的 `session.v4.jsonl.zstd`）。按设计它们不是当前代次，迁移不动；保留原始内容反而让
  备份更具回滚价值，且 v3→v4 提升对 direct kind 与包裹形态都能正确处理。
- `2026-09-30 00:13` 新增 `src/cordis.d.ts` 最小 ambient 声明，`npm run typecheck` 首次在宿主之外通过；
  `npm run build` 与 `npm test`（20/20）随之全绿。
- `2026-09-30 00:13` 按 11 号流程建分支 `bugfix/fix-v4-producer-owned-source-kind` 并提交
  `b2158a9`（pre-commit 门禁 typecheck/lint/format:check 与 commit-msg 全部通过）。
- `2026-09-30 00:13` 推送分支并创建 PR [#4](https://github.com/IriskaDev/dsh-global-memory/pull/4)；
  CI `lint-and-format` pass（18s），rebase 合入 `master` = `0d89ec9`，远端分支已删除。
- `2026-09-30 00:13` 发布：打 tag `v0.0.5` 并推送（沿用仓库既有 `v0.0.x` 约定）。

<!-- CONTENT_END: log -->

---

## 7. 风险与阻塞

<!-- CONTENT_START: risks -->

| 风险 / 阻塞点                                                                                                                                           | 影响                                                                                                                                                | 应对方案                                                                                                                                             | 状态   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 本仓库开发环境缺少 `cordis` 类型（DSH 用 vendored `@deepseek-ai/cordis` 4.0.4，公开 npm 只有 `cordis@4.0.0-rc.x`，且 exports 面不同：不导出 `Context`） | `npm run build` / `npm run typecheck` 报 `TS2305: Module '"cordis"' has no exported member 'Context'`，**与本次改动无关**（既有问题，原代码同样报） | 本次以 `tsc --noEmitOnError false` 产出 `lib/` 完成验证；后续可加一个仅含插件实际用到的 `Context` 成员的本地 `cordis` 类型 shim，使 build 可离线复现 | 跟进中 |
| 未在真实桌面版 profile 上跑完整回归                                                                                                                     | 端到端链路由真实校验器覆盖，但「插件装配 + GUI 会话」整链未实测                                                                                     | 重装/重载 desktop profile 后新建会话验证；见验收清单                                                                                                 | 跟进中 |
| 插件当前似乎未装配进 desktop profile（profile `cordis.patch.yml` 无 global-memory 行）                                                                  | 即使修好插件，桌面版也可能根本没加载它                                                                                                              | 单独排查 bundle patch 装配流程（`.plugin-manager` 日志显示 git spec 安装曾因 `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` 失败）                           | 跟进中 |

<!-- CONTENT_END: risks -->

---

## 8. 验收清单

<!-- CONTENT_START: acceptance -->

- [x] 在原复现环境下问题不再出现（真实环境复测：插件 0.0.5 加载、索引正常注入、当前 GUI 会话持久化
      消息 `source.kind = "plugin:@dsh-external/dsh-global-memory"`，不再报 v4 source 错误）
- [x] 回归测试用例已加入并通过（20/20）
- [x] 同类风险点已排查与修复（迁移方向、工件收集器匹配规则、v3 旁路跳过、模块文档/README 描述）
- [x] 脏数据已修复（真实写入 16 个文件 / 16 处 source；修复结果与备份均逐项核对，16/16 可重新打开）
- [x] 监控 / 告警已恢复正常（本项目无告警；以桌面版会话可正常运行替代 —— 已实测通过）
- [x] 模块文档已更新（`modules/session-migration.md` + `modules/index.md` + `modules/memory-tools.md`）
- [x] PR 已合入目标分支（[#4](https://github.com/IriskaDev/dsh-global-memory/pull/4) → `master` `0d89ec9`）
- [x] 任务文件已从 `_active/` 移入 `_archive/{YYYY-MM}/`

<!-- CONTENT_END: acceptance -->

---

<!-- TASK_HINTS:
  - STATUS 流转：PLANNING → IN_PROGRESS → (BLOCKED) → DONE / ABANDONED
  - P0 / P1 必须在「进度日志」中维护"分钟级"更新，便于跨人协作
  - 修复前必须先复现，复现不出来时不要盲目改代码
  - 回归测试用例必须能在"修复前失败、修复后通过"，否则不算闭环
-->
