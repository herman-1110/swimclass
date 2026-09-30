import { describe, expect, it } from 'vitest'

import { AppError } from '@/shared/api/rpc'
import { GENERIC_MESSAGE, NETWORK_MESSAGE } from '@/shared/config/messages'

import { excuseErrorOutcome, refreshesAfter } from './errorOutcome'

describe('excuseErrorOutcome', () => {
  it('says a future lesson is cancelled instead', () => {
    expect(excuseErrorOutcome(new AppError('not_started'))).toEqual({
      message: 'This lesson hasn’t started yet. Cancel it instead.',
      canRetry: false,
    })
  })

  it('says a lesson is already excused or cancelled', () => {
    expect(excuseErrorOutcome(new AppError('not_booked', { status: 'excused' })).message).toBe(
      'This lesson is already excused. Refresh to see the latest.',
    )
    expect(excuseErrorOutcome(new AppError('not_booked', { status: 'cancelled' })).message).toBe(
      'This lesson is already cancelled. Refresh to see the latest.',
    )
  })

  it('lets only a network failure be retried', () => {
    expect(excuseErrorOutcome(new AppError('network'))).toEqual({
      message: NETWORK_MESSAGE,
      canRetry: true,
    })
    expect(excuseErrorOutcome(new AppError('not_coach'))).toEqual({
      message: GENERIC_MESSAGE,
      canRetry: false,
    })
  })
})

describe('refreshesAfter', () => {
  it('refreshes after the refusals that mean the list was out of date', () => {
    expect(refreshesAfter(new AppError('not_booked'))).toBe(true)
    expect(refreshesAfter(new AppError('not_started'))).toBe(true)
    expect(refreshesAfter(new AppError('not_found'))).toBe(true)
    expect(refreshesAfter(new AppError('network'))).toBe(false)
    expect(refreshesAfter(new AppError('not_coach'))).toBe(false)
  })
})
