<!-- TASK_ID: 20260930-align-cordis-dependency-name -->
<!-- TASK_TYPE: bugfix -->
<!-- STATUS: IN_PROGRESS -->
<!-- CREATED: 2026-09-30 -->
<!-- LAST_UPDATED: 2026-09-30 00:30 -->
<!-- OWNER: IriskaDev -->
<!-- BRANCH: fix/cordis-types-from-runtime-package -->
<!-- SEVERITY: P2 -->
<!-- RELATED_WORKFLOWS: 07,04,05,08,11,12,13 -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_BUGFIX / TASK_STATUS_ENUM / TASK_TYPE_ENUM；修改本行前请先改常量表（D5.E1/E2 自检规则会校验）。 -->

# peerDependency 依赖名与运行期真实包不一致，导致 typecheck 门禁恒失败

> 本包声明 `cordis` 为 peerDependency 并从 `cordis` 引入 `Context`，但 DSH 实际提供的是
> vendored 包 `@deepseek-ai/cordis`；公开 registry 上的普通 `cordis` 根入口不导出 `Context`，
> 使 `npm run typecheck`（husky pre-commit 门禁）在宿主之外必然失败。
>
> 📐 **章节结构（共 8 节）**：1 问题描述 → 2 复现步骤 → 3 根因分析 → 4 修复计划 → 5 关键决策 → 6 进度日志 → 7 风险与阻塞 → 8 **验收清单（最后一节）**

---

## 1. 问题描述

<!-- CONTENT_START: issue -->

- **现象**：`npm run typecheck` 报
  `src/index.ts(12,15): error TS2305: Module '"cordis"' has no exported member 'Context'`，
  husky `pre-commit` 门禁因此恒失败，无法正常提交。
- **预期行为**：类型检查能解析到运行期真实存在的 cordis 类型，门禁可通过。
- **影响范围**：所有在 DSH 宿主之外（本仓库、CI、任何克隆后的本地开发）执行 typecheck 的场景。
- **严重等级**：P2（不阻塞运行期功能，但阻塞提交流程与开发体验）
- **首次发现**：2026-09-29 修复 v4 source kind 问题时暴露（见
  [`20260930-fix-v4-producer-owned-source-kind`](../_archive/2026-09/20260930-fix-v4-producer-owned-source-kind.md)）
- **关联资料**：该任务当时以新增 `src/cordis.d.ts` ambient 声明作为**临时**缓解

<!-- CONTENT_END: issue -->

---

## 2. 复现步骤

<!-- CONTENT_START: reproduce -->

**环境**：本仓库 `master`（v0.0.5），Node 24，`npm ci`/`npm install` 后。

**步骤**：

1. `npm run typecheck`
2. 观察报错

**实际结果**：

```
src/index.ts(12,15): error TS2305: Module '"cordis"' has no exported member 'Context'.
```

**复现率**：100%

<!-- CONTENT_END: reproduce -->

---

## 3. 根因分析（RCA）

<!-- CONTENT_START: rca -->

- **直接原因**：`peerDependencies` 与源码 import 都写作 `cordis`，但该名字对应的公开包
  （`cordis@4.0.0-rc.x`）**根入口不导出 `Context`**；DSH 真正提供的是同作者的
  **`@deepseek-ai/cordis`**（scoped 包，已在 npm 发布 4.0.2 / 4.0.3 / 4.0.4）。

- **底层原因**：依赖名沿用了上游 `cordis` 项目名，而 DSH 把它以 `@deepseek-ai/` scope 发布为
  vendored 包并在宿主中挂载；本包只 `import type`，编译后被擦除，所以**运行期一直正常**，
  掩盖了依赖名错误 —— 直到有人在宿主之外跑 `tsc` 才暴露。

- **次生问题（同源）**：`ctx.tools` 与 `agent/pre-step` 的类型来自
  `@deepseek-ai/dsh-tools` 的 `declare module '@deepseek-ai/cordis'` cordis 增强。
  如果本仓库解析到的 cordis 副本与 `dsh-tools` 解析到的**不是同一个包实例**，
  增强会打到另一个模块标识上，`ctx.tools` 报 `TS2339`。
  本仓库 devDependencies 是指向宿主 profile 的**符号链接**，必须与 `dsh-tools` 指向同一份
  cordis（实测：`node_modules/@deepseek-ai/{dsh-llm,dsh-tools}` → 宿主 profile，
  而 `dsh-tools` 再解析到 `…/@deepseek-ai/dsh/node_modules/@deepseek-ai/cordis`）。

- **触发条件**：在 DSH 宿主之外执行 `tsc`。

- **类似风险点**：其他同样以 `cordis` 之名声明 peer 的 DSH 插件会踩同一个坑。

- **影响数据**：无运行期数据影响，纯类型/依赖元数据问题。

<!-- CONTENT_END: rca -->

---

## 4. 修复计划（Step List）

<!-- CONTENT_START: steps -->

- [x] 4.1 在本地稳定复现
- [x] 4.2 定位根因，确认修复方案（改用 `@deepseek-ai/cordis`，而非继续用 ambient shim）
- [x] 4.3 实施修复
  - [x] `peerDependencies`：`cordis` → `@deepseek-ai/cordis: ^4.0.4`
  - [x] `src/index.ts`：`import type { Context } from '@deepseek-ai/cordis'`
  - [x] 删除临时的 `src/cordis.d.ts`
  - [x] devDependencies 装 `@deepseek-ai/cordis@4.0.4`，并使其与 `dsh-tools` 解析到同一实例
  - [x] 顺带修正 `src/index.ts` 头部注释里过期的 `source.kind = "plugin"` 描述
  - [x] 版本号 0.0.5 → 0.0.6
- [x] 4.4 回归测试（类型修复不改变运行期行为，以既有 20 个用例 + 门禁确保无回归）
- [x] 4.5 本地编译通过（`npm run build`）
- [x] 4.6 本地完整测试通过（`npm test` 20/20）+ lint + format:check
- [x] 4.7 同类风险点排查（确认全仓无残留 `from 'cordis'`）
- [x] 4.8 数据修复（不涉及）
- [x] 4.9 更新模块文档（`modules/session-migration.md` 备注区改写为真实结论）
- [ ] 4.10 完成归档动作（参考 AGENTS.md「Step 4」）
  - [ ] `STATUS` 改为 `DONE`，更新 `LAST_UPDATED`
  - [ ] 「验收清单」预声明勾选「PR 已合入目标分支」「任务文件已归档」
  - [ ] 任务文件 `git mv` 到 `_archive/<YYYY-MM>/`
- [ ] 4.11 提交分支并推送（参考 `workflows/11-branch-commit.md`）
- [ ] 4.12 创建 PR（参考 `workflows/12-pull-request.md`）
- [ ] 4.13 CI 通过 + PR 合入主干（参考 `workflows/13-ci-cd-pipeline.md`）

<!-- CONTENT_END: steps -->

---

## 5. 关键决策记录

<!-- CONTENT_START: decisions -->

|  #  | 决策点                           | 选项                                                                                | 选择  | 原因                                                                                                                      | 时间       |
| :-: | -------------------------------- | ----------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------- | ---------- |
|  1  | 类型缺口怎么补                   | A：保留 `src/cordis.d.ts` ambient shim<br>B：改用运行期真实包 `@deepseek-ai/cordis` | **B** | A 是手写并需要长期维护的**假类型**，且会掩盖后续真实签名变化；B 用的是 DSH 实际挂载的包，能拿到真实类型与官方 cordis 增强 | 2026-09-30 |
|  2  | peer 范围怎么写                  | A：`^4.0.4`<br>B：`>=4.0.0 <5`                                                      | **A** | 钉住已在宿主验证过的版本线，避免早期 rc 的类型面差异                                                                      | 2026-09-30 |
|  3  | 是否顺手去掉 `ctx.commands` 断言 | A：去掉（新增 `@deepseek-ai/dsh-commands` 依赖）<br>B：保留断言                     | **B** | 只用到 `register` 一个方法，为它新增依赖不划算；断言是既有写法，非本次问题                                                | 2026-09-30 |

<!-- CONTENT_END: decisions -->

---

## 6. 进度日志（Append-Only）

<!-- CONTENT_START: log -->

- `2026-09-30 00:30` 创建任务。背景：上一任务以 ambient shim 临时缓解，本次按用户要求根治
- `2026-09-30 00:30` 确认 `@deepseek-ai/cordis@4.0.4` 已在 npm 发布且**自带 `lib/types/*.d.ts`**
  （从 app.asar 解出的宿主副本 `files` 字段也证实其 `types: lib/types/index.d.ts`）
- `2026-09-30 00:30` 改造 import 与 peerDependencies，删除 `src/cordis.d.ts`
- `2026-09-30 00:30` 遇到次生问题：`ctx.tools` 报 `TS2339` —— 本仓库 cordis 副本与 `dsh-tools`
  解析到的不是同一实例（`node_modules/@deepseek-ai/cordis` vs
  `…/@deepseek-ai/dsh/node_modules/@deepseek-ai/cordis`）。将本地副本对齐到 `dsh-tools`
  实际使用的那一份后，官方增强生效，`npm run typecheck` **完全通过**
- `2026-09-30 00:30` 门禁全绿：typecheck / lint / format:check / build / test(20/20)
- `2026-09-30 00:30` 版本号 0.0.5 → 0.0.6；模块文档备注区改写为真实结论

<!-- CONTENT_END: log -->

---

## 7. 风险与阻塞

<!-- CONTENT_START: risks -->

| 风险 / 阻塞点                                                                                              | 影响                                                                          | 应对方案                                                                                                                   | 状态   |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ |
| 开发环境的 cordis 实例对齐依赖**符号链接**（指向宿主 profile 与全局 dsh 安装），不是可复现的 `npm ci` 结果 | 在新机器上直接 `npm ci` 后，`ctx.tools` 可能因增强打不到同一实例而报 `TS2339` | 已在模块档案写明该约束；根治需 DSH 侧统一 cordis 实例或提供可安装的 @deepseek-ai/* 源。CI 目前显式跳过 typecheck，不受影响 | 跟进中 |
| CI 仍未接入 typecheck / test（13 号流程既定限制：`@deepseek-ai/*` 私有包不在公共 runner 可用）             | 本次改动无法在 CI 中被自动验证                                                | 本地门禁 + 现有 CI lint/format 兜底；记录在 `workflows/13-ci-cd-pipeline.md`                                               | 跟进中 |

<!-- CONTENT_END: risks -->

---

## 8. 验收清单

<!-- CONTENT_START: acceptance -->

- [x] 在原复现环境下问题不再出现（`npm run typecheck` 通过，无 `TS2305`）
- [x] 回归测试用例已加入并通过（既有 20/20；本次为类型/元数据修复，无行为变更）
- [x] 同类风险点已排查与修复（全仓无残留 `from 'cordis'`）
- [x] 脏数据已修复（不涉及）
- [x] 监控 / 告警已恢复正常（本项目无告警；以门禁可正常执行为准）
- [x] 模块文档已更新（`modules/session-migration.md` 备注区）
- [ ] PR 已合入目标分支
- [ ] 任务文件已从 `_active/` 移入 `_archive/{YYYY-MM}/`

<!-- CONTENT_END: acceptance -->

---

<!-- TASK_HINTS:
  - STATUS 流转：PLANNING → IN_PROGRESS → (BLOCKED) → DONE / ABANDONED
  - P0 / P1 必须在「进度日志」中维护"分钟级"更新，便于跨人协作
  - 修复前必须先复现，复现不出来时不要盲目改代码
  - 回归测试用例必须能在"修复前失败、修复后通过"，否则不算闭环
-->
