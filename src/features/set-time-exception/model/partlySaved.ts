import type { DateKey } from '@/shared/lib/time'

/**
 * A range of days that stopped part way: add_exception is one call per day and they are not
 * one transaction (the Schedule spec §5.2 W2), so the days before `failed` stay saved.
 * `cause` is the refusal (an AppError) for messageFor.
 */
export class PartlySavedError extends Error {
  readonly saved: readonly DateKey[]
  readonly failed: DateKey

  constructor(saved: readonly DateKey[], failed: DateKey, cause: unknown) {
    super(`Saved ${saved.length} days; ${failed} failed.`, { cause })
    this.name = 'PartlySavedError'
    this.saved = saved
    this.failed = failed
  }
}
