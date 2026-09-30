/**
 * A username the database accepts: 3 to 30 small letters, numbers, dots or underscores
 * (the profiles check and the sign-up trigger, `…100000_schema.sql`, `…100100_triggers.sql`).
 * The forms check it before asking the database whether the name is free.
 */
export const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/

/**
 * A username as the database stores it, as the person types: lowercased, with every space
 * removed ("  Mei Ling " → "meiling"). The database lowercases and trims too; removing the
 * inner spaces here saves a pointless "invalid" (the auth spec §7.3).
 */
export function normalizeUsername(input: string): string {
  return input.replace(/\s+/g, '').toLowerCase()
}

/** Whether a normalized username has the database's format (no request needed to say no). */
export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username)
}
