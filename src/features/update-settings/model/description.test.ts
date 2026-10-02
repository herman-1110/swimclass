import { describe, expect, it } from 'vitest'

import { describedText } from './description'

describe('describedText', () => {
  it('ends each part with a full stop, so the help, note and error are read as sentences', () => {
    expect(
      describedText([
        'Blocked before and after every lesson',
        'Changing the travel gap affects times shown to customers straight away. Existing lessons stay booked.',
        undefined,
      ]),
    ).toBe(
      'Blocked before and after every lesson. Changing the travel gap affects times shown to customers straight away. Existing lessons stay booked.',
    )
  })

  it('keeps the punctuation a part already has, and leaves out empty parts', () => {
    expect(
      describedText([
        'Email customers when they book. Cancellation emails always go out.',
        null,
        '',
      ]),
    ).toBe('Email customers when they book. Cancellation emails always go out.')
    expect(describedText(['Counted from when a package is paid', 'Not available yet'])).toBe(
      'Counted from when a package is paid. Not available yet.',
    )
    expect(describedText([])).toBe('')
  })
})
