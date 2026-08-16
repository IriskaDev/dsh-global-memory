<!-- MODULE: code-optimization -->
<!-- STATUS: PARTIAL -->
<!-- LAST_ANALYZED: 2026-08-17 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 代码优化流程

> 根据用户指令，对项目或指定模块进行代码质量分析，输出可操作的优化建议，并记录技术债务。

---

## 概述

<!-- CONTENT_START: overview -->

- 未检测到专用质量平台（Sonar/CodeClimate）、bundle 分析、size-limit、depcheck 等优化工具。
- 现有基线：ESLint recommended + typescript-eslint + Prettier + tsc strict；当前代码无 TODO/FIXME 标记。

<!-- CONTENT_END: overview -->

---

## 触发指令

```
# 全量分析
分析项目代码质量
检查代码优化空间

# 指定模块分析
分析 <模块名> 的代码质量
检查 <模块名> 的性能优化空间

# 查看技术债务
统计项目技术债务
列出所有 TODO/FIXME
```

---

## 代码质量配置

<!-- CONTENT_START: quality_tools -->

| 工具                         | 状态      | 说明                            |
| ---------------------------- | --------- | ------------------------------- |
| ESLint 10                    | ✅ 已配置 | eslint.config.js（flat config） |
| tsc strict                   | ✅ 已配置 | tsconfig.json strict:true       |
| Prettier                     | ✅ 已配置 | .prettierrc.json                |
| Sonar / CodeClimate          | ❌ 未配置 | -                               |
| bundle-analyzer / size-limit | ❌ 未配置 | 无前端 bundle                   |
| depcheck                     | ❌ 未配置 | 未使用依赖需人工核对            |

<!-- CONTENT_END: quality_tools -->

---

## 代码优化 SOP

### Step 1 · 确认分析范围

- **全量分析**：扫描整个项目，识别所有优化点
- **单模块分析**：仅分析用户指定的模块目录

---

### Step 2 · 静态质量扫描

对目标范围执行以下静态扫描（只读，不执行命令）：

#### 2.1 技术债务统计

搜索代码中的标记注释，统计分布情况：

<!-- CONTENT_START: tech_debt -->

- 扫描范围 src/**（2026-08-17）：TODO / FIXME / HACK / XXX / DEPRECATED 标记均为 0 个。
- 无明显遗留技术债标记；注意 src/store.ts 注释中的容错逻辑（损坏记忆文件跳过保留）属于设计决策而非债务。

<!-- CONTENT_END: tech_debt -->

#### 2.2 代码复杂度

<!-- CONTENT_START: complexity -->

- eslint.config.js 未设置 max-complexity / max-lines-per-function 等复杂度阈值。
- 当前规模：src/index.ts 240 行、src/store.ts 430 行；建议函数级复杂度靠人工 Review 控制。

<!-- CONTENT_END: complexity -->

#### 2.3 重复代码（DRY 分析）

<!-- CONTENT_START: duplication -->

- 未配置重复代码检测工具；当前无 jscpd 等。
- 已知少量有意重复：store.ts 中 async/sync 两套索引重建（rebuildIndex / rebuildIndexSync），分别服务工具路径与 systemPrompt.context 同步路径；合并需谨慎评估。

<!-- CONTENT_END: duplication -->

#### 2.4 性能风险点

<!-- CONTENT_START: performance -->

- 无 benchmark/ 目录与性能测试配置。
- 可人工关注点：会话索引快照经 WeakMap 按 session 缓存，仅在 save/delete 后失效，避免每步重扫；memory_search 为内存索引线性扫描（数据量上限由 index categories=30 与搜索 limit 约束），当前规模足够。

<!-- CONTENT_END: performance -->

#### 2.5 依赖分析

<!-- CONTENT_START: dependencies -->

- peerDependencies：cordis / dsh-llm / dsh-tools / schemastery（宿主提供）。
- devDependencies 与 scripts 一一对应（build/typecheck→typescript，test→node，lint→eslint 系，format→prettier，commit 门禁→husky/commitlint）；未发现明显未使用依赖（未经 depcheck 验证）。

<!-- CONTENT_END: dependencies -->

---

### Step 3 · 生成优化建议

基于 Step 2 的扫描结果，按优先级输出可操作的优化建议：

<!-- CONTENT_START: suggestions -->

| 优先级 | 建议                                                                |
| ------ | ------------------------------------------------------------------- |
| 🟠 中  | 补充 coverage / complexity 阈值，纳入 pre-commit 或 CI（当前无 CI） |
| 🟡 低  | 如需长期维护，引入 depcheck 与 CHANGELOG 工具                       |
| 🟡 低  | memory_search 线性扫描在记忆条目显著增长后，可评估索引化/分词优化   |

<!-- CONTENT_END: suggestions -->

**优先级判断标准**：

- 🔴 **高**：影响运行时性能、存在内存泄漏/资源未释放、安全漏洞
- 🟠 **中**：高复杂度函数、大量重复代码、未使用的依赖
- 🟡 **低**：命名不规范、注释缺失、TODO 清理

---

### Step 4 · 记录优化结果

分析完成后：

1. 将扫描结果和优化建议写入本文件（更新 `overview`、各 `CONTENT` 区段）
2. 重大技术债务同步记录到对应的 `.agent-workflow/modules/<module>.md` 的"注意事项"章节
3. 可操作的优化项建议创建对应的 Issue 单据跟踪

---

## 代码质量指标汇总

<!-- CONTENT_START: quality_metrics -->

| 指标                           | 当前值                 |
| ------------------------------ | ---------------------- |
| TODO/FIXME/HACK/XXX/DEPRECATED | 0                      |
| 单元测试                       | 12 用例，npm test 通过 |
| 复杂度阈值                     | 未配置                 |
| 覆盖率阈值                     | 未配置                 |

<!-- CONTENT_END: quality_metrics -->

---

## 相关文件

<!-- CONTENT_START: related_files -->

- eslint.config.js、.prettierrc.json、tsconfig.json
- src/index.ts、src/store.ts、src/store.test.ts

<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->

- 10 为 PARTIAL：只有基础静态检查基线，缺少质量指标与专项优化工具。
- 10 不计入阶段一完善度评分。

<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: sonar-project.properties, .codeclimate.yml
  - 检查文件: .lighthouse/*, lighthouse.config.js
  - 检查文件: package.json(scripts.analyze), webpack-bundle-analyzer 配置
  - 检查文件: .size-limit.json, bundlesize 配置
  - 搜索注释: TODO, FIXME, HACK, XXX, DEPRECATED（统计数量和文件分布）
  - 检查目录: benchmark/, bench/, perf/
  - 检查文件: .depcheckrc, depcheck 配置（未使用依赖）
  - 检查配置: ESLint complexity 规则（max-complexity, max-lines-per-function）
  - 提取信息: 质量工具列表, TODO/FIXME 统计（按类型和模块分布）
  - 提取信息: bundle 大小配置, 性能基准配置, 复杂度阈值设置
  - 输出目标: 更新本文件各 CONTENT 区段，重大债务同步到 .agent-workflow/modules/
-->
