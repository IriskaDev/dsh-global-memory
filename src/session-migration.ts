/**
 * 旧会话 source.kind 兼容迁移。
 *
 * 本模块在插件启动、任何会话被打开之前，把本插件历史写出的、当前 runtime 不再
 * 接纳的 `source.kind` 规范化为 producer-owned 形态；原文件先备份，迁移幂等。
 *
 * 两代历史载荷：
 * - `memory-index`（v0.0.3 及以前）：v2→v3 迁移只为内建 kind 建立审计白名单，
 *   未知 kind 会让历史会话无法加载。
 * - `{ kind: 'plugin', plugin: <本插件名> }`（v0.0.4）：v3 会话的合法包裹形态，
 *   v3→v4 迁移会把它提升为 `plugin:<插件名>`；但 DSH 0.2.x 的 v4 原生准入直接
 *   拒绝 `kind === 'plugin'`（"format v4 message requires a producer-owned
 *   source kind"），会话一旦已是 v4，插件再写这种 source 就会让整轮运行失败。
 *
 * 因此统一改写为 `plugin:<完整插件名>`——这正是官方 v3→v4 迁移的提升结果，v4
 * 原生接纳，旧 runtime 也会把它当作 direct kind 原样保留。
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
/** 当前 runtime 接纳的 producer-owned source kind。 */
const CURRENT_SOURCE_KIND = `plugin:${PLUGIN_NAME}`
const LEGACY_SOURCE_KIND = 'memory-index'
const PACKAGED_SOURCE_KIND = 'plugin'
const MIGRATION_VERSION = 2
const MARKER_FILENAME = '.legacy-session-source-migration.json'
const ZSTD_MAGIC = 4247762216
const CHECKSUM_OPTIONS = {
  params: { [constants.ZSTD_c_checksumFlag]: 1 },
}

export interface LegacySessionMigrationResult {
  scannedFiles: number
  changedFiles: number
  changedSources: number
  /** 按改写前的 source kind 统计改写条数，便于排查是哪一代历史载荷。 */
  changedKinds: Record<string, number>
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

/**
 * 判断一个 source 记录是否由本插件在生产，且仍是过期的 `kind` 形态。
 *
 * - `{ kind: 'plugin', plugin: <本插件名> }`：v3 包裹形态，v4 原生准入拒绝；
 * - `{ kind: 'memory-index', plugin: <本插件名> }`：更早的自定义 kind.
 *
 * 其他插件写出的同名记录一律不动。
 */
function stalePluginSourceKind(record: Record<string, unknown>): string | null {
  if (record.plugin !== PLUGIN_NAME) return null
  if (record.kind === LEGACY_SOURCE_KIND) return LEGACY_SOURCE_KIND
  if (record.kind === PACKAGED_SOURCE_KIND) return PACKAGED_SOURCE_KIND
  return null
}

/** 把一条事件里所有本插件的过期 source.kind 改写为当前形态，返回按源 kind 的计数。 */
function rewriteLegacySource(value: unknown): Record<string, number> {
  const changed: Record<string, number> = {}
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    if (node === null || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    const stale = stalePluginSourceKind(record)
    if (stale !== null) {
      record.kind = CURRENT_SOURCE_KIND
      changed[stale] = (changed[stale] ?? 0) + 1
    }
    for (const child of Object.values(record)) visit(child)
  }
  visit(value)
  return changed
}

/** 将一份 JSONL 文本中的旧插件 source 规范化；返回变更条数和输出行。 */
function rewriteJsonlLines(text: string): {
  text: string
  changedSources: number
  changedKinds: Record<string, number>
} {
  const lines = text.split(/(?<=\n)/)
  const changedKinds: Record<string, number> = {}
  let changedSources = 0
  const output = lines.map((line) => {
    if (!line.includes(PLUGIN_NAME)) return line
    let event: unknown
    try {
      event = JSON.parse(line)
    } catch {
      return line
    }
    const changed = rewriteLegacySource(event)
    const count = Object.values(changed).reduce((total, item) => total + item, 0)
    if (count === 0) return line
    changedSources += count
    for (const [kind, item] of Object.entries(changed)) {
      changedKinds[kind] = (changedKinds[kind] ?? 0) + item
    }
    return `${JSON.stringify(event)}\n`
  })
  return { text: output.join(''), changedSources, changedKinds }
}

function repairSessionBuffer(
  file: string,
  buffer: Buffer,
): { data: Buffer; changedSources: number; changedKinds: Record<string, number> } {
  const plaintext = file.endsWith('.zstd') ? decodeSessionArtifact(buffer) : buffer
  let text = plaintext.toString('utf8')
  if (!text.endsWith('\n') && text.length > 0) text += '\n'
  const { text: rewritten, changedSources, changedKinds } = rewriteJsonlLines(text)
  if (changedSources === 0) return { data: buffer, changedSources: 0, changedKinds: {} }
  if (!file.endsWith('.zstd')) {
    return { data: Buffer.from(rewritten, 'utf8'), changedSources, changedKinds }
  }
  const frames = rewritten
    .split(/(?<=\n)/)
    .filter((line) => line.length > 0)
    .map((line) => zstdCompressSync(Buffer.from(line, 'utf8'), CHECKSUM_OPTIONS))
  return { data: Buffer.concat(frames), changedSources, changedKinds }
}

/** 会话工件文件名：`session.jsonl[.zstd]` 或 `session.v<n>.jsonl[.zstd]`。 */
const SESSION_ARTIFACT_PATTERN = /^session(?:\.v(\d+))?\.jsonl(?:\.zstd)?$/

/** 从会话工件文件名解析格式代次；无 `.v<n>` 后缀视为 0（最老的 generation）。 */
function sessionArtifactVersion(entry: string): number {
  const match = SESSION_ARTIFACT_PATTERN.exec(entry)
  if (match === null) return -1
  return match[1] === undefined ? 0 : Number(match[1])
}

/**
 * 收集每个会话目录里**当前代次**的会话工件。
 *
 * DSH 把同一个会话的各代次并排存放（`session.jsonl.zstd`、`session.v3.jsonl.zstd`、
 * `session.v4.jsonl.zstd`……），只有代次最高的那个是可读写的活跃工件；旧代次是
 * runtime 自己维护的迁移备份，改写它们只会制造无谓 diff。
 *
 * 注意：真实 `$DSH_HOME/sessions` 里的活跃工件通常**带** `.v<n>` 后缀（v0.0.4 的
 * 收集器只认无后缀名，因而从未命中任何真实文件，见任务档案 RCA）。
 */
function collectSessionArtifacts(root: string): string[] {
  const candidates: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (SESSION_ARTIFACT_PATTERN.test(entry)) candidates.push(full)
    }
  }
  walk(root)

  const newestPerDirectory = new Map<string, { file: string; version: number }>()
  for (const file of candidates) {
    const dir = dirname(file)
    const version = sessionArtifactVersion(file.slice(dir.length + 1))
    const current = newestPerDirectory.get(dir)
    if (current === undefined || version > current.version) {
      newestPerDirectory.set(dir, { file, version })
    }
  }
  return [...newestPerDirectory.values()].map((entry) => entry.file)
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
 * 扫描 `$DSH_HOME/sessions`，自动修复本插件历史写出的过期 source kind
 * （`memory-index` 与 `kind: 'plugin'` 包裹形态）。
 *
 * 改写目标 `plugin:<完整插件名>` 在 v3 / v4 都是合法 source，因此这里不需要判定
 * 工件自身的格式版本：只有真正含过期 source 的文件才会被改写（其余文件
 * `changedSources === 0` 直接跳过，不产生任何写入）。
 *
 * 每个会话目录只处理**当前代次**的活跃工件（见 {@link collectSessionArtifacts}）；
 * 旧代次（`session.v3.jsonl.zstd` 等）是 runtime 自己的迁移备份，保持原样。
 *
 * 已完成迁移的版本通过 memory 目录下的 marker 跳过；有文件失败时不写 marker，
 * 下次启动会重试。
 *
 * @param memoryDir `$DSH_HOME/memory` 目录。
 */
export function migrateLegacySessionSources(memoryDir: string): LegacySessionMigrationResult {
  const result: LegacySessionMigrationResult = {
    scannedFiles: 0,
    changedFiles: 0,
    changedSources: 0,
    changedKinds: {},
    backups: [],
    errors: [],
  }
  if (readMarker(memoryDir) !== null) return result
  const sessionsRoot = join(memoryDir, '..', 'sessions')
  if (!existsSync(sessionsRoot)) return result
  for (const file of collectSessionArtifacts(sessionsRoot)) {
    result.scannedFiles += 1
    try {
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
      for (const [kind, count] of Object.entries(repaired.changedKinds)) {
        result.changedKinds[kind] = (result.changedKinds[kind] ?? 0) + count
      }
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
