import { guardMessage } from './guardrails'

describe('chat safety guardrails', () => {
  it('escalates severe symptoms and refuses diagnosis or medication instructions', () => {
    expect(guardMessage('My child has chest pain', 'en').action).toBe('escalate')
    expect(guardMessage('What medication dose should I use?', 'en').action).toBe('refuse')
    expect(guardMessage('दवाई की खुराक बताएं', 'hi').action).toBe('refuse')
  })
  it('politely refuses unrelated topics and allows pollution questions', () => {
    expect(guardMessage('Give me a bitcoin stock tip', 'en').action).toBe('refuse')
    expect(guardMessage('When should I ventilate the room?', 'en').action).toBe('allow')
  })
})
