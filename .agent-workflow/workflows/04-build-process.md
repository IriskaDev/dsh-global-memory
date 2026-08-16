<!-- MODULE: build-process -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-08-17 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 编译流程

> 编译/构建命令、配置说明、产物输出和依赖管理。

---

## 概述

<!-- CONTENT_START: overview -->

- 纯 TypeScript 插件：tsc -p tsconfig.json 编译 src → lib，无 bundler、无原生模块、无跨平台二进制。
- 默认入口 scripts.build = tsc -p tsconfig.json；scripts/build.sh 保留为 DSH_CHECKOUT 环境备用。
- 产物为平台无关的 Node ESM JavaScript，所有宿主平台共用同一份 lib/。

<!-- CONTENT_END: overview -->

---

## 构建工具

<!-- CONTENT_START: build_tools -->

| 项           | 内容                                                                                  |
| ------------ | ------------------------------------------------------------------------------------- |
| 工具         | TypeScript 5.9（tsc）                                                                 |
| 配置         | tsconfig.json（rootDir src、outDir lib、declarationDir lib/types）                    |
| 包管理器     | npm（package-lock.json）                                                              |
| 备用脚本     | scripts/build.sh：探测 DSH_CHECKOUT 后 junction 链接宿主依赖，用 checkout 的 tsc 编译 |
| 构建系统类型 | 单包、无 workspaces、无 Makefile/CMake 等原生构建                                     |

<!-- CONTENT_END: build_tools -->

---

## 编译模式说明

> 根据改动类型选择合适的编译模式，避免不必要的全量重编。

| 编译模式     | 触发时机                                        | 说明                                                   |
| ------------ | ----------------------------------------------- | ------------------------------------------------------ |
| **增量编译** | 仅修改了已有文件内容                            | 构建系统自动识别变更文件，只重编受影响的部分，速度最快 |
| **全量编译** | 新增/删除文件、修改构建配置、切换分支、依赖变更 | 清除所有缓存后重新编译，确保产物一致性                 |
| **重置编译** | 构建产物异常、缓存污染、跨平台切换后            | 先执行 clean 清除所有中间产物和缓存，再执行全量编译    |

> ⚠️ **注意**：以下情况**必须**使用全量编译或重置编译，增量编译可能产生错误结果：
>
> - 新增或删除源文件（文件依赖关系图发生变化）
> - 修改了头文件 / 公共接口 / 导出符号
> - 修改了构建脚本、CMakeLists.txt、Makefile 等构建配置
> - 切换 Git 分支后（不同分支的中间产物可能不兼容）
> - 修改了编译宏、编译选项、链接参数

---

## 本机快速编译

> 仅编译当前开发平台的目标，用于**快速验证代码改动**，不要求跨平台产物。适合在提交前做本地冒烟验证。

### 增量编译（仅文件内容修改）

<!-- CONTENT_START: local_build_incremental -->

npm run build

- tsconfig 未开启 incremental（无 tsBuildInfo 缓存），每次均为对 src/ 全量重编译；项目体量小（3 个 ts 文件），可直接作为快速验证命令。

<!-- CONTENT_END: local_build_incremental -->

### 全量编译（有文件增删或配置变更）

<!-- CONTENT_START: local_build_full -->

npm run build

- 与增量命令相同：tsc 按 include: ['src'] 重新编译全部源文件，文件增删/配置变更后无需额外命令。

<!-- CONTENT_END: local_build_full -->

### 重置编译（清除缓存后重建）

<!-- CONTENT_START: local_build_clean -->

# PowerShell（项目根目录）

Remove-Item -Recurse -Force lib
npm run build

# bash

rm -rf lib && npm run build

- 无独立 clean script；lib/ 被 .gitignore 忽略，可直接删除后重建。

<!-- CONTENT_END: local_build_clean -->

---

## 全平台编译

> 在本机快速编译通过后，进行全量跨平台编译，输出所有受支持目标平台的产物。

### 宿主平台支持矩阵

<!-- CONTENT_START: platform_matrix -->

| 宿主平台 | 支持情况                                 | 说明                                       |
| -------- | ---------------------------------------- | ------------------------------------------ |
| Windows  | ✅ npm run build                         | 原生 tsc；scripts/build.sh 需 Git Bash/WSL |
| macOS    | ✅ npm run build / bash scripts/build.sh | 纯 JS 产物，无平台差异                     |
| Linux    | ✅ npm run build / bash scripts/build.sh | 同上                                       |

- 产物为 Node ESM（target ES2023），不区分目标平台；无交叉编译工具链要求。

<!-- CONTENT_END: platform_matrix -->

### macOS 宿主 - 全平台编译

<!-- CONTENT_START: full_build_macos -->

npm run build

# 或备用（DSH 环境）：

DSH_CHECKOUT=<checkout> bash scripts/build.sh

<!-- CONTENT_END: full_build_macos -->

### Windows 宿主 - 全平台编译

<!-- CONTENT_START: full_build_windows -->

npm run build

# 或备用（DSH 环境，需 bash 可用，如 Git Bash/WSL）：

bash scripts/build.sh

<!-- CONTENT_END: full_build_windows -->

---

## 构建命令汇总

<!-- CONTENT_START: build_commands -->

| 场景                  | 命令                       | 说明                                 |
| --------------------- | -------------------------- | ------------------------------------ |
| 本机快速/全量编译     | npm run build              | tsc -p tsconfig.json                 |
| 类型检查（不产出）    | npm run typecheck          | tsc --noEmit                         |
| 重置编译              | 删除 lib/ 后 npm run build | 无 clean script                      |
| DSH checkout 备用构建 | bash scripts/build.sh      | 自动探测 DSH_CHECKOUT 并链接宿主依赖 |

<!-- CONTENT_END: build_commands -->

---

## 构建配置

<!-- CONTENT_START: build_config -->

- tsconfig.json：target/lib ES2023、module/moduleResolution NodeNext、strict、declaration + declarationDir lib/types、outDir lib、rootDir src、sourceMap、skipLibCheck、esModuleInterop。
- package.json：main=./lib/index.js、types=./lib/types/index.d.ts、files=['lib']。
- eslint/prettier 均忽略 lib/ 产物。

<!-- CONTENT_END: build_config -->

---

## 构建产物

<!-- CONTENT_START: build_output -->

| 产物           | 路径                                      |
| -------------- | ----------------------------------------- |
| 编译后入口     | lib/index.js（package.json main）         |
| 存储模块       | lib/store.js                              |
| 编译后测试文件 | lib/store.test.js（npm test 直接运行）    |
| 类型声明       | lib/types/index.d.ts 等（declarationDir） |
| Source Map     | lib/**/*.js.map（sourceMap:true）         |

- lib/ 与 _.tsbuildinfo、_.tgz 均在 .gitignore 中，不提交仓库。

<!-- CONTENT_END: build_output -->

---

## 依赖管理

<!-- CONTENT_START: dependency_management -->

- 常规构建：npm install 解析 peerDependencies（cordis、dsh-llm、dsh-tools、schemastery）。
- DSH 环境构建：scripts/build.sh 用 junction 把 node_modules 下 cordis/cosmokit/schemastery/@deepseek-ai/* 链接到 DSH checkout 的 vendor/packages，再使用 checkout 的 tsc 编译。
- 锁文件：package-lock.json；node_modules 不提交。

<!-- CONTENT_END: dependency_management -->

---

## 相关文件

<!-- CONTENT_START: related_files -->

- package.json（build/typecheck scripts）
- tsconfig.json（编译参数）
- scripts/build.sh（DSH_CHECKOUT 备用构建）
- .gitignore / .prettierignore（lib/ 忽略规则）

<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->

- 无增量编译缓存配置、无 clean script、无跨平台产物目录区分。
- scripts/build.sh 仅在需要与 DSH 宿主 checkout 严格对齐依赖时使用；日常 npm run build 即可。

<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: Makefile, CMakeLists.txt, meson.build, BUILD, BUILD.bazel, WORKSPACE
  - 检查文件: build.gradle, build.gradle.kts, pom.xml, settings.gradle
  - 检查文件: package.json(scripts.build/clean/rebuild), webpack.config.*, vite.config.*, rollup.config.*, esbuild.config.*
  - 检查文件: Cargo.toml, build.rs, .cargo/config.toml（含 [target.*] 交叉编译目标配置）
  - 检查文件: setup.py, setup.cfg, pyproject.toml(build-system)
  - 检查文件: Rakefile, Gruntfile.js, gulpfile.js
  - 检查文件: .npmrc, .yarnrc, .yarnrc.yml, .pnpmrc
  - 检查文件: go.mod, go.sum（注意 GOOS/GOARCH 环境变量用于交叉编译）
  - 检查文件: Pipfile, Pipfile.lock, poetry.lock
  - 检查文件: toolchain.cmake, cross-*.cmake（CMake 交叉编译工具链文件）
  - 检查文件: .xcode-version, Podfile（iOS/macOS 平台）
  - 检查文件: build-all.sh, build-cross.sh, build-platforms.sh 等批量编译脚本
  - 检查目录: dist/, build/, out/, target/, bin/, release/
  - 检查目录: .cargo/, toolchains/, cross/, cmake/toolchains/（交叉编译工具链目录）
  - 提取信息: 增量编译命令（直接 build，依赖构建系统缓存机制）
  - 提取信息: 全量编译命令（强制重编，如 make -B / cargo build --release / gradle build）
  - 提取信息: clean 命令（如 make clean / cargo clean / gradle clean / rm -rf build/）
  - 提取信息: 重置编译命令（clean + build 组合，或 rebuild 脚本）
  - 提取信息: 本机快速编译命令, 全平台编译命令, 宿主平台限制（mac/windows/linux）
  - 提取信息: 各宿主平台支持的目标平台列表（target triple），构建工具名称及版本
  - 提取信息: 产物输出路径（按平台区分）, 编译选项, 包管理器类型
  - 注意: 识别构建系统是否支持增量编译（Makefile 依赖时间戳、Ninja、Bazel、Gradle 增量等）
-->
