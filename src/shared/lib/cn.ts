/** Joins class names, leaving out the empty ones: cn('a', done && 'b') → 'a b' or 'a'. */
export function cn(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ')
}
