import { describe, expect, it } from 'vitest'

import type { CoachException } from '@/entities/schedule'
import { AppError } from '@/shared/api/rpc'

import {
  blockedInsideMessage,
  exceptionLine,
  exceptionWhen,
  partlySavedMessage,
  removedNotice,
  removeExceptionName,
  savedNotice,
  saveErrorMessage,
} from './copy'
import { PartlySavedError } from './partlySaved'

const block: CoachException = {
  id: 'e1',
  kind: 'closed',
  starts_at: '2026-10-03T07:00:00+08:00',
  ends_at: '2026-10-03T09:00:00+08:00',
  note: 'Pool maintenance',
}

describe('an exception in the week’s list (§3.8)', () => {
  it('says when, within a day', () => {
    expect(exceptionWhen(block)).toBe('Sat 3 Oct, 7:00–9:00 am')
  })

  it('names both days across midnight', () => {
    expect(
      exceptionWhen({
        starts_at: '2026-10-04T20:00:00+08:00',
        ends_at: '2026-10-05T09:00:00+08:00',
      }),
    ).toBe('Sun 4 Oct, 8:00 pm – Mon 5 Oct, 9:00 am')
  })

  it('keeps one day when it ends at the midnight after it, from UTC text too', () => {
    expect(
      exceptionWhen({
        starts_at: '2026-10-04T12:00:00+00:00',
        ends_at: '2026-10-04T16:00:00+00:00',
      }),
    ).toBe('Sun 4 Oct, 8:00 pm–12:00 am')
  })

  it('says what it is, with the coach’s note', () => {
    expect(exceptionLine(block)).toBe('Blocked · Pool maintenance')
    expect(exceptionLine({ kind: 'open', note: null })).toBe('Extra time')
    expect(exceptionLine({ kind: 'open', note: '  ' })).toBe('Extra time')
  })

  it('gives Remove a full name, and a notice once removed', () => {
    expect(removeExceptionName(block)).toBe('blocked time, Sat 3 Oct, 7:00–9:00 am')
    expect(
      removeExceptionName({
        ...block,
        kind: 'open',
        starts_at: '2026-10-07T15:00:00+08:00',
        ends_at: '2026-10-07T17:30:00+08:00',
      }),
    ).toBe('extra time, Wed 7 Oct, 3:00–5:30 pm')
    expect(removedNotice('closed')).toBe('Blocked time removed.')
    expect(removedNotice('open')).toBe('Extra time removed.')
  })
})

describe('the dialogs’ words (§6.5)', () => {
  it('say what was saved', () => {
    expect(savedNotice('closed', 1)).toBe('Time blocked.')
    expect(savedNotice('closed', 3)).toBe('Time blocked on 3 days.')
    expect(savedNotice('open', 1)).toBe('Extra time opened.')
  })

  it('say which days were saved when a range stopped part way', () => {
    expect(
      partlySavedMessage(
        ['2026-10-03', '2026-10-04'],
        '2026-10-05',
        'Something went wrong. Refresh the page and try again.',
      ),
    ).toBe(
      'Blocked Sat 3 Oct and Sun 4 Oct. Mon 5 Oct wasn’t blocked: Something went wrong. Refresh the page and try again.',
    )
  })

  it('warn about extra time inside a block', () => {
    expect(blockedInsideMessage([block])).toBe(
      'Part of this time is blocked (7:00–9:00 am). Blocked time wins, so it stays closed. Remove the block first.',
    )
  })
})

describe('saveErrorMessage', () => {
  it('gives the refusal in the coach’s words', () => {
    expect(saveErrorMessage(new AppError('invalid_note'))).toBe(
      'The note is too long. Shorten it to 500 characters.',
    )
  })

  it('says which days were saved when a range stopped part way', () => {
    expect(
      saveErrorMessage(new PartlySavedError(['2026-10-10'], '2026-10-11', new AppError('network'))),
    ).toBe(
      'Blocked Sat 10 Oct. Sun 11 Oct wasn’t blocked: Couldn’t reach the server. Check your connection and try again.',
    )
  })
})
