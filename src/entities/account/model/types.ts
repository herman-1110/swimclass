import type { Row } from '@/shared/api/rpc'

/** An account's profile (TECH_SPEC §3). The email stays in Auth, never in this row. */
export type Profile = Row<'profiles'>

export type Role = Profile['role']
