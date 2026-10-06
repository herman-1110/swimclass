import { describe, expect, it } from 'vitest'

import { fillSiteUrl, type OutboxEmail, sameToken, tomorrowInMalaysia } from './mail'

const EMAIL: OutboxEmail = {
  id: 1,
  to_email: 'meiling@example.com',
  kind: 'reminder',
  subject: 'Swim lesson tomorrow, Sat 3 Oct',
  body_text: 'See your lessons: {{site_url}}/my-classes\n\nOpen the site: {{site_url}}',
  body_html:
    '<p>See your lessons: <a href="{{site_url}}/my-classes">{{site_url}}/my-classes</a></p>',
}

describe('fillSiteUrl', () => {
  it('replaces both placeholders in an HTML link, and every one in the text', () => {
    const filled = fillSiteUrl(EMAIL, 'https://swimclass.example')
    expect(filled.body_html).toBe(
      '<p>See your lessons: <a href="https://swimclass.example/my-classes">https://swimclass.example/my-classes</a></p>',
    )
    expect(filled.body_text).toBe(
      'See your lessons: https://swimclass.example/my-classes\n\nOpen the site: https://swimclass.example',
    )
    expect(JSON.stringify(filled)).not.toContain('{{site_url}}')
    expect(filled).toMatchObject({ id: 1, to_email: 'meiling@example.com', kind: 'reminder' })
  })

  it('fills the subject too and keeps a missing HTML body missing', () => {
    expect(
      fillSiteUrl(
        { ...EMAIL, subject: 'From {{site_url}}', body_html: null },
        'http://localhost:5173',
      ),
    ).toMatchObject({ subject: 'From http://localhost:5173', body_html: null })
  })

  it('leaves text without the placeholder alone, including a broken-up one', () => {
    // email_text writes a customer's '{{' as '{ {', so free text never becomes a link.
    const text = 'Note: { {site_url}}/evil and $& and $1'
    expect(fillSiteUrl({ ...EMAIL, body_text: text }, 'https://a.example').body_text).toBe(text)
  })
})

describe('tomorrowInMalaysia', () => {
  it('is the day after today in Malaysia, whatever the server’s time zone', () => {
    expect(tomorrowInMalaysia(new Date('2026-10-02T20:05:00+08:00'))).toBe('2026-10-03')
    expect(tomorrowInMalaysia(new Date('2026-10-02T23:59:00+08:00'))).toBe('2026-10-03')
    expect(tomorrowInMalaysia(new Date('2026-10-03T00:00:00+08:00'))).toBe('2026-10-04')
    // 16:30 UTC on 2 Oct is already 00:30 on 3 Oct in Malaysia.
    expect(tomorrowInMalaysia(new Date('2026-10-02T16:30:00Z'))).toBe('2026-10-04')
    expect(tomorrowInMalaysia(new Date('2026-12-31T20:00:00+08:00'))).toBe('2027-01-01')
  })
})

describe('sameToken', () => {
  it('accepts only the exact token', async () => {
    const token = 'a'.repeat(64)
    expect(await sameToken(token, token)).toBe(true)
    expect(await sameToken(`${token}b`, token)).toBe(false)
    expect(await sameToken(token.slice(1), token)).toBe(false)
    expect(await sameToken('', token)).toBe(false)
  })
})
