import { type ReactNode, useContext, useEffect } from 'react'

import { LanguageContext } from './context'
import type { Language } from './language'
import { pinPageLanguage } from './pageLanguage'

type LanguageScopeProps = {
  language: Language
  children: ReactNode
  /** Also sets <html lang> while it shows (a whole page: the coach's layout). */
  wholePage?: boolean
}

/**
 * Shows its part of the page in one language whatever the toggle says: the coach's screens
 * stay English (Herman, 7 Oct 2026). Tests also use it to render Chinese.
 */
export function LanguageScope({ language, children, wholePage = false }: LanguageScopeProps) {
  const { choose } = useContext(LanguageContext)
  useEffect(() => (wholePage ? pinPageLanguage(language) : undefined), [wholePage, language])
  return <LanguageContext value={{ language, choose }}>{children}</LanguageContext>
}
