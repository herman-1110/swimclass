import { formatRinggit, parseRinggit } from '@/shared/lib/format'

/** At most 7 ringgit digits (the spec §5.3: `^\d{1,7}(\.\d{1,2})?$`): RM 9,999,999.99. */
const MAX_AMOUNT_CENTS = 999_999_999

/**
 * The Amount field as cents for create_group: null when empty (the database then uses the
 * type's price, or refuses with `price_not_set`), 'invalid' when it isn't an amount in
 * ringgit, is negative, or has more than 7 ringgit digits (all `amount_format` in
 * messages.ts). Integer maths only.
 */
export function readAmount(text: string): number | null | 'invalid' {
  const cents = parseRinggit(text)
  if (cents === null || cents === 'invalid') return cents
  return cents < 0 || cents > MAX_AMOUNT_CENTS ? 'invalid' : cents
}

/** Amount's starting value: the chosen type's price ("540"), or empty while no price is set
 *  (the spec §5.3, C6). */
export function amountPrefill(priceCents: number | null): string {
  return priceCents === null ? '' : formatRinggit(priceCents, { symbol: false })
}

/**
 * A starting-balance field as a number of lessons. The inputs keep digits only, and empty
 * counts as 0 (the spec §5.3).
 */
export function readLessons(text: string): number {
  return text === '' ? 0 : Number.parseInt(text, 10)
}

/** What a starting-balance input keeps of what was typed: digits only, at most 4. */
export function lessonDigits(text: string): string {
  return text.replace(/\D/g, '').slice(0, 4)
}
