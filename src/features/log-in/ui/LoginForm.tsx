import { type FormEvent, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { toAppError } from '@/shared/api/rpc'
import { messageFor } from '@/shared/config/messages'
import { ROUTES } from '@/shared/config/routes'
import { Button } from '@/shared/ui/Button'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { Field } from '@/shared/ui/Field'

import { useLogIn } from '../api/useLogIn'
import { type LogInField, type LogInProblems, logInProblems } from '../model/logInChecks'

type LoginFormProps = {
  /** The id of the page's h1, which names the form (auth spec §7.2: "login-title"). */
  labelledBy: string
}

type Refusal = { message: string; wrongDetails: boolean }

const REFUSAL_ID = 'login-error'

/**
 * Log in (design/Login.dc.html; auth spec §2.2, §6.1): username, password, "Log in" and the
 * way to Forgot password. Empty fields are named before any call, and focus goes to the
 * first. A refusal shows above the button; after a wrong username or password the password
 * is cleared and focused. On success the session changes and the page's guard carries the
 * person on, to where they were going or home.
 */
export function LoginForm({ labelledBy }: LoginFormProps) {
  const [values, setValues] = useState<Record<LogInField, string>>({ username: '', password: '' })
  const [problems, setProblems] = useState<LogInProblems>({})
  const [refusal, setRefusal] = useState<Refusal | null>(null)
  const usernameInput = useRef<HTMLInputElement>(null)
  const passwordInput = useRef<HTMLInputElement>(null)
  const logIn = useLogIn()

  // Event handlers only: refs are never read while rendering.
  const focus = (field: LogInField) =>
    (field === 'username' ? usernameInput : passwordInput).current?.focus()

  function change(field: LogInField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setProblems((current) => ({ ...current, [field]: undefined }))
  }

  function refused(error: Error) {
    const wrongDetails = toAppError(error).code === 'invalid_login'
    // Committed before the focus moves, so the field is read with its new description.
    flushSync(() => {
      if (wrongDetails) setValues((current) => ({ ...current, password: '' }))
      setRefusal({ message: messageFor(error), wrongDetails })
    })
    if (wrongDetails) focus('password')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (logIn.isPending) return
    const found = logInProblems(values)
    flushSync(() => {
      setProblems(found)
      setRefusal(null)
    })
    const first = (['username', 'password'] as const).find((field) => found[field])
    if (first) {
      focus(first)
      return
    }
    logIn.mutate(values, { onError: refused })
  }

  const errorOf = (field: LogInField) => {
    const code = problems[field]
    return code && messageFor({ code })
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby={labelledBy} className="flex flex-col gap-4">
      <Field
        ref={usernameInput}
        id="login-username"
        label="Username"
        size="lg"
        placeholder="e.g. meiling"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="next"
        required
        value={values.username}
        onChange={(event) => change('username', event.target.value)}
        error={errorOf('username')}
      />
      <Field
        ref={passwordInput}
        id="login-password"
        label="Password"
        type="password"
        size="lg"
        placeholder="Your password"
        autoComplete="current-password"
        enterKeyHint="go"
        required
        value={values.password}
        onChange={(event) => change('password', event.target.value)}
        error={errorOf('password')}
        aria-describedby={refusal?.wrongDetails ? REFUSAL_ID : undefined}
      />
      {refusal && (
        <p id={REFUSAL_ID} role="alert" className="text-label leading-normal text-warn">
          {refusal.message}
        </p>
      )}
      {/* 8 px more above the button than between the fields, as drawn. */}
      <Button type="submit" size="xl" block pending={logIn.isPending} className="mt-2">
        {logIn.isPending ? 'Logging in…' : 'Log in'}
      </Button>
      <ButtonLink to={ROUTES.forgotPassword} variant="text" className="self-center">
        Forgot username or password?
      </ButtonLink>
    </form>
  )
}
