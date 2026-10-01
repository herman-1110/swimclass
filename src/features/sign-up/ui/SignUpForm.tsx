import { type FormEvent, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { useUsernameAvailable } from '@/entities/account'
import { toAppError } from '@/shared/api/rpc'
import { messageFor, MIN_PASSWORD_LENGTH } from '@/shared/config/messages'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'

import { useSignUp } from '../api/useSignUp'
import {
  EMPTY_SIGN_UP,
  SIGN_UP_FIELDS,
  type SignUpField,
  signUpFieldFor,
  signUpInput,
  type SignUpProblems,
  signUpProblems,
  type SignUpValues,
} from '../model/signUpChecks'
import { UsernameField } from './UsernameField'

type SignUpFormProps = {
  /** The id of the page's h1, which names the form (auth spec §7.2: "signup-title"). */
  labelledBy: string
  /**
   * The account exists. `confirmEmail`: a confirmation email went out (always in demo mode);
   * false means Supabase signed the person in at once.
   */
  onSignedUp: (result: { email: string; confirmEmail: boolean }) => void
}

/**
 * Sign up (auth spec §2.3, §6.2): username (checked as it is typed), name, email, phone and
 * a password typed twice. Every field is checked before the call; each problem shows under
 * its field and focus goes to the first. Refusals show under their field, or above the button.
 */
export function SignUpForm({ labelledBy, onSignedUp }: SignUpFormProps) {
  const [values, setValues] = useState<SignUpValues>(EMPTY_SIGN_UP)
  const [problems, setProblems] = useState<SignUpProblems>({})
  const [usernameLeft, setUsernameLeft] = useState(false)
  const [sent, setSent] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)
  const usernameInput = useRef<HTMLInputElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const emailInput = useRef<HTMLInputElement>(null)
  const phoneInput = useRef<HTMLInputElement>(null)
  const passwordInput = useRef<HTMLInputElement>(null)
  const confirmInput = useRef<HTMLInputElement>(null)
  const check = useUsernameAvailable(values.username)
  const signUp = useSignUp()

  // Event handlers only: refs are never read while rendering.
  function focus(field: SignUpField) {
    const input = {
      username: usernameInput,
      name: nameInput,
      email: emailInput,
      phone: phoneInput,
      password: passwordInput,
      confirm: confirmInput,
    }[field]
    input.current?.focus()
  }

  function change(field: SignUpField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setProblems((current) => ({ ...current, [field]: undefined }))
  }

  function refused(error: Error) {
    const code = toAppError(error).code
    const field = signUpFieldFor(code)
    // Committed before the focus moves, so the field is read with its message.
    flushSync(() => {
      if (field) setProblems({ [field]: code })
      else setRefusal(messageFor(error))
    })
    if (field) focus(field)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (signUp.isPending) return
    const found = signUpProblems(values, check.state)
    flushSync(() => {
      setSent(true)
      setProblems(found)
      setRefusal(null)
    })
    const first = SIGN_UP_FIELDS.find((field) => found[field])
    if (first) {
      focus(first)
      return
    }
    const input = signUpInput(values)
    signUp.mutate(input, {
      onSuccess: ({ confirmEmail }) => onSignedUp({ email: input.email, confirmEmail }),
      onError: refused,
    })
  }

  // The username's own line says when it is taken (UsernameField), so only the other fields
  // show their codes here.
  const errorOf = (field: Exclude<SignUpField, 'username' | 'phone'>) => {
    const code = problems[field]
    return code && messageFor({ code })
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby={labelledBy} className="flex flex-col gap-4">
      <UsernameField
        ref={usernameInput}
        value={values.username}
        onChange={(username) => change('username', username)}
        check={check}
        left={usernameLeft}
        sent={sent}
        onLeave={() => setUsernameLeft(true)}
      />
      <Field
        ref={nameInput}
        id="signup-name"
        label="Name"
        size="lg"
        help="Your own name. Your coach adds your swimmers."
        autoComplete="name"
        maxLength={100}
        required
        value={values.name}
        onChange={(event) => change('name', event.target.value)}
        error={errorOf('name')}
      />
      <Field
        ref={emailInput}
        id="signup-email"
        label="Email"
        type="email"
        inputMode="email"
        size="lg"
        help="We’ll email you a link to confirm it."
        autoComplete="email"
        autoCapitalize="none"
        maxLength={254}
        required
        value={values.email}
        onChange={(event) => change('email', event.target.value)}
        error={errorOf('email')}
      />
      <Field
        ref={phoneInput}
        id="signup-phone"
        label="Phone"
        type="tel"
        inputMode="tel"
        size="lg"
        autoComplete="tel"
        maxLength={30}
        value={values.phone}
        onChange={(event) => change('phone', event.target.value)}
      />
      <Field
        ref={passwordInput}
        id="signup-password"
        label="Password"
        type="password"
        size="lg"
        help={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        autoComplete="new-password"
        required
        value={values.password}
        onChange={(event) => change('password', event.target.value)}
        error={errorOf('password')}
      />
      <Field
        ref={confirmInput}
        id="signup-password-confirm"
        label="Confirm password"
        type="password"
        size="lg"
        autoComplete="new-password"
        required
        value={values.confirm}
        onChange={(event) => change('confirm', event.target.value)}
        error={errorOf('confirm')}
      />
      {refusal && (
        <p role="alert" className="text-label leading-normal text-warn">
          {refusal}
        </p>
      )}
      <Button type="submit" size="xl" block pending={signUp.isPending} className="mt-2">
        {signUp.isPending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}
