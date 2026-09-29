# @dsh-external/dsh-global-memory

DSH Agent 跨会话全局记忆插件（toolkit 形态）。数据仅存本机 `$DSH_HOME/memory/`，不进入任何业务仓库，也不会上传到远端。

> **runtime 兼容性**：DSH 0.1.x（会话格式 v3）与 0.2.x（会话格式 v4）均可使用。0.2.x 起注入消息必须使用 v4 producer-owned 的 `source.kind`（`plugin:<插件名>`），插件已按此写入；历史会话中的旧 kind 会在首次加载时自动修复（见「历史会话兼容迁移」）。

## 设计原则

- **会话开始自动注入条目级索引**：每个会话首 step 自动注入一次全部记忆的轻量索引（按分类分组，列出 key 与 tags），位于 system prompt + tools 之后，不注入全文。
- **模型按需查阅**：模型在工作过程中发现记忆里可能有相关内容时，自行调用 `memory_recall(key)` 读取全文；全文仅在当轮工具结果中返回，用完即止。
- **显式写入**：不自动记录对话内容。只有用户明确要求“帮我记一下”，或模型判断应全局保存时，才调用 `memory_save` 落盘。
- **用户可直接保存**：`/memory_save <key> <content...>` 命令直接落盘，不经过 LLM，结果不进模型上下文。

## 工具

| 工具            | 参数                                                 | 行为                                                 |
| --------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| `memory_save`   | `key*`, `category*`, `content*`, `summary?`, `tags?` | 创建或覆盖一条记忆                                   |
| `memory_recall` | `key*`                                               | 按 key 返回该条完整内容                              |
| `memory_search` | `query*`, `category?`, `tag?`, `limit?`              | 对 key/content/tags 做大小写不敏感子串搜索，返回摘要 |
| `memory_delete` | `key*`                                               | 删除一条记忆                                         |

## 用户命令

| 命令             | 语法                              | 行为                                                |
| ---------------- | --------------------------------- | --------------------------------------------------- |
| `/memory_save`   | `/memory_save <key> <content...>` | 直接保存；category 默认 `general`，summary 自动截取 |
| `/memory_delete` | `/memory_delete <key>`            | 直接删除                                            |

命令在 UI 命令面执行，内容不经过 LLM、不进模型历史、不占 token。

## 数据位置与格式

```
$DSH_HOME/memory/
  index.json                  # 索引缓存，可由 m*.json 重建
  m0001_<key>.json            # 单条记忆
```

- `key`：`[a-zA-Z0-9_-]`，1–64 字符
- `category`：`[a-zA-Z0-9_-]`，1–32 字符，由模型在保存时自行总结
- `content`：UTF-8，单条上限 256 KB
- `summary`：可选，缺省自动截取 content 首行/前 80 字
- `tags`：可选，单 tag ≤ 32 字符

## 安装

- 内部开发调试：`dev_build_plugin` 构建 + `dev_inject_plugin` 运行时注入（免重启，无需改 profile）。
- 常驻装配：`dsh plugin --profile <name> add link:<本目录>`（或 super-injector 的 `dev_install_package`）。该路径会把包写进 profile 的 `dsh.profile.bundles`，要求本包 `package.json` 具备 `dsh.bundle.patch` 声明并随仓库提供 `cordis.patch.yml`（本仓库已提供）。

## 历史会话兼容迁移

`0.0.5` 起，插件写入的索引消息使用 **v4 producer-owned** 的 `source.kind = "plugin:@dsh-external/dsh-global-memory"`。DSH 0.2.x 的会话格式 v4 原生准入**明确拒绝** `kind === "plugin"` 的包裹式 source（`format v4 message requires a producer-owned source kind`）；v3 runtime 也接纳命名空间形态，因此无需按版本分支。

升级后首次加载插件时，会在任何会话被打开之前自动扫描 `$DSH_HOME/sessions`：

- 处理本插件历史上写出的两代载荷：`source.kind = "memory-index"`（≤ `0.0.3`）与 `{ kind: "plugin", plugin: <本插件名> }`（`0.0.4`），统一改写为 `plugin:@dsh-external/dsh-global-memory`；
- 只改写 `plugin` 字段等于本插件名的记录，**其他插件**的 source 一律不动；
- 每个会话目录只处理当前代次的活跃工件（`session.v4.jsonl.zstd` 等），旧代次备份保持原样；
- 修改前为每个会话文件创建 `session.<ver>.jsonl.zstd.bak-dsh-global-memory-2` 备份；
- 迁移完成状态记录在 `$DSH_HOME/memory/.legacy-session-source-migration.json`，重复启动不会重复修改（版本号提升后会自动重跑一次）；
- 单个文件迁移失败时不会写完成标记，下次启动会重试。

> ⚠️ `0.0.4` 的迁移会把 `memory-index` 改写成 `kind: "plugin"` 包裹形态。该形态在 v3 下正确，但在 DSH 0.2.x（会话格式 v4）下非法，会让**整轮运行失败**。`0.0.5` 的迁移（版本号 2）会修复这批历史文件。

## 隐私说明

- 本插件只做显式记忆，不自动采集对话内容。
- 记忆文件只存在于本机 `$DSH_HOME/memory/`，不进入 git 仓库（见 `.gitignore`），也不会上传远端。
