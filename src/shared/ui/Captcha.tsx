import { type Ref, useEffect, useImperativeHandle, useRef, useState } from 'react'

import { messageFor } from '@/shared/config/messages'
import { loadTurnstile, type TurnstileApi } from '@/shared/lib/turnstile'

export type CaptchaHandle = {
  /** A token works once: after every refused try, ask for a fresh one. */
  reset(): void
}

type CaptchaProps = {
  siteKey: string
  /** The token once the check passes; null when it expires, fails or is reset. */
  onToken: (token: string | null) => void
  ref?: Ref<CaptchaHandle>
}

/**
 * Cloudflare Turnstile's check (TECH_SPEC §9), full width, on Log in, Sign up and Forgot
 * password. It usually passes by itself; sometimes it asks for a click. Its 65 px are kept
 * from the start, so the button below doesn't jump when it appears. Use it through
 * useCaptcha, which renders it only when the site key is set.
 */
export function Captcha({ siteKey, onToken, ref }: CaptchaProps) {
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<{ api: TurnstileApi; id: string } | null>(null)
  const report = useRef(onToken)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    report.current = onToken
  })

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        report.current(null)
        if (widget.current) widget.current.api.reset(widget.current.id)
      },
    }),
    [],
  )

  useEffect(() => {
    let active = true
    loadTurnstile().then(
      (api) => {
        if (!active || !box.current) return
        const id = api.render(box.current, {
          sitekey: siteKey,
          callback: (token) => report.current(token),
          'expired-callback': () => report.current(null),
          'error-callback': () => report.current(null),
          'timeout-callback': () => report.current(null),
          theme: 'light',
          size: 'flexible',
        })
        if (id) widget.current = { api, id }
      },
      () => {
        if (active) setUnavailable(true)
      },
    )
    return () => {
      active = false
      const current = widget.current
      widget.current = null
      if (current) current.api.remove(current.id)
    }
  }, [siteKey])

  return (
    <div>
      <div ref={box} className="min-h-[65px]" />
      {unavailable && (
        <p role="alert" className="text-label leading-normal text-warn">
          {messageFor({ code: 'captcha_unavailable' })}
        </p>
      )}
    </div>
  )
}
