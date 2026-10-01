import type { Profile } from '@/entities/account'

/** What the details form holds, as typed. */
export type ProfileValues = { name: string; phone: string }

type SavedDetails = Pick<Profile, 'display_name' | 'phone'>

/** The form's starting values: the saved name and phone (none shows as empty). */
export function profileValues(profile: SavedDetails): ProfileValues {
  return { name: profile.display_name, phone: profile.phone ?? '' }
}

/**
 * Whether saving would change anything (auth spec §6.6: "Save details" waits for a change).
 * Spaces at either end don't count: they are trimmed before saving.
 */
export function profileChanged(profile: SavedDetails, values: ProfileValues): boolean {
  return (
    values.name.trim() !== profile.display_name.trim() ||
    values.phone.trim() !== (profile.phone ?? '').trim()
  )
}

/**
 * The check before saving (auth spec §6.6): a name, not just spaces. The phone may be empty.
 * maxLength keeps both within the database's limits (100 and 30 characters).
 */
export function profileProblems(values: ProfileValues): { name?: 'name_required' } {
  return values.name.trim() === '' ? { name: 'name_required' } : {}
}

/**
 * What is saved (auth spec W6, C22): the name trimmed, the phone trimmed or null. The table
 * keeps whatever it is given, so a blank phone would otherwise be stored as ''.
 */
export function profileUpdate(values: ProfileValues): {
  displayName: string
  phone: string | null
} {
  return { displayName: values.name.trim(), phone: values.phone.trim() || null }
}
