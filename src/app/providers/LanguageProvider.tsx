import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import { LanguageContext, type LanguageState } from '@/shared/i18n/context'
import { type Language, storedLanguage, storeLanguage } from '@/shared/i18n/language'
import { showPageLanguage } from '@/shared/i18n/pageLanguage'

import { loadChinese, preloadChosenLanguage } from './loadChinese'

// The student screens' language (Herman, 7 Oct 2026): what the person chose, shown once its
// words are in. The coach's screens pin English under it (CoachLayout).

preloadChosenLanguage()

export function LanguageProvider({ children }: { children: ReactNode }) {
  // What the person chose, and whether the Chinese words are in (English always is).
  const [wanted, setWanted] = useState<Language>(() => storedLanguage() ?? 'en')
  const [chineseReady, setChineseReady] = useState(false)
  // Only the very first screen waits for Chinese, so it doesn't flash English first; a later
  // switch shows English until the words are in.
  const [starting, setStarting] = useState(wanted === 'zh')

  useEffect(() => {
    if (wanted !== 'zh' || chineseReady) return
    let current = true
    loadChinese().then(
      () => {
        if (!current) return
        setChineseReady(true)
        setStarting(false)
      },
      // Offline: stay English; the toggle can try again.
      () => {
        if (!current) return
        setWanted('en')
        setStarting(false)
      },
    )
    return () => {
      current = false
    }
  }, [wanted, chineseReady])

  const language: Language = wanted === 'zh' && chineseReady ? 'zh' : 'en'

  useEffect(() => {
    showPageLanguage(language)
  }, [language])

  const choose = useCallback((next: Language) => {
    storeLanguage(next)
    setWanted(next)
  }, [])
  const value = useMemo<LanguageState>(() => ({ language, choose }), [language, choose])

  if (starting) return null
  return <LanguageContext value={value}>{children}</LanguageContext>
}
