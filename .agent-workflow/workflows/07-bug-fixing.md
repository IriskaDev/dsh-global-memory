<!-- MODULE: bug-fixing -->
<!-- STATUS: PARTIAL -->
<!-- LAST_ANALYZED: 2026-08-17 -->
<!-- ANALYZER_VERSION: 1.0 -->

# Bug 排查修复流程

> 从问题确认到修复上线的完整 SOP，包含复现、定位根因、修复、回归验证、提交各阶段说明。

---

## 概述

<!-- CONTENT_START: overview -->

- 项目无日志框架、无 IDE 调试配置、无错误追踪平台；排查主要靠 MemoryError/标准 Error 消息、node:test 回归用例与宿主工具返回。
- Bug 修复与日常开发共用 04/05/11 流程：typecheck → lint → build → test → Conventional Commit。

<!-- CONTENT_END: overview -->

---

## 日志系统

<!-- CONTENT_START: logging -->

- 未检测到日志框架依赖（winston/pino/bunyan 等）与日志配置文件（log4j/logback 等）。
- 运行期错误以 MemoryError（src/store.ts）或标准 Error 抛出，由工具 execute/handler 捕获后作为字符串返回宿主展示；未写日志文件。

<!-- CONTENT_END: logging -->

---

## 调试工具配置

<!-- CONTENT_START: debug_config -->

- 未检测到 .vscode/launch.json、.idea/runConfigurations 等调试配置。
- 可用 Node 原生调试：node --inspect lib/store.test.js（先 npm run build）；配合 --test-name-pattern 过滤用例。

<!-- CONTENT_END: debug_config -->

---

## 错误追踪平台

<!-- CONTENT_START: error_tracking -->

- 未检测到 Sentry 等错误追踪平台配置。
- 无监控告警系统；插件错误由 DSH 宿主交互面直接可见，可作为事实上的上报通道。

<!-- CONTENT_END: error_tracking -->

---

## Bug 修复 SOP

> 以下为标准 Bug 修复流程，按步骤顺序执行。每个步骤标注了**判断条件**和**失败处理**。

<!-- CONTENT_START: fix_workflow -->

1. **确认问题**：复现 bug，记录触发工具/命令、输入与期望结果（优先在 src/store.test.ts 用用例复现）。
2. **定位根因**：store 层问题看 src/store.ts（白名单清洗、原子写、索引重建）；插件面问题看 src/index.ts（工具/命令注册、systemPrompt.context）。
3. **先写回归测试**：在 src/store.test.ts 增加失败用例，确保能复现（05 要求）。
4. **修复**：遵循 02 命名与白名单；保持所有读写限制在 memory 目录内。
5. **验证**：npm run typecheck && npm run lint && npm test（husky pre-commit 会自动重复 typecheck+lint+format:check）。
6. **提交**：Conventional Commits 的 fix 类型（见 11）；日常修复直接 master，较大修复开 feature/<slug>。
7. **回归确认**：npm test 全量通过；如涉及宿主行为，注入后手工验证。

<!-- CONTENT_END: fix_workflow -->

---

## Hotfix 流程

> 适用于**线上紧急故障**，需要绕过常规开发流程快速上线修复。

<!-- CONTENT_START: hotfix_workflow -->

- 无线上生产环境与部署流水线，hotfix 不涉及跨环境发布。
- 紧急修复：直接在 master 修改 → typecheck/lint/build/test → fix(scope): 描述 提交并 push；如变更大则开 feature 分支走 12 PR。
- 无 tag/回滚自动化；回退依赖 git 历史 revert 或重新注入旧版本。

<!-- CONTENT_END: hotfix_workflow -->

---

## 相关文件

<!-- CONTENT_START: related_files -->

- src/store.ts（MemoryError 与核心逻辑）
- src/store.test.ts（回归用例）
- src/index.ts（工具/命令入口）
- package.json（typecheck/lint/test scripts）

<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->

- 未检测到日志/调试/错误追踪平台配置，相关章节为 PARTIAL，待手动补充。
- Bug 修复 SOP 的分支与提交规范以 11-branch-commit.md 为唯一权威来源。

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
