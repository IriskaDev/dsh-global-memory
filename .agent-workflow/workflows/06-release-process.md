<!-- MODULE: release-process -->
<!-- STATUS: TODO -->
<!-- LAST_ANALYZED: -->
<!-- ANALYZER_VERSION: 1.0 -->

# 发布流程

> 从版本确认到上线验证的完整发布 SOP，包含版本号更新、编译、测试、打包、部署各阶段说明。

---

## 概述

<!-- CONTENT_START: overview -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: overview -->

---

## 版本管理

<!-- CONTENT_START: versioning -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: versioning -->

---

## 环境配置

<!-- CONTENT_START: environments -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: environments -->

---

## 变更日志

<!-- CONTENT_START: changelog -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: changelog -->

---

## 发布 SOP

> 以下为标准发布流程，按步骤顺序执行。区分**常规发布**和**紧急 Hotfix 发布**两种场景。

### Step 1 · 确认发布范围与版本号

- 确认本次发布包含的功能列表（来自 Issue / CHANGELOG）
- 根据变更类型确定版本号递增规则：
  - 不兼容的 API 变更 → MAJOR 版本
  - 向下兼容的新功能 → MINOR 版本
  - 向下兼容的 Bug 修复 → PATCH 版本
- 确认目标发布分支

---

### Step 2 · 确认/切换发布分支

<!-- CONTENT_START: release_branch -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: release_branch -->

---

### Step 3 · 更新版本号

<!-- CONTENT_START: version_bump_cmd -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: version_bump_cmd -->

---

### Step 4 · 更新 CHANGELOG

- 整理本次版本的变更内容（新增/修复/重构/Breaking Changes）
- 按 CHANGELOG 格式写入对应版本条目

<!-- CONTENT_START: changelog_cmd -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: changelog_cmd -->

---

### Step 5 · 全平台编译

执行全平台编译，确保所有目标平台产物正常（详见 [编译流程](../workflows/04-build-process.md)）：

<!-- CONTENT_START: release_build_cmd -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: release_build_cmd -->

**判断**：
- 所有平台编译通过 → 继续 Step 6
- 有平台编译失败 → 修复后重新执行，确认全部通过再继续

---

### Step 6 · 运行全量测试

<!-- CONTENT_START: release_test_cmd -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: release_test_cmd -->

**判断**：
- 全部通过 → 继续 Step 7
- 有失败（发布阻塞级）→ 修复后重新走 Step 4~6
- 有失败（已知存量问题）→ 记录到 CHANGELOG，评估是否可发布

---

### Step 7 · 打包发布产物

<!-- CONTENT_START: package_cmd -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: package_cmd -->

---

### Step 8 · 提交版本变更并打 Tag

<!-- CONTENT_START: tag_cmd -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: tag_cmd -->

---

### Step 9 · 提交发布 PR

参考 [PR 提交流程](../workflows/12-pull-request.md) 创建 PR：
- **release → 生产分支**（合并发布内容）
- **release → 开发分支**（同步版本号和 CHANGELOG 变更）

PR 描述需包含：版本号、变更摘要、测试结论。

---

### Step 10 · 部署到目标环境

<!-- CONTENT_START: deploy_cmd -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: deploy_cmd -->

---

### Step 11 · 发布后验证

- 在目标环境验证核心功能是否正常
- 检查监控/告警平台是否有异常指标
- 确认本次版本的关键需求已按预期上线

**判断**：
- 验证通过 → 发布完成，在 Issue 中关闭相关单据
- 发现问题 → 评估严重程度，决定是否回滚或提紧急 Hotfix

---

## Hotfix 发布流程

> 适用于生产环境紧急故障，需跳过常规发布节奏快速上线。

<!-- CONTENT_START: hotfix_release -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: hotfix_release -->

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
  - 检查文件: CHANGELOG.md, CHANGELOG, HISTORY.md, RELEASES.md
  - 检查文件: VERSION, version.txt, version.py, version.go
  - 检查文件: package.json(version 字段, scripts.release, scripts.deploy)
  - 检查文件: .release-it.json, .release-it.js, release.config.js
  - 检查文件: lerna.json, .changeset/
  - 检查文件: .gitlab-ci.yml(deploy 阶段), .github/workflows/*release*, .github/workflows/*deploy*
  - 检查文件: Jenkinsfile(deploy 阶段)
  - 检查文件: Dockerfile, docker-compose.prod.yml
  - 检查文件: kubernetes/, k8s/, helm/, charts/
  - 检查文件: terraform/, pulumi/, ansible/, serverless.yml
  - 检查文件: .env.production, .env.staging, .env.test
  - 检查文件: Makefile(release/deploy/tag 目标)
  - 检查文件: Procfile, app.yaml, vercel.json, netlify.toml, fly.toml
  - 提取信息: 版本号规范, 版本号存储位置, 版本更新命令
  - 提取信息: 发布命令, 打包命令, 部署命令（按环境区分）, 回滚命令
  - 提取信息: 环境列表（开发/测试/预发/生产）及配置文件路径
  - 提取信息: CHANGELOG 格式和自动生成工具
  - 提取信息: Tag 命名规范（如 v1.2.3）
-->
