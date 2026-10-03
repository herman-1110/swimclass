import { describe, expect, it } from 'vitest'

import type { GroupBalance } from '@/entities/balance'
import type { Group } from '@/entities/group'

import { accountsWithoutGroups, attentionGroups } from './attention'

function group(id: string, names: string): Group {
  return {
    group_id: id,
    account_id: `account-${id}`,
    display_names: names,
    location: 'Palm Court',
    active: true,
    opening_used_lessons: 0,
    opening_paid_lessons: 0,
    created_at: '2026-09-01T00:00:00+00:00',
    size: 1,
    type_label: '1-to-1',
    student_ids: [id],
  }
}

function balance(id: string, flags: Partial<GroupBalance> = {}): GroupBalance {
  return {
    group_id: id,
    account_id: `account-${id}`,
    package_size: 4,
    paid_lessons: 4,
    used_lessons: 1,
    booked_lessons: 1,
    package_no: 1,
    used_in_package: 1,
    booked_in_package: 1,
    left_in_package: 2,
    unpaid: false,
    unpaid_since: null,
    can_still_book: 2,
    last_lesson_at: null,
    last_paid_on: null,
    last_payment_method: null,
    ...flags,
  }
}

const groups = [
  group('wj', 'Wei Jie'),
  group('ha', 'Hana'),
  group('pr', 'Priya'),
  group('so', 'Sofia'),
  group('ai', 'Aina'),
]

describe('attentionGroups', () => {
  it('puts the groups that owe first, by name, then the last lessons by date (§3.6)', () => {
    const { unpaid, lastLesson } = attentionGroups(
      [
        balance('wj', { unpaid: true }),
        balance('so', { last_lesson_at: '2026-10-04T09:00:00+00:00' }),
        balance('ha', { unpaid: true }),
        balance('pr', { last_lesson_at: '2026-10-01T09:30:00+00:00' }),
        balance('ai'),
      ],
      groups,
    )
    expect(unpaid.map((row) => row.group.display_names)).toEqual(['Hana', 'Wei Jie'])
    expect(lastLesson.map((row) => row.group.display_names)).toEqual(['Priya', 'Sofia'])
  })

  it('skips a balance whose group isn’t loaded', () => {
    expect(attentionGroups([balance('zz', { unpaid: true })], groups).unpaid).toEqual([])
  })
})

describe('accountsWithoutGroups', () => {
  it('keeps the approved accounts that have no group at all, in their order', () => {
    const accounts = [
      { id: 'account-hana', display_name: 'Hana' },
      { id: 'account-new', display_name: 'Mei Ling' },
      { id: 'account-paused', display_name: 'Priya' },
    ]
    const groups = [
      { account_id: 'account-hana', active: true },
      // All of Priya's groups are paused: the coach did that, so no reminder.
      { account_id: 'account-paused', active: false },
    ]
    expect(accountsWithoutGroups(accounts, groups)).toEqual([
      { id: 'account-new', display_name: 'Mei Ling' },
    ])
  })
})
