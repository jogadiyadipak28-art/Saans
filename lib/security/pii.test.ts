import { redactPersonalIdentifiers } from './pii'

describe('chat identifier redaction', () => {
  it('removes email, phone, Indian PIN, explicit names, and addresses', () => {
    const result = redactPersonalIdentifiers('My name is Asha Patel, email asha@example.com, call +91 98765 43210, PIN 110001, address: 12 Green Road.')
    expect(result).not.toMatch(/asha|example\.com|98765|110001|Green Road/i)
    expect(result).toContain('[email removed]')
    expect(result).toContain('[phone removed]')
    expect(result).toContain('[PIN removed]')
    expect(result).toContain('[name removed]')
    expect(result).toContain('[address removed]')
  })

  it('redacts explicit Hindi and Gujarati name disclosures', () => {
    expect(redactPersonalIdentifiers('मेरा नाम आशा है।')).toContain('[नाम हटाया]')
    expect(redactPersonalIdentifiers('મારું નામ આશા છે.')).toContain('[નામ દૂર કર્યું]')
  })
})
