import assert from 'node:assert/strict'
import test from 'node:test'
import { createMemoryIndexMessage } from './index.js'

test('记忆索引注入消息使用 DSH 已审计的 plugin source', () => {
  const message = createMemoryIndexMessage('[global memory] 暂无记忆。')
  assert.equal(message.role, 'user')
  assert.equal(typeof message.id, 'string')
  assert.ok(message.id.length > 0)
  assert.equal(message.source.kind, 'plugin')
  assert.equal(message.source.plugin, '@dsh-external/dsh-global-memory')
  assert.deepEqual(message.content, [{ type: 'text', text: '[global memory] 暂无记忆。' }])
})
