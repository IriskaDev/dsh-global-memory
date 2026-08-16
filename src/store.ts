/**
 * dsh-global-memory 核心存储模块。
 * 数据布局：
 *   $DSH_HOME/memory/
 *     index.json                  # 索引缓存，可由 m*.json 重建
 *     m0001_<key>.json            # 单条记忆，编号递增不回收
 *
 * 全部读写仅限 memory 根目录内；路径防穿越由 safeKey/safeCategory 白名单保证。
 */
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'

export interface MemoryIndexItem {
  id: string
  key: string
  category: string
  summary: string
  tags: string[]
  updated: string
}

export interface MemoryIndex {
  version: 1
  nextId: number
  items: MemoryIndexItem[]
}

export interface MemoryRecord {
  key: string
  category: string
  content: string
  summary: string
  tags: string[]
  created: string
  updated: string
}

export interface SaveMemoryInput {
  key: string
  category?: string
  content: string
  summary?: string
  tags?: string[]
}

export interface SaveMemoryResult {
  ok: true
  key: string
  id: string
  created: string
  updated: string
}

export interface SearchOptions {
  category?: string
  tag?: string
  limit?: number
}

export interface SearchResultItem {
  key: string
  category: string
  summary: string
  tags: string[]
  updated: string
}

export interface SearchResult {
  query: string
  matches: number
  limit: number
  results: SearchResultItem[]
}

const MAX_CONTENT_BYTES = 256 * 1024
const MAX_TAG_LENGTH = 32
const MAX_SUMMARY_CHARS = 80
const MAX_TAGS = 12
const MAX_SEARCH_LIMIT = 50
const DEFAULT_SEARCH_LIMIT = 10
const MAX_INDEX_CATEGORIES = 30
const MAX_INDEX_CATEGORIES_SHOWN = 20

export class MemoryError extends Error {}

/** 读取 DSH_HOME 并拼接 memory/ 目录。默认 ~/.dsh/memory/。 */
export function resolveMemoryDir(env: NodeJS.ProcessEnv = process.env): string {
  const home = env.DSH_HOME?.trim() || join(homedir(), '.dsh')
  return join(home, 'memory')
}

/** key 白名单安全化：删除非法字符，保留 [a-zA-Z0-9_-]；结果为空则报错。 */
export function safeKey(raw: string): string {
  const cleaned = String(raw ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
  if (!cleaned) throw new MemoryError('memory key 非法：处理后为空，必须包含至少一个 [a-zA-Z0-9_-] 字符')
  return cleaned.slice(0, 64)
}

/** category 白名单安全化：规则同 key，长度 1–32；空值回退 general。 */
export function safeCategory(raw: string | undefined): string {
  if (raw === undefined || String(raw).trim() === '') return 'general'
  const cleaned = String(raw)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
  if (!cleaned) throw new MemoryError('memory category 非法：处理后为空')
  return cleaned.slice(0, 32)
}

/** 单条记忆文件路径：m<NNNN>_<key>.json。 */
export function memoryFilePath(dir: string, id: string, key: string): string {
  return join(dir, `m${id}_${key}.json`)
}

/** 从文件名解析 id：m0001_xxx.json → 0001；不匹配返回 null。 */
function parseFileId(name: string): string | null {
  const match = /^m(\d{4})_.+\.json$/.exec(name)
  return match?.[1] ?? null
}

async function readJsonFile<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T
}

async function writeJsonFileAtomic(file: string, value: unknown): Promise<void> {
  const tmp = join(
    dirname(file),
    `.${basename(file)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
  )
  await writeFile(tmp, JSON.stringify(value, null, 2), 'utf8')
  await rename(tmp, file)
}

function summarizeContent(content: string, summary?: string): string {
  if (summary !== undefined && String(summary).trim() !== '') return String(summary).trim().slice(0, MAX_SUMMARY_CHARS)
  const firstLine =
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? ''
  return firstLine.slice(0, MAX_SUMMARY_CHARS)
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) return []
  const result: string[] = []
  for (const raw of tags) {
    if (typeof raw !== 'string') continue
    const tag = raw.trim()
    if (!tag) continue
    if (tag.length > MAX_TAG_LENGTH) throw new MemoryError(`tag 超长（≤${MAX_TAG_LENGTH} 字符）：${tag.slice(0, 32)}…`)
    if (!result.includes(tag)) result.push(tag)
  }
  if (result.length > MAX_TAGS) throw new MemoryError(`tags 数量超限（≤${MAX_TAGS}）`)
  return result
}

function validateContent(content: string): void {
  if (typeof content !== 'string') throw new MemoryError('content 必须为字符串')
  if (Buffer.byteLength(content, 'utf8') > MAX_CONTENT_BYTES) {
    throw new MemoryError(`content 超限（≤${MAX_CONTENT_BYTES} bytes）`)
  }
}

function isValidIndex(value: unknown): value is MemoryIndex {
  if (typeof value !== 'object' || value === null) return false
  const index = value as { version?: unknown; nextId?: unknown; items?: unknown }
  return index.version === 1 && Number.isInteger(index.nextId) && Array.isArray(index.items)
}

function readJsonFileSync<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T
}

function writeJsonFileAtomicSync(file: string, value: unknown): void {
  const tmp = join(
    dirname(file),
    `.${basename(file)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
  )
  writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  renameSync(tmp, file)
}

/** 同步重建索引：供 systemPrompt.context（必须同步返回）在 index.json 缺失/损坏时兜底。 */
export function rebuildIndexSync(dir: string): MemoryIndex {
  mkdirSync(dir, { recursive: true })
  const names = readdirSync(dir)
  const items: MemoryIndexItem[] = []
  let maxId = 0
  for (const name of names) {
    const id = parseFileId(name)
    if (id === null) continue
    const file = join(dir, name)
    try {
      const record = readJsonFileSync<Partial<MemoryRecord>>(file)
      const key = typeof record.key === 'string' && record.key ? safeKey(record.key) : basename(name, '.json').slice(6)
      const item: MemoryIndexItem = {
        id,
        key,
        category: safeCategory(record.category),
        summary: summarizeContent(typeof record.content === 'string' ? record.content : '', record.summary),
        tags: normalizeTags(record.tags),
        updated: typeof record.updated === 'string' ? record.updated : new Date(0).toISOString(),
      }
      items.push(item)
      maxId = Math.max(maxId, Number(id))
    } catch {
      // 跳过无法解析的记忆文件，保留在磁盘上
    }
  }
  items.sort((a, b) => a.id.localeCompare(b.id))
  const index: MemoryIndex = { version: 1, nextId: maxId + 1, items }
  writeJsonFileAtomicSync(join(dir, 'index.json'), index)
  return index
}

/** 同步读取索引；缺失或损坏时从 m*.json 重建。 */
export function loadIndexSync(dir: string): MemoryIndex {
  mkdirSync(dir, { recursive: true })
  const indexFile = join(dir, 'index.json')
  try {
    const value = readJsonFileSync<unknown>(indexFile)
    if (isValidIndex(value)) return value
  } catch {
    // fall through to rebuild
  }
  return rebuildIndexSync(dir)
}

/** 读取索引；缺失或损坏时从 m*.json 重建。 */
export async function loadIndex(dir: string): Promise<MemoryIndex> {
  await mkdir(dir, { recursive: true })
  const indexFile = join(dir, 'index.json')
  try {
    const value = await readJsonFile<unknown>(indexFile)
    if (isValidIndex(value)) return value
  } catch {
    // fall through to rebuild
  }
  return rebuildIndex(dir)
}

/** 从 m*.json 重建索引。损坏的记忆文件跳过（文件保留，下次可再修）。 */
export async function rebuildIndex(dir: string): Promise<MemoryIndex> {
  await mkdir(dir, { recursive: true })
  const names = await readdir(dir)
  const items: MemoryIndexItem[] = []
  let maxId = 0
  for (const name of names) {
    const id = parseFileId(name)
    if (id === null) continue
    const file = join(dir, name)
    try {
      const record = await readJsonFile<Partial<MemoryRecord>>(file)
      const key = typeof record.key === 'string' && record.key ? safeKey(record.key) : basename(name, '.json').slice(6)
      const item: MemoryIndexItem = {
        id,
        key,
        category: safeCategory(record.category),
        summary: summarizeContent(typeof record.content === 'string' ? record.content : '', record.summary),
        tags: normalizeTags(record.tags),
        updated: typeof record.updated === 'string' ? record.updated : new Date(0).toISOString(),
      }
      items.push(item)
      maxId = Math.max(maxId, Number(id))
    } catch {
      // 跳过无法解析的记忆文件，保留在磁盘上
    }
  }
  items.sort((a, b) => a.id.localeCompare(b.id))
  const index: MemoryIndex = { version: 1, nextId: maxId + 1, items }
  await writeJsonFileAtomic(join(dir, 'index.json'), index)
  return index
}

/** 创建或覆盖一条记忆：原子写记忆文件 + 原子写索引。 */
export async function saveMemory(dir: string, input: SaveMemoryInput): Promise<SaveMemoryResult> {
  const key = safeKey(input.key)
  const category = safeCategory(input.category)
  validateContent(input.content)
  const summary = summarizeContent(input.content, input.summary)
  const tags = normalizeTags(input.tags)
  const now = new Date().toISOString()

  const index = await loadIndex(dir)
  const existing = index.items.find((item) => item.key === key)
  let id: string
  let created = now
  if (existing) {
    id = existing.id
    const file = memoryFilePath(dir, id, key)
    let previous: Partial<MemoryRecord> = {}
    try {
      previous = await readJsonFile<Partial<MemoryRecord>>(file)
    } catch {
      // 文件缺失时按新建处理
    }
    created = typeof previous.created === 'string' ? previous.created : now
    existing.category = category
    existing.summary = summary
    existing.tags = tags
    existing.updated = now
  } else {
    id = String(index.nextId).padStart(4, '0')
    index.nextId += 1
    index.items.push({ id, key, category, summary, tags, updated: now })
  }
  index.items.sort((a, b) => a.id.localeCompare(b.id))

  const record: MemoryRecord = { key, category, content: input.content, summary, tags, created, updated: now }
  await writeJsonFileAtomic(memoryFilePath(dir, id, key), record)
  await writeJsonFileAtomic(join(dir, 'index.json'), index)
  return { ok: true, key, id, created, updated: now }
}

/** 按 key 读取完整记忆；不存在返回 null。 */
export async function readMemory(dir: string, rawKey: string): Promise<MemoryRecord | null> {
  const key = safeKey(rawKey)
  const index = await loadIndex(dir)
  const item = index.items.find((entry) => entry.key === key)
  if (!item) return null
  try {
    return await readJsonFile<MemoryRecord>(memoryFilePath(dir, item.id, key))
  } catch {
    return null
  }
}

/** 删除一条记忆并同步更新索引。 */
export async function deleteMemory(dir: string, rawKey: string): Promise<{ ok: true; key: string }> {
  const key = safeKey(rawKey)
  const index = await loadIndex(dir)
  const itemIndex = index.items.findIndex((entry) => entry.key === key)
  if (itemIndex === -1) throw new MemoryError(`记忆不存在：${key}`)
  const [item] = index.items.splice(itemIndex, 1)
  await rm(memoryFilePath(dir, item.id, key), { force: true })
  await writeJsonFileAtomic(join(dir, 'index.json'), index)
  return { ok: true, key }
}

/** 大小写不敏感子串搜索 key/content/tags，返回带摘要的结果。 */
export async function searchMemories(
  dir: string,
  rawQuery: string,
  options: SearchOptions = {},
): Promise<SearchResult> {
  const query = String(rawQuery ?? '')
    .trim()
    .toLowerCase()
  if (!query) throw new MemoryError('query 不能为空')
  const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_SEARCH_LIMIT), MAX_SEARCH_LIMIT)
  const category = options.category === undefined ? undefined : safeCategory(options.category)
  const tag = options.tag?.trim() || undefined

  const index = await loadIndex(dir)
  const results: SearchResultItem[] = []
  for (const item of index.items) {
    if (category !== undefined && item.category !== category) continue
    if (tag !== undefined && !item.tags.includes(tag)) continue
    const keyHit = item.key.toLowerCase().includes(query)
    const tagHit = item.tags.some((entry) => entry.toLowerCase().includes(query))
    let contentHit = false
    if (!keyHit && !tagHit) {
      try {
        const record = await readJsonFile<MemoryRecord>(memoryFilePath(dir, item.id, item.key))
        contentHit = record.content.toLowerCase().includes(query)
      } catch {
        contentHit = false
      }
    }
    if (keyHit || tagHit || contentHit) {
      results.push({
        key: item.key,
        category: item.category,
        summary: item.summary,
        tags: item.tags,
        updated: item.updated,
      })
      if (results.length >= limit) break
    }
  }
  return { query, matches: results.length, limit, results }
}

/** 渲染会话开始注入的条目级轻量索引：按分类分组，只含 key 与 tags。 */
export function renderMemoryIndex(index: MemoryIndex): string {
  const total = index.items.length
  if (total === 0) return '[global memory] 暂无记忆。'

  const groups = new Map<string, MemoryIndexItem[]>()
  for (const item of index.items) {
    const list = groups.get(item.category) ?? []
    list.push(item)
    groups.set(item.category, list)
  }
  for (const list of groups.values()) list.sort((a, b) => a.key.localeCompare(b.key))

  const categoryNames = [...groups.keys()].sort((a, b) => {
    const countDiff = groups.get(b)!.length - groups.get(a)!.length
    return countDiff !== 0 ? countDiff : a.localeCompare(b)
  })

  let visibleCategories = categoryNames
  let overflowCount = 0
  if (categoryNames.length > MAX_INDEX_CATEGORIES) {
    visibleCategories = categoryNames.slice(0, MAX_INDEX_CATEGORIES_SHOWN)
    overflowCount = categoryNames.length - visibleCategories.length
  }

  const lines: string[] = [
    `[global memory] ${total} 条记忆，${categoryNames.length} 个分类。需要时 memory_recall(key=...) 查全文；不确定 key 用 memory_search。`,
  ]
  for (const category of visibleCategories) {
    const items = groups.get(category)!
    const tagSet = new Set<string>()
    for (const item of items) for (const tag of item.tags) tagSet.add(tag)
    const tags = [...tagSet]
      .sort()
      .slice(0, 5)
      .map((tag) => `#${tag}`)
      .join(' ')
    lines.push(`- ${category} (${items.length})${tags ? ` ${tags}` : ''}`)
    for (const item of items) lines.push(`  - ${item.key}`)
  }
  if (overflowCount > 0) lines.push(`- 其余 ${overflowCount} 个分类的 key 可用 memory_search 检索`)
  return lines.join('\n')
}
