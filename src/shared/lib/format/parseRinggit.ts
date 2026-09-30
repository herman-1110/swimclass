// Ringgit and at most two decimals, after "RM", spaces and commas are gone: "240", "240.5",
// "-240.50". A minus sign is kept, so the database can refuse a negative amount with its own
// code (invalid_amount); forms that must stop it earlier check for a negative result.
const AMOUNT = /^(-?)(\d+)(?:\.(\d{1,2}))?$/

/**
 * An amount typed in ringgit, as cents: "240" → 24000, "RM 1,200.5" → 120050. Empty (or
 * just "RM") → `null`: no amount (record_payment and create_group then use the price; a
 * price setting becomes unset). Anything else → `'invalid'`. Integer maths only, so "0.29"
 * is exactly 29.
 */
export function parseRinggit(text: string): number | null | 'invalid' {
  const cleaned = text.trim().replace(/^rm/i, '').replace(/[\s,]/g, '')
  if (cleaned === '') return null
  const match = AMOUNT.exec(cleaned)
  if (!match) return 'invalid'
  const [, minus, whole = '', fraction = ''] = match
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents)) return 'invalid'
  return minus && cents !== 0 ? -cents : cents
}
