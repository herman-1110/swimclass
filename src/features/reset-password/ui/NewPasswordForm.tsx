import { type FormEvent, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { toAppError } from '@/shared/api/rpc'
import { messageFor, MIN_PASSWORD_LENGTH } from '@/shared/config/messages'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'

import { useSetNewPassword } from '../api/useSetNewPassword'
import {
  isNewPasswordRefusal,
  type NewPasswordField,
  type NewPasswordProblems,
  newPasswordProblems,
} from '../model/resetChecks'

type NewPasswordFormProps = {
  /** The id of the page's h1, which names the form (auth spec §7.2: "reset-title"). */
  labelledBy: string
  /** The new password is saved. */
  onSaved: () => void
  /** There is no session to save it for (the link expired, or was used). */
  onExpired: () => void
}

/**
 * Set a new password, the last step of a reset or an invite (auth spec §2.5, §6.4): the
 * password twice, then "Save new password". Problems show under their field and focus goes
 * to the first; other refusals show above the button.
 */
export function NewPasswordForm({ labelledBy, onSaved, onExpired }: NewPasswordFormProps) {
  const [values, setValues] = useState<Record<NewPasswordField, string>>({
    password: '',
    confirm: '',
  })
  const [problems, setProblems] = useState<NewPasswordProblems>({})
  const [refusal, setRefusal] = useState<string | null>(null)
  const passwordInput = useRef<HTMLInputElement>(null)
  const confirmInput = useRef<HTMLInputElement>(null)
  const save = useSetNewPassword()

  // Event handlers only: refs are never read while rendering.
  const focus = (field: NewPasswordField) =>
    (field === 'password' ? passwordInput : confirmInput).current?.focus()

  function change(field: NewPasswordField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setProblems((current) => ({ ...current, [field]: undefined }))
  }

  function refused(error: Error) {
    const code = toAppError(error).code
    if (code === 'not_signed_in') {
      onExpired()
      return
    }
    const onField = isNewPasswordRefusal(code)
    // Committed before the focus moves, so the field is read with its message.
    flushSync(() => {
      if (onField) setProblems({ password: code })
      else setRefusal(messageFor(error))
    })
    if (onField) focus('password')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (save.isPending) return
    const found = newPasswordProblems(values.password, values.confirm)
    flushSync(() => {
      setProblems(found)
      setRefusal(null)
    })
    const first = (['password', 'confirm'] as const).find((field) => found[field])
    if (first) {
      focus(first)
      return
    }
    save.mutate(values.password, { onSuccess: onSaved, onError: refused })
  }

  const errorOf = (field: NewPasswordField) => {
    const code = problems[field]
    return code && messageFor({ code })
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby={labelledBy} className="flex flex-col gap-4">
      <Field
        ref={passwordInput}
        id="reset-password"
        label="New password"
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
        id="reset-password-confirm"
        label="Confirm new password"
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
      <Button type="submit" size="xl" block pending={save.isPending} className="mt-2">
        {save.isPending ? 'Saving…' : 'Save new password'}
      </Button>
    </form>
  )
}
