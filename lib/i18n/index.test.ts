import { flatten, LANGS, MESSAGES, translate } from './index'

describe('static translations', () => {
  it('keeps the English, Hindi, and Gujarati dictionaries complete', () => {
    const englishKeys = Object.keys(flatten(MESSAGES.en)).sort()
    for (const language of LANGS) expect(Object.keys(flatten(MESSAGES[language])).sort()).toEqual(englishKeys)
  })
  it('uses the requested language and fills message variables', () => {
    expect(translate('en', 'brief.exposure', false, { exposure: 2, plan: 1 })).toContain('2 µg·h/m³')
    expect(translate('hi', 'onboarding.title')).not.toBe(translate('en', 'onboarding.title'))
    expect(translate('gu', 'nav.today')).not.toBe('nav.today')
  })
})
