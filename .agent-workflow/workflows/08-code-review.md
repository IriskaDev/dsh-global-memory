<!-- MODULE: code-review -->
<!-- STATUS: TODO -->
<!-- LAST_ANALYZED: -->
<!-- ANALYZER_VERSION: 1.0 -->

# 代码 Review 规范

> 本文档定义项目的 **Code Review 规范配置**，包括 Review 标准、代码所有权、自动化检查和评审人规则。
>
> **与 12-PR 评审的分工**：
> - 本文档（08）：**是什么** —— 项目 Review 的规则、标准和工具配置（静态规范）
> - [PR 评审流程（12）](../workflows/12-pull-request.md) Part 2：**怎么做** —— Agent 实际执行 PR 评审的操作 SOP

---

## 概述

<!-- CONTENT_START: overview -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: overview -->

---

## 代码所有权（CODEOWNERS）

<!-- CONTENT_START: code_ownership -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: code_ownership -->

---

## Review 标准

> 以下为本项目的 Review 检查标准，[PR 评审流程](../workflows/12-pull-request.md) 执行评审时以此为依据。

<!-- CONTENT_START: review_standards -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: review_standards -->

---

## 审批规则

<!-- CONTENT_START: approval_rules -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: approval_rules -->

---

## 自动化检查（CI 门禁）

<!-- CONTENT_START: automated_checks -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: automated_checks -->

---

## PR 描述模板

<!-- CONTENT_START: mr_template -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: mr_template -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
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
