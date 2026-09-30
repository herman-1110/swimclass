import { describe, expect, it } from 'vitest'

import { AppError } from '@/shared/api/rpc'
import { GENERIC_MESSAGE, NETWORK_MESSAGE } from '@/shared/config/messages'

import { cancelErrorOutcome, refreshesAfter } from './errorOutcome'

const customer = { audience: 'customer', cutoffHours: 6 } as const
const coach = { audience: 'coach' } as const

describe('cancelErrorOutcome', () => {
  it('says a customer is too late, with the cutoff, and offers no retry', () => {
    const locked = new AppError('locked', { cutoff_at: '2026-09-26T11:00:00+08:00' })
    expect(cancelErrorOutcome(locked, customer)).toEqual({
      message: 'It’s less than 6 hours before the lesson, so it can’t be cancelled.',
      canRetry: false,
      field: null,
    })
  })

  it('says a lesson that isn’t booked any more is out of date, in each side’s words', () => {
    const notBooked = new AppError('not_booked', { status: 'cancelled' })
    expect(cancelErrorOutcome(notBooked, customer).message).toBe(
      'This lesson is no longer booked. Refresh to see the latest.',
    )
    expect(cancelErrorOutcome(notBooked, coach)).toEqual({
      message: 'This lesson is already cancelled. Refresh to see the latest.',
      canRetry: false,
      field: null,
    })
  })

  it('lets a network failure be retried', () => {
    expect(cancelErrorOutcome(new AppError('network'), customer)).toEqual({
      message: NETWORK_MESSAGE,
      canRetry: true,
      field: null,
    })
  })

  it('puts the coach’s too-long reason on the reason field', () => {
    expect(cancelErrorOutcome(new AppError('invalid_reason'), coach)).toEqual({
      message: 'The reason is too long. Shorten it to 500 characters.',
      canRetry: true,
      field: 'reason',
    })
  })

  it('gives the generic message for anything else', () => {
    for (const code of ['not_your_booking', 'not_found', 'unknown', 'invalid_reason']) {
      expect(cancelErrorOutcome(new AppError(code), customer)).toEqual({
        message: GENERIC_MESSAGE,
        canRetry: false,
        field: null,
      })
    }
    expect(cancelErrorOutcome(new AppError('not_approved'), customer).message).toBe(
      'Your coach hasn’t approved your account yet.',
    )
  })
})

describe('refreshesAfter', () => {
  it('refreshes after refusals that mean the screen was out of date', () => {
    for (const code of ['locked', 'not_booked', 'not_found', 'not_your_booking', 'not_approved']) {
      expect(refreshesAfter(new AppError(code))).toBe(true)
    }
  })

  it('doesn’t refresh after a network failure or a bad reason', () => {
    expect(refreshesAfter(new AppError('network'))).toBe(false)
    expect(refreshesAfter(new AppError('invalid_reason'))).toBe(false)
  })
})
