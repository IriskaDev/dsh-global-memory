import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  MemoryError,
  deleteMemory,
  loadIndex,
  readMemory,
  renderMemoryIndex,
  resolveMemoryDir,
  safeCategory,
  safeKey,
  saveMemory,
  searchMemories,
} from './store.js'

async function makeTmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'dsh-global-memory-test-'))
}

test('resolveMemoryDir 读取 DSH_HOME', () => {
  assert.equal(resolveMemoryDir({ DSH_HOME: '/tmp/dsh' }), join('/tmp', 'dsh', 'memory'))
})

test('safeKey 删除非法字符并限制长度', () => {
  assert.equal(safeKey(' dev-env_proxy-01 '), 'dev-env_proxy-01')
  assert.equal(safeKey('dev/env\\proxy:01'), 'devenvproxy01')
  assert.throws(() => safeKey('！！！'), MemoryError)
  assert.equal(safeKey('a'.repeat(100)).length, 64)
})

test('safeCategory 空值回退 general 并删除非法字符', () => {
  assert.equal(safeCategory(undefined), 'general')
  assert.equal(safeCategory('DEV/Env'), 'DEVEnv')
})

test('save/read/delete 往返', async () => {
  const dir = await makeTmpDir()
  try {
    const saved = await saveMemory(dir, {
      key: 'dev-env-proxy',
      category: 'dev-env',
      content: 'git push 走本机代理 127.0.0.1:10809',
      tags: ['network', 'local'],
    })
    assert.equal(saved.key, 'dev-env-proxy')
    assert.equal(saved.id, '0001')

    const record = await readMemory(dir, 'dev-env-proxy')
    assert.ok(record)
    assert.equal(record.content, 'git push 走本机代理 127.0.0.1:10809')
    assert.equal(record.category, 'dev-env')
    assert.deepEqual(record.tags, ['network', 'local'])
    assert.ok(record.created <= record.updated)

    await deleteMemory(dir, 'dev-env-proxy')
    assert.equal(await readMemory(dir, 'dev-env-proxy'), null)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('覆盖已有 key 复用编号且保留 created', async () => {
  const dir = await makeTmpDir()
  try {
    const first = await saveMemory(dir, { key: 'k', category: 'c', content: 'one' })
    await new Promise((resolve) => setTimeout(resolve, 5))
    const second = await saveMemory(dir, { key: 'k', category: 'c2', content: 'two' })
    assert.equal(second.id, first.id)
    assert.equal(second.created, first.created)
    const record = await readMemory(dir, 'k')
    assert.equal(record?.content, 'two')
    assert.equal(record?.category, 'c2')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('search 大小写不敏感命中 key/content/tags', async () => {
  const dir = await makeTmpDir()
  try {
    await saveMemory(dir, { key: 'git-commit-sop', category: 'git', content: 'type(scope): subject', tags: ['commit'] })
    await saveMemory(dir, {
      key: 'dev-env-proxy',
      category: 'dev-env',
      content: 'git push 走本机代理',
      tags: ['network'],
    })
    const hitKey = await searchMemories(dir, 'COMMIT', { limit: 10 })
    assert.equal(hitKey.results.length, 1)
    assert.equal(hitKey.results[0].key, 'git-commit-sop')
    const hitContent = await searchMemories(dir, '本机代理', { limit: 10 })
    assert.equal(hitContent.results[0].key, 'dev-env-proxy')
    const miss = await searchMemories(dir, '不存在的关键词', { limit: 10 })
    assert.equal(miss.results.length, 0)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('content 超限抛错', async () => {
  const dir = await makeTmpDir()
  try {
    const content = 'x'.repeat(256 * 1024 + 1)
    await assert.rejects(() => saveMemory(dir, { key: 'big', content }), MemoryError)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('原子写入后索引完整', async () => {
  const dir = await makeTmpDir()
  try {
    await saveMemory(dir, { key: 'a', category: 'c', content: '1' })
    await saveMemory(dir, { key: 'b', category: 'c', content: '2' })
    const index = await loadIndex(dir)
    assert.equal(index.items.length, 2)
    assert.equal(index.nextId, 3)
    const rawIndex = JSON.parse(await readFile(join(dir, 'index.json'), 'utf8'))
    assert.equal(rawIndex.items.length, 2)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('索引缺失时从文件重建', async () => {
  const dir = await makeTmpDir()
  try {
    await saveMemory(dir, { key: 'a', category: 'c', content: '1' })
    await rm(join(dir, 'index.json'))
    const index = await loadIndex(dir)
    assert.equal(index.items.length, 1)
    assert.equal(index.items[0].key, 'a')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('renderMemoryIndex 按分类分组且只含 key/tags', async () => {
  const dir = await makeTmpDir()
  try {
    await saveMemory(dir, { key: 'proxy', category: 'dev-env', content: 'x', tags: ['network'] })
    await saveMemory(dir, { key: 'commit-sop', category: 'git', content: 'x', tags: ['commit'] })
    await saveMemory(dir, { key: 'branch', category: 'git', content: 'x', tags: ['branch'] })
    const text = renderMemoryIndex(await loadIndex(dir))
    assert.match(text, /\[global memory\] 3 条记忆，2 个分类/)
    assert.match(text, /- git \(2\) #branch #commit/)
    assert.ok(text.includes('  - commit-sop'))
    assert.ok(!text.includes('proxy 走')) // 不含 content
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('分类超过 30 个时折叠并提示', () => {
  const items = Array.from({ length: 31 }, (_, index) => ({
    id: String(index + 1).padStart(4, '0'),
    key: `k${index}`,
    category: `cat-${String(index).padStart(2, '0')}`,
    summary: '',
    tags: [] as string[],
    updated: '2026-08-17T00:00:00.000Z',
  }))
  const text = renderMemoryIndex({ version: 1, nextId: 32, items })
  assert.match(text, /其余 11 个分类的 key 可用 memory_search 检索/)
  assert.ok(!text.includes('cat-30'))
})

test('deleteMemory 同步更新 index.json', async () => {
  const dir = await makeTmpDir()
  try {
    await saveMemory(dir, { key: 'a', category: 'c', content: '1' })
    await deleteMemory(dir, 'a')
    const names = await readdir(dir)
    assert.ok(!names.some((name) => name.endsWith('_a.json')))
    const index = await loadIndex(dir)
    assert.equal(index.items.length, 0)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
