import { type FormEvent, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { toAppError } from '@/shared/api/rpc'
import { messageFor } from '@/shared/config/messages'
import { focusProblem } from '@/shared/lib/focusProblem'
import { useCaptcha } from '@/shared/lib/hooks/useCaptcha'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'

import { useSendPasswordReset } from '../api/useSendPasswordReset'
import { emailProblem } from '../model/resetChecks'

type ForgotPasswordFormProps = {
  /** The id of the page's h1, which names the form (auth spec §7.2: "forgot-title"). */
  labelledBy: string
  /** The link went out (or would have: the answer never says whether the address is known). */
  onSent: (email: string) => void
}

/**
 * Forgot password (auth spec §2.4, §6.3): the email address, then "Send reset link". A
 * malformed address is named before any call; refusals show above the button. With the
 * CAPTCHA on (TECH_SPEC §9), its check sits above the button and must pass first; every
 * refusal asks for a fresh one.
 */
export function ForgotPasswordForm({ labelledBy, onSent }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [refusal, setRefusal] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const send = useSendPasswordReset()
  const captcha = useCaptcha()

  function refused(error: Error) {
    captcha.reset()
    const onField = toAppError(error).code === 'email_address_invalid'
    // Committed before the focus moves, so the field is read with its message.
    flushSync(() => {
      if (onField) setProblem('email_address_invalid')
      else setRefusal(messageFor(error))
    })
    // Said out loud also when Enter was pressed in the field.
    if (onField) focusProblem(input.current, messageFor(error))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (send.isPending) return
    const found = emailProblem(email)
    flushSync(() => {
      setProblem(found)
      setRefusal(null)
    })
    if (found) {
      focusProblem(input.current, messageFor({ code: found }))
      return
    }
    if (captcha.missing) {
      setRefusal(messageFor({ code: 'captcha_required' }))
      return
    }
    const address = email.trim()
    send.mutate(
      { email: address, captchaToken: captcha.token },
      { onSuccess: () => onSent(address), onError: refused },
    )
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby={labelledBy} className="flex flex-col gap-4">
      <Field
        ref={input}
        id="forgot-email"
        label="Email"
        type="email"
        inputMode="email"
        size="lg"
        autoComplete="email"
        autoCapitalize="none"
        maxLength={254}
        required
        value={email}
        onChange={(event) => {
          setEmail(event.target.value)
          setProblem(null)
        }}
        error={problem ? messageFor({ code: problem }) : undefined}
      />
      {captcha.widget}
      {refusal && (
        <p role="alert" className="text-label leading-normal text-warn">
          {refusal}
        </p>
      )}
      <Button type="submit" size="xl" block pending={send.isPending} className="mt-2">
        {send.isPending ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  )
}
