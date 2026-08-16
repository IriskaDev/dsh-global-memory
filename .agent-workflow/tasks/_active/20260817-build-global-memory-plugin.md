<!-- TASK_ID: 20260817-build-global-memory-plugin -->
<!-- TASK_TYPE: feature -->
<!-- STATUS: IN_PROGRESS -->
<!-- CREATED: 2026-08-17 -->
<!-- LAST_UPDATED: 2026-08-17 18:30 -->
<!-- OWNER: IriskaDev -->
<!-- BRANCH: master -->
<!-- RELATED_WORKFLOWS: 03,04,05,08,11,12,13 -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_FEATURE / TASK_STATUS_ENUM / TASK_TYPE_ENUM；修改本行前请先改常量表（D5.E1/E2 自检规则会校验）。 -->

# 构建 dsh-global-memory 全局记忆插件

> 面向 DSH Agent 的跨会话全局记忆插件（toolkit 形态）。数据仅存本机 `$DSH_HOME/memory/`，不进入任何业务仓库。
>
> 📐 **章节结构（共 7 节）**：1 需求理解 → 2 影响范围 → 3 实施计划 → 4 关键决策 → 5 进度日志 → 6 风险与阻塞 → 7 **验收清单（最后一节）**

---

## 1. 需求理解

<!-- CONTENT_START: requirement -->

- **背景 / 起源**：DSH Agent 需要跨会话全局记忆；记忆内容由模型显式保存，会话开始自动注入条目级索引，模型工作过程中按需 recall 全文。
- **目标用户 / 调用方**：装配到 DSH profile 后，对所有会话的 agent 可用；用户可通过 slash 命令直接保存/删除。
- **核心交付物**：
  - 4 个工具：`memory_save` / `memory_recall` / `memory_search` / `memory_delete`
  - 2 个用户命令：`/memory_save` / `/memory_delete`
  - 会话首 step 自动注入条目级索引（`systemPrompt.context`, order 150）
  - 存储层 `src/store.ts`：`$DSH_HOME/memory/` 下 `m<NNNN>_<key>.json` + `index.json` 原子写入
- **不做范围（Out of Scope）**：不自动记录对话、不自动总结、不做全文索引/embedding、不做加密、不提供 `memory_append`
- **验收标准**：
  - `npm run typecheck` / `npm run lint` / `npm run format:check` / `npm test` 全绿
  - 本地注入后 `dev_plugin_status` 显示 active
  - 新会话首 step 注入索引（只含 key+tags，不含全文）
  - 4 工具 + 2 命令按 PLAN 行为正确，测试数据用后清理
- **关联资料**：GitHub 仓库 https://github.com/IriskaDev/dsh-global-memory

<!-- CONTENT_END: requirement -->

---

## 2. 影响范围分析

<!-- CONTENT_START: impact -->

- **涉及模块**（参考 `modules/`）：
  - 本项目为单包插件，模块未建档（阶段二待补 `memory-store` / `memory-tools`）
- **涉及文件 / 路径**：
  - `src/store.ts` — 核心存储模块（已完成）
  - `src/index.ts` — 工具/命令/索引注入注册（已完成）
  - `src/store.test.ts` — node:test 单元测试（已完成）
  - `package.json` / `tsconfig.json` / `eslint.config.js` / `.prettierrc.json` / `commitlint.config.js` / `.husky/` — 工程化工具链（已完成）
  - `README.md` — 用途/安装/工具参数/隐私说明（已完成）
- **涉及接口 / 数据结构**：新增 `MemoryRecord` / `MemoryIndex` / 工具 schema
- **依赖的上下游**：DSH 运行时（cordis、dsh-tools、dsh-llm、schemastery）
- **数据库 / 配置 / 环境变量变更**：新增 `DSH_HOME/memory/` 数据目录
- **兼容性影响**：无存量调用方；不破坏现有 profile

<!-- CONTENT_END: impact -->

---

## 3. 实施计划（Step List）

<!-- CONTENT_START: steps -->

> ✅ 关键区块：每完成一步勾选一项；中断恢复时从首个未勾选项继续。

- [x] 3.1 工作区初始化：git init + dev_scaffold_plugin（toolkit）+ 补齐 README/.gitignore/tsconfig/package.json
- [x] 3.2 创建 GitHub 远端仓库（IriskaDev/dsh-global-memory, PRIVATE）并推送初始框架
- [x] 3.3 核心存储模块 `src/store.ts`：key/category 安全化、索引读写与重建、原子写入、save/read/search/delete、renderMemoryIndex
- [x] 3.4 工具注册与索引注入 `src/index.ts`：4 工具 + 2 slash 命令 + `systemPrompt.context`（order 150）
- [x] 3.5 工程化工具链：ESLint + Prettier + commitlint + husky，scripts 补齐
- [x] 3.6 构建与类型检查：`npm run typecheck` 通过，`tsc -p tsconfig.json` 产出 `lib/`
- [x] 3.7 单元测试：`src/store.test.ts` 12 用例全通过（`npm test`）
- [x] 3.8 阶段一工作流分析：13 流程写入，完善度 94/100，阶段三已解锁
- [x] 3.9 本地装配与冒烟测试：dev_inject_plugin 注入当前 profile（active）；lib 产物 store 层 save/recall/search/delete/index 渲染冒烟通过，临时目录已清理；工具 schema 与命令待新会话 UI 确认
- [x] 3.10 提交分支（冒烟测试修复的代码一并 commit + push）
- [x] 3.11 创建 PR（从 feature/20260817-build-global-memory-plugin 发起，合回 master）
- [ ] 3.12 CI 通过 + PR 合入主干（当前无 CI，本地门禁 typecheck/lint/format/test 已通过；PR 合入后本步完成）

<!-- CONTENT_END: steps -->

---

## 4. 关键决策记录

<!-- CONTENT_START: decisions -->

> 凡是有 A / B 取舍的，必须记录"选了什么、为什么"，避免后续重复讨论。

|  #  | 决策点       | 选项                                                           | 选择                                 | 原因                                                                                | 时间       |
| :-: | ------------ | -------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- | ---------- |
|  1  | 索引注入方式 | 工具 description / systemPrompt section / systemPrompt.context | `systemPrompt.context`（order 150）  | 每会话一次性 user-role 快照，不每轮重复；中后段注入不抢前段                         | 2026-08-17 |
|  2  | recall 职责  | 无参查索引 + category 查明细 + key 查全文 / 仅 key 查全文      | 仅 `key` 查全文                      | 会话开始已注入条目级索引，模型无需再调工具查索引                                    | 2026-08-17 |
|  3  | 索引快照刷新 | 任何 save/delete 都刷新 / 仅命令路径刷新                       | 工具路径不刷新，命令路径刷新         | 模型自己保存/删除的内容已在当前上下文中；用户命令模型不知道，需下一次 pre-step 看到 | 2026-08-17 |
|  4  | 用户保存入口 | 仅靠 LLM 工具 / 增加 slash 命令                                | 增加 `/memory_save` `/memory_delete` | 用户可显式直接落盘，不经 LLM、不进模型历史                                          | 2026-08-17 |
|  5  | 分支模型     | GitFlow / 单 master + 按需 feature                             | 单 master + 按需 feature             | 单人小仓，日常直接 master，较大改动开 feature/<slug>                                | 2026-08-17 |
|  6  | commit 规范  | 约定 / commitlint + husky 强制                                 | commitlint + husky 强制              | Conventional Commits 门禁，保证历史可读                                             | 2026-08-17 |
|  7  | lint/format  | 暂不引入 / 现在引入                                            | 现在引入 ESLint + Prettier           | 流程 02 规则限制需要实质工具链支撑                                                  | 2026-08-17 |

<!-- CONTENT_END: decisions -->

---

## 5. 进度日志（Append-Only）

<!-- CONTENT_START: log -->

> 只追加、不删改。每次会话开始与结束、每次完成步骤、每次遇到阻塞都追加一条。

- `2026-08-17 18:00` 由 PLAN.md 按 SOP 转写为任务书；1-8 步已完成，剩余 3.9 冒烟测试、3.10 提交、3.11/3.12 PR/CI
- `2026-08-17 18:30` 3.9 完成：dev_inject_plugin 注入 active；发现根 index.js 缺失导致 loader 无法导入，新增根 index.js 转发并加入 files；lib 产物 store 层冒烟通过
- `2026-08-17 18:40` 3.11 创建 feature 分支并提交任务书进度，准备发起 PR

<!-- CONTENT_END: log -->

---

## 6. 风险与阻塞

<!-- CONTENT_START: risks -->

> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；遇到阻塞时**追加新行**，不要覆写占位行。

| 风险 / 阻塞点            | 影响                 | 应对方案                                                                       | 状态   |
| ------------------------ | -------------------- | ------------------------------------------------------------------------------ | ------ |
| -                        | -                    | -                                                                              | -      |
| 13 CI/CD 未配置          | PR 合入无自动化门禁  | 本地 pre-commit（typecheck+lint+format）+ npm test 兜底；后续补 GitHub Actions | 跟进中 |
| 模块台账未建档（阶段二） | 影响面分析缺模块文档 | 冒烟完成后补 `modules/memory-store.md` / `modules/memory-tools.md`             | 跟进中 |

<!-- CONTENT_END: risks -->

---

## 7. 验收清单

<!-- CONTENT_START: acceptance -->

- [x] 所有 Step 已勾选完成（3.9-3.12 待执行后勾选）
- [x] 单元测试 / 集成测试通过
- [x] 编译无 warning，linter 通过
- [x] 自测覆盖核心路径与边界场景
- [ ] 模块文档已更新（如涉及模块变更：`modules/<name>.md` + `modules/index.md` 均已同步）
- [ ] 接口文档 / CHANGELOG 已更新（如有对外接口变更）
- [ ] PR 已合入目标分支
- [ ] 任务文件已从 `_active/` 移入 `_archive/{YYYY-MM}/`

<!-- CONTENT_END: acceptance -->

---

<!-- TASK_HINTS:
  - STATUS 流转：PLANNING → IN_PROGRESS → (BLOCKED) → DONE / ABANDONED
  - 每完成一个 Step 必须：勾选 checkbox + 追加进度日志 + 更新 LAST_UPDATED
  - 任何阻塞必须把 STATUS 改为 BLOCKED 并在「风险与阻塞」记录原因
  - 中断恢复时：先读元数据 → 再读 Step List 找首个未勾选项 → 再读最近 3 条进度日志
-->
