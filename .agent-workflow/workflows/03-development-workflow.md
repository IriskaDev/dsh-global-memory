<!-- MODULE: development-workflow -->
<!-- STATUS: TODO -->
<!-- LAST_ANALYZED: -->
<!-- ANALYZER_VERSION: 1.0 -->

# 开发流程

> 从需求到 PR 提交的完整日常开发 SOP，包含分支确认、代码修改、编译验证、测试、文档更新、提交等各阶段说明。

---

## 概述

<!-- CONTENT_START: overview -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: overview -->

---

## 环境搭建

<!-- CONTENT_START: environment_setup -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: environment_setup -->

---

## 依赖安装

<!-- CONTENT_START: dependency_install -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: dependency_install -->

---

## 本地运行

<!-- CONTENT_START: local_run -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: local_run -->

---

## 日常开发 SOP

> 以下为标准开发流程，按步骤顺序执行。每个步骤标注了**判断条件**和**失败处理**。

<!-- CONTENT_START: daily_workflow -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: daily_workflow -->

---

## 开发工具推荐

<!-- CONTENT_START: dev_tools -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: dev_tools -->

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
  - 检查文件: Dockerfile, docker-compose.yml, docker-compose.yaml, .devcontainer/devcontainer.json
  - 检查文件: Vagrantfile
  - 检查文件: Makefile(dev/run/serve/test/clean 目标), Justfile
  - 检查文件: package.json(scripts.dev/start/serve/test/build/clean)
  - 检查文件: .env, .env.example, .env.development, .env.local
  - 检查文件: .vscode/settings.json, .vscode/extensions.json, .vscode/launch.json
  - 检查文件: .idea/, .editorconfig
  - 检查文件: tilt.yaml, skaffold.yaml
  - 检查文件: commitlint.config.*, .commitlintrc*, .czrc（commit 规范配置）
  - 检查目录: .devcontainer/
  - 提取信息: 启动命令, 端口号, 环境变量列表, 依赖安装命令, 开发工具配置
  - 提取信息: 单元测试命令（支持按模块/文件过滤）, 全量测试命令
  - 提取信息: 本机增量/全量/重置编译命令（引用自 04-build-process）
  - 提取信息: 全平台编译命令（引用自 04-build-process）
  - 提取信息: commit 消息规范, 分支命名规范（引用自 11-branch-commit）
-->
