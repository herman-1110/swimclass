import { HTML_LANG, type Language } from './language'

// <html lang>: the chosen language, unless a page pins its own (the coach's layout pins
// English). Screen readers and the browser's choice of font follow it.

let chosen: Language = 'en'
const pins: Language[] = []

function apply(): void {
  document.documentElement.lang = HTML_LANG[pins.at(-1) ?? chosen]
}

/** The language the toggle chose (LanguageProvider). */
export function showPageLanguage(language: Language): void {
  chosen = language
  apply()
}

/** Pins the page to `language` until the returned function is called (LanguageScope). */
export function pinPageLanguage(language: Language): () => void {
  pins.push(language)
  apply()
  return () => {
    pins.splice(pins.lastIndexOf(language), 1)
    apply()
  }
}
