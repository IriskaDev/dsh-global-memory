import assert from 'node:assert/strict'
import test from 'node:test'
import { createMemoryIndexMessage } from './index.js'

const PLUGIN_NAME = '@dsh-external/dsh-global-memory'

/**
 * 读取注入消息的运行时字段。
 *
 * 本仓库开发环境里 `cordis` / `@deepseek-ai/dsh-llm` 的类型来自宿主 profile 的
 * 符号链接，解析结果不稳定（`message.source` 常被推成 `never`）。因此断言基于
 * 运行时结构读取，而不是依赖可选的类型导出面。
 */
function inspect(message: unknown): {
  id: unknown
  role: unknown
  source: Record<string, unknown>
  content: unknown
} {
  const record = message as { id?: unknown; role?: unknown; source?: unknown; content?: unknown }
  return {
    id: record.id,
    role: record.role,
    source: (record.source ?? {}) as Record<string, unknown>,
    content: record.content,
  }
}

test('记忆索引注入消息使用 v4 producer-owned source kind', () => {
  const message = inspect(createMemoryIndexMessage('[global memory] 暂无记忆。'))
  assert.equal(message.role, 'user')
  assert.equal(typeof message.id, 'string')
  assert.ok((message.id as string).length > 0)
  // DSH 0.2.x 的 v4 原生准入拒绝 `kind === 'plugin'`，必须用提升后的命名空间形态。
  assert.equal(message.source.kind, `plugin:${PLUGIN_NAME}`)
  assert.notEqual(message.source.kind, 'plugin')
  assert.deepEqual(message.content, [{ type: 'text', text: '[global memory] 暂无记忆。' }])
})

test('记忆索引注入消息不再携带 v3 的 plugin 包裹字段', () => {
  const message = inspect(createMemoryIndexMessage('[global memory] 一条记忆。'))
  assert.equal(Object.hasOwn(message.source, 'plugin'), false)
  assert.deepEqual(Object.keys(message.source), ['kind'])
})
