import type { PublicSettings } from './types'

/** The three package prices: in get_public_settings and in the coach's settings row alike. */
type PackagePrices = Pick<
  PublicSettings,
  'price_1to1_cents' | 'price_1to2_cents' | 'price_1to3_cents'
>

/**
 * The price of one package for a group of `size` students (1-to-1, 1-to-2 or 1-to-3), in
 * cents, or null when the coach hasn't set it (the seed sets none) or there is no such
 * type. Show it with formatRinggit; with no price, the screens leave the amount out
 * (book.md C10, my-classes C7).
 */
export function packagePriceCents(settings: PackagePrices, size: number): number | null {
  switch (size) {
    case 1:
      return settings.price_1to1_cents
    case 2:
      return settings.price_1to2_cents
    case 3:
      return settings.price_1to3_cents
    default:
      return null
  }
}

/**
 * What `lessons` lessons cost a group of `size`: the package price × lessons ÷ lessons per
 * package, rounded to the cent the way record_payment prices a payment with no amount
 * (`package_price_cents`; coach-students §5.2.8). Null when the price isn't set. A preview
 * for Record payment's Amount: the database prices the payment itself.
 */
export function lessonsPriceCents(
  settings: PackagePrices & Pick<PublicSettings, 'lessons_per_package'>,
  size: number,
  lessons: number,
): number | null {
  const price = packagePriceCents(settings, size)
  if (price === null || settings.lessons_per_package <= 0) return null
  // Postgres rounds halves away from zero; for amounts of 0 or more that is Math.round.
  return Math.round((price * lessons) / settings.lessons_per_package)
}
