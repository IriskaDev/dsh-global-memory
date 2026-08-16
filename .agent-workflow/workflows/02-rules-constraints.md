<!-- MODULE: rules-constraints -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-08-17 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 规则限制

> 编码规范、命名约定、技术限制和代码风格配置说明。

---

## 概述

<!-- CONTENT_START: overview -->

- ESLint + Prettier 均已配置并接入 npm scripts 与 husky pre-commit。
- 命名规范为显式约定（文件名 kebab-case、函数/变量 camelCase、类型/接口 PascalCase、常量 UPPER_SNAKE_CASE）。
- key / category 使用 [a-zA-Z0-9_-] 白名单，并在 src/store.ts 的 safeKey / safeCategory 中强制清洗。

<!-- CONTENT_END: overview -->

---

## 编码规范

<!-- CONTENT_START: coding_standards -->

| 项目              | 规则                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Lint 引擎         | eslint.config.js（flat config）：js.configs.recommended + tseslint.configs.recommended + eslint-config-prettier |
| 自定义规则        | @typescript-eslint/no-explicit-any: off                                                                         |
| 忽略范围          | node_modules/、lib/、dist/、*.tgz                                                                               |
| 运行环境          | globals.node                                                                                                    |
| 格式化            | .prettierrc.json：semi:false、singleQuote:true、trailingComma:all、printWidth:120                               |
| 格式化忽略        | node_modules/、lib/、dist/、*.tgz、package-lock.json                                                            |
| 执行命令          | npm run lint / lint:fix / format / format:check                                                                 |
| TypeScript 严格度 | tsconfig.json strict:true                                                                                       |

> husky pre-commit 强制执行 typecheck + lint + format:check，任一失败阻止提交。

<!-- CONTENT_END: coding_standards -->

---

## 命名约定

<!-- CONTENT_START: naming_conventions -->

| 对象          | 约定                                       | 示例                                       |
| ------------- | ------------------------------------------ | ------------------------------------------ |
| 文件名        | kebab-case                                 | store.ts、store.test.ts、build.sh          |
| 函数 / 变量   | camelCase                                  | safeKey、indexSnapshotCache、memoryDir     |
| 类型 / 接口   | PascalCase                                 | MemoryIndex、MemoryRecord、SaveMemoryInput |
| 常量          | UPPER_SNAKE_CASE                           | MAX_CONTENT_BYTES、DEFAULT_SEARCH_LIMIT    |
| 记忆 key      | [a-zA-Z0-9_-]，1–64 字符，非法字符被删除   | dev-env_proxy-01                           |
| 记忆 category | [a-zA-Z0-9_-]，1–32 字符，空值回退 general | dev-env                                    |
| tag           | 单个 ≤32 字符，最多 12 个                  | network                                    |

> 白名单在 src/store.ts 中硬编码实现，不依赖外部配置。

<!-- CONTENT_END: naming_conventions -->

---

## 技术限制

<!-- CONTENT_START: technical_constraints -->

| 约束     | 值                                                          |
| -------- | ----------------------------------------------------------- |
| 模块体系 | ESM（package.json type=module，NodeNext）                   |
| 编译目标 | ES2023，strict:true，declaration + sourceMap                |
| 内容上限 | content ≤ 256 KB（UTF-8 bytes）                             |
| 索引分类 | 最多 30 个 category，注入时最多展示 20 个                   |
| 搜索限制 | limit 默认 10、最大 50                                      |
| 数据位置 | 仅 $DSH_HOME/memory/（默认 ~/.dsh/memory/），禁止跨目录读写 |
| 隐私     | 不做自动记忆采集；不写业务仓库、不上传远端                  |

- 路径安全：记忆文件名由白名单化后的 key 拼接，防路径穿越；写文件用临时文件 + rename 原子落盘。
- key/category 非法字符会被清洗而非拒绝；清洗后为空才抛 MemoryError。

<!-- CONTENT_END: technical_constraints -->

---

## 代码风格配置文件

<!-- CONTENT_START: config_files -->

| 文件             | 内容摘要                                                           |
| ---------------- | ------------------------------------------------------------------ |
| eslint.config.js | flat config + typescript-eslint + prettier，no-explicit-any off    |
| .prettierrc.json | semi:false / singleQuote:true / trailingComma:all / printWidth:120 |
| .prettierignore  | node_modules/、lib/、dist/、*.tgz、package-lock.json               |
| tsconfig.json    | ES2023 + NodeNext + strict + declaration，rootDir src → outDir lib |
| package.json     | scripts：lint / lint:fix / format / format:check / typecheck       |

<!-- CONTENT_END: config_files -->

---

## 相关文件

<!-- CONTENT_START: related_files -->

- eslint.config.js、.prettierrc.json、.prettierignore
- tsconfig.json（strict 与编译约束）
- package.json（lint/format scripts）
- src/store.ts（key/category 白名单、大小上限常量）

<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->

- 未检测到 .editorconfig、stylelint、browserslist；如需编辑器统一缩进，建议后续补充 .editorconfig。
- 命名规范部分为项目约定（非工具强制），写入本文件作为开发与 Review 依据。

<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: .eslintrc, .eslintrc.js, .eslintrc.json, .eslintrc.yml, eslint.config.js, eslint.config.mjs
  - 检查文件: .prettierrc, .prettierrc.js, .prettierrc.json, prettier.config.js
  - 检查文件: .editorconfig
  - 检查文件: .clang-format, .clang-tidy
  - 检查文件: pylintrc, .pylintrc, pyproject.toml(tool.pylint), setup.cfg(pylint)
  - 检查文件: .flake8, tox.ini(flake8)
  - 检查文件: .rubocop.yml
  - 检查文件: .golangci.yml, .golangci.yaml
  - 检查文件: rustfmt.toml, .rustfmt.toml, clippy.toml
  - 检查文件: checkstyle.xml, .checkstyle
  - 检查文件: .stylelintrc, stylelint.config.js
  - 检查文件: tsconfig.json(strict 相关配置)
  - 检查文件: .browserslistrc, browserslist
  - 提取信息: 规则列表, 严格程度配置, 自定义规则, 忽略规则(.eslintignore 等)
-->
