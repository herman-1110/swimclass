import type { MinuteRange } from '@/shared/ui/weekGridLayout'

// Set arithmetic on stretches of one day (minutes from its MYT midnight). Each result is
// sorted, with nothing empty in it.

/** The ranges, sorted, with overlapping or touching ones joined: 17:30–19:30 and 19:30–20:30 make one. */
export function mergeRanges(ranges: readonly MinuteRange[]): MinuteRange[] {
  const sorted = ranges.filter((r) => r.end > r.start).toSorted((a, b) => a.start - b.start)
  const merged: MinuteRange[] = []
  for (const range of sorted) {
    const last = merged.at(-1)
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end)
    else merged.push({ start: range.start, end: range.end })
  }
  return merged
}

/** What is left of `ranges` once every stretch in `cut` is taken out. */
export function subtractRanges(
  ranges: readonly MinuteRange[],
  cut: readonly MinuteRange[],
): MinuteRange[] {
  const holes = mergeRanges(cut)
  const left: MinuteRange[] = []
  for (const range of mergeRanges(ranges)) {
    let start = range.start
    for (const hole of holes) {
      if (hole.end <= start || hole.start >= range.end) continue
      if (hole.start > start) left.push({ start, end: hole.start })
      start = Math.max(start, hole.end)
    }
    if (range.end > start) left.push({ start, end: range.end })
  }
  return left
}

/** The stretches that are in both `a` and `b`. */
export function intersectRanges(
  a: readonly MinuteRange[],
  b: readonly MinuteRange[],
): MinuteRange[] {
  const others = mergeRanges(b)
  const both: MinuteRange[] = []
  for (const range of mergeRanges(a)) {
    for (const other of others) {
      const start = Math.max(range.start, other.start)
      const end = Math.min(range.end, other.end)
      if (end > start) both.push({ start, end })
    }
  }
  return mergeRanges(both)
}
