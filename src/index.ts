/**
 * @dsh-external/dsh-global-memory — 跨会话全局记忆插件（toolkit 形态）。
 *
 * 设计要点：
 * - 会话开始通过 agent/pre-step 注入一次条目级索引快照（user-role 消息，source.kind
 *   为 "memory-index"）；不依赖 systemPrompt.context，因此不受 anchored-standard 等
 *   preset 的 includeRuntimeContext: false 影响。
 *   快照按 session 缓存，工具路径 save/delete 不刷新，用户命令路径 save/delete 刷新。
 * - memory_* 工具不自动注入内容；只有模型主动调用时才产生当轮工具结果。
 * - memory_recall(key) 是唯一的全文查阅入口。
 */
import type { Context } from 'cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import z from 'schemastery'
import {
  deleteMemory,
  loadIndexSync,
  readMemory,
  renderMemoryIndex,
  resolveMemoryDir,
  saveMemory,
  searchMemories,
} from './store.js'

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'memory-index': { kind: 'memory-index'; plugin: string }
  }
}

export const name = '@dsh-external/dsh-global-memory'
export const inject = ['tools', 'commands']

export type Config = Record<string, never>

export const Config = z.object({})

/** 每个 session 的索引快照缓存。命令路径落盘后删除，使下一次 pre-step 重新渲染。 */
const indexSnapshotCache = new Map<string, string>()

function memoryDir(): string {
  return resolveMemoryDir()
}

function sessionOf(agent: unknown): object | null {
  if (typeof agent !== 'object' || agent === null) return null
  const session = (agent as { session?: unknown }).session
  return typeof session === 'object' && session !== null ? session : null
}

function sessionIdOf(agent: unknown): string | null {
  const session = sessionOf(agent)
  const id = (session as { id?: unknown } | null)?.id
  return typeof id === 'string' && id.length > 0 ? id : null
}

function clearSessionIndexCache(agent: unknown): void {
  const sessionId = sessionIdOf(agent)
  if (sessionId) indexSnapshotCache.delete(sessionId)
}

export function createMemoryIndexMessage(text: string) {
  return createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: 'memory-index', plugin: name },
  })
}

function formatRecord(record: NonNullable<Awaited<ReturnType<typeof readMemory>>>): string {
  const tags = record.tags.length > 0 ? record.tags.map((tag) => `#${tag}`).join(' ') : '(无)'
  return [
    `key: ${record.key}`,
    `category: ${record.category}`,
    `tags: ${tags}`,
    `created: ${record.created}`,
    `updated: ${record.updated}`,
    '',
    record.content,
  ].join('\n')
}

function parseSaveInput(rawInput: string): { key: string; content: string } | { error: string } {
  const trimmed = rawInput.trim()
  const match = /^(\S+)\s+([\s\S]+)$/.exec(trimmed)
  if (!match) return { error: '用法：/memory_save <key> <content...>（key 之后至少需要一段内容）' }
  return { key: match[1], content: match[2] }
}

function parseKeyInput(rawInput: string): { key: string } | { error: string } {
  const key = rawInput.trim()
  if (!key) return { error: '用法：/memory_delete <key>' }
  return { key }
}

export function apply(ctx: Context, _config: Config): void {
  void _config
  // 1) 工具注册（ctx.effect：fiber dispose 自动注销）
  ctx.effect(
    () =>
      ctx.tools.register(
        defineTool({
          name: 'memory_save',
          description: '保存一条全局记忆（显式落盘）。用户明确要求记住，或模型判断应长期保存时调用。',
          parameters: {
            key: { type: 'string', required: true, description: '记忆 key：仅 [a-zA-Z0-9_-]，1-64 字符，语义化命名' },
            category: { type: 'string', required: true, description: '分类：由模型自行总结，[a-zA-Z0-9_-]，1-32 字符' },
            content: { type: 'string', required: true, description: '记忆全文：UTF-8，≤256KB' },
            summary: { type: 'string', description: '可选一句话摘要；缺省自动取 content 首行/前80字' },
            tags: { type: 'array', items: { type: 'string' }, description: '可选标签数组，单 tag ≤32 字符' },
          },
          output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: String(value) }],
          },
          async execute(args: { key: string; category: string; content: string; summary?: string; tags?: string[] }) {
            const result = await saveMemory(memoryDir(), args)
            return `已保存 memory "${result.key}"（${result.id}）`
          },
        }),
      ),
    'memory_save tool',
  )

  ctx.effect(
    () =>
      ctx.tools.register(
        defineTool({
          name: 'memory_recall',
          description: '按 key 查阅一条记忆的完整内容；仅当轮返回，用完即止。',
          parameters: {
            key: { type: 'string', required: true, description: '记忆 key，来自会话开始时注入的索引' },
          },
          output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: String(value) }],
          },
          async execute(args: { key: string }) {
            const record = await readMemory(memoryDir(), args.key)
            if (!record) return `未找到 memory "${args.key}"。可尝试 memory_search。`
            return formatRecord(record)
          },
        }),
      ),
    'memory_recall tool',
  )

  ctx.effect(
    () =>
      ctx.tools.register(
        defineTool({
          name: 'memory_search',
          description: '对记忆 key/content/tags 做大小写不敏感子串搜索，返回摘要。',
          parameters: {
            query: { type: 'string', required: true, description: '搜索关键词' },
            category: { type: 'string', description: '可选：限定分类' },
            tag: { type: 'string', description: '可选：限定 tag' },
            limit: { type: 'integer', description: '可选：返回条数，默认10，最大50' },
          },
          output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: String(value) }],
          },
          async execute(args: { query: string; category?: string; tag?: string; limit?: number }) {
            const result = await searchMemories(memoryDir(), args.query, args)
            if (result.results.length === 0) return `未找到与 "${result.query}" 匹配的记忆。`
            const lines = result.results.map((item) => {
              const tags = item.tags.length > 0 ? item.tags.map((tag) => `#${tag}`).join(' ') : ''
              return `- ${item.key} [${item.category}]${tags ? ` ${tags}` : ''} | ${item.summary}`
            })
            return `找到 ${result.results.length} 条匹配 "${result.query}"：\n${lines.join('\n')}\n\n需要全文时用 memory_recall(key=...) 读取。`
          },
        }),
      ),
    'memory_search tool',
  )

  ctx.effect(
    () =>
      ctx.tools.register(
        defineTool({
          name: 'memory_delete',
          description: '删除一条记忆并更新索引。',
          parameters: {
            key: { type: 'string', required: true, description: '要删除的记忆 key' },
          },
          output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: String(value) }],
          },
          async execute(args: { key: string }) {
            await deleteMemory(memoryDir(), args.key)
            return `已删除 memory "${args.key}"。`
          },
        }),
      ),
    'memory_delete tool',
  )

  // 2) 会话开始注入条目级索引快照（agent/pre-step user-role 消息，不受 runtime context 抑制影响）
  ctx.on('agent/pre-step', async (payload: { agent?: unknown }, next: () => Promise<any>) => {
    const decision = await next()
    try {
      if (decision?.kind === 'reject' || !Array.isArray(decision?.messages)) return decision
      const sessionId = sessionIdOf(payload?.agent)
      if (!sessionId) return decision
      if (indexSnapshotCache.has(sessionId)) return decision
      const text = renderMemoryIndex(loadIndexSync(memoryDir()))
      indexSnapshotCache.set(sessionId, text)
      const message = createMemoryIndexMessage(text)
      return { ...decision, messages: [...decision.messages, message] }
    } catch {
      return decision
    }
  })

  // 3) 用户 slash 命令：直接落盘，不经 LLM，结果不进模型历史
  const commands = (ctx as Context & { commands: { register(definition: unknown): () => void } }).commands
  ctx.effect(
    () =>
      commands.register({
        name: 'memory_save',
        description: '直接保存一条全局记忆：/memory_save <key> <content...>',
        input: { hint: '<key> <content...>' },
        handler: async (invocation: { agent?: unknown; rawInput: string }) => {
          const parsed = parseSaveInput(invocation.rawInput)
          if ('error' in parsed) return { kind: 'error', text: parsed.error }
          try {
            const result = await saveMemory(memoryDir(), { key: parsed.key, content: parsed.content })
            clearSessionIndexCache(invocation.agent)
            return { kind: 'success', text: `已保存 memory "${result.key}"（${result.id}）` }
          } catch (error) {
            return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
          }
        },
      }),
    'memory_save command',
  )

  ctx.effect(
    () =>
      commands.register({
        name: 'memory_delete',
        description: '直接删除一条记忆：/memory_delete <key>',
        input: { hint: '<key>' },
        handler: async (invocation: { agent?: unknown; rawInput: string }) => {
          const parsed = parseKeyInput(invocation.rawInput)
          if ('error' in parsed) return { kind: 'error', text: parsed.error }
          try {
            await deleteMemory(memoryDir(), parsed.key)
            clearSessionIndexCache(invocation.agent)
            return { kind: 'success', text: `已删除 memory "${parsed.key}"。` }
          } catch (error) {
            return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
          }
        },
      }),
    'memory_delete command',
  )
}
