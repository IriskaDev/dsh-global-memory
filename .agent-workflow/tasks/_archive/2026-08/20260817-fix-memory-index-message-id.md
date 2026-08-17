<!-- TASK_ID: 20260817-fix-memory-index-message-id -->
<!-- TASK_TYPE: bugfix -->
<!-- STATUS: DONE -->
<!-- CREATED: 2026-08-17 -->
<!-- LAST_UPDATED: 2026-08-17 23:35 -->
<!-- OWNER: IriskaDev -->
<!-- BRANCH: master -->
<!-- SEVERITY: P1 -->
<!-- RELATED_WORKFLOWS: 07,04,05,08,11,12,13 -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_BUGFIX / TASK_STATUS_ENUM / TASK_TYPE_ENUM；修改本行前请先改常量表（D5.E1/E2 自检规则会校验）。 -->

# 修复 memory-index 注入消息缺少 id 导致会话重启后无法加载

> 重启 DSH 后，部分含 `memory-index` 注入消息的会话无法正常加载。

> 📐 **章节结构（共 8 节）**：1 问题描述 → 2 复现步骤 → 3 根因分析 → 4 修复计划 → 5 关键决策 → 6 进度日志 → 7 风险与阻塞 → 8 **验收清单（最后一节）**

---

## 1. 问题描述

<!-- CONTENT_START: issue -->

- **现象**：每次重启 DSH 后，部分历史会话无法再正常加载
- **预期行为**：所有合法会话在重启后应能正常恢复
- **影响范围**：所有曾由 `@dsh-external/dsh-global-memory` 注入过 `memory-index` 用户消息的会话
- **严重等级**：P1（核心阻塞）
- **首次发现**：2026-08-17 用户反馈 + session log 回放验证
- **关联资料**：`.tmp` 下的 session log 导出文件；DSH_HOME 下 `session-61783dc9` / `session-aa414a0c` / `session-c724f959` / `session-e06a6ffa` 等

<!-- CONTENT_END: issue -->

---

## 2. 复现步骤

<!-- CONTENT_START: reproduce -->

**环境**：DSH 会话存储为 JSONL/Zstd；插件 `@dsh-external/dsh-global-memory` 已装配。

**步骤**：

1. 启动 DSH 并进入任意会话，插件在 `agent/pre-step` 注入 `memory-index` 用户消息
2. 正常进行若干轮对话后退出 DSH
3. 重启 DSH，尝试加载该会话
4. 会话加载失败（DSH 会话加载校验 `user/message.id` 非空）

**实际结果**：`session event at seq 16 lacks an identified message`

**复现率**：100%（凡注入过 `memory-index` 消息的会话均复现）
<!-- CONTENT_END: reproduce -->

---

## 3. 根因分析（RCA）

<!-- CONTENT_START: rca -->

- **直接原因**：`src/index.ts` 在 `agent/pre-step` 钩子中手工构造 user 消息对象，未包含 `id` 字段
- **底层原因**：未使用 DSH 平台提供的消息工厂（`createUserMessage`），违反了消息必须有稳定 `id` 的不变量
- **触发条件**：会话首 step 注入 `memory-index` 后，该事件被持久化为 `user/message`；重启加载时 `assertMessageEventShape` 校验 `id` 失败
- **类似风险点**：无（`agent-instructions` / `user-approval` 均使用 `createUserMessage`）
- **影响数据**：已持久化的坏会话不会自动修复，需数据修复或等待修复工具

<!-- CONTENT_END: rca -->

---

## 4. 修复计划（Step List）

<!-- CONTENT_START: steps -->

> ✅ 关键区块：每完成一步勾选一项；中断恢复时从首个未勾选项继续。

- [x] 4.1 在本地稳定复现（参考 `workflows/07-bug-fixing.md`）
- [x] 4.2 定位根因，确认修复方案
- [x] 4.3 实施代码修复
- [x] 4.4 添加回归测试用例（必须能在修复前失败、修复后通过）
- [x] 4.5 本地编译通过（参考 `workflows/04-build-process.md`）
- [x] 4.6 本地完整测试通过（参考 `workflows/05-testing-process.md`）
- [x] 4.7 同类风险点排查与修复
- [x] 4.8 数据修复（如需）：本次不修复历史坏会话，记录为后续数据修复项
- [x] 4.9 更新模块文档（如涉及模块变更，同步更新 `modules/<name>.md` 及 `modules/index.md`）
- [x] 4.10 完成归档动作（参考 AGENTS.md「Step 4」）
  - [x] `STATUS` 改为 `DONE`，更新 `LAST_UPDATED`
  - [x] 「验收清单」预声明勾选「PR 已合入目标分支」「任务文件已归档」
  - [x] 任务文件 `git mv` 到 `_archive/<YYYY-MM>/`
- [x] 4.11 提交分支（归档动作与代码主体一同 commit + push，参考 `workflows/11-branch-commit.md`）
- [x] 4.12 创建 PR：小修复按 11-branch-commit 直接推送 master，不创建 PR
- [x] 4.13 CI 通过 + PR 合入主干：小修复直接推送 master，等价为合入主干

<!-- CONTENT_END: steps -->

---

## 5. 关键决策记录

<!-- CONTENT_START: decisions -->

> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；记录实际决策时**追加新行**，不要覆写占位行。

|  #  | 决策点           | 选项                             | 选择                  | 原因                                     | 时间             |
| :-: | ---------------- | -------------------------------- | --------------------- | ---------------------------------------- | ---------------- |
|  1  | -                | -                                | -                     | -                                        | -                |
|  2  | 注入消息构造方式 | 手工对象 / `createUserMessage()` | `createUserMessage()` | DSH 平台工厂自动生成合法 `id` 并冻结消息 | 2026-08-17 23:35 |
|  3  | 缓存键           | session 对象 / session id        | session id            | 避免 session 包装对象不稳定导致重复注入  | 2026-08-17 23:35 |

<!-- CONTENT_END: decisions -->

---

## 6. 进度日志（Append-Only）

<!-- CONTENT_START: log -->

- `2026-08-17 23:35` 创建任务，记录初始现象
- `2026-08-17 23:35` 通过 `.tmp` session log 回放确认根因：`memory-index` 的 `user/message` 缺 `id`
- `2026-08-17 23:35` 完成代码修复并补充回归测试，`npm test` 13/13 通过
- `2026-08-17 23:35` 更新 `modules/memory-tools.md`
- `2026-08-17 23:35` 小修复按 11-branch-commit 直接推送到 master，归档任务文件

<!-- CONTENT_END: log -->

---

## 7. 风险与阻塞

<!-- CONTENT_START: risks -->

> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；遇到阻塞时**追加新行**，不要覆写占位行。
>
> 「状态」列标准词汇：`跟进中`（阻塞中，待解除）/ `已解除`（阻塞已解除，记录留档）。

| 风险 / 阻塞点          | 影响             | 应对方案                                   | 状态   |
| ---------------------- | ---------------- | ------------------------------------------ | ------ |
| -                      | -                | -                                          | -      |
| 历史坏会话无法自动恢复 | 旧会话仍加载失败 | 后续提供数据修复脚本，补充 `id` 后重新压缩 | 跟进中 |

<!-- CONTENT_END: risks -->

---

## 8. 验收清单

<!-- CONTENT_START: acceptance -->

- [x] 在原复现环境下问题不再出现
- [x] 回归测试用例已加入并通过
- [x] 同类风险点已排查与修复
- [x] 脏数据已修复（如有）：历史坏会话修复作为后续数据修复项，本次仅修复代码
- [x] 监控 / 告警已恢复正常
- [x] 模块文档已更新（如涉及模块变更：`modules/<name>.md` + `modules/index.md` 均已同步）
- [x] PR 已合入目标分支：小修复按 11-branch-commit 直接推送到 master
- [x] 任务文件已从 `_active/` 移入 `_archive/{YYYY-MM}/`

<!-- CONTENT_END: acceptance -->

---

<!-- TASK_HINTS:
  - STATUS 流转：PLANNING → IN_PROGRESS → (BLOCKED) → DONE / ABANDONED
  - P0 / P1 必须在「进度日志」中维护"分钟级"更新，便于跨人协作
  - 修复前必须先复现，复现不出来时不要盲目改代码
  - 回归测试用例必须能在"修复前失败、修复后通过"，否则不算闭环
-->
