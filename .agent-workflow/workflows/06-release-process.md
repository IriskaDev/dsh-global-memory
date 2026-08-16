<!-- MODULE: release-process -->
<!-- STATUS: PARTIAL -->
<!-- LAST_ANALYZED: 2026-08-17 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 发布流程

> 从版本确认到上线验证的完整发布 SOP，包含版本号更新、编译、测试、打包、部署各阶段说明。

---

## 概述

<!-- CONTENT_START: overview -->

- 无正式发布流水线与发布工具：未检测到 CHANGELOG、.release-it、changeset、release/deploy scripts。
- 包为 private（version 0.0.1），分发方式是内部 DSH 装配：dev_build_plugin 构建 + dev_inject_plugin 注入，或 dsh plugin add link:<目录>。
- 版本号唯一事实源：package.json version。

<!-- CONTENT_END: overview -->

---

## 版本管理

<!-- CONTENT_START: versioning -->

| 项         | 内容                                                                          |
| ---------- | ----------------------------------------------------------------------------- |
| 当前版本   | 0.0.1                                                                         |
| 版本存储   | package.json（version 字段）                                                  |
| 版本方案   | SemVer（沿用 Conventional Commits 变更类型映射 MAJOR/MINOR/PATCH 的常规约定） |
| 自动化工具 | 未检测到 .release-it / changeset / release script                             |

<!-- CONTENT_END: versioning -->

---

## 环境配置

<!-- CONTENT_START: environments -->

- 无多环境配置（无 .env.production / .env.staging、无部署平台配置）。
- 运行时唯一相关环境变量：DSH_HOME（记忆数据目录）；构建备用：DSH_CHECKOUT。
- “发布目标”= 用户本机 DSH 宿主，非服务器部署。

<!-- CONTENT_END: environments -->

---

## 变更日志

<!-- CONTENT_START: changelog -->

- 未检测到 CHANGELOG.md / RELEASES.md，无自动生成工具。
- 当前可依赖 Conventional Commits 提交历史作为变更记录来源；建议后续补充 CHANGELOG 文件。

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

- 无 release/* 分支策略。分支模型为单 master + 按需 feature/<slug>（见 11）。
- 版本号变更与发布内容直接在 master 提交；无生产分支概念。

<!-- CONTENT_END: release_branch -->

---

### Step 3 · 更新版本号

<!-- CONTENT_START: version_bump_cmd -->

# 手动修改 package.json 的 version 字段（无 npm version / release 脚本）

# 建议同步更新 README/相关文档中的版本引用（当前 README 未硬编码版本号）

<!-- CONTENT_END: version_bump_cmd -->

---

### Step 4 · 更新 CHANGELOG

- 整理本次版本的变更内容（新增/修复/重构/Breaking Changes）
- 按 CHANGELOG 格式写入对应版本条目

<!-- CONTENT_START: changelog_cmd -->

未配置 CHANGELOG 生成命令；待手动补充变更记录文件后在此固化命令。

<!-- CONTENT_END: changelog_cmd -->

---

### Step 5 · 全平台编译

执行全平台编译，确保所有目标平台产物正常（详见 [编译流程](../workflows/04-build-process.md)）：

<!-- CONTENT_START: release_build_cmd -->

npm run build

# DSH 环境备用：bash scripts/build.sh

# 详细命令见 04-build-process.md

<!-- CONTENT_END: release_build_cmd -->

**判断**：

- 所有平台编译通过 → 继续 Step 6
- 有平台编译失败 → 修复后重新执行，确认全部通过再继续

---

### Step 6 · 运行全量测试

<!-- CONTENT_START: release_test_cmd -->

npm test

# 先 build 再运行 12 个 node:test 用例；详细见 05-testing-process.md

<!-- CONTENT_END: release_test_cmd -->

**判断**：

- 全部通过 → 继续 Step 7
- 有失败（发布阻塞级）→ 修复后重新走 Step 4~6
- 有失败（已知存量问题）→ 记录到 CHANGELOG，评估是否可发布

---

### Step 7 · 打包发布产物

<!-- CONTENT_START: package_cmd -->

# 内部装配（推荐）：dev_build_plugin 构建打包 + dev_inject_plugin 注入

# 或链接安装：dsh plugin add link:<本目录>

# 注：private=true，不执行 npm publish；dev_build_plugin 可产出 tgz 供安装/发布工具使用

<!-- CONTENT_END: package_cmd -->

---

### Step 8 · 提交版本变更并打 Tag

<!-- CONTENT_START: tag_cmd -->

未检测到 tag 脚本与 tag 命名配置；如需标记版本建议手动执行 git tag v0.0.1 并推送（当前仓库无 release 自动化）。

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

无部署目标与部署脚本。插件在本机 DSH 宿主中装配即“上线”；无回滚命令，旧版本可通过重新注入对应目录/包回退。

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

- 无生产环境，hotfix 等价于紧急 bug 修复：在 master 直接修复（较大改动可 feature 分支）→ npm run build → npm test → Conventional Commit → push。
- 修复 SOP 见 07-bug-fixing.md；无独立的 hotfix 分支/tag/回滚流水线。

<!-- CONTENT_END: hotfix_release -->

---

## 相关文件

<!-- CONTENT_START: related_files -->

- package.json（version、scripts、files）
- README.md（安装/装配方式）
- scripts/build.sh（DSH 环境构建）

<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->

- 发布流程为 PARTIAL：版本事实存在，但缺 CHANGELOG、tag/发布自动化、环境与回滚机制，需用户后续补充。
- 阶段一完善度评分不包含 06，不影响解锁判定。

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
