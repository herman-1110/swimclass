import { describe, expect, it } from 'vitest'

import { readAddedState } from './added'

const GROUP = 'c0000000-0000-4000-8000-000000000003'

describe('readAddedState', () => {
  it('reads the group Add students added, and who was invited', () => {
    expect(readAddedState({ added: { groupId: GROUP, size: 1 } })).toEqual({
      groupId: GROUP,
      size: 1,
    })
    expect(
      readAddedState({ added: { groupId: GROUP, size: 3, invitedEmail: 'farah@example.com' } }),
    ).toEqual({ groupId: GROUP, size: 3, invitedEmail: 'farah@example.com' })
  })

  it('ignores any other state', () => {
    expect(readAddedState(null)).toBeNull()
    expect(readAddedState(undefined)).toBeNull()
    expect(readAddedState('added')).toBeNull()
    expect(readAddedState({ opened: 'pay' })).toBeNull()
    expect(readAddedState({ added: null })).toBeNull()
    expect(readAddedState({ added: { size: 1 } })).toBeNull()
    expect(readAddedState({ added: { groupId: GROUP } })).toBeNull()
    expect(readAddedState({ added: { groupId: GROUP, size: 4 } })).toBeNull()
    expect(readAddedState({ added: { groupId: GROUP, size: 1, invitedEmail: 7 } })).toBeNull()
  })
})
