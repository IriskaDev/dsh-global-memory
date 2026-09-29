import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { constants, zstdCompressSync } from 'node:zlib'
import { decodeSessionArtifact, migrateLegacySessionSources } from './session-migration.js'

const CHECKSUM_OPTIONS = {
  params: { [constants.ZSTD_c_checksumFlag]: 1 },
}
const PLUGIN_NAME = '@dsh-external/dsh-global-memory'
const CURRENT_KIND = `plugin:${PLUGIN_NAME}`

function compressFrame(text: string): Buffer {
  return zstdCompressSync(Buffer.from(text, 'utf8'), CHECKSUM_OPTIONS)
}

interface SessionFixture {
  root: string
  memoryDir: string
  sessionFile: string
}

function createFixture(name: string, version: number, events: unknown[]): SessionFixture {
  const root = mkdtempSync(join(tmpdir(), `dsh-global-memory-migration-${name}-`))
  const memoryDir = join(root, 'memory')
  const sessionDir = join(root, 'sessions', 'workspace', `session-${name}`)
  mkdirSync(memoryDir, { recursive: true })
  mkdirSync(sessionDir, { recursive: true })
  const sessionFile = join(sessionDir, 'session.jsonl.zstd')
  const header = `${JSON.stringify({
    type: 'session',
    version,
    id: `session-${name}`,
    createdAt: 1,
    cwd: 'D:\\workspace',
    delegationDepth: 0,
  })}\n`
  const frames = [compressFrame(header), ...events.map((event) => compressFrame(`${JSON.stringify(event)}\n`))]
  writeFileSync(sessionFile, Buffer.concat(frames))
  return { root, memoryDir, sessionFile }
}

function indexMessageEvent(source: unknown) {
  return {
    type: 'user/message',
    seq: 0,
    time: 1,
    data: {
      id: 'message-a',
      role: 'user',
      source,
      content: [{ type: 'text', text: '[global memory]' }],
    },
  }
}

function readSessionText(file: string): string {
  return decodeSessionArtifact(readFileSync(file)).toString('utf8')
}

test('v0.0.3 的 memory-index source 迁移为 v4 producer-owned kind 并保留备份', () => {
  const fixture = createFixture('legacy', 0, [indexMessageEvent({ kind: 'memory-index', plugin: PLUGIN_NAME })])

  const first = migrateLegacySessionSources(fixture.memoryDir)
  assert.equal(first.scannedFiles, 1)
  assert.equal(first.changedFiles, 1)
  assert.equal(first.changedSources, 1)
  assert.deepEqual(first.changedKinds, { 'memory-index': 1 })
  assert.equal(first.errors.length, 0)
  assert.equal(first.backups.length, 1)
  assert.ok(existsSync(first.backups[0]))

  const rewritten = readSessionText(fixture.sessionFile)
  assert.match(rewritten, new RegExp(`"kind":"${CURRENT_KIND.replace(/[/@]/g, '\\$&')}"`))
  assert.doesNotMatch(rewritten, /"kind":"memory-index"/)
  assert.doesNotMatch(rewritten, /"kind":"plugin"/)

  const second = migrateLegacySessionSources(fixture.memoryDir)
  assert.equal(second.changedFiles, 0)
  assert.equal(second.changedSources, 0)

  rmSync(fixture.root, { recursive: true, force: true })
})

// 回归：DSH 0.2.x 的 v4 原生准入拒绝 `kind === 'plugin'` 包裹式 source，
// 会话一旦已是 v4，插件再写这种 source 会让整轮运行失败。
test('v0.0.4 写入的 kind:plugin 包裹 source 被修复为 producer-owned kind', () => {
  const fixture = createFixture('packaged', 4, [indexMessageEvent({ kind: 'plugin', plugin: PLUGIN_NAME })])

  const result = migrateLegacySessionSources(fixture.memoryDir)
  assert.equal(result.changedFiles, 1)
  assert.equal(result.changedSources, 1)
  assert.deepEqual(result.changedKinds, { plugin: 1 })
  assert.equal(result.errors.length, 0)

  const rewritten = readSessionText(fixture.sessionFile)
  assert.match(rewritten, new RegExp(`"kind":"${CURRENT_KIND.replace(/[/@]/g, '\\$&')}"`))
  assert.doesNotMatch(rewritten, /"kind":"plugin"/)
  // 与官方 v3→v4 提升一致：只替换 kind，其余 own 属性（含 plugin）原样保留。
  assert.match(rewritten, new RegExp(`"plugin":"${PLUGIN_NAME.replace(/[/@]/g, '\\$&')}"`))

  rmSync(fixture.root, { recursive: true, force: true })
})

test('嵌套在 inbox 载荷里的 source 同样被修复', () => {
  const fixture = createFixture('nested', 4, [
    {
      type: 'agent/inbox/spliced',
      seq: 0,
      time: 1,
      data: {
        target: 'next-turn',
        start: 0,
        inserted: [
          {
            id: 'message-nested',
            role: 'user',
            source: { kind: 'plugin', plugin: PLUGIN_NAME },
            content: [{ type: 'text', text: '[global memory]' }],
          },
        ],
      },
    },
  ])

  const result = migrateLegacySessionSources(fixture.memoryDir)
  assert.equal(result.changedSources, 1)

  const rewritten = readSessionText(fixture.sessionFile)
  assert.match(rewritten, new RegExp(`"kind":"${CURRENT_KIND.replace(/[/@]/g, '\\$&')}"`))
  assert.doesNotMatch(rewritten, /"kind":"plugin"/)

  rmSync(fixture.root, { recursive: true, force: true })
})

test('其他插件的 plugin source 不被改写', () => {
  const fixture = createFixture('foreign', 4, [indexMessageEvent({ kind: 'plugin', plugin: 'some-other-plugin' })])

  const result = migrateLegacySessionSources(fixture.memoryDir)
  assert.equal(result.changedFiles, 0)
  assert.equal(result.changedSources, 0)

  const untouched = readSessionText(fixture.sessionFile)
  assert.match(untouched, /"kind":"plugin","plugin":"some-other-plugin"/)

  rmSync(fixture.root, { recursive: true, force: true })
})

test('已是当前 kind 的会话不产生写入', () => {
  const fixture = createFixture('current', 4, [indexMessageEvent({ kind: CURRENT_KIND })])
  const before = readFileSync(fixture.sessionFile)

  const result = migrateLegacySessionSources(fixture.memoryDir)
  assert.equal(result.scannedFiles, 1)
  assert.equal(result.changedFiles, 0)
  assert.equal(result.backups.length, 0)
  assert.deepEqual(readFileSync(fixture.sessionFile), before)

  rmSync(fixture.root, { recursive: true, force: true })
})

test('每个会话目录只处理当前代次的活跃工件，旧代次备份保持原样', () => {
  const fixture = createFixture('generations', 0, [indexMessageEvent({ kind: 'memory-index', plugin: PLUGIN_NAME })])
  const sessionDir = join(fixture.sessionFile, '..')
  // 真实布局：各代次并排存放，当前代次带 `.v<n>` 后缀。
  const activeFile = join(sessionDir, 'session.v4.jsonl.zstd')
  writeFileSync(activeFile, readFileSync(fixture.sessionFile))
  const staleBackup = readFileSync(fixture.sessionFile)
  writeFileSync(join(sessionDir, 'session.v3.jsonl.zstd'), staleBackup)
  rmSync(fixture.sessionFile)

  const result = migrateLegacySessionSources(fixture.memoryDir)
  // 只扫当前代次（v4），旧代次 v3 不进入扫描。
  assert.equal(result.scannedFiles, 1)
  assert.equal(result.changedFiles, 1)

  const rewritten = readSessionText(activeFile)
  assert.match(rewritten, new RegExp(`"kind":"${CURRENT_KIND.replace(/[/@]/g, '\\$&')}"`))
  // 旧代次备份逐字节未变。
  assert.deepEqual(readFileSync(join(sessionDir, 'session.v3.jsonl.zstd')), staleBackup)

  rmSync(fixture.root, { recursive: true, force: true })
})
