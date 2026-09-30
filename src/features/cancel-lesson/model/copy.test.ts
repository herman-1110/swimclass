import { describe, expect, it } from 'vitest'

import {
  cancelDescription,
  cancelLabel,
  cancelledNotice,
  cancelTitle,
  lessonWhen,
  reasonHelp,
} from './copy'
import type { CancelableLesson } from './types'

// meiling's Sat 3 Oct 9:00 am lesson (d0…02) as My classes has it (UTC columns).
const CUSTOMER_LESSON: CancelableLesson = {
  booking_id: 'd0000000-0000-4000-8000-000000000002',
  starts_at: '2026-10-03T01:00:00+00:00',
  ends_at: '2026-10-03T02:00:00+00:00',
  display_names: 'Aiman & Sofia',
}

// Chloe's 2-hour lesson as coach_week sends it (MYT text).
const COACH_LESSON: CancelableLesson = {
  booking_id: 'd0000000-0000-4000-8000-000000000014',
  starts_at: '2026-10-04T10:00:00+08:00',
  ends_at: '2026-10-04T12:00:00+08:00',
  display_names: 'Chloe',
  account_name: 'Grace',
}

describe('the cancel confirmation’s words', () => {
  it('names the lesson by its date and times, never "Today"', () => {
    expect(lessonWhen(CUSTOMER_LESSON)).toBe('Sat 3 Oct, 9:00–10:00 am')
    expect(lessonWhen(COACH_LESSON)).toBe('Sun 4 Oct, 10:00 am–12:00 pm')
    expect(
      lessonWhen({ starts_at: '2026-09-26T09:00:00+00:00', ends_at: '2026-09-26T10:00:00+00:00' }),
    ).toBe('Sat 26 Sep, 5:00–6:00 pm')
  })

  it('asks about the lesson and its students (the My classes spec §2.6)', () => {
    expect(cancelLabel(CUSTOMER_LESSON)).toBe('Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia')
    expect(cancelTitle(CUSTOMER_LESSON)).toBe('Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia?')
  })

  it('tells each side what happens next', () => {
    expect(cancelDescription('customer')).toBe('The lesson goes back to your package.')
    expect(cancelDescription('coach')).toBe(
      'The lesson goes back to their package and the customer is emailed.',
    )
  })

  it('says who the coach’s reason goes to', () => {
    expect(reasonHelp(COACH_LESSON)).toBe('Goes in the email to Grace. Up to 500 characters.')
    expect(reasonHelp({})).toBe('Goes in the email to the customer. Up to 500 characters.')
  })

  it('announces the cancellation on each side', () => {
    expect(cancelledNotice(CUSTOMER_LESSON, 'customer')).toBe(
      'Lesson cancelled: Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia. It went back to your package.',
    )
    expect(cancelledNotice(COACH_LESSON, 'coach')).toBe(
      'Lesson cancelled. Grace will get an email.',
    )
    expect(cancelledNotice(CUSTOMER_LESSON, 'coach')).toBe(
      'Lesson cancelled. The customer will get an email.',
    )
  })
})
