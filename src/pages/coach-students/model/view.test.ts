import { describe, expect, it } from 'vitest'

import type { PendingAccount } from '@/entities/account'
import type { GroupBalance } from '@/entities/balance'
import type { Group } from '@/entities/group'

import { packageRows } from './rows'
import { studentsView, tabView } from './view'

function row(id: string, names: string, unpaid: boolean) {
  const group = {
    group_id: id,
    account_id: 'a',
    display_names: names,
    active: true,
    student_ids: [id],
  } as Group
  const balance = { group_id: id, unpaid, last_lesson_at: null } as GroupBalance
  return { group, balance }
}

const seed = [row('hana', 'Hana', true), row('weijie', 'Wei Jie', true), row('kai', 'Kai', false)]
const rows = packageRows(
  seed.map((r) => r.group),
  seed.map((r) => r.balance),
  new Map([['a', 'Farah']]),
)
const siti = { id: 'siti', display_name: 'Siti Rahman' } as PendingAccount

const base = {
  rows,
  waiting: [siti],
  query: '',
  filter: 'all' as const,
  pay: null,
  history: null,
  added: null,
  kept: null,
  wide: false,
}
const ids = (set: ReadonlySet<string>) => [...set]

describe('studentsView', () => {
  it('shows the first listed row in the 1280 px column when no group is chosen', () => {
    const view = studentsView({ ...base, wide: true })
    expect(view.panelRow?.group.group_id).toBe('hana')
    expect(ids(view.highlighted)).toEqual(['hana'])
  })

  it('shows no group and highlights nothing below 1280 px until one is chosen', () => {
    const view = studentsView(base)
    expect(view.panelRow).toBeNull()
    expect(ids(view.highlighted)).toEqual([])
    const chosen = studentsView({ ...base, pay: 'kai' })
    expect(chosen.panelRow?.group.group_id).toBe('kai')
    expect(ids(chosen.highlighted)).toEqual(['kai'])
  })

  it('follows the tab and the search for the column’s first row', () => {
    expect(studentsView({ ...base, wide: true, filter: 'paid' }).panelRow?.group.group_id).toBe(
      'kai',
    )
    expect(studentsView({ ...base, wide: true, query: 'wei' }).panelRow?.group.group_id).toBe(
      'weijie',
    )
    expect(studentsView({ ...base, wide: true, filter: 'waiting' }).panelRow).toBeNull()
  })

  it('ignores ids that aren’t groups, and highlights a group just added', () => {
    const view = studentsView({ ...base, pay: 'nope', history: 'nope', added: 'weijie' })
    expect(view.payRow).toBeNull()
    expect(view.historyRow).toBeNull()
    expect(ids(view.highlighted)).toEqual(['weijie'])
  })

  it('from 1280 px opens the column on a group just added, so only that row is highlighted', () => {
    const view = studentsView({ ...base, wide: true, added: 'weijie' })
    expect(view.panelRow?.group.group_id).toBe('weijie')
    expect(ids(view.highlighted)).toEqual(['weijie'])
    // A row the coach then chooses takes the column.
    const chosen = studentsView({ ...base, wide: true, added: 'weijie', pay: 'kai' })
    expect(chosen.panelRow?.group.group_id).toBe('kai')
    expect(ids(chosen.highlighted)).toEqual(['kai', 'weijie'])
  })

  it('searches the waiting accounts by name too', () => {
    expect(studentsView({ ...base, query: 'siti' }).waitingAccounts).toEqual([siti])
    expect(studentsView({ ...base, query: 'hana' }).waitingAccounts).toEqual([])
  })

  it('has nothing to list while loading', () => {
    const view = studentsView({ ...base, rows: null, waiting: null, wide: true })
    expect(view.matching).toBeNull()
    expect(view.panelRow).toBeNull()
    expect(view.waitingAccounts).toBeNull()
  })

  it('keeps the row focus goes back to on screen, without highlighting it', () => {
    const view = studentsView({ ...base, kept: 'kai', added: 'weijie' })
    expect(ids(view.highlighted)).toEqual(['weijie'])
    expect(ids(view.onScreen)).toEqual(['weijie', 'kai'])
    expect(ids(studentsView(base).onScreen)).toEqual([])
  })
})

describe('tabView', () => {
  const tab = (filter: 'all' | 'unpaid' | 'paid', query: string) =>
    tabView({ rows, waiting: [siti], filter, query })

  it('lists a tab’s rows for the search, and counts every tab’s matches', () => {
    // "i" is in Wei Jie and Kai (not in Hana, or in Farah, their account holder).
    const unpaid = tab('unpaid', 'i')
    expect(unpaid.listed.map((r) => r.group.group_id)).toEqual(['weijie'])
    expect(unpaid.matching?.map((r) => r.group.group_id)).toEqual(['weijie', 'kai'])
    expect(unpaid.searching).toBe(true)
  })

  it('says a search matches nothing only when no tab has a match', () => {
    // "Kai" is paid: the Unpaid tab is empty, but the search found him.
    expect(tab('unpaid', 'kai')).toMatchObject({ listed: [], noMatch: false })
    expect(tab('unpaid', 'zz')).toMatchObject({ listed: [], noMatch: true })
    expect(tab('paid', '').noMatch).toBe(false)
  })
})
