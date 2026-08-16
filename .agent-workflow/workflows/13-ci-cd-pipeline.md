<!-- MODULE: ci-cd-pipeline -->
<!-- STATUS: TODO -->
<!-- LAST_ANALYZED: -->
<!-- ANALYZER_VERSION: 1.0 -->

# CI/CD 流程

> 定义项目的持续集成（CI）和持续部署/交付（CD）流程，包括流水线配置、构建阶段、自动化检查、部署策略等。

---

## 概述

<!-- CONTENT_START: overview -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: overview -->

---

## 流水线配置

### 触发规则

<!-- CONTENT_START: trigger_rules -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: trigger_rules -->

### 流水线阶段

<!-- CONTENT_START: pipeline_stages -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: pipeline_stages -->

---

## 自动化检查

<!-- CONTENT_START: automated_checks -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: automated_checks -->

---

## 环境与部署

### 环境配置

<!-- CONTENT_START: environments -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: environments -->

### 部署策略

<!-- CONTENT_START: deploy_strategy -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: deploy_strategy -->

---

## 制品管理

<!-- CONTENT_START: artifacts -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: artifacts -->

---

## 密钥与变量管理

<!-- CONTENT_START: secrets -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: secrets -->

---

## 常见问题与排查

<!-- CONTENT_START: troubleshooting -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: troubleshooting -->

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
