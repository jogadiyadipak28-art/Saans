import { buildIndex, search, tokenize, type Doc } from './bm25'

const docs: Doc[] = [
  { id: 'windows', title: 'Window timing', source: 'Saans', url: 'https://example.com/windows', tags: 'ventilation windows', body: 'Close windows when outdoor air is polluted.' },
  { id: 'fuel', title: 'Clean cooking', source: 'Saans', url: 'https://example.com/fuel', tags: 'fuel cooking', body: 'Use cleaner cooking fuel when available.' },
]

describe('BM25 knowledge retrieval', () => {
  it('tokenizes and ranks the most relevant knowledge first', () => {
    expect(tokenize('The outdoor air is very polluted!')).toEqual(['outdoor', 'air', 'very', 'polluted'])
    expect(search(buildIndex(docs), 'polluted outdoor windows')[0]?.doc.id).toBe('windows')
  })
  it('returns no unrelated results and honors the result limit', () => {
    const index = buildIndex(docs)
    expect(search(index, 'volcanoes')).toEqual([])
    expect(search(index, 'windows cooking', 1)).toHaveLength(1)
  })
})
