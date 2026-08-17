import assert from 'node:assert/strict'
import test from 'node:test'
import { createMemoryIndexMessage } from './index.js'

test('memory-index 注入消息必须携带合法 id', () => {
  const message = createMemoryIndexMessage('[global memory] 暂无记忆。')
  assert.equal(message.role, 'user')
  assert.equal(typeof message.id, 'string')
  assert.ok(message.id.length > 0)
  assert.equal(message.source.kind, 'memory-index')
  assert.equal(message.source.plugin, '@dsh-external/dsh-global-memory')
  assert.deepEqual(message.content, [{ type: 'text', text: '[global memory] 暂无记忆。' }])
})
