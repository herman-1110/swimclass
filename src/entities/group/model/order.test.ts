import { describe, expect, it } from 'vitest'

import { byNames, distinctLocations } from './order'

describe('byNames', () => {
  it('orders groups by their names as people read them, ignoring case', () => {
    const groups = [
      { group_id: 'c1', display_names: 'Sofia' },
      { group_id: 'c2', display_names: 'adam' },
      { group_id: 'c3', display_names: 'Aiman & Sofia' },
      { group_id: 'c4', display_names: 'Zara' },
    ]
    expect(groups.toSorted(byNames).map((group) => group.display_names)).toEqual([
      'adam',
      'Aiman & Sofia',
      'Sofia',
      'Zara',
    ])
  })

  it('keeps groups with the same names in id order', () => {
    const groups = [
      { group_id: 'c9', display_names: 'Kai' },
      { group_id: 'c2', display_names: 'Kai' },
    ]
    expect(groups.toSorted(byNames).map((group) => group.group_id)).toEqual(['c2', 'c9'])
  })
})

describe('distinctLocations', () => {
  it('lists each location once, in reading order', () => {
    const groups = [
      { location: 'Palm Court' },
      { location: 'Sunrise Res.' },
      { location: 'Palm Court' },
      { location: 'maple Condo' },
    ]
    expect(distinctLocations(groups)).toEqual(['maple Condo', 'Palm Court', 'Sunrise Res.'])
  })

  it('gives an empty list when there are no groups', () => {
    expect(distinctLocations([])).toEqual([])
  })
})
