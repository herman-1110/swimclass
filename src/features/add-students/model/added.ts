import type { AddedResult } from './types'

/**
 * What Add students tells Students & payments about the group it added (coach-add-students
 * §5.2.1): router state, not the URL, so no email goes in an address (TECH_SPEC §13). The
 * URL says which group (`?added=<group id>`); the state adds who was invited.
 */
export type AddedState = { added: AddedResult }

/**
 * The group Add students just added, as the router state says (a page's history entry can
 * hold anything): null unless it has a group id, a size of 1 to 3 and, if any, an email.
 */
export function readAddedState(state: unknown): AddedResult | null {
  if (typeof state !== 'object' || state === null || !('added' in state)) return null
  const { added } = state
  if (typeof added !== 'object' || added === null) return null
  if (!('groupId' in added) || typeof added.groupId !== 'string') return null
  if (!('size' in added) || typeof added.size !== 'number' || ![1, 2, 3].includes(added.size)) {
    return null
  }
  const email = 'invitedEmail' in added ? added.invitedEmail : undefined
  if (email !== undefined && typeof email !== 'string') return null
  const result: AddedResult = { groupId: added.groupId, size: added.size }
  if (email) result.invitedEmail = email
  return result
}
