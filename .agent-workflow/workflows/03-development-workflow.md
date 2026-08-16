<!-- MODULE: development-workflow -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-08-17 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 开发流程

> 从需求到 PR 提交的完整日常开发 SOP，包含分支确认、代码修改、编译验证、测试、文档更新、提交等各阶段说明。

---

## 概述

<!-- CONTENT_START: overview -->

- 插件型项目：无 dev server，日常 = 改 src → typecheck/lint/format → build → test → commit；运行验证在 DSH 宿主中注入插件完成。
- 分支：日常直接 master；较大改动开 feature/<slug>（见 11-branch-commit）。
- Commit 为 Conventional Commits，husky 自动执行 typecheck + lint + format:check 与 commitlint（见 11-branch-commit）。

<!-- CONTENT_END: overview -->

---

## 环境搭建

<!-- CONTENT_START: environment_setup -->

| 项             | 内容                                                                             |
| -------------- | -------------------------------------------------------------------------------- |
| 必需环境       | Node.js + npm（依赖 TypeScript 5.9、ESLint 10、Prettier 3 等 devDependencies）   |
| 可选环境       | DSH_CHECKOUT：仅 scripts/build.sh 备用构建需要，指向含 packages/ 的 DSH checkout |
| 运行时环境变量 | DSH_HOME：记忆数据根目录（默认 ~/.dsh），记忆写入 $DSH_HOME/memory/              |
| 容器/虚拟环境  | 未检测到 Dockerfile / docker-compose / .devcontainer                             |
| IDE 配置       | 未检测到 .vscode/ 或 .idea/ 配置                                                 |

无 .env.example；除 DSH_HOME 外无必需环境变量模板。

<!-- CONTENT_END: environment_setup -->

---

## 依赖安装

<!-- CONTENT_START: dependency_install -->

| 方式               | 命令                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 常规安装           | npm install（prepare 自动安装 husky）                                                                            |
| 宿主 checkout 构建 | bash scripts/build.sh（探测 DSH_CHECKOUT → junction 链接 cordis/dsh-tools/dsh-llm 等 → 用 checkout 的 tsc 编译） |
| 内部开发装配       | dev_build_plugin 构建 + dev_inject_plugin 注入；或 dsh plugin add link:<本目录>                                  |

> npm install 后确认 .husky/pre-commit、.husky/commit-msg 已存在；git hooks 由 husky 管理。

<!-- CONTENT_END: dependency_install -->

---

## 本地运行

<!-- CONTENT_START: local_run -->

- 本项目无独立启动命令（无 dev/start/serve script）。
- 运行验证：构建产物经 DSH 宿主装配后生效——dev_build_plugin 构建、dev_inject_plugin 注入，或 dsh plugin add link:<本目录>。
- 验证点：memory_save / memory_recall / memory_search / memory_delete 四个工具与 /memory_save、/memory_delete 命令；检查 $DSH_HOME/memory/ 下的 index.json 与 m*.json。

<!-- CONTENT_END: local_run -->

---

## 日常开发 SOP

> 以下为标准开发流程，按步骤顺序执行。每个步骤标注了**判断条件**和**失败处理**。

<!-- CONTENT_START: daily_workflow -->

1. **确认需求与范围**：明确要改 src/index.ts（插件注入面）还是 src/store.ts（存储逻辑）。
2. **选择分支**：日常改动直接 master；较大改动先 git checkout -b feature/<slug>（分支规范见 11）。
3. **修改代码**：遵循 02 的命名约定与 key/category 白名单；资源注册使用 ctx.effect（fiber dispose 自动清理）。
   - **Step 3.1 · 查台账（强制）**：修改开始前按 15-module-inventory.md Step 4 三级下钻读取 modules/index.md，命中模块档案则校验时效并加载，避免脱离既有模块上下文。
4. **静态检查**：npm run typecheck && npm run lint（husky pre-commit 会再强制跑 typecheck + lint + format:check）。
5. **构建**：npm run build（产物 lib/；04 有说明）。
6. **测试**：npm test（先 build 再 node --test lib/store.test.js，05 有说明）。
7. **提交**：Conventional Commits（11 有说明）；提交前通过 11 的台账同步门禁（LAST_ANALYZED=今日且时效 🟢）。
8. **推送/PR**：master 日常改动直接推送；feature 分支合并按 12 创建 PR。
9. **文档同步**：涉及接口/存储结构变化时，按 09/15 更新模块档案与 modules/index.md。
10. **完成前刷新**：
    - **Step 10.1 · 刷台账（强制）**：按 15-module-inventory.md Step 5 增量刷新受影响模块档案（三段依赖按最新代码重写）+ modules/index.md（最后更新=今日、时效 🟢）；档案与代码同一次 commit 提交。

<!-- CONTENT_END: daily_workflow -->

---

## 开发工具推荐

<!-- CONTENT_START: dev_tools -->

| 工具               | 用途     | 命令                                             |
| ------------------ | -------- | ------------------------------------------------ |
| tsc                | 类型检查 | npm run typecheck                                |
| ESLint             | 静态检查 | npm run lint / npm run lint:fix                  |
| Prettier           | 格式化   | npm run format / npm run format:check            |
| node:test          | 单元测试 | npm test                                         |
| husky + commitlint | 提交门禁 | 自动触发（.husky/pre-commit、.husky/commit-msg） |

未检测到 IDE 配置文件；VS Code 打开后建议安装 ESLint 与 Prettier 扩展。

<!-- CONTENT_END: dev_tools -->

---

## 相关文件

<!-- CONTENT_START: related_files -->

- package.json（scripts）
- tsconfig.json（编译配置）
- scripts/build.sh（DSH checkout 备用构建）
- .husky/pre-commit、.husky/commit-msg（提交门禁）
- README.md（安装与验证说明）

<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->

- 开发环境与运行环境都依赖本机 DSH 宿主，无独立端口/服务。
- 日常开发 SOP 中的分支、Commit 细节以 11-branch-commit.md 为唯一权威来源；编译/测试细节分别见 04/05。

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
