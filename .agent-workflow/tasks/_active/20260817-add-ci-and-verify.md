<!-- TASK_ID: 20260817-add-ci-and-verify -->
<!-- TASK_TYPE: feature -->
<!-- STATUS: IN_PROGRESS -->
<!-- CREATED: 2026-08-17 -->
<!-- LAST_UPDATED: 2026-08-17 19:10 -->
<!-- OWNER: IriskaDev -->
<!-- BRANCH: master -->
<!-- RELATED_WORKFLOWS: 03,04,05,11,12,13 -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_FEATURE / TASK_STATUS_ENUM / TASK_TYPE_ENUM；修改本行前请先改常量表（D5.E1/E2 自检规则会校验）。 -->

# 补齐 GitHub Actions CI 并验证新会话工具面

> 为仓库补上基础 CI 门禁（lint + format:check），并验证插件注入后新会话工具/slash 命令可用。
>
> 📐 **章节结构（共 7 节）**：1 需求理解 → 2 影响范围 → 3 实施计划 → 4 关键决策 → 5 进度日志 → 6 风险与阻塞 → 7 **验收清单（最后一节）**

---

## 1. 需求理解

<!-- CONTENT_START: requirement -->

- **背景 / 起源**：13 号流程（CI/CD）是阶段一唯一 TODO；当前仓库无任何 CI 门禁，PR 合入仅靠本地 husky 兜底。
- **目标用户 / 调用方**：仓库维护者与后续 PR 流程。
- **核心交付物**：
  - `.github/workflows/ci.yml`：push/PR 触发，跑 `npm run lint` + `npm run format:check`
  - 13 号流程文档从 TODO 更新为 PARTIAL（记录 CI 配置与限制）
  - 新会话验证清单与结论（工具 schema / slash 命令 / 索引注入）
- **不做范围（Out of Scope）**：typecheck / test 不接入 CI（`@deepseek-ai/*` 私有包不在 npm registry，待公开或配置私有源后接入）
- **验收标准**：CI workflow 文件存在且语法正确；13 号流程状态更新；新会话验证有明确结论或待办
- **关联资料**：https://github.com/IriskaDev/dsh-global-memory

<!-- CONTENT_END: requirement -->

---

## 2. 影响范围分析

<!-- CONTENT_START: impact -->

- **涉及模块**：`memory-tools`（工具面验证）、13 号流程文档
- **涉及文件 / 路径**：
  - `.github/workflows/ci.yml`（新增）
  - `.agent-workflow/workflows/13-ci-cd-pipeline.md`（更新）
- **涉及接口 / 数据结构**：无
- **依赖的上下游**：GitHub Actions（公共 runner）、npm registry（仅公共包）
- **数据库 / 配置 / 环境变量变更**：无
- **兼容性影响**：无

<!-- CONTENT_END: impact -->

---

## 3. 实施计划（Step List）

<!-- CONTENT_START: steps -->

- [x] 3.1 创建任务书
- [x] 3.2 新增 `.github/workflows/ci.yml`（lint + format:check）
- [x] 3.3 更新 13 号流程文档为 PARTIAL，记录 CI 配置与 typecheck/test 未接入原因
- [x] 3.4 本地门禁通过（typecheck/lint/format:check）
- [x] 3.5 提交 feature 分支并创建 PR
- [ ] 3.6 PR 合入 master
- [ ] 3.7 归档任务文件
- [ ] 3.8 新会话验证（工具 schema / slash 命令 / 索引注入），记录结论

<!-- CONTENT_END: steps -->

---

## 4. 关键决策记录

<!-- CONTENT_START: decisions -->

|  #  | 决策点  | 选项                                               | 选择                   | 原因                                                                                | 时间       |
| :-: | ------- | -------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------- | ---------- |
|  1  | CI 范围 | lint+format+typecheck+test 全接入 / 仅 lint+format | 仅 lint + format:check | `@deepseek-ai/*` 私有包不在 npm registry，typecheck/test 无法在公共 runner 安装依赖 | 2026-08-17 |

<!-- CONTENT_END: decisions -->

---

## 5. 进度日志（Append-Only）

<!-- CONTENT_START: log -->

- `2026-08-17 19:10` 创建任务，需求已与用户对齐（补 CI + 新会话验证）
- `2026-08-17 19:20` 3.2-3.4 完成：新增 ci.yml，13 号流程更新为 PARTIAL，本地门禁通过

<!-- CONTENT_END: log -->

---

## 6. 风险与阻塞

<!-- CONTENT_START: risks -->

| 风险 / 阻塞点                | 影响             | 应对方案                                   | 状态   |
| ---------------------------- | ---------------- | ------------------------------------------ | ------ |
| -                            | -                | -                                          | -      |
| 新会话验证需用户配合开新会话 | 验证结论可能滞后 | 给出明确验证清单，请用户在新会话执行或反馈 | 跟进中 |

<!-- CONTENT_END: risks -->

---

## 7. 验收清单

<!-- CONTENT_START: acceptance -->

- [ ] 所有 Step 已勾选完成
- [ ] CI workflow 文件已推送到远端
- [ ] 13 号流程文档状态已更新
- [ ] 本地门禁通过
- [ ] PR 已合入目标分支
- [ ] 任务文件已从 `_active/` 移入 `_archive/{YYYY-MM}/`
- [ ] 新会话验证有明确结论或用户确认

<!-- CONTENT_END: acceptance -->

---

<!-- TASK_HINTS:
  - STATUS 流转：PLANNING → IN_PROGRESS → (BLOCKED) → DONE / ABANDONED
  - 每完成一个 Step 必须：勾选 checkbox + 追加进度日志 + 更新 LAST_UPDATED
  - 任何阻塞必须把 STATUS 改为 BLOCKED 并在「风险与阻塞」记录原因
  - 中断恢复时：先读元数据 → 再读 Step List 找首个未勾选项 → 再读最近 3 条进度日志
-->
