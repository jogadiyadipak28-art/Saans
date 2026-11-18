export type Doc = { id: string; title: string; source: string; url: string; tags: string; body: string }

const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'you', 'your'])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word))
}

export type Bm25Index = {
  docs: Doc[]
  idf: Map<string, number>
  vectors: Map<string, number>[]
  lengths: number[]
  avg: number
}

export function buildIndex(docs: Doc[]): Bm25Index {
  const counts = docs.map((doc) => termCounts(`${doc.title} ${doc.tags} ${doc.body}`))
  const docFreq = new Map<string, number>()
  for (const count of counts) {
    for (const term of count.keys()) docFreq.set(term, (docFreq.get(term) ?? 0) + 1)
  }
  const idf = new Map<string, number>()
  for (const [term, freq] of docFreq) {
    idf.set(term, Math.log(1 + (docs.length - freq + 0.5) / (freq + 0.5)))
  }
  const lengths = counts.map((count) => [...count.values()].reduce((sum, value) => sum + value, 0))
  const avg = lengths.reduce((sum, value) => sum + value, 0) / Math.max(1, lengths.length)
  return { docs, idf, vectors: counts, lengths, avg }
}

function termCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const token of tokenize(text)) counts.set(token, (counts.get(token) ?? 0) + 1)
  return counts
}

export function search(index: Bm25Index, query: string, limit = 4): { doc: Doc; score: number }[] {
  const queryTerms = tokenize(query)
  const k1 = 1.2
  const b = 0.75
  const ranked = index.docs.map((doc, docIndex) => {
    const vector = index.vectors[docIndex] ?? new Map<string, number>()
    const length = index.lengths[docIndex] ?? 0
    let score = 0
    for (const term of queryTerms) {
      const freq = vector.get(term) ?? 0
      if (!freq) continue
      const idf = index.idf.get(term) ?? 0
      const norm = freq / (freq + k1 * (1 - b + b * (length / Math.max(index.avg, 1))))
      score += idf * norm
    }
    return { doc, score }
  })
  return ranked
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
