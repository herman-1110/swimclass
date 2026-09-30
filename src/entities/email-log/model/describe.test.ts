import { describe, expect, it } from 'vitest'

import { emailKindLabel, emailStatus, emailWhen } from './describe'
import type { EmailKind } from './types'

describe('emailKindLabel', () => {
  it('names each kind of email as the Settings spec does', () => {
    expect(emailKindLabel('reminder')).toBe('Lesson reminder')
    expect(emailKindLabel('digest')).toBe('Tomorrow’s schedule')
    expect(emailKindLabel('booked')).toBe('Booking confirmation')
    expect(emailKindLabel('cancelled')).toBe('Cancellation')
    expect(emailKindLabel('late_alert')).toBe('Late-change alert')
    expect(emailKindLabel('broadcast')).toBe('Message to customers')
  })

  it('shows a kind it doesn’t know as it is', () => {
    expect(emailKindLabel('welcome' as EmailKind)).toBe('welcome')
  })
})

describe('emailWhen', () => {
  it('writes the Malaysia day and time it was queued', () => {
    // 12:05 UTC is 8:05 pm in Malaysia; the tests run in America/Los_Angeles.
    expect(emailWhen({ created_at: '2026-09-26T12:05:00+00:00' })).toBe('Sat 26 Sep, 8:05 pm')
    expect(emailWhen({ created_at: '2026-09-26T16:30:00.123456+00:00' })).toBe(
      'Sun 27 Sep, 12:30 am',
    )
  })
})

describe('emailStatus', () => {
  it('says when a sent email went out', () => {
    expect(
      emailStatus({ sent_at: '2026-09-26T12:06:00+00:00', attempts: 1, last_error: null }),
    ).toEqual({ text: 'Sent 8:06 pm', tone: 'ink' })
  })

  it('says an email the mailer hasn’t tried yet is waiting', () => {
    expect(emailStatus({ sent_at: null, attempts: 0, last_error: null })).toEqual({
      text: 'Waiting',
      tone: 'muted',
    })
  })

  it('gives the mailer’s reason when sending failed', () => {
    expect(emailStatus({ sent_at: null, attempts: 3, last_error: ' Mailbox full ' })).toEqual({
      text: 'Not sent: Mailbox full',
      tone: 'warn',
    })
    expect(emailStatus({ sent_at: null, attempts: 1, last_error: null })).toEqual({
      text: 'Not sent',
      tone: 'warn',
    })
  })
})
