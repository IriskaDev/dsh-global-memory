<!-- MODULE: branch-commit -->
<!-- STATUS: TODO -->
<!-- LAST_ANALYZED: -->
<!-- ANALYZER_VERSION: 1.0 -->

# 分支提交规范

> 定义项目的分支命名策略、Commit 消息规范、提交前检查和通过 gh 执行分支操作的完整 SOP。
>
> **本文档是唯一权威来源**：[开发流程](../workflows/03-development-workflow.md) Step 2 和 [Bug修复流程](../workflows/07-bug-fixing.md) Step 2 均引用本文档，不在各自文件中重复定义。

---

## 概述

<!-- CONTENT_START: overview -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: overview -->

---

## 分支策略

<!-- CONTENT_START: branch_strategy -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: branch_strategy -->

---

## Commit 规范

<!-- CONTENT_START: commit_convention -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: commit_convention -->

---

## 提交前检查

<!-- CONTENT_START: pre_commit_hooks -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: pre_commit_hooks -->

---

## 分支操作 SOP

> 以下为创建/切换分支的标准步骤，供 [开发流程](../workflows/03-development-workflow.md) 和 [Bug修复流程](../workflows/07-bug-fixing.md) 调用。

### 新建功能/修复分支

```bash
# 1. 切换到基础分支并拉取最新代码
git checkout <基础分支>       # feature/fix/hotfix → main
git pull origin <基础分支>

# 2. 创建新分支
git checkout -b <分支名>      # 按"分支命名规范"表格中的格式

# 3. 确认当前状态
git branch                   # 确认当前在新分支上
git status                   # 确认工作区干净
```

### 提交代码前置校验（模块档案同步）

> ⚠️ 本校验是 [15-module-inventory.md](./15-module-inventory.md) Step 5 的**执行门禁**，凡代码修改类提交必须通过本校验才能进入 `git add`。

**校验清单**（提交前逐项确认）：

1. **本次改动映射到的模块清单**：通过 `git diff --name-only` 得到变更文件列表，逆向映射到 `.agent-workflow/modules/index.md` 中对应模块
2. **对每个受影响模块**：
   - [ ] 模块档案 `LAST_ANALYZED` 头 = 今日日期
   - [ ] 三段依赖章节（上游依赖 / 下游调用方 / 下游数据调用）已按最新代码扫描重写
   - [ ] 若对外接口签名有变更，「下游调用方」列表中的模块档案「上游依赖」章节已同步刷新（1 层级联，见 [15 Step 5.3](./15-module-inventory.md#53-更新粒度)）
3. **`modules/index.md`**：
   - [ ] 受影响行的「最后更新」= 今日
   - [ ] 「时效状态」= 🟢 有效
4. **模块边界变化检查**：
   - [ ] 新增/删除对外入口文件时，已完成模块档案的新建/合并/拆分决策

**未通过时**：
- 补齐 [15 Step 5 增量更新](./15-module-inventory.md#step-5--增量更新流程自动--手动共用) 后再执行 `git add`
- 模块档案与代码变更**必须在同一次 commit 内提交**，禁止分开提交（防止台账与代码短暂不一致）

---

### 提交代码

```bash
# 精确 add，避免提交无关文件
git add <变更文件>
# 或按目录
git add src/module-name/

# 提交（commit 消息遵循上方"Commit 规范"）
git commit -m "<type>(<scope>): <subject>"

# 推送到远端
git push origin <当前分支>
# 首次推送（建立追踪）
git push -u origin <当前分支>
```

> ⚠️ **DSH 沙箱 push**：受限模式下 `git push` 会因 schannel 拿不到凭据（`SEC_E_NO_CREDENTIALS`）或 openssl 找不到 UGit CA（`ca-bundle.trust.crt`）而失败。提权（`danger-full-access`）后走 schannel 通常即可；否则用 `git -c http.sslBackend=openssl -c http.sslVerify=false push "https://x-access-token:<token>@github.com/<owner>/<repo>.git" main`（token 用 `gh auth token` 取）。

### 同步主干最新代码（避免冲突积累）

```bash
# 方式一：merge（保留合并历史）
git fetch origin
git merge origin/<基础分支>

# 方式二：rebase（保持线性历史，推荐）
git fetch origin
git rebase origin/<基础分支>
```

### 分支合并后清理

```bash
# 删除本地分支
git branch -d <已合并分支名>

# 删除远端分支
git push origin --delete <已合并分支名>
```

---

## GitHub 平台操作指引

<!-- CONTENT_START: github_branch -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。
<!-- CONTENT_END: github_branch -->

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
  - 检查文件: .gitflow（Git Flow 配置）
  - 检查文件: commitlint.config.js, commitlint.config.ts, .commitlintrc, .commitlintrc.json
  - 检查文件: .czrc, .cz.json, package.json(config.commitizen)（Commitizen 配置）
  - 检查文件: .husky/, .husky/pre-commit, .husky/commit-msg（Husky hooks）
  - 检查文件: .pre-commit-config.yaml（pre-commit 框架配置）
  - 检查文件: package.json(husky, lint-staged 配置)
  - 检查文件: lefthook.yml（Lefthook hooks）
  - 分析: git branch -a 列表，识别现有分支命名模式（feature/fix/hotfix/release）
  - 分析: git log --oneline 最近 20 条，识别实际使用的 commit 消息格式
  - 提取信息: 分支命名规则（各类型格式）, commit 消息格式规范
  - 提取信息: Git hooks 配置（pre-commit/commit-msg 检查项）
  - 提取信息: 分支保护规则（哪些分支禁止直接推送）
-->
