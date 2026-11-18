import { corpusIndex, resetCorpusCache, retrieve } from './retrieve'

describe('curated guidance corpus', () => {
  beforeEach(resetCorpusCache)
  it('loads cited source metadata and ranks relevant notes', () => {
    const index = corpusIndex()
    expect(index.docs.length).toBeGreaterThanOrEqual(25)
    expect(index.docs.every((doc) => doc.id && doc.title && doc.source)).toBe(true)
    expect(retrieve('window ventilation indoor pm', 3)).toHaveLength(3)
  })
})
