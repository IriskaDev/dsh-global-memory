# @dsh-external/dsh-global-memory

DSH Agent 跨会话全局记忆插件（toolkit 形态）。数据仅存本机 `$DSH_HOME/memory/`，不进入任何业务仓库，也不会上传到远端。

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

内部使用：`dev_build_plugin` 构建 + `dev_inject_plugin` 注入，或 `dsh plugin add link:<本目录>`。

## 隐私说明

- 本插件只做显式记忆，不自动采集对话内容。
- 记忆文件只存在于本机 `$DSH_HOME/memory/`，不进入 git 仓库（见 `.gitignore`），也不会上传远端。
