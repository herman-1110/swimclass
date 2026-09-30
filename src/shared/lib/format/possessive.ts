/**
 * A name with the typographic ’s (U+2019, as the drawings write it): "Mei Ling’s",
 * "Aiman & Sofia’s", "James’s".
 */
export function possessive(name: string): string {
  return `${name}’s`
}
