import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { buildIndex, search, type Bm25Index, type Doc } from './bm25'

let cached: Bm25Index | null = null

export function loadCorpus(directory = path.join(process.cwd(), 'knowledge')): Doc[] {
  const files = readdirSync(directory).filter((file) => file.endsWith('.md'))
  return files.map((file) => parseDoc(readFileSync(path.join(directory, file), 'utf8')))
}

export function corpusIndex(): Bm25Index {
  cached ??= buildIndex(loadCorpus())
  return cached
}

export function retrieve(query: string, limit = 4): Doc[] {
  return search(corpusIndex(), query, limit).map((item) => item.doc)
}

export function resetCorpusCache(): void {
  cached = null
}

function parseDoc(raw: string): Doc {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  const meta = match?.[1] ?? ''
  const body = (match?.[2] ?? raw).trim()
  const field = (name: string) => meta.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? ''
  return {
    id: field('id'),
    title: field('title'),
    source: field('source'),
    url: field('url'),
    tags: field('tags'),
    body,
  }
}
