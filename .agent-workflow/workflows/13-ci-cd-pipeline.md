<!-- MODULE: ci-cd-pipeline -->
<!-- STATUS: TODO -->
<!-- LAST_ANALYZED: 2026-08-17 -->
<!-- ANALYZER_VERSION: 1.0 -->

# CI/CD 流程

> 定义项目的持续集成（CI）和持续部署/交付（CD）流程，包括流水线配置、构建阶段、自动化检查、部署策略等。

---

## 概述

<!-- CONTENT_START: overview -->

未检测到任何 CI/CD 配置：无 .github/workflows/、无 .gitlab-ci.yml、无 Jenkinsfile、无 Docker/部署编排。

<!-- CONTENT_END: overview -->

---

## 流水线配置

### 触发规则

<!-- CONTENT_START: trigger_rules -->

- 无 CI 配置文件 → 无 push/PR 触发规则。
- 当前质量门禁全部在本地：husky pre-commit + commit-msg（见 11）。

<!-- CONTENT_END: trigger_rules -->

### 流水线阶段

<!-- CONTENT_START: pipeline_stages -->

- 无远程流水线。
- 本地等效流程：typecheck → lint → format:check（pre-commit）→ build → test（05）→ commit/push。

<!-- CONTENT_END: pipeline_stages -->

---

## 自动化检查

<!-- CONTENT_START: automated_checks -->

- 无 CI 自动化检查。
- 本地自动化：.husky/pre-commit（typecheck+lint+format:check）、.husky/commit-msg（commitlint）。

<!-- CONTENT_END: automated_checks -->

---

## 环境与部署

### 环境配置

<!-- CONTENT_START: environments -->

- 无部署环境配置（无 Docker/K8s/Helm/平台配置）。
- 插件运行环境为本机 DSH 宿主；相关环境变量 DSH_HOME / DSH_CHECKOUT 见 03。

<!-- CONTENT_END: environments -->

### 部署策略

<!-- CONTENT_START: deploy_strategy -->

- 无持续部署策略与部署目标。
- 内部交付方式：dev_build_plugin 构建 + dev_inject_plugin 注入，或 dsh plugin add link:<目录>。

<!-- CONTENT_END: deploy_strategy -->

---

## 制品管理

<!-- CONTENT_START: artifacts -->

- 本地构建产物：lib/（tsc，不提交仓库）。
- 打包产物：dev_build_plugin 可产出 tgz；无制品仓库/远程存储。

<!-- CONTENT_END: artifacts -->

---

## 密钥与变量管理

<!-- CONTENT_START: secrets -->

- 无 CI 密钥与变量管理（无 CI 系统）。
- 仓库为 PRIVATE，远端凭据由本机 git/gh 环境管理，无项目内配置。

<!-- CONTENT_END: secrets -->

---

## 常见问题与排查

<!-- CONTENT_START: troubleshooting -->

- 无 CI 可排查。
- 构建问题 → 04-build-process.md；测试问题 → 05-testing-process.md；提交门禁问题 → 11-branch-commit.md。

<!-- CONTENT_END: troubleshooting -->

---

## 相关文件

<!-- CONTENT_START: related_files -->

- 无 CI/CD 相关文件（.github/ 目录不存在）。
- 本地门禁参考：.husky/pre-commit、.husky/commit-msg、package.json scripts。

<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->

- 13 保持 TODO：项目无 CI/CD 配置，待后续引入（如需可补充 GitHub Actions 跑 typecheck+lint+test）。
- 13 不计入阶段一完善度评分。

<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: .gitlab-ci.yml（GitLab CI 配置）
  - 检查文件: .github/workflows/*.yml（GitHub Actions 配置）
  - 检查文件: Jenkinsfile, jenkins/（Jenkins 配置）
  - 检查文件: .circleci/config.yml（CircleCI 配置）
  - 检查文件: .travis.yml（Travis CI 配置）
  - 检查文件: azure-pipelines.yml（Azure DevOps 配置）
  - 检查文件: Dockerfile, docker-compose.yml, docker-compose.*.yml
  - 检查文件: .dockerignore
  - 检查文件: k8s/, kubernetes/, deploy/, deployment/（K8s 部署配置）
  - 检查文件: helm/, charts/（Helm Charts）
  - 检查文件: Makefile（构建/部署相关 target）
  - 检查文件: .env, .env.example, .env.production（环境变量模板）
  - 检查文件: scripts/deploy*, scripts/ci*（部署/CI 脚本）
  - 提取信息: 流水线阶段列表, 触发规则, 环境变量, 部署目标
  - 提取信息: 制品类型与存储位置, 部署策略, 回滚机制
  - 关联模块: 04-build-process.md（编译流程）, 05-testing-process.md（测试流程）, 06-release-process.md（发布流程）
-->
