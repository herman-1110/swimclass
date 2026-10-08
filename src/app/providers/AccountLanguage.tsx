import { type ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from 'react'

import { useMyProfile, useUserId } from '@/entities/account'
import { useSaveLanguage } from '@/features/save-language'
import { LanguageContext, type LanguageState } from '@/shared/i18n/context'
import { isLanguage, type Language, storedLanguage } from '@/shared/i18n/language'

/**
 * The account's language (HANDOFF v0.26 stage 4). Signed in, the toggle also saves the choice
 * on the account, so its emails go out in it. Once per sign-in, the account's saved language
 * wins over the phone's (Herman, 8 Oct 2026: "2. B"); an account that never chose (made by
 * the coach, or before languages) takes the phone's choice, if the phone made one. Only once:
 * a profile read again while a new choice is being saved must not switch the screen back.
 */
export function AccountLanguage({ children }: { children: ReactNode }) {
  const outer = useContext(LanguageContext)
  const userId = useUserId()
  const profile = useMyProfile()
  const { mutate: save } = useSaveLanguage()
  const settledFor = useRef<string | null>(null)
  const saved = profile.data?.language

  useEffect(() => {
    if (userId === null) {
      // Signed out: the next sign-in, even of the same account, settles again.
      settledFor.current = null
      return
    }
    if (settledFor.current === userId || profile.data === undefined) return
    settledFor.current = userId
    if (isLanguage(saved)) {
      // Also when the screen already shows it: the phone may be loading the other one.
      outer.choose(saved)
      return
    }
    const phone = storedLanguage()
    if (phone !== null && profile.data !== null) save({ accountId: userId, language: phone })
  }, [userId, profile.data, saved, outer, save])

  const choose = useCallback(
    (next: Language) => {
      outer.choose(next)
      if (userId !== null) save({ accountId: userId, language: next })
    },
    [outer, userId, save],
  )
  const value = useMemo<LanguageState>(
    () => ({ language: outer.language, choose }),
    [outer.language, choose],
  )
  return <LanguageContext value={value}>{children}</LanguageContext>
}
