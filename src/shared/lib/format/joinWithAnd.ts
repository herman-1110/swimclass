/**
 * Items as a sentence's list: "Sun 4 Oct", "Tue 13 Oct and Tue 20 Oct",
 * "Tue 29 Sep, Tue 6 Oct and Tue 13 Oct" (no comma before "and"). Names use `joinNames`.
 */
export function joinWithAnd(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
