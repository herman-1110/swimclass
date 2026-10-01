import { describe, expect, it } from 'vitest'

import type { GroupBalance } from '@/entities/balance'
import type { Group } from '@/entities/group'

import {
  collapsedCount,
  compareRows,
  figureNames,
  filterCounts,
  footerCaption,
  inFilter,
  packageRows,
  rowMatches,
  searchKey,
  studentsFigures,
} from './rows'

// A few seed groups (coach-students §8), with only the fields the list reads.
function group(id: string, names: string, account: string, extra: Partial<Group> = {}): Group {
  return {
    group_id: id,
    account_id: account,
    location: 'Palm Court',
    active: true,
    opening_used_lessons: 0,
    opening_paid_lessons: 0,
    created_at: '2026-09-01T00:00:00+00:00',
    size: 1,
    type_label: '1-to-1',
    display_names: names,
    student_ids: [`s-${id}`],
    ...extra,
  }
}

function balance(id: string, extra: Partial<GroupBalance> = {}): GroupBalance {
  return {
    group_id: id,
    account_id: 'a',
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
    last_paid_on: '2026-09-18',
    last_payment_method: 'cash',
    ...extra,
  }
}

const unpaid = { unpaid: true, unpaid_since: '2026-09-18T11:30:00+00:00' }
const lastLesson = { last_lesson_at: '2026-10-01T09:30:00+00:00' }

const groups = [
  group('g-sofia', 'Sofia', 'mei'),
  group('g-weijie', 'Wei Jie', 'weijie'),
  group('g-aiman', 'Aiman & Sofia', 'mei', { size: 2, student_ids: ['s-aiman', 's-g-sofia'] }),
  group('g-hana', 'Hana', 'farah'),
  group('g-priya', 'Priya', 'priya'),
  group('g-adam', 'Adam, Alya & Amir', 'zul', { size: 3, student_ids: ['s-1', 's-2', 's-3'] }),
]
const balances = [
  balance('g-sofia', lastLesson),
  balance('g-weijie', unpaid),
  balance('g-aiman'),
  balance('g-hana', unpaid),
  balance('g-priya', lastLesson),
  balance('g-adam'),
]
const names = new Map([
  ['mei', 'Mei Ling'],
  ['weijie', 'Wei Jie'],
  ['farah', 'Farah'],
  ['priya', 'Priya'],
  ['zul', 'Zulaikha'],
])
const rows = packageRows(groups, balances, names)
const order = (list: readonly { group: Group }[]) => list.map((row) => row.group.display_names)

describe('packageRows', () => {
  it('joins each group to its balance and account, needs action first, then by name', () => {
    expect(order(rows)).toEqual([
      'Hana',
      'Wei Jie',
      'Priya',
      'Sofia',
      'Adam, Alya & Amir',
      'Aiman & Sofia',
    ])
    expect(rows[0]).toMatchObject({ accountName: 'Farah', bucket: 'unpaid' })
    expect(rows[2]?.bucket).toBe('last-lesson')
    expect(rows[5]?.bucket).toBe('paid')
  })

  it('leaves out a group without a balance row', () => {
    expect(packageRows(groups, balances.slice(1), names)).toHaveLength(5)
  })

  it('puts deactivated groups after the active ones', () => {
    const paused = packageRows(
      [...groups, group('g-old', 'Aaron', 'zul', { active: false })],
      [...balances, balance('g-old', unpaid)],
      names,
    )
    expect(order(paused).at(-1)).toBe('Aaron')
    expect(compareRows(paused.at(-1)!, paused[0])).toBeGreaterThan(0)
  })
})

describe('the search', () => {
  it('matches students’ and account holders’ names, in any case and without accents', () => {
    const key = (text: string) => order(rows.filter((row) => rowMatches(row, searchKey(text))))
    expect(key('sofia')).toEqual(['Sofia', 'Aiman & Sofia'])
    expect(key('MEI LING')).toEqual(['Sofia', 'Aiman & Sofia'])
    expect(key('  farah ')).toEqual(['Hana'])
    expect(key('Sofía')).toEqual(['Sofia', 'Aiman & Sofia'])
    expect(key('zz')).toEqual([])
    expect(key('')).toHaveLength(6)
  })
})

describe('the tabs', () => {
  it('count what each would show: Paid takes every row that isn’t unpaid', () => {
    expect(filterCounts(rows)).toEqual({ all: 6, unpaid: 2, 'last-lesson': 2, paid: 4 })
    expect(order(rows.filter((row) => inFilter(row, 'last-lesson')))).toEqual(['Priya', 'Sofia'])
  })
})

describe('studentsFigures', () => {
  it('names the unpaid and last-lesson groups, and counts the different students', () => {
    const figures = studentsFigures(rows)
    expect(figures.unpaid).toEqual({ count: 2, caption: 'Unpaid · Hana, Wei Jie' })
    expect(figures.lastLesson).toEqual({ count: 2, caption: 'On last lesson · Priya, Sofia' })
    // Sofia is in two groups: 1 + 1 + 1 + 1 + 3 + (Aiman & Sofia adds Aiman) = 8.
    expect(figures.students).toEqual({ count: 8, caption: 'Students · 6 packages' })
  })

  it('says just the label when nobody is in it, and counts one student in the singular', () => {
    const one = packageRows([groups[5]], [balances[5]], names)
    expect(studentsFigures([]).unpaid).toEqual({ count: 0, caption: 'Unpaid' })
    expect(studentsFigures(one).lastLesson.caption).toBe('On last lesson')
    const single = packageRows([groups[1]], [balance('g-weijie')], names)
    expect(studentsFigures(single).students.caption).toBe('Student · 1 package')
  })

  it('leaves deactivated groups out of the students and packages', () => {
    const paused = packageRows(
      [group('g-old', 'Aaron', 'zul', { active: false }), groups[1]],
      [balance('g-old'), balance('g-weijie')],
      names,
    )
    expect(studentsFigures(paused).students.caption).toBe('Student · 1 package')
  })
})

describe('figureNames', () => {
  it('lists up to three names, then how many more', () => {
    expect(figureNames(['Hana'])).toBe('Hana')
    expect(figureNames(['Hana', 'Wei Jie', 'Priya'])).toBe('Hana, Wei Jie, Priya')
    expect(figureNames(['Hana', 'Wei Jie', 'Priya', 'Kai', 'Nurul'])).toBe(
      'Hana, Wei Jie, Priya and 2 more',
    )
  })
})

describe('collapsedCount', () => {
  const buckets = (...list: ('unpaid' | 'last-lesson' | 'paid')[]) =>
    list.map((bucket) => ({ bucket }))

  it('shows every row that needs action, then enough to reach the minimum', () => {
    // The seed: 4 need action of 13; 5 cards and 9 table rows.
    const seed = buckets(
      'unpaid',
      'unpaid',
      'last-lesson',
      'last-lesson',
      ...Array<'paid'>(9).fill('paid'),
    )
    expect(collapsedCount(seed, 5)).toBe(5)
    expect(collapsedCount(seed, 9)).toBe(9)
    expect(collapsedCount(buckets(...Array<'unpaid'>(7).fill('unpaid')), 5)).toBe(7)
  })

  it('never shows more rows than there are', () => {
    expect(collapsedCount(buckets('paid', 'paid'), 5)).toBe(2)
    expect(collapsedCount([], 9)).toBe(0)
  })
})

describe('footerCaption', () => {
  it('counts the packages under the tab', () => {
    expect(footerCaption(13)).toBe('Needs action first · 13 packages')
    expect(footerCaption(1)).toBe('Needs action first · 1 package')
  })
})
