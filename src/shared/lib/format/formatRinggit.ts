// Malaysian grouping: 1,234,567. Only whole ringgit go through it; the cents are added by
// hand, so no amount is ever a floating-point number.
const GROUPED = new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 })

/**
 * Money from cents, as the screens show it: whole ringgit without decimals ("RM 240"), any
 * other amount with two ("RM 240.50", "RM 0.05"), thousands grouped ("RM 1,200"). With
 * `symbol: false` it leaves out "RM " for an amount field's value ("240.50"), which
 * `parseRinggit` reads back.
 */
export function formatRinggit(cents: number, { symbol = true }: { symbol?: boolean } = {}): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Expected a whole number of cents, got ${cents}.`)
  }
  const size = Math.abs(cents)
  const rest = size % 100
  const whole = GROUPED.format((size - rest) / 100)
  const amount = rest === 0 ? whole : `${whole}.${String(rest).padStart(2, '0')}`
  return `${cents < 0 ? '-' : ''}${symbol ? 'RM ' : ''}${amount}`
}
