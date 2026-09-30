/**
 * A count with its noun, read naturally (DESIGN §6): "1 lesson", "2 lessons", "0 lessons",
 * and with more words before the noun "1 more lesson", "3 more lessons". The plural adds
 * "s" unless it is given: `plural(2, 'person', 'people')`.
 */
export function plural(count: number, one: string, other = `${one}s`): string {
  return `${count} ${count === 1 ? one : other}`
}
