// Cloudflare Turnstile, the CAPTCHA (TECH_SPEC §9). Its script is loaded only when a page
// shows the widget (Log in, Sign up, Forgot password), once per visit. The site's
// Content-Security-Policy allows https://challenges.cloudflare.com when the key is set
// (vite.config.ts).

/** The parts of Turnstile's API the widget uses (developers.cloudflare.com/turnstile). */
export type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': () => void
      'timeout-callback': () => void
      theme: 'light' | 'dark' | 'auto'
      size: 'normal' | 'flexible' | 'compact'
    },
  ): string | null | undefined
  reset(widgetId: string): void
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

/** Explicit rendering: the widget appears where Captcha renders it, not by class name. */
export const TURNSTILE_SCRIPT =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let loading: Promise<TurnstileApi> | undefined

/** Turnstile's API, loading its script the first time. A failed load can be tried again. */
export function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile)
      return
    }
    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT
    script.async = true
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile)
      else fail()
    }
    script.onerror = fail
    function fail() {
      loading = undefined
      script.remove()
      reject(new Error('Turnstile did not load'))
    }
    document.head.append(script)
  })
  return loading
}
