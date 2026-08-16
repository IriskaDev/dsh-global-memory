<!-- MODULE: code-review -->
<!-- STATUS: PARTIAL -->
<!-- LAST_ANALYZED: 2026-08-17 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 代码 Review 规范

> 本文档定义项目的 **Code Review 规范配置**，包括 Review 标准、代码所有权、自动化检查和评审人规则。
>
> **与 12-PR 评审的分工**：
>
> - 本文档（08）：**是什么** —— 项目 Review 的规则、标准和工具配置（静态规范）
> - [PR 评审流程（12）](../workflows/12-pull-request.md) Part 2：**怎么做** —— Agent 实际执行 PR 评审的操作 SOP

---

## 概述

<!-- CONTENT_START: overview -->

- Review 标准建立在 02（规则限制）+ 05（测试）+ 11（提交规范）之上。
- 自动化检查仅有 husky pre-commit（typecheck + lint + format:check）与 commit-msg（commitlint）；无 CI Review 任务。
- 未配置 CODEOWNERS、PR 模板、Sonar/Danger 等审查工具。

<!-- CONTENT_END: overview -->

---

## 代码所有权（CODEOWNERS）

<!-- CONTENT_START: code_ownership -->

- 未检测到 CODEOWNERS 文件。
- 仓库为单模块私有插件（远端 github.com/IriskaDev/dsh-global-memory，PRIVATE）；评审兜底候选：仓库 owner IriskaDev + 12 流程按变更文件历史统计的作者。

<!-- CONTENT_END: code_ownership -->

---

## Review 标准

> 以下为本项目的 Review 检查标准，[PR 评审流程](../workflows/12-pull-request.md) 执行评审时以此为依据。

<!-- CONTENT_START: review_standards -->

| 维度       | 检查点                                                                          |
| ---------- | ------------------------------------------------------------------------------- |
| 类型/编译  | npm run typecheck 通过                                                          |
| Lint/格式  | npm run lint、npm run format:check 通过（pre-commit 已强制）                    |
| 命名       | 文件名 kebab-case、变量 camelCase、类型 PascalCase、常量 UPPER_SNAKE_CASE（02） |
| 数据安全   | key/category 仅 [a-zA-Z0-9_-]；所有读写限制在 $DSH_HOME/memory/；无路径穿越     |
| 存储正确性 | 原子写入、索引缺失/损坏可重建、覆盖保留 created、删除同步索引                   |
| 测试       | 变更涉及 store 逻辑必须有 node:test 回归用例；npm test 全绿（05）               |
| 提交       | Conventional Commits（11），hook 自动校验                                       |

<!-- CONTENT_END: review_standards -->

---

## 审批规则

<!-- CONTENT_START: approval_rules -->

- 未检测到分支保护/审批人数/必要评审人等配置。
- 当前默认：PR 需仓库 owner（IriskaDev）或用户显式指定评审人确认；最低通过标准=预检门禁全绿 + 无 Blocker 意见。
- 正式审批规则待手动补充。

<!-- CONTENT_END: approval_rules -->

---

## 自动化检查（CI 门禁）

<!-- CONTENT_START: automated_checks -->

| 检查         | 触发点                           | 是否阻塞              |
| ------------ | -------------------------------- | --------------------- |
| typecheck    | .husky/pre-commit                | 是（失败阻止 commit） |
| lint         | .husky/pre-commit                | 是                    |
| format:check | .husky/pre-commit                | 是                    |
| commitlint   | .husky/commit-msg                | 是                    |
| 测试         | 无自动 hook；提交前手动 npm test | 否（但建议必须）      |
| CI Review    | 无（未配置 CI）                  | -                     |

<!-- CONTENT_END: automated_checks -->

---

## PR 描述模板

<!-- CONTENT_START: mr_template -->

- 未检测到 .github/PULL_REQUEST_TEMPLATE.md。
- PR 描述统一使用 12-pull-request.md Part 1 Step 3 的内置模板（变更类型/原因/分析/结果/影响/测试/关联 Issue/文件清单/推荐评审人）。

<!-- CONTENT_END: mr_template -->

---

## 相关文件

<!-- CONTENT_START: related_files -->

- .husky/pre-commit、.husky/commit-msg
- eslint.config.js、.prettierrc.json（评审标准来源）
- .agent-workflow/workflows/02-rules-constraints.md、05-testing-process.md、11-branch-commit.md

<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->

- 08 为 PARTIAL：自动化门禁已有，但缺 CODEOWNERS、PR 模板、CI Review 与正式审批规则。
- 08 只定义“是什么”；PR 评审执行逻辑见 12-pull-request.md Part 2。

<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: CODEOWNERS, .github/CODEOWNERS, docs/CODEOWNERS（提取各路径 Owner 列表）
  - 检查文件: .github/PULL_REQUEST_TEMPLATE.md, .github/pull_request_template.md
  - 检查文件: .github/workflows/*lint*, .github/workflows/*review*, .gitlab-ci.yml(lint/review job)
  - 检查文件: .pre-commit-config.yaml, lint-staged 配置（package.json 或 .lintstagedrc）
  - 检查文件: sonar-project.properties, .sonarcloud.properties
  - 检查文件: .danger.js, dangerfile.ts, reviewdog.yml
  - 检查文件: 分支保护规则相关配置（.gitlab 设置 / .github/branch-protection）
  - 提取信息: CODEOWNERS 规则（路径 → Owner 映射）, PR 模板内容
  - 提取信息: CI 自动化检查列表（工具名、触发时机、是否阻塞合并）
  - 提取信息: 审批规则（最少人数、必要评审人角色）
  - 注意: 本文档聚焦"规范配置"，不包含 PR 评审执行逻辑（见 12-pull-request.md Part 2）
-->
