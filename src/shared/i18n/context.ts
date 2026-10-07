import { createContext, useContext } from 'react'

import type { Language } from './language'
import { type WordsDef, wordsIn } from './words'

export type LanguageState = {
  /** The language the screen shows now. */
  language: Language
  /** Switches the student screens and remembers it on this phone (the toggle). */
  choose: (language: Language) => void
}

/**
 * Without a provider (most tests, the coach's screens under LanguageScope) everything is
 * English and choosing does nothing.
 */
export const LanguageContext = createContext<LanguageState>({ language: 'en', choose: () => {} })

/** The language the screen shows. */
export function useLanguage(): Language {
  return useContext(LanguageContext).language
}

/** The toggle's action: switch, and remember it on this phone. */
export function useChooseLanguage(): (language: Language) => void {
  return useContext(LanguageContext).choose
}

/** A part's words in the screen's language: `const w = useWords(logInWords)`. */
export function useWords<W>(def: WordsDef<W>): W {
  return wordsIn(def, useLanguage())
}
