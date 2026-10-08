import { type FormEvent, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { toAppError } from '@/shared/api/rpc'
import { messageFor, MIN_PASSWORD_LENGTH } from '@/shared/config/messages'
import { useLanguage } from '@/shared/i18n/context'
import { wordsIn } from '@/shared/i18n/words'
import { focusProblem } from '@/shared/lib/focusProblem'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'

import { useChangePassword } from '../api/useChangePassword'
import {
  isPasswordRefusal,
  type PasswordField,
  type PasswordProblems,
  passwordProblems,
} from '../model/passwordChecks'
import { changePasswordWords } from '../model/words'

type ChangePasswordFormProps = {
  /** The id of the section heading that names the form ("Password"). */
  labelledBy?: string
}

const NO_PASSWORD = { password: '', confirm: '' }

/**
 * Account's "Password" form (auth spec §2.7, §6.6, W5): the new password twice, then "Save
 * new password". Problems show under their field and focus goes to the first; other refusals
 * show above the button. Once saved, both fields empty and "New password saved." shows under
 * the button until the next edit.
 */
export function ChangePasswordForm({ labelledBy }: ChangePasswordFormProps) {
  const language = useLanguage()
  const w = wordsIn(changePasswordWords, language)
  const [values, setValues] = useState<Record<PasswordField, string>>(NO_PASSWORD)
  const [problems, setProblems] = useState<PasswordProblems>({})
  const [refusal, setRefusal] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const passwordInput = useRef<HTMLInputElement>(null)
  const confirmInput = useRef<HTMLInputElement>(null)
  const change = useChangePassword()

  // Event handlers only: refs are never read while rendering.
  const inputOf = (field: PasswordField) =>
    (field === 'password' ? passwordInput : confirmInput).current

  function edit(field: PasswordField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setProblems((current) => ({ ...current, [field]: undefined }))
    setSaved(false)
  }

  function refused(error: Error) {
    const code = toAppError(error).code
    const onField = isPasswordRefusal(code)
    // Committed before the focus moves, so the field is read with its message.
    flushSync(() => {
      if (onField) setProblems({ password: code })
      else setRefusal(messageFor(error, { language }))
    })
    // Said out loud also when Enter was pressed in that very field.
    if (onField) focusProblem(inputOf('password'), messageFor({ code }, { language }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (change.isPending) return
    const found = passwordProblems(values.password, values.confirm)
    flushSync(() => {
      setProblems(found)
      setRefusal(null)
      setSaved(false)
    })
    const first = (['password', 'confirm'] as const).find((field) => found[field])
    if (first) {
      focusProblem(inputOf(first), messageFor({ code: found[first] }, { language }))
      return
    }
    change.mutate(values.password, {
      onSuccess: () => {
        setValues(NO_PASSWORD)
        setSaved(true)
      },
      onError: refused,
    })
  }

  const errorOf = (field: PasswordField) => {
    const code = problems[field]
    return code && messageFor({ code }, { language })
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby={labelledBy} className="flex flex-col gap-4">
      <Field
        ref={passwordInput}
        id="account-password"
        maxLength={72}
        label={w.newPassword}
        type="password"
        size="lg"
        help={w.help(MIN_PASSWORD_LENGTH)}
        autoComplete="new-password"
        required
        value={values.password}
        onChange={(event) => edit('password', event.target.value)}
        error={errorOf('password')}
      />
      <Field
        ref={confirmInput}
        id="account-password-confirm"
        maxLength={72}
        label={w.confirm}
        type="password"
        size="lg"
        autoComplete="new-password"
        required
        value={values.confirm}
        onChange={(event) => edit('confirm', event.target.value)}
        error={errorOf('confirm')}
      />
      {refusal && (
        <p role="alert" className="text-label leading-normal text-warn">
          {refusal}
        </p>
      )}
      <div className="mt-2 flex flex-col">
        <Button type="submit" size="xl" block pending={change.isPending}>
          {change.isPending ? w.saving : w.save}
        </Button>
        {/* Always in the page, so the news is read out; empty, it takes no room. */}
        <p role="status" className="text-label leading-normal text-muted not-empty:mt-3">
          {saved ? w.saved : null}
        </p>
      </div>
    </form>
  )
}
