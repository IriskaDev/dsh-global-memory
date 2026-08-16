<!-- MODULE: testing-process -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-08-17 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 测试流程

> 从编写测试用例到运行验证的完整 SOP，包含单元测试、全量测试、覆盖率检查各阶段说明。

---

## 概述

<!-- CONTENT_START: overview -->

- 测试框架：Node 内置 node:test + node:assert/strict，无 Jest/Vitest/Mocha。
- 唯一测试文件 src/store.test.ts（12 个用例），编译后运行 lib/store.test.js；npm test 已全部通过。
- 无覆盖率配置、无集成测试、无 E2E 配置。

<!-- CONTENT_END: overview -->

---

## 测试框架

<!-- CONTENT_START: test_frameworks -->

| 项       | 内容                                                          |
| -------- | ------------------------------------------------------------- |
| 框架     | node:test（Node 内置 test runner）                            |
| 断言     | node:assert/strict                                            |
| 测试文件 | src/store.test.ts（与 store.ts 同目录，编译进 lib/）          |
| 运行脚本 | scripts.test = npm run build && node --test lib/store.test.js |
| 用例数   | 12（用户确认 npm test 全部通过）                              |

<!-- CONTENT_END: test_frameworks -->

---

## 测试目录结构

<!-- CONTENT_START: test_structure -->

| 路径              | 说明                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| src/store.test.ts | 存储层单元测试：resolveMemoryDir / safeKey / safeCategory / save-read-delete 往返 / 覆盖复用编号 / 索引重建等 |
| lib/store.test.js | tsc 编译产物，npm test 实际执行目标                                                                           |

- 无独立 test/、**tests**/ 目录；新增测试继续放在 src/ 下并保持 kebab-case 文件名（如 <module>.test.ts）。

<!-- CONTENT_END: test_structure -->

---

## 覆盖率要求

<!-- CONTENT_START: coverage -->

| 项         | 状态                                   |
| ---------- | -------------------------------------- |
| 覆盖率工具 | 未检测到（无 nyc/c8/v8 coverage 配置） |
| 覆盖率阈值 | 未定义                                 |
| 覆盖率报告 | 无                                     |

> 未设置覆盖率门槛；当前以 12 个用例覆盖核心存储行为为准。如需阈值可后续补充。

<!-- CONTENT_END: coverage -->

---

## 测试 SOP

> 以下为标准测试执行流程，在开发流程的 Step 6~~8 和 Bug 修复流程的 Step 6~~8 中调用。

### Step 1 · 编写/更新测试用例

**新增功能**：必须编写对应的单元测试用例，覆盖：

- 正常路径（Happy Path）
- 边界条件
- 异常/错误情况

**Bug 修复**：必须添加回归测试用例，确保该 Bug 不会再次引入。

**测试文件存放**：按照"测试目录结构"中定义的规范存放，与被测文件保持对应关系。

---

### Step 2 · 运行相关单元测试（按模块过滤）

> 仅运行与本次改动相关的测试，快速验证，不需要等待全量测试。

<!-- CONTENT_START: unit_test_filter_cmd -->

# 全量（当前唯一测试文件）

node --test lib/store.test.js

# 按用例名过滤（Node test runner）

node --test --test-name-pattern="safeKey" lib/store.test.js

<!-- CONTENT_END: unit_test_filter_cmd -->

**判断**：

- 全部通过（含新增用例）→ 继续 Step 3
- 有失败 → 修复后重新执行 Step 2，不进入下一步

---

### Step 3 · 运行全量单元测试

<!-- CONTENT_START: unit_test_full_cmd -->

npm test

# 等价于：npm run build && node --test lib/store.test.js

# 结果：12/12 通过（2026-08-17 用户确认）

<!-- CONTENT_END: unit_test_full_cmd -->

**判断**：

- 全部通过 → 继续 Step 4
- 有失败（本次改动引入）→ 必须修复后重新执行
- 有失败（已知存量问题）→ 记录并评估是否阻塞提交

---

### Step 4 · 运行集成测试（如有）

<!-- CONTENT_START: integration_test_cmd -->

未检测到集成测试配置。本插件无数据库/网络/消息队列外部依赖，当前无需集成测试；如未来增加宿主联动场景再补充。

<!-- CONTENT_END: integration_test_cmd -->

---

### Step 5 · 检查覆盖率

<!-- CONTENT_START: coverage_cmd -->

未配置覆盖率命令与阈值；跳过本步骤（无门槛可判）。

<!-- CONTENT_END: coverage_cmd -->

**判断**：

- 覆盖率达到最低要求（见"覆盖率要求"表）→ 通过
- 低于要求 → 补充测试用例后重新执行 Step 2~5

---

### Step 6 · 运行 E2E 测试（发布前）

> E2E 测试通常在发布前或 CI 中运行，不要求每次开发改动都执行。

<!-- CONTENT_START: e2e_test_cmd -->

未检测到 E2E 测试配置（无 Playwright/Cypress 等）。发布前验证以 12 个单元测试 + 宿主注入后手工验证工具/命令为准。

<!-- CONTENT_END: e2e_test_cmd -->

---

## 测试命令速查

<!-- CONTENT_START: test_commands -->

| 命令                                                          | 作用                              |
| ------------------------------------------------------------- | --------------------------------- |
| npm test                                                      | 先构建，再运行全部 node:test 用例 |
| node --test lib/store.test.js                                 | 跳过构建直接跑测试                |
| node --test --test-name-pattern="<pattern>" lib/store.test.js | 按用例名过滤                      |

<!-- CONTENT_END: test_commands -->

---

## 相关文件

<!-- CONTENT_START: related_files -->

- src/store.test.ts（测试源码）
- package.json（scripts.test）
- src/store.ts（被测对象）

<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->

- 测试使用 mkdtemp 创建临时目录并在 finally 中清理，不污染 $DSH_HOME。
- npm test 含 build 步骤，因此测试运行前提是 TypeScript 编译通过。

<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查目录: test/, tests/, __tests__/, spec/, __test__/, test_*, *_test/
  - 检查文件: jest.config.js, jest.config.ts, jest.config.json
  - 检查文件: vitest.config.ts, vitest.config.js
  - 检查文件: pytest.ini, conftest.py, pyproject.toml(tool.pytest)
  - 检查文件: .mocharc.yml, .mocharc.js
  - 检查文件: karma.conf.js
  - 检查文件: cypress.config.js, cypress.config.ts, cypress/
  - 检查文件: playwright.config.ts, playwright.config.js
  - 检查文件: package.json(scripts.test, scripts.test:unit, scripts.test:e2e, scripts.coverage)
  - 检查文件: Makefile(test 目标)
  - 检查文件: *_test.go, *_test.rs
  - 检查文件: .coveragerc, .nycrc, .nycrc.json, .c8rc
  - 提取信息: 测试框架名称, 全量测试命令, 按模块过滤测试命令（--testPathPattern/--run/etc）
  - 提取信息: 覆盖率阈值配置（branches/lines/functions）, 覆盖率报告路径
  - 提取信息: 测试文件命名规范, 测试目录结构
-->
