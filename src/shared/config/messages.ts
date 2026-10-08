import { AppError, toAppError } from '@/shared/api/rpc'
import type { Language } from '@/shared/i18n/language'
import { defineWords, wordsIn } from '@/shared/i18n/words'
import { formatDateList, formatHours, formatMinutes, plural, possessive } from '@/shared/lib/format'
import { formatRange, formatTime } from '@/shared/lib/time'

// Every failure a screen shows, in words, kept in one place so it is easy to edit
// (DESIGN §6; ARCHITECTURE §3.1 rule 6). `shared/api/rpc.ts` turns each failure into an
// AppError { code, detail }; screens pass it to messageFor and never show raw errors.
// Customer screens use the first table below; coach screens try the coach table first, then
// the customer table. Any code in neither gets the generic message, and so does a code
// whose message needs a value that is missing (DESIGN §6). Copy uses the typographic ’ and
// “ ”, as the drawings do.
//
// The checks a form runs before any call get their words here too, as `{ code, detail }`.
// A check that mirrors a database rule uses that rule's code (weak_password, invalid_username,
// invalid_name {index}, invalid_range, invalid_setting {field} …). The others have codes of
// their own that no server sends (username_required, password_mismatch, amount_format …).

/** DESIGN §6's generic row: every code without words of its own. */
export const GENERIC_MESSAGE = 'Something went wrong. Refresh the page and try again.'

/** DESIGN §6's (network) row: the server couldn't be reached. */
export const NETWORK_MESSAGE = 'Couldn’t reach the server. Check your connection and try again.'

/** DESIGN §6's empty state for an account with no groups yet (Book, My classes). */
export const NO_GROUPS_MESSAGE =
  'Your coach hasn’t set up your lessons yet. Message your coach to get started.'

/**
 * The same empty state for the coach, who looks at Book and My classes through View as
 * customer: his account has no groups, and "Message your coach" doesn't fit him (triage 11).
 */
export const NO_GROUPS_COACH_MESSAGE =
  'Customers see their lessons here. Your coach account has no lessons of its own.'

/** The empty state for an account with no groups, in the reader's words. */
export function noGroupsMessage(isCoach: boolean): string {
  return isCoach ? NO_GROUPS_COACH_MESSAGE : NO_GROUPS_MESSAGE
}

/**
 * A malformed email: Sign up and Forgot password (Supabase's email_address_invalid) and Add
 * students (admin-accounts' invalid_email) use the same words (triage 9).
 */
const EMAIL_FORMAT_MESSAGE = 'Enter an email address like name@example.com.'

/** DESIGN §6's empty state for a day on Book with no free start time. */
export const DAY_FULLY_BOOKED_MESSAGE = 'This day is fully booked. Try another day.'

/**
 * Book, for a day the coach blocked all of with Block time (Herman, 2 Oct 2026: "Coach is not
 * available on this day"). It takes the fully-booked line's place.
 */
export const COACH_AWAY_DAY_MESSAGE = 'Your coach isn’t available on this day. Try another day.'

/** Book, for blocked time inside a day: "Your coach isn’t available 9:00 am–12:00 pm." */
export function coachAwayMessage(ranges: readonly string[]): string {
  return `Your coach isn’t available ${ranges.join(' and ')}.`
}

/**
 * Settings: put before the refusal's own words when the open hours were saved and the other
 * changes then weren't (prompt 10 TASK 7; the Settings spec §5.4; DESIGN §6).
 */
export const OPEN_HOURS_SAVED_LEAD = 'Your open hours were saved, but your other changes weren’t.'

/**
 * The shortest password `weak_password`'s message asks for (Herman chose 8: the auth spec's
 * open question 2). The sign-up and password forms check the same number.
 */
export const MIN_PASSWORD_LENGTH = 8

/** Who reads the message. Coach screens try DESIGN §6's coach table first. */
export type Audience = 'customer' | 'coach'

/** The settings and labels some messages need. Leave one out and those messages turn generic. */
export type MessageOptions = {
  /**
   * 'customer' (the default) or 'coach' for the coach screens DESIGN §6 lists: Add booking,
   * lesson details, Students & payments, Add students, Settings, Message all customers.
   */
  audience?: Audience
  /** `travel_gap_minutes` from settings, for `{gap}` ("1 hour", "90 minutes"). */
  gapMinutes?: number | null
  /** `cancel_cutoff_hours` from settings, for `{cutoff}` in `locked` ("6 hours"). */
  cutoffHours?: number | null
  /** `booking_window_weeks` from settings, for `{weeks}` in `outside_window` ("4 weeks"). */
  windowWeeks?: number | null
  /**
   * The form's label for each settings column, for `invalid_setting`'s `{field}`:
   * `{ travel_gap_minutes: 'Travel gap', … }`. A column without a label gets the generic message.
   */
  fieldLabels?: Readonly<Record<string, string>>
  /** The student screens' language (default English; the coach's screens are English). */
  language?: Language
}

/** A link inside a message: `duplicate_group`'s “that group” opens that group (DESIGN §6). */
export type MessageLink = { readonly text: string; readonly groupId: string }

/** A piece of a message, in reading order: text, or a link for the screen to render. */
export type MessagePart = string | MessageLink

type Detail = Readonly<Record<string, unknown>>
type Filled = string | readonly MessagePart[] | null
/**
 * A message: its text, or a function of the error's detail and the options. The third
 * argument reads values in the message's language; Chinese messages (messages.zh.ts) use it,
 * since that file may import nothing at run time.
 */
export type Words = string | ((detail: Detail, options: MessageOptions, read: Readers) => Filled)

// --- Reading values from an error's detail (TECH_SPEC §5) and from the options. Each gives
// null when the value is missing or unusable, which turns the message generic.

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function textOf(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function wholeOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}

/** At least 1: `{index}` (the database counts from 1), `{count}`, `{max}` and the settings. */
function countOf(value: unknown): number | null {
  const count = wholeOf(value)
  return count !== null && count >= 1 ? count : null
}

/** `{time}`: "6:30 pm", from a detail's MYT timestamp. */
function timeOf(value: unknown): string | null {
  const instant = textOf(value)
  if (instant === null) return null
  try {
    return formatTime(instant)
  } catch {
    return null
  }
}

/** `{range}`: "5:30–6:30 pm", from a detail's `starts_at` and `ends_at`. */
function rangeOf(detail: Detail): string | null {
  const start = textOf(detail.starts_at)
  const end = textOf(detail.ends_at)
  if (start === null || end === null) return null
  try {
    return formatRange(start, end)
  } catch {
    return null
  }
}

/** `{dates}`: "Tue 13 Oct and Tue 20 Oct", from a detail's MYT dates ("2026-10-13"). */
function datesOf(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const dates: readonly unknown[] = value
  if (!dates.every((date): date is string => typeof date === 'string')) return null
  try {
    return formatDateList(dates)
  } catch {
    return null
  }
}

/** `{gap}`: "1 hour", "90 minutes". */
function gapOf(options: MessageOptions): string | null {
  const minutes = countOf(options.gapMinutes)
  return minutes === null ? null : formatMinutes(minutes)
}

/** `{status}`: a booking that isn't booked any more is cancelled or excused. */
function statusOf(value: unknown): string | null {
  return value === 'cancelled' || value === 'excused' ? value : null
}

/** `{weekday}`: 1 = Monday … 7 = Sunday. */
function weekdayOf(value: unknown): string | null {
  const day = wholeOf(value)
  return day !== null && day >= 1 && day <= 7 ? WEEKDAYS[day - 1] : null
}

/** `{field}`: the form's label for a settings column. */
function labelOf(value: unknown, labels: MessageOptions['fieldLabels']): string | null {
  const column = textOf(value)
  if (column === null || labels === undefined || !Object.hasOwn(labels, column)) return null
  return textOf(labels[column])
}

/** The words, when the value they need is there. */
function given<T, W extends Filled>(value: T | null, words: (value: T) => W): W | null {
  return value === null ? null : words(value)
}

/** The words, when both values they need are there. */
function givenBoth<A, B>(a: A | null, b: B | null, words: (a: A, b: B) => string): string | null {
  return a === null || b === null ? null : words(a, b)
}

/** Reading a detail's values for a message in one language (the Chinese table's tools). */
export type Readers = {
  textOf: (value: unknown) => string | null
  wholeOf: (value: unknown) => number | null
  countOf: (value: unknown) => number | null
  /** "6:30 pm" / "晚上6:30" */
  timeOf: (value: unknown) => string | null
  /** "5:30–6:30 pm" / "下午5:30–6:30" */
  rangeOf: (detail: Detail) => string | null
  /** "Tue 13 Oct and Tue 20 Oct" / "10月13日 周二、10月20日 周二" */
  datesOf: (value: unknown) => string | null
  /** "1 hour", "90 minutes" / "1 小时", "90 分钟" */
  gapOf: (options: MessageOptions) => string | null
  given: typeof given
  givenBoth: typeof givenBoth
  /** The shortest password weak_password asks for. */
  minPasswordLength: number
}

function readersIn(language: Language): Readers {
  if (language === 'en') return ENGLISH_READERS
  return {
    ...ENGLISH_READERS,
    timeOf: (value) => {
      const instant = textOf(value)
      if (instant === null) return null
      try {
        return formatTime(instant, language)
      } catch {
        return null
      }
    },
    rangeOf: (detail) => {
      const start = textOf(detail.starts_at)
      const end = textOf(detail.ends_at)
      if (start === null || end === null) return null
      try {
        return formatRange(start, end, language)
      } catch {
        return null
      }
    },
    datesOf: (value) => {
      if (!Array.isArray(value) || value.length === 0) return null
      const dates: readonly unknown[] = value
      if (!dates.every((date): date is string => typeof date === 'string')) return null
      try {
        return formatDateList(dates, language)
      } catch {
        return null
      }
    },
    gapOf: (options) => {
      const minutes = countOf(options.gapMinutes)
      return minutes === null ? null : formatMinutes(minutes, language)
    },
  }
}

const ENGLISH_READERS: Readers = {
  textOf,
  wholeOf,
  countOf,
  timeOf,
  rangeOf,
  datesOf,
  gapOf,
  given,
  givenBoth,
  minPasswordLength: MIN_PASSWORD_LENGTH,
}

// --- DESIGN §6's first table, read by every screen. Coach screens reach it after theirs.

const CUSTOMER: Readonly<Record<string, Words>> = {
  overlap_mine: (d) =>
    givenBoth(
      textOf(d.names),
      rangeOf(d),
      (names, range) => `It overlaps ${possessive(names)} lesson at ${range}.`,
    ),
  overlap_other: (d) => given(rangeOf(d), (range) => `It overlaps another lesson at ${range}.`),
  gap_after: (d, o) =>
    givenBoth(
      timeOf(d.ends_at),
      gapOf(o),
      (time, gap) =>
        `It starts too soon after the lesson that ends at ${time}. Your coach needs ${gap} to travel between lessons.`,
    ),
  gap_before: (d, o) =>
    givenBoth(
      timeOf(d.starts_at),
      gapOf(o),
      (time, gap) =>
        `It ends too close to the ${time} lesson. Your coach needs ${gap} to travel between lessons.`,
    ),
  outside_open_hours: 'Your coach isn’t available at that time.',
  outside_window: (_, o) =>
    given(countOf(o.windowWeeks), (weeks) => `You can book up to ${plural(weeks, 'week')} ahead.`),
  past: 'This time has already started.',
  credit_exceeded: 'Pay for the current package before booking more lessons.',
  repeat_conflict: (d) =>
    given(
      datesOf(d.dates),
      (dates) =>
        `These weeks clash: ${dates}. Nothing was booked. Try another time or turn off repeat.`,
    ),
  group_inactive: 'Your coach has paused bookings for this group. Message your coach.',
  // BR-16's limit on bookings and cancellations (hardening migration, 4 Oct 2026).
  too_many_changes: (d) =>
    given(
      countOf(d.limit),
      (limit) =>
        `You’ve booked or cancelled ${limit} times in the last 24 hours. Try again later, or message your coach.`,
    ),
  // "{cutoff} hours" reads "1 hours" for a 1-hour cutoff, so the unit comes with the number
  // (the My classes spec, C8). A cutoff of 0 has no sensible words: generic.
  locked: (_, o) =>
    given(
      countOf(o.cutoffHours),
      (hours) =>
        `It’s less than ${formatHours(hours)} before the lesson, so it can’t be cancelled.`,
    ),
  not_booked: 'This lesson is no longer booked. Refresh to see the latest.',
  not_approved: 'Your coach hasn’t approved your account yet.',
  invalid_login: 'Wrong username or password.',
  too_many_attempts: 'Too many tries. Wait 15 minutes and try again.',
  // Supabase Auth's own limit per IP (sign-up, reset; the login function passes it on).
  over_request_rate_limit: 'Too many tries from this network. Wait a few minutes and try again.',
  // The CAPTCHA on Log in, Sign up and Forgot password (TECH_SPEC §9): not passed yet, refused
  // by Auth (a token works once, or it expired), or its script didn't load.
  captcha_required: 'Finish the security check above, then try again.',
  captcha_failed: 'The security check didn’t work. Do it again, then try again.',
  captcha_unavailable:
    'Couldn’t load the security check. Check your connection and refresh the page.',
  network: NETWORK_MESSAGE,
  // DESIGN §6's generic row, spelled out (any code in neither table gets it too, such as
  // invalid_week, off_step, unknown, and signup_failed and not_signed_in, which the sign-up
  // and reset pages handle themselves).
  not_your_group: GENERIC_MESSAGE,
  not_your_booking: GENERIC_MESSAGE,
  invalid_repeat: GENERIC_MESSAGE,
  invalid_length: GENERIC_MESSAGE,
  invalid_reason: GENERIC_MESSAGE,
  not_found: GENERIC_MESSAGE,
  // Signing up and changing a password (the auth spec §5.4; DESIGN §6).
  weak_password: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
  same_password: 'That’s your current password. Choose a different one.',
  user_already_exists:
    'An account already uses that email. Log in, or use Forgot username or password.',
  email_address_invalid: EMAIL_FORMAT_MESSAGE,
  over_email_send_rate_limit:
    'We can’t send another email just yet. Wait a few minutes and try again.',
  // The words of the sign-up username check (DESIGN §4); admin-accounts refuses with it.
  username_taken: 'That username is taken.',
  // The auth forms' checks before any call (the auth spec §5.4; DESIGN §6). The format check
  // mirrors the sign-up trigger's rule, so it has the trigger's code. An empty or malformed
  // email uses email_address_invalid, and a short password weak_password (both above).
  // Add students' new account (admin-accounts) uses the same username words (triage 9).
  invalid_username: 'Use 3 to 30 small letters, numbers, dots or underscores.',
  username_required: 'Enter your username.',
  password_required: 'Enter your password.',
  name_required: 'Enter your name.',
  // Only if the owner makes the phone required at sign-up (the auth spec, open question 3).
  phone_required: 'Enter your phone number.',
  password_mismatch: 'The passwords don’t match. Type the same password twice.',
}

/**
 * The words the student screens show in their language (Herman, 7 Oct 2026): the customer
 * table and the fixed messages. Chinese in messages.zh.ts; the coach table stays English.
 */
export const messageWords = defineWords('messages', {
  generic: GENERIC_MESSAGE,
  network: NETWORK_MESSAGE,
  noGroups: NO_GROUPS_MESSAGE,
  noGroupsCoach: NO_GROUPS_COACH_MESSAGE,
  dayFullyBooked: DAY_FULLY_BOOKED_MESSAGE,
  coachAwayDay: COACH_AWAY_DAY_MESSAGE,
  coachAway: coachAwayMessage,
  customer: CUSTOMER,
})

/** The fixed messages and the customer table in `language`. */
export function messagesIn(language: Language = 'en'): typeof messageWords.en {
  return wordsIn(messageWords, language)
}

// --- DESIGN §6's coach table. Coach screens try it first.

const COACH: Readonly<Record<string, Words>> = {
  outside_open_hours:
    'It’s outside your open hours. Turn on “Outside open hours” to book it anyway.',
  off_step:
    'It starts between your usual start times. Turn on “Outside open hours” to book it anyway.',
  gap_after: (d, o) =>
    givenBoth(
      timeOf(d.ends_at),
      gapOf(o),
      (time, gap) =>
        `It starts too soon after the lesson that ends at ${time}. You need ${gap} to travel between lessons. Turn on “Skip travel gap” to book it anyway.`,
    ),
  gap_before: (d, o) =>
    givenBoth(
      timeOf(d.starts_at),
      gapOf(o),
      (time, gap) =>
        `It ends too close to the ${time} lesson. You need ${gap} to travel between lessons. Turn on “Skip travel gap” to book it anyway.`,
    ),
  // A group past its credit has a negative can_still_book: it shows 0 (DESIGN §6).
  credit_exceeded: (d) =>
    given(
      wholeOf(d.can_still_book),
      (left) =>
        `This group can book ${plural(Math.max(0, left), 'more lesson')} before paying. Record a payment first, or choose “Book anyway”.`,
    ),
  not_started: 'This lesson hasn’t started yet. Cancel it instead.',
  not_booked: (d) =>
    given(
      statusOf(d.status),
      (status) => `This lesson is already ${status}. Refresh to see the latest.`,
    ),
  invalid_reason: 'The reason is too long. Shorten it to 500 characters.',
  price_not_set:
    'No price is set for this lesson type. Type the amount, or set the price in Settings.',
  invalid_lessons: 'A payment needs at least 1 lesson. Change the number of lessons.',
  // Payments go at most one package ahead of the lessons booked (Herman, 7 Oct 2026).
  paid_ahead: (d) =>
    given(
      wholeOf(d.package_no),
      (no) =>
        `Package ${no} is already paid and has no lessons booked yet. Record the next payment once a lesson is booked in Package ${no}.`,
    ),
  too_many_lessons: (d) =>
    given(
      wholeOf(d.max),
      (max) =>
        `That pays more than one package ahead of the lessons booked. Record at most ${plural(max, 'lesson')} now.`,
    ),
  invalid_amount: 'The amount can’t be negative. Enter RM 0 or more.',
  invalid_method: 'Choose how they paid: Cash, Transfer or FPX.',
  invalid_date: 'The payment date is in the future. Pick today or an earlier date.',
  invalid_note: 'The note is too long. Shorten it to 500 characters.',
  // remove_payment (Herman, 9 Oct 2026): a payment gateway's record stays.
  online_payment: 'This payment was made online, so it can’t be removed here.',
  // “that group” links to the group (messageParts), so the message needs its id: without
  // it, generic (DESIGN §6; data-contracts §4.2 lists detail.group_id as its placeholder).
  duplicate_group: (d) =>
    given(textOf(d.group_id), (groupId) => [
      'These students already have an active group. Use ',
      { text: 'that group', groupId },
      ', or deactivate it first.',
    ]),
  // One lesson reads "1 upcoming lesson. Cancel it first" (the Students spec, C18).
  has_upcoming_lessons: (d) =>
    given(
      countOf(d.count),
      (count) =>
        `This group has ${plural(count, 'upcoming lesson')}. Cancel ${count === 1 ? 'it' : 'them'} first, then deactivate it. Each cancellation emails the customer.`,
    ),
  group_full: (d) =>
    given(
      countOf(d.max),
      (max) =>
        `A lesson can have up to ${plural(max, 'student')}. Remove one, or change “Students per lesson” in Settings.`,
    ),
  invalid_students: (d) =>
    given(
      countOf(d.index),
      (index) =>
        `Student ${index} is already in the list or can’t be found. Pick another student or type a new name.`,
    ),
  invalid_name: (d) =>
    given(countOf(d.index), (index) => `Type a name for student ${index} (up to 100 characters).`),
  student_other_account: (d) =>
    given(
      countOf(d.index),
      (index) =>
        `Student ${index} belongs to another account. Pick one of this account’s students or type a new name.`,
    ),
  invalid_location: 'Type the pool location (up to 100 characters).',
  invalid_opening: 'Lessons already used and paid can’t be negative. Enter 0 or more.',
  invalid_range: 'The end time must be after the start time. Change it and try again.',
  invalid_rules: (d) =>
    given(
      countOf(d.index),
      (index) => `Open hours range ${index} is incomplete. Check each day’s hours and save again.`,
    ),
  overlapping_rules: (d) =>
    given(
      weekdayOf(d.weekday),
      (weekday) => `Two ranges on ${weekday} overlap. Change one and save again.`,
    ),
  invalid_setting: (d, o) =>
    given(
      labelOf(d.field, o.fieldLabels),
      (field) => `${field} has a value that isn’t allowed. Check it and save again.`,
    ),
  invalid_message: 'The message must be 1 to 1000 characters. Change it and send again.',
  // DESIGN §6's coach generic row. group_inactive's customer words aren't for the coach.
  not_coach: GENERIC_MESSAGE,
  not_found: GENERIC_MESSAGE,
  invalid_settings: GENERIC_MESSAGE,
  unknown_setting: GENERIC_MESSAGE,
  invalid_kind: GENERIC_MESSAGE,
  invalid_active: GENERIC_MESSAGE,
  not_customer: GENERIC_MESSAGE,
  group_inactive: GENERIC_MESSAGE,
  // A new account from Add students (admin-accounts; the Add students spec §5.2.2), and the
  // same form's checks before the call (its §5.3). invalid_username has Sign up's words
  // (customer table), and invalid_email Sign up's email words (triage 9).
  invalid_display_name: 'Type their name (up to 100 characters).',
  invalid_phone: 'Shorten the phone number to 30 characters or fewer.',
  invalid_email: EMAIL_FORMAT_MESSAGE,
  email_taken:
    'Another account already uses this email. Choose that account under Account, or type a different email.',
  // Removing a sign-up in Waiting for approval (admin-accounts delete_account, prompt 09).
  account_approved:
    'This account is already approved, so it can’t be removed. Refresh to see the latest.',
  has_groups: 'This account has a group of students, so it can’t be removed. Approve it instead.',
  // The coach's forms' checks before any call. Add students: no account chosen (its spec
  // §5.3). Record payment, Add students and Settings' prices: an amount parseRinggit can't
  // read. Settings: a count that isn't a whole number, or a time it can't read (triage 9;
  // under the box, so the box's label says which). Settings' Edit hours dialog: a range left
  // on “Choose”, or a time outside the form's 5:00 am–11:00 pm (its spec §7.3). Block time: an
  // end date before the start date (the Schedule spec §6.5).
  account_required: 'Choose an account, or create a new one.',
  amount_format: 'Enter the amount in RM, like 240 or 240.50.',
  count_format: 'Enter a whole number.',
  time_format: 'Enter a time like 8:00 pm.',
  hours_incomplete: 'Choose a start and an end time.',
  hours_out_of_range: 'Open hours must be between 5:00 am and 11:00 pm.',
  last_day_before_first: 'The last day must be on or after the first day.',
}

// The database's reason codes are lower_snake_case (rpc.ts).
const REASON = /^[a-z][a-z0-9_]*$/

/** The code and detail of an AppError, a `{ code, detail }` object, or any other failure. */
function readError(error: unknown): { code: string; detail: Detail } {
  if (error instanceof AppError) return error
  if (error === null || error === undefined) return { code: 'unknown', detail: {} }
  if (
    isRecord(error) &&
    !(error instanceof Error) &&
    typeof error.code === 'string' &&
    REASON.test(error.code)
  ) {
    return { code: error.code, detail: isRecord(error.detail) ? error.detail : {} }
  }
  return toAppError(error)
}

function wordsFor(code: string, audience: Audience, language: Language): Words | undefined {
  if (audience === 'coach' && Object.hasOwn(COACH, code)) return COACH[code]
  const table = messagesIn(language).customer
  return Object.hasOwn(table, code) ? table[code] : undefined
}

function fill(words: Words, detail: Detail, options: MessageOptions): Filled {
  if (typeof words === 'string') return words
  try {
    return words(detail, options, readersIn(options.language ?? 'en'))
  } catch {
    return null
  }
}

/**
 * A message in pieces, for a screen that renders its link: `duplicate_group` gives
 * `['These students already have an active group. Use ', { text: 'that group', groupId },
 * ', or deactivate it first.']`. Every other message is one piece of text.
 */
export function messageParts(error: unknown, options: MessageOptions = {}): readonly MessagePart[] {
  const { code, detail } = readError(error)
  const language = options.language ?? 'en'
  const words = wordsFor(code, options.audience ?? 'customer', language)
  const filled = words === undefined ? null : fill(words, detail, options)
  if (filled === null) return [messagesIn(language).generic]
  return typeof filled === 'string' ? [filled] : filled
}

/**
 * What went wrong and what to do next, in words (DESIGN §6), for any failure: the AppError
 * that rpc.ts, auth.ts and the query and mutation hooks give, or `{ code, detail }`, such as
 * a form's check before any call (`messageFor({ code: 'password_mismatch' })`).
 * `messageFor(error, { audience: 'coach', gapMinutes: settings.travel_gap_minutes })`.
 */
export function messageFor(error: unknown, options: MessageOptions = {}): string {
  return messageParts(error, options)
    .map((part) => (typeof part === 'string' ? part : part.text))
    .join('')
}

/**
 * Why a start time can't be booked, from a `week_slots` or `coach_slot_check` row's
 * `reason` and `detail`: Book's crossed-out chips ("7:00 pm isn’t available" and then this)
 * and Add booking's reason line (with `audience: 'coach'`).
 */
export function reasonMessage(
  reason: string,
  detail: unknown,
  options: MessageOptions = {},
): string {
  return messageFor({ code: reason, detail }, options)
}

/**
 * The weeks a `repeat_conflict` couldn't book, one line each with its reason (DESIGN §4:
 * "any week that can't be booked is listed with its reason"):
 * "Tue 29 Sep: It overlaps another lesson at 5:30–6:30 pm." Empty for any other error.
 */
export function clashLines(error: unknown, options: MessageOptions = {}): string[] {
  const { code, detail } = readError(error)
  const clashes: unknown = detail.clashes
  if (code !== 'repeat_conflict' || !Array.isArray(clashes)) return []
  const lines: string[] = []
  for (const clash of clashes as readonly unknown[]) {
    if (!isRecord(clash) || typeof clash.reason !== 'string') continue
    const day = datesOf([clash.date])
    if (day !== null) lines.push(`${day}: ${reasonMessage(clash.reason, clash.detail, options)}`)
  }
  return lines
}
