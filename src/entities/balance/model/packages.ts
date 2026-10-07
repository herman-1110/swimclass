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

/** A package after the current one with lessons booked in it (laterPackages). */
export type LaterPackage = {
  package_no: number
  package_size: number
  booked: number
  left: number
}

/**
 * The packages after the current one that already have lessons booked, in order (Herman, 7 Oct
 * 2026: "why can't I see their package 2"). The current package moves on only as lessons are
 * used, so lessons booked past it had no bar. They fill the next packages in order: Package 1
 * with 4 booked and 1 more booked gives Package 2 with 1 booked, 3 left. Empty while the
 * current package still has room.
 */
export function laterPackages(
  balance: Pick<
    GroupBalance,
    'package_no' | 'package_size' | 'booked_lessons' | 'booked_in_package'
  >,
): LaterPackage[] {
  const size = balance.package_size
  const later: LaterPackage[] = []
  let rest = balance.booked_lessons - balance.booked_in_package
  for (let no = balance.package_no + 1; rest > 0; no += 1) {
    const booked = Math.min(rest, size)
    later.push({ package_no: no, package_size: size, booked, left: size - booked })
    rest -= booked
  }
  return later
}

/** "1 booked · 3 left to book", or "4 booked · fully booked": a later package's counts. */
export function laterPackageCounts(later: LaterPackage): string {
  return `${later.booked} booked · ${later.left > 0 ? `${later.left} left to book` : 'fully booked'}`
}

/** "1 booked · 3 left": a later package's counts on the Students table and cards. */
export function laterPackageUsage(later: LaterPackage): string {
  return `${later.booked} booked · ${later.left} left`
}

/** "1 booked, 3 left of 4": a later package's bar, for screen readers. */
export function laterPackageBarLabel(later: LaterPackage): string {
  return `${later.booked} booked, ${later.left} left of ${later.package_size}`
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
 * Whether record_payment would refuse the next payment as paid_ahead (Herman, 7 Oct 2026): a
 * payment may start at most one package past the last package with a lesson used or booked,
 * so paid must stay under (ceil((used + booked) / size) + 1) × size. Null while a payment may
 * go ahead (always, for a group that owes one), else the package a lesson must be booked in
 * first: with Package 2 paid and nothing booked in it, 2. A preview: the database decides.
 */
export function paidAheadPackageNo(balance: Totals): number | null {
  const size = balance.package_size
  const counted = balance.used_lessons + balance.booked_lessons
  const limit = (Math.ceil(counted / size) + 1) * size
  return balance.paid_lessons >= limit ? Math.floor(balance.paid_lessons / size) : null
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
 * package: Book's "Paid" or "Unpaid" beside the package's number. A group can be neither this
 * nor the view's unpaid (used + booked > paid): a new group that hasn't paid, or one whose
 * paid lessons are all used with none booked. owesPayment counts those as unpaid.
 */
export function isPackagePaid(
  balance: Pick<GroupBalance, 'package_no' | 'package_size' | 'paid_lessons'>,
): boolean {
  return balance.paid_lessons >= balance.package_no * balance.package_size
}

/**
 * Whether the group owes a payment: the one "Unpaid" of the coach's Students list (its pill,
 * tabs, counts and Record payment), Needs attention and My classes. Herman, 2 Oct 2026: if it
 * isn't paid yet, it says Unpaid; it's the group's status, not each lesson's. That is lessons
 * used or booked past what's paid (the view's unpaid), or, while the group is active, a current
 * package no payment covers yet (a new group that hasn't paid; a package used up with nothing
 * booked). A paused group that used up what it paid owes nothing.
 */
export function owesPayment(
  balance: Pick<GroupBalance, 'unpaid' | 'package_no' | 'package_size' | 'paid_lessons'>,
  active = true,
): boolean {
  return balance.unpaid || (active && !isPackagePaid(balance))
}

/**
 * Whether booking `lessons` more would go past the lessons paid for: Book's "…, not paid yet".
 * A preview only: book_lesson decides with can_still_book.
 */
export function isUnpaidAfter(balance: Totals, lessons: number): boolean {
  return balance.used_lessons + balance.booked_lessons + lessons > balance.paid_lessons
}
