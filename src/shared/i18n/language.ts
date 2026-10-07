// The two languages of the student screens (Herman, 7 Oct 2026): English, and Simplified
// Chinese. The coach's screens stay English. Each phone remembers its choice.

export type Language = 'en' | 'zh'

/** <html lang>: screen readers and the browser's font choice follow it. */
export const HTML_LANG: Readonly<Record<Language, string>> = { en: 'en', zh: 'zh-Hans' }

const KEY = 'swimclass.language'

function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'zh'
}

/**
 * The language this phone chose, or null when it never chose one. Storage can be missing or
 * refuse access (a private window, blocked site data): that reads as no choice.
 */
export function storedLanguage(): Language | null {
  try {
    const value = localStorage.getItem(KEY)
    return isLanguage(value) ? value : null
  } catch {
    return null
  }
}

/** Remembers the choice on this phone; silently does nothing where storage is refused. */
export function storeLanguage(language: Language): void {
  try {
    localStorage.setItem(KEY, language)
  } catch {
    // The choice then lasts until the page is closed.
  }
}
