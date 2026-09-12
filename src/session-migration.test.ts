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

function compressFrame(text: string): Buffer {
  return zstdCompressSync(Buffer.from(text, 'utf8'), CHECKSUM_OPTIONS)
}

test('自动迁移旧会话中的 memory-index source 并保留备份', () => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-global-memory-migration-'))
  const memoryDir = join(root, 'memory')
  const sessionDir = join(root, 'sessions', 'workspace', 'session-a')
  mkdirSync(memoryDir, { recursive: true })
  mkdirSync(sessionDir, { recursive: true })
  const sessionFile = join(sessionDir, 'session.jsonl.zstd')
  const header = `${JSON.stringify({
    type: 'session',
    version: 0,
    id: 'session-a',
    createdAt: 1,
    cwd: 'D:\\workspace',
    delegationDepth: 0,
  })}\n`
  const event = `${JSON.stringify({
    type: 'user/message',
    seq: 0,
    time: 1,
    data: {
      id: 'message-a',
      role: 'user',
      source: { kind: 'memory-index', plugin: '@dsh-external/dsh-global-memory' },
      content: [{ type: 'text', text: '[global memory]' }],
    },
  })}\n`
  writeFileSync(sessionFile, Buffer.concat([compressFrame(header), compressFrame(event)]))

  const first = migrateLegacySessionSources(memoryDir)
  assert.equal(first.scannedFiles, 1)
  assert.equal(first.changedFiles, 1)
  assert.equal(first.changedSources, 1)
  assert.equal(first.errors.length, 0)
  assert.equal(first.backups.length, 1)
  assert.ok(existsSync(first.backups[0]))

  const rewritten = decodeSessionArtifact(readFileSync(sessionFile)).toString('utf8')
  assert.match(rewritten, /"kind":"plugin"/)
  assert.doesNotMatch(rewritten, /"kind":"memory-index"/)
  assert.match(rewritten, /"plugin":"@dsh-external\/dsh-global-memory"/)

  const second = migrateLegacySessionSources(memoryDir)
  assert.equal(second.changedFiles, 0)
  assert.equal(second.changedSources, 0)

  rmSync(root, { recursive: true, force: true })
})

test('已有 v3 generation 时跳过旧 source 文件', () => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-global-memory-migration-v3-'))
  const memoryDir = join(root, 'memory')
  const sessionDir = join(root, 'sessions', 'workspace', 'session-b')
  mkdirSync(memoryDir, { recursive: true })
  mkdirSync(sessionDir, { recursive: true })
  const sessionFile = join(sessionDir, 'session.jsonl.zstd')
  writeFileSync(
    sessionFile,
    compressFrame(
      `${JSON.stringify({
        type: 'session',
        version: 0,
        id: 'session-b',
        createdAt: 1,
        cwd: 'D:\\workspace',
        delegationDepth: 0,
      })}\n`,
    ),
  )
  writeFileSync(join(sessionDir, 'session.v3.jsonl.zstd'), compressFrame('{}\n'))

  const result = migrateLegacySessionSources(memoryDir)
  assert.equal(result.scannedFiles, 1)
  assert.equal(result.changedFiles, 0)

  rmSync(root, { recursive: true, force: true })
})
