import { describe, expect, it } from 'vitest'

import type { Group } from '@/entities/group'

import { searchGroups } from './groupSearch'

function group(id: string, names: string, accountId: string, active = true): Group {
  return {
    group_id: id,
    account_id: accountId,
    display_names: names,
    location: 'Palm Court',
    active,
    opening_used_lessons: 0,
    opening_paid_lessons: 0,
    created_at: '2026-09-01T00:00:00+00:00',
    size: 1,
    type_label: '1-to-1',
    student_ids: [id],
  }
}

const groups = [
  group('g1', 'Aiman & Sofia', 'meiling'),
  group('g2', 'Hana', 'farah'),
  group('g3', 'Sofia', 'meiling'),
  group('g4', 'Kai', 'kai', false),
]
const names = new Map([
  ['meiling', 'Mei Ling'],
  ['farah', 'Farah'],
  ['kai', 'Kai'],
])

describe('searchGroups', () => {
  it('offers the active groups only, in the order given (§9 C15)', () => {
    expect(searchGroups(groups, names, '').map((g) => g.display_names)).toEqual([
      'Aiman & Sofia',
      'Hana',
      'Sofia',
    ])
  })

  it('matches the students’ names, ignoring case', () => {
    expect(searchGroups(groups, names, 'SOF').map((g) => g.group_id)).toEqual(['g1', 'g3'])
  })

  it('matches the account holder’s name', () => {
    expect(searchGroups(groups, names, 'farah').map((g) => g.group_id)).toEqual(['g2'])
    expect(searchGroups(groups, names, 'mei ling').map((g) => g.group_id)).toEqual(['g1', 'g3'])
  })

  it('finds nothing for a search that matches no one, and never a paused group', () => {
    expect(searchGroups(groups, names, 'zz')).toEqual([])
    expect(searchGroups(groups, names, 'kai')).toEqual([])
  })
})
