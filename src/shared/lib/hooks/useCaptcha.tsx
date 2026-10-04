import { type ReactNode, useRef, useState } from 'react'

import { env } from '@/shared/config/env'
import { Captcha, type CaptchaHandle } from '@/shared/ui/Captcha'

export type CaptchaState = {
  /** The token to send with the form, or null (no CAPTCHA, or not passed yet). */
  token: string | null
  /** The CAPTCHA is on and hasn't passed yet: the form says so (captcha_required), not sending. */
  missing: boolean
  /** After a refused try: its token is spent, so the check runs again. */
  reset(): void
  /** The widget to place above the form's button, or null when the CAPTCHA is off. */
  widget: ReactNode
}

/**
 * The CAPTCHA of a signed-out form (TECH_SPEC §9): on only when VITE_TURNSTILE_SITE_KEY is
 * set, so demo mode and dev without a key have no widget and send no token.
 */
export function useCaptcha(): CaptchaState {
  const siteKey = env.turnstileSiteKey
  const [token, setToken] = useState<string | null>(null)
  const handle = useRef<CaptchaHandle>(null)
  return {
    token: siteKey ? token : null,
    missing: Boolean(siteKey) && !token,
    reset: () => handle.current?.reset(),
    widget: siteKey ? <Captcha ref={handle} siteKey={siteKey} onToken={setToken} /> : null,
  }
}
