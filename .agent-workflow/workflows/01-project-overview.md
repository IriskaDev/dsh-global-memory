<!-- MODULE: project-overview -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-08-17 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 项目说明

> 项目基本信息、技术栈、架构概览和核心依赖说明。

---

## 概述

<!-- CONTENT_START: overview -->

| 项目       | 内容                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 包名       | @dsh-external/dsh-global-memory                                                                                                                |
| 描述       | DSH Agent 跨会话全局记忆插件（toolkit 形态）：会话开始注入条目级索引，模型按需 recall 全文，显式保存/搜索/删除，数据仅存本机 $DSH_HOME/memory/ |
| 版本       | 0.0.1（private，未发布）                                                                                                                       |
| 插件注入面 | tools + commands + systemPrompt（inject = ['tools', 'commands', 'systemPrompt']）                                                              |
| 数据落点   | 本机 $DSH_HOME/memory/，不进入任何业务仓库、不上传远端                                                                                         |

核心行为：4 个 memory_* 工具（save/recall/search/delete）+ 2 个 slash 命令（/memory_save、/memory_delete）+ 会话开始注入一次索引快照（order 150，按 session 缓存）。

<!-- CONTENT_END: overview -->

---

## 技术栈

<!-- CONTENT_START: tech_stack -->

| 层         | 技术                                                                                |
| ---------- | ----------------------------------------------------------------------------------- |
| 语言       | TypeScript 5.9（ESM，module/moduleResolution NodeNext，target/lib ES2023，strict）  |
| 运行时     | Node.js（package.json type=module）                                                 |
| 编译       | tsc -p tsconfig.json（scripts.build），产物 lib/                                    |
| 测试       | node:test + node:assert/strict（src/store.test.ts，12 用例）                        |
| 代码规范   | ESLint 10 flat config + typescript-eslint + eslint-config-prettier；Prettier 3      |
| 提交规范   | commitlint（@commitlint/config-conventional）+ husky（pre-commit / commit-msg）     |
| 运行时依赖 | peerDependencies：cordis、@deepseek-ai/dsh-llm、@deepseek-ai/dsh-tools、schemastery |
| 存储       | 纯 Node fs：$DSH_HOME/memory/index.json + mNNNN_<key>.json（原子写入，索引可重建）  |

<!-- CONTENT_END: tech_stack -->

---

## 架构概览

<!-- CONTENT_START: architecture -->

- 入口 src/index.ts：export name + inject，apply(ctx) 中用 ctx.effect 注册 4 个 memory_* 工具、2 个 slash 命令和 1 个 systemPrompt.context（order 150 注入索引快照）。
- 存储核心 src/store.ts：key/category 白名单清洗、单条记忆原子读写、索引读取/重建、大小写不敏感搜索、删除；全部读写限制在 memory 根目录内（防路径穿越）。
- 依赖方向：src/index.ts → src/store.ts → node:fs/os/path；对外接口为 cordis Context、dsh-tools defineTool、schemastery schema。
- 无网络调用、无数据库、无消息队列；数据只落在本机文件系统，WeakMap 缓存会话索引快照。

<!-- CONTENT_END: architecture -->

---

## 目录结构说明

<!-- CONTENT_START: directory_structure -->

| 路径              | 说明                                                                |
| ----------------- | ------------------------------------------------------------------- |
| src/index.ts      | 插件入口：工具 / slash 命令 / systemPrompt 注入                     |
| src/store.ts      | 记忆存储核心：读写、搜索、索引重建、白名单校验                      |
| src/store.test.ts | node:test 单元测试（12 用例）                                       |
| lib/              | tsc 构建产物（.gitignore / .prettierignore 忽略）                   |
| scripts/build.sh  | DSH_CHECKOUT 环境备用构建脚本（junction 链接 + tsc 编译）           |
| .husky/           | pre-commit（typecheck+lint+format:check）、commit-msg（commitlint） |
| .agent-workflow/  | Agent 工作流文档、模块/链路/任务档案与模板                          |

<!-- CONTENT_END: directory_structure -->

---

## 核心依赖

<!-- CONTENT_START: dependencies -->

| 依赖                                                | 版本约束              | 用途                                 |
| --------------------------------------------------- | --------------------- | ------------------------------------ |
| cordis                                              | >=4.0.0-rc <5（peer） | 插件上下文 / ctx.effect 资源生命周期 |
| @deepseek-ai/dsh-tools                              | >=0.0.1-rc <2（peer） | defineTool 工具注册                  |
| @deepseek-ai/dsh-llm                                | >=0.0.1-rc <2（peer） | 宿主 LLM 环境                        |
| schemastery                                         | ^3.18.0（peer）       | 工具参数 schema（z）                 |
| typescript / @types/node                            | dev ^5.9.0 / ^24.13.3 | 编译与类型                           |
| eslint + typescript-eslint + eslint-config-prettier | dev                   | Lint 规则                            |
| prettier                                            | dev ^3.9.6            | 格式化                               |
| husky + @commitlint/cli + config-conventional       | dev                   | git hooks + Commit 规范              |

<!-- CONTENT_END: dependencies -->

---

## 主要开发者

<!-- CONTENT_START: main_developers -->

| 开发者/角色 | 负责模块           | 角色备注                                                                  |
| ----------- | ------------------ | ------------------------------------------------------------------------- |
| IriskaDev   | 全仓（单模块插件） | GitHub 仓库 owner（远端 github.com/IriskaDev/dsh-global-memory，PRIVATE） |
| 待补充      | -                  | 本次分析约定不执行 git log；未配置 CODEOWNERS                             |

> PR 推荐评审人时，以 12-pull-request.md 的文件作者统计为准，IriskaDev 为仓库 owner 兜底候选。

<!-- CONTENT_END: main_developers -->

---

## 相关文件

<!-- CONTENT_START: related_files -->

- README.md — 项目说明、工具/命令、数据格式与隐私说明
- package.json — 包元数据、scripts、peer/dev 依赖
- tsconfig.json — 编译与类型配置
- src/index.ts / src/store.ts / src/store.test.ts — 源码与测试
- scripts/build.sh — 备用构建脚本
- .agent-workflow/ — 工作流文档

<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->

- private 包，版本 0.0.1，无 CI、无 CODEOWNERS、无 PR 模板、无发布脚本。
- 主要开发者表格中 IriskaDev 仅来自 GitHub 远端 owner 事实；提交频次统计需后续执行 git log 补充。

<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: README.md, README, readme.md
  - 检查文件: package.json, go.mod, go.sum, Cargo.toml, pom.xml, build.gradle, requirements.txt, Pipfile, pyproject.toml, composer.json, Gemfile, mix.exs, pubspec.yaml
  - 检查文件: .nvmrc, .python-version, .ruby-version, .tool-versions, .node-version
  - 检查文件: tsconfig.json, webpack.config.*, vite.config.*, rollup.config.*
  - 检查文件: Dockerfile, docker-compose.yml
  - 检查目录: src/, lib/, app/, cmd/, pkg/, internal/
  - 提取信息: 项目名称(name字段), 描述(description字段), 版本(version字段), 依赖列表(dependencies), 语言版本
  - 主要开发者分析: 执行 git log --format='%ae %an' | sort | uniq -c | sort -rn | head -10 统计提交频次最高的开发者
  - 主要开发者分析: 检查 CODEOWNERS 文件，提取各路径的 Owner 列表
  - 主要开发者分析: 两种来源合并去重后填入"主要开发者"表格，标注负责模块（来自 CODEOWNERS）
-->
