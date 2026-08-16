<!-- MODULE: bug-fixing -->
<!-- STATUS: TODO -->
<!-- LAST_ANALYZED: -->
<!-- ANALYZER_VERSION: 1.0 -->

# Bug 排查修复流程

> 从问题确认到修复上线的完整 SOP，包含复现、定位根因、修复、回归验证、提交各阶段说明。

---

## 概述

<!-- CONTENT_START: overview -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: overview -->

---

## 日志系统

<!-- CONTENT_START: logging -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: logging -->

---

## 调试工具配置

<!-- CONTENT_START: debug_config -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: debug_config -->

---

## 错误追踪平台

<!-- CONTENT_START: error_tracking -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: error_tracking -->

---

## Bug 修复 SOP

> 以下为标准 Bug 修复流程，按步骤顺序执行。每个步骤标注了**判断条件**和**失败处理**。

<!-- CONTENT_START: fix_workflow -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: fix_workflow -->

---

## Hotfix 流程

> 适用于**线上紧急故障**，需要绕过常规开发流程快速上线修复。

<!-- CONTENT_START: hotfix_workflow -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: hotfix_workflow -->

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
  - 检查文件: .vscode/launch.json, .idea/runConfigurations/
  - 检查文件: log4j.properties, log4j2.xml, logback.xml, logging.conf, logging.yaml
  - 检查文件: .sentryclirc, sentry.properties
  - 检查配置: package.json(依赖中的 winston/pino/bunyan/log4js/sentry)
  - 检查配置: requirements.txt/Pipfile(logging/sentry-sdk 依赖)
  - 检查配置: go.mod(zap/logrus/sentry-go 依赖)
  - 检查目录: logs/, log/
  - 检查文件: .gdbinit, .lldbinit
  - 检查文件: docker-compose.yml(日志相关配置)
  - 提取信息: 日志框架, 日志级别配置, 日志文件路径, 日志查看命令
  - 提取信息: 调试启动配置（IDE launch.json）, 常用调试命令
  - 提取信息: 错误追踪平台配置, 监控告警配置
  - 提取信息: 单元测试命令（引用自 05-testing-process）
  - 提取信息: 全量测试命令（引用自 05-testing-process）
  - 提取信息: 本机增量/全量/重置编译命令（引用自 04-build-process）
  - 提取信息: 全平台编译命令（引用自 04-build-process）
  - 提取信息: 分支命名规范（fix/* / hotfix/*，引用自 11-branch-commit）
  - 提取信息: 生产分支名称（用于 hotfix 基础分支，引用自 06-release-process）
-->
