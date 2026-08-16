<!-- MODULE: build-process -->
<!-- STATUS: TODO -->
<!-- LAST_ANALYZED: -->
<!-- ANALYZER_VERSION: 1.0 -->

# 编译流程

> 编译/构建命令、配置说明、产物输出和依赖管理。

---

## 概述

<!-- CONTENT_START: overview -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: overview -->

---

## 构建工具

<!-- CONTENT_START: build_tools -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: build_tools -->

---

## 编译模式说明

> 根据改动类型选择合适的编译模式，避免不必要的全量重编。

| 编译模式 | 触发时机 | 说明 |
|---------|---------|------|
| **增量编译** | 仅修改了已有文件内容 | 构建系统自动识别变更文件，只重编受影响的部分，速度最快 |
| **全量编译** | 新增/删除文件、修改构建配置、切换分支、依赖变更 | 清除所有缓存后重新编译，确保产物一致性 |
| **重置编译** | 构建产物异常、缓存污染、跨平台切换后 | 先执行 clean 清除所有中间产物和缓存，再执行全量编译 |

> ⚠️ **注意**：以下情况**必须**使用全量编译或重置编译，增量编译可能产生错误结果：
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
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: local_build_incremental -->

### 全量编译（有文件增删或配置变更）

<!-- CONTENT_START: local_build_full -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: local_build_full -->

### 重置编译（清除缓存后重建）

<!-- CONTENT_START: local_build_clean -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: local_build_clean -->

---

## 全平台编译

> 在本机快速编译通过后，进行全量跨平台编译，输出所有受支持目标平台的产物。

### 宿主平台支持矩阵

<!-- CONTENT_START: platform_matrix -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: platform_matrix -->

### macOS 宿主 - 全平台编译

<!-- CONTENT_START: full_build_macos -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: full_build_macos -->

### Windows 宿主 - 全平台编译

<!-- CONTENT_START: full_build_windows -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: full_build_windows -->

---

## 构建命令汇总

<!-- CONTENT_START: build_commands -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: build_commands -->

---

## 构建配置

<!-- CONTENT_START: build_config -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: build_config -->

---

## 构建产物

<!-- CONTENT_START: build_output -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: build_output -->

---

## 依赖管理

<!-- CONTENT_START: dependency_management -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: dependency_management -->

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
