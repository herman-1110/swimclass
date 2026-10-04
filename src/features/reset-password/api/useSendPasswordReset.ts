import { useMutation } from '@tanstack/react-query'

import { sendPasswordReset } from '@/shared/api/auth'

export type SendPasswordResetInput = { email: string; captchaToken?: string | null }

/**
 * Forgot password (auth spec W3): emails a link to /reset-password. The answer is the same
 * whether or not an account uses the address, so the page always says "Check your email".
 * Demo mode sends nothing. Refusals: `email_address_invalid`, `over_email_send_rate_limit`,
 * `captcha_failed`, `network`. Pass the address trimmed, and the CAPTCHA's token when it is
 * on (TECH_SPEC §9). Nothing to refresh.
 */
export function useSendPasswordReset() {
  return useMutation({
    mutationFn: ({ email, captchaToken = null }: SendPasswordResetInput) =>
      sendPasswordReset(email, captchaToken),
  })
}
