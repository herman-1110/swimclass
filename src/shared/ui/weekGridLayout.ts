/** The week grid's default hours: 7 am to 10 pm, in minutes from midnight (DESIGN §4). */
export const WEEK_GRID_FROM = 7 * 60
export const WEEK_GRID_TO = 22 * 60

/** The grid is drawn in half-hour rows; --row is one row's height. */
const ROW_MINUTES = 30

/** A stretch of one day, in minutes from that day's midnight (1440 = the next midnight). */
export type MinuteRange = { start: number; end: number }

/**
 * The hours a week grid shows: 7 am to 10 pm, or longer when the week's open hours or
 * lessons fall outside, extended to whole hours and never past midnight (DESIGN §4; one range
 * for the whole week). Pass the open windows and lessons, not travel or closed time.
 */
export function weekGridHours(ranges: readonly MinuteRange[]): { from: number; to: number } {
  let from = WEEK_GRID_FROM
  let to = WEEK_GRID_TO
  for (const { start, end } of ranges) {
    if (!(end > start)) continue
    from = Math.min(from, Math.floor(start / 60) * 60)
    to = Math.max(to, Math.ceil(end / 60) * 60)
  }
  return { from: Math.max(from, 0), to: Math.min(to, 24 * 60) }
}

/** A number for a CSS calc(): four decimals are well under a pixel. */
function css(value: number): string {
  return String(Math.round(value * 10000) / 10000)
}

/**
 * Where a block sits in its day column (the grid shows `from` to `to`), as CSS for its inline
 * style, in rows of the grid's --row height: inset 1 px at the top and bottom, as drawn
 * (`margin: 1px …`). The part outside the grid's hours is cut off; null when nothing is left.
 * A sliver stays at least 1 px tall.
 */
export function blockPosition(
  { start, end }: MinuteRange,
  from: number,
  to: number,
): { top: string; height: string } | null {
  const shownStart = Math.max(start, from)
  const shownEnd = Math.min(end, to)
  if (!(shownEnd > shownStart)) return null
  const top = (shownStart - from) / ROW_MINUTES
  const rows = (shownEnd - shownStart) / ROW_MINUTES
  return {
    top: `calc(${css(top)} * var(--row) + 1px)`,
    height: `max(1px, calc(${css(rows)} * var(--row) - 2px))`,
  }
}

/** The hour lines between `from` and `to`, each labelled (no label at the bottom edge). */
export function gridHours(from: number, to: number): number[] {
  const hours: number[] = []
  for (let minute = from; minute < to; minute += 60) hours.push(minute)
  return hours
}
