import type { Row } from '@/shared/api/rpc'

type GroupBalanceRow = Row<'group_balance'>

/**
 * The columns that really can be null (data-contracts §6.2, TECH_SPEC §4). The type generator
 * makes every view column nullable, so the rest are narrowed here.
 */
type NullableColumn = 'unpaid_since' | 'last_lesson_at' | 'last_paid_on' | 'last_payment_method'

/**
 * A group's package position and balance as of the database clock (the group_balance view,
 * TECH_SPEC §4), with the database's column names:
 * - package_size: lessons per package; paid_lessons, used_lessons, booked_lessons: totals
 * - package_no, used_in_package, booked_in_package, left_in_package: the bar and its counts
 * - unpaid: used + booked > paid; unpaid_since: start of the first unpaid lesson (UTC text),
 *   null when that lesson is in the starting balance
 * - can_still_book: lessons the group may still book (may be negative)
 * - last_lesson_at: start of the upcoming lesson that uses the last paid lesson (UTC text)
 * - last_paid_on ("2026-09-19") and last_payment_method: the latest payment, null without one
 */
export type GroupBalance = {
  [K in Exclude<keyof GroupBalanceRow, NullableColumn>]: NonNullable<GroupBalanceRow[K]>
} & Pick<GroupBalanceRow, NullableColumn>
