import type { GroupBalance } from './types'

// Package words and numbers for display (DESIGN §3, §4; TECH_SPEC §10). They only show what
// group_balance says: the database decides every count, and whether a booking may go ahead.

type Counts = Pick<GroupBalance, 'used_in_package' | 'booked_in_package' | 'left_in_package'>
type Totals = Pick<
  GroupBalance,
  'package_size' | 'paid_lessons' | 'used_lessons' | 'booked_lessons'
>

/** "1-to-2 · Package 4": the package card's title on Book and in the coach's lesson details. */
export function packageTitle(typeLabel: string, balance: Pick<GroupBalance, 'package_no'>): string {
  return `${typeLabel} · Package ${balance.package_no}`
}

/**
 * "0 used · 2 booked · 2 left to book", or "3 used · 1 booked · fully booked" when nothing is
 * left (Book, lesson details; the drawing's script, Main.dc.html:375).
 */
export function packageCounts(balance: Counts): string {
  const left =
    balance.left_in_package > 0 ? `${balance.left_in_package} left to book` : 'fully booked'
  return `${packageUsage(balance)} · ${left}`
}

/** "Package 4 · 0 used · 2 booked · 2 left to book": My classes' caption under the bar. */
export function packageCaption(balance: Counts & Pick<GroupBalance, 'package_no'>): string {
  return `Package ${balance.package_no} · ${packageCounts(balance)}`
}

/** "0 used · 2 booked": the Students table and cards (AdminStudents.dc.html). */
export function packageUsage(
  balance: Pick<Counts, 'used_in_package' | 'booked_in_package'>,
): string {
  return `${balance.used_in_package} used · ${balance.booked_in_package} booked`
}

/**
 * "0 used, 2 booked, 2 left of 4": a name for the package bar where the text beside it
 * leaves out what's left (the Students table and cards, coach-students spec §7).
 */
export function packageBarLabel(balance: Counts & Pick<GroupBalance, 'package_size'>): string {
  return `${balance.used_in_package} used, ${balance.booked_in_package} booked, ${balance.left_in_package} left of ${balance.package_size}`
}

/**
 * The package the next booked lesson goes into: floor((used + booked) / size) + 1. Book's
 * "New bookings start Package 3" and "uses 1 lesson from Package 4". It is package_no while
 * the package has room, and stays right when booked lessons already reach past it.
 */
export function nextBookingPackageNo(balance: Totals): number {
  return Math.floor((balance.used_lessons + balance.booked_lessons) / balance.package_size) + 1
}

/**
 * The package the next payment starts to pay for: floor(paid / size) + 1. Record payment's
 * "Package 6", Needs attention's "Package 6 unpaid", My classes' "starts Package 3".
 */
export function nextPaymentPackageNo(
  balance: Pick<Totals, 'package_size' | 'paid_lessons'>,
): number {
  return Math.floor(balance.paid_lessons / balance.package_size) + 1
}

/**
 * Lessons left to book in the package after booking `lessons` more (1 for an hour, 2 for two
 * hours): Book's "1 left to book after this". 0 means the booking completes the package; below
 * 0 it spills into the next one (a 2-hour lesson with 1 left).
 */
export function lessonsLeftAfter(balance: Totals, lessons: number): number {
  const used = balance.used_lessons + balance.booked_lessons
  return nextBookingPackageNo(balance) * balance.package_size - used - lessons
}

/**
 * Whether the next lesson booked is already paid for: used + booked < paid, My classes' rule
 * (my-classes spec §9 C5). Book's and My classes' notes ask for a payment only once it isn't,
 * whatever is left in the package: a new group that hasn't paid has 4 left to book and nothing
 * paid.
 */
export function isNextLessonPaid(
  balance: Pick<Totals, 'paid_lessons' | 'used_lessons' | 'booked_lessons'>,
): boolean {
  return balance.used_lessons + balance.booked_lessons < balance.paid_lessons
}

/**
 * Whether payments (with the starting balance and free lessons) cover every lesson of the current
 * package: Book's "Paid" and the Students pill. A group can be neither this nor unpaid (the
 * view's unpaid means used + booked > paid): a new group that hasn't paid, or one whose paid
 * lessons are all used with none booked.
 */
export function isPackagePaid(
  balance: Pick<GroupBalance, 'package_no' | 'package_size' | 'paid_lessons'>,
): boolean {
  return balance.paid_lessons >= balance.package_no * balance.package_size
}

/**
 * Whether booking `lessons` more would go past the lessons paid for: Book's "…, not paid yet".
 * A preview only: book_lesson decides with can_still_book.
 */
export function isUnpaidAfter(balance: Totals, lessons: number): boolean {
  return balance.used_lessons + balance.booked_lessons + lessons > balance.paid_lessons
}
