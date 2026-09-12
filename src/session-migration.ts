/**
 * 旧会话 source.kind 兼容迁移。
 *
 * v0.0.3 及以前把记忆索引消息写成 `source.kind = "memory-index"`。DSH 的
 * v2→v3 会话迁移只为内建 source kind 建立审计白名单，未知 kind 会让历史会话
 * 无法加载。本模块在插件启动、任何会话被打开之前，自动把本插件写出的
 * `memory-index` 规范化为官方 `plugin` source；原文件先备份，迁移幂等。
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { constants, zstdCompressSync, zstdDecompressSync } from 'node:zlib'

const PLUGIN_NAME = '@dsh-external/dsh-global-memory'
const LEGACY_SOURCE_KIND = 'memory-index'
const MIGRATION_VERSION = 1
const MARKER_FILENAME = '.legacy-session-source-migration.json'
const ZSTD_MAGIC = 4247762216
const CHECKSUM_OPTIONS = {
  params: { [constants.ZSTD_c_checksumFlag]: 1 },
}

export interface LegacySessionMigrationResult {
  scannedFiles: number
  changedFiles: number
  changedSources: number
  backups: string[]
  errors: string[]
}

interface ZstdFrame {
  start: number
  end: number
}

interface MigrationMarker {
  version: number
  completedAt: string
  changedFiles: number
  changedSources: number
}

function scanZstdFrames(buffer: Buffer): { frames: ZstdFrame[]; tornStart?: number } {
  const frames: ZstdFrame[] = []
  let offset = 0
  while (offset < buffer.length) {
    const start = offset
    if (buffer.length - offset < 4) return { frames, tornStart: start }
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) {
      throw new Error(`invalid Zstandard frame magic at byte ${offset}`)
    }
    offset += 4
    if (offset === buffer.length) return { frames, tornStart: start }
    const descriptor = buffer.readUInt8(offset)
    offset += 1
    if ((descriptor & 24) !== 0) {
      throw new Error(`reserved Zstandard frame-header bit at byte ${offset - 1}`)
    }
    const contentSizeFlag = descriptor >>> 6
    const singleSegment = (descriptor & 32) !== 0
    const checksum = (descriptor & 4) !== 0
    const dictionaryFlag = descriptor & 3
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag
    const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : 1 << contentSizeFlag
    const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes
    if (buffer.length - offset < remainingHeaderBytes) return { frames, tornStart: start }
    offset += remainingHeaderBytes
    for (;;) {
      if (buffer.length - offset < 3) return { frames, tornStart: start }
      const blockHeader = buffer.readUIntLE(offset, 3)
      offset += 3
      const lastBlock = (blockHeader & 1) !== 0
      const blockType = (blockHeader >>> 1) & 3
      const blockSize = blockHeader >>> 3
      if (blockType === 3) {
        throw new Error(`reserved Zstandard block type at byte ${offset - 3}`)
      }
      const payloadBytes = blockType === 1 ? 1 : blockSize
      if (buffer.length - offset < payloadBytes) return { frames, tornStart: start }
      offset += payloadBytes
      if (lastBlock) break
    }
    if (checksum) {
      if (buffer.length - offset < 4) return { frames, tornStart: start }
      offset += 4
    }
    frames.push({ start, end: offset })
  }
  return { frames }
}

export function decodeSessionArtifact(buffer: Buffer): Buffer {
  const { frames, tornStart } = scanZstdFrames(buffer)
  if (tornStart !== undefined) {
    throw new Error(`torn Zstandard frame at byte ${tornStart}`)
  }
  return Buffer.concat(frames.map(({ start, end }) => zstdDecompressSync(buffer.subarray(start, end))))
}

function rewriteLegacySource(value: unknown): number {
  let changed = 0
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    if (node === null || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    if (record.kind === LEGACY_SOURCE_KIND && record.plugin === PLUGIN_NAME) {
      record.kind = 'plugin'
      changed += 1
    }
    for (const child of Object.values(record)) visit(child)
  }
  visit(value)
  return changed
}

/** 将一份 JSONL 文本中的旧插件 source 规范化；返回变更条数和输出行。 */
function rewriteJsonlLines(text: string): { text: string; changedSources: number } {
  const lines = text.split(/(?<=\n)/)
  let changedSources = 0
  const output = lines.map((line) => {
    if (!line.includes(LEGACY_SOURCE_KIND)) return line
    let event: unknown
    try {
      event = JSON.parse(line)
    } catch {
      return line
    }
    const changed = rewriteLegacySource(event)
    if (changed === 0) return line
    changedSources += changed
    return `${JSON.stringify(event)}\n`
  })
  return { text: output.join(''), changedSources }
}

function repairSessionBuffer(file: string, buffer: Buffer): { data: Buffer; changedSources: number } {
  const plaintext = file.endsWith('.zstd') ? decodeSessionArtifact(buffer) : buffer
  let text = plaintext.toString('utf8')
  if (!text.endsWith('\n') && text.length > 0) text += '\n'
  const { text: rewritten, changedSources } = rewriteJsonlLines(text)
  if (changedSources === 0) return { data: buffer, changedSources: 0 }
  if (!file.endsWith('.zstd')) {
    return { data: Buffer.from(rewritten, 'utf8'), changedSources }
  }
  const frames = rewritten
    .split(/(?<=\n)/)
    .filter((line) => line.length > 0)
    .map((line) => zstdCompressSync(Buffer.from(line, 'utf8'), CHECKSUM_OPTIONS))
  return { data: Buffer.concat(frames), changedSources }
}

function collectSessionArtifacts(root: string): string[] {
  const files: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (entry === 'session.jsonl.zstd' || entry === 'session.jsonl') {
        files.push(full)
      }
    }
  }
  walk(root)
  return files
}

function readMarker(memoryDir: string): MigrationMarker | null {
  const file = join(memoryDir, MARKER_FILENAME)
  if (!existsSync(file)) return null
  try {
    const marker = JSON.parse(readFileSync(file, 'utf8')) as MigrationMarker
    return marker.version >= MIGRATION_VERSION ? marker : null
  } catch {
    return null
  }
}

function writeMarker(memoryDir: string, changedFiles: number, changedSources: number): void {
  mkdirSync(memoryDir, { recursive: true })
  const marker: MigrationMarker = {
    version: MIGRATION_VERSION,
    completedAt: new Date().toISOString(),
    changedFiles,
    changedSources,
  }
  writeFileSync(join(memoryDir, MARKER_FILENAME), `${JSON.stringify(marker, null, 2)}\n`, 'utf8')
}

/**
 * 扫描 `$DSH_HOME/sessions`，自动修复本插件历史 `memory-index` source。
 * 已完成迁移的版本通过 memory 目录下的 marker 跳过；单个文件失败时不写 marker，
 * 下次启动会重试。
 */
export function migrateLegacySessionSources(memoryDir: string): LegacySessionMigrationResult {
  const result: LegacySessionMigrationResult = {
    scannedFiles: 0,
    changedFiles: 0,
    changedSources: 0,
    backups: [],
    errors: [],
  }
  if (readMarker(memoryDir) !== null) return result
  const sessionsRoot = join(memoryDir, '..', 'sessions')
  if (!existsSync(sessionsRoot)) return result
  for (const file of collectSessionArtifacts(sessionsRoot)) {
    result.scannedFiles += 1
    try {
      const currentV3 = join(dirname(file), 'session.v3.jsonl.zstd')
      if (existsSync(currentV3)) continue
      const original = readFileSync(file)
      const repaired = repairSessionBuffer(file, original)
      if (repaired.changedSources === 0) continue
      const backup = `${file}.bak-dsh-global-memory-${MIGRATION_VERSION}`
      const finalBackup = existsSync(backup) ? `${backup}-${Date.now()}` : backup
      copyFileSync(file, finalBackup)
      const temporary = `${file}.migrate-${process.pid}-${Date.now()}.tmp`
      writeFileSync(temporary, repaired.data)
      renameSync(temporary, file)
      result.changedFiles += 1
      result.changedSources += repaired.changedSources
      result.backups.push(finalBackup)
    } catch (error) {
      result.errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  if (result.errors.length === 0) {
    writeMarker(memoryDir, result.changedFiles, result.changedSources)
  }
  return result
}
