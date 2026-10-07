import type { Ref } from 'react'

import { normalizeUsername, type UsernameCheck } from '@/entities/account'
import { messageFor } from '@/shared/config/messages'
import { useLanguage, useWords } from '@/shared/i18n/context'
import { Field } from '@/shared/ui/Field'

import { signUpWords } from '../model/words'

type UsernameFieldProps = {
  ref: Ref<HTMLInputElement>
  /** The username as stored: lowercase, no spaces. */
  value: string
  onChange: (username: string) => void
  /** useUsernameAvailable's answer for `value`. */
  check: UsernameCheck
  /** The field has been left once with something in it. */
  left: boolean
  /** The form has been sent once. */
  sent: boolean
  /** The field is left with something in it (passing through it empty doesn't count). */
  onLeave: () => void
}

/**
 * Sign-up's username (auth spec §2.3, §6.2, §7.3): lowercased and stripped of spaces as typed.
 * A polite live line under it says "Checking…", then whether the name is free; a taken name is
 * in --warn and marks the field invalid. A name in the wrong format is never checked: it gets
 * the format message in place of the help once the field is left with something in it, or
 * the form sent (an empty field only once the form is sent).
 */
export function UsernameField({
  ref,
  value,
  onChange,
  check,
  left,
  sent,
  onLeave,
}: UsernameFieldProps) {
  const language = useLanguage()
  const w = useWords(signUpWords)
  const wrongFormat =
    (check.state === 'invalid' && (left || sent)) || (check.state === 'empty' && sent)
  const status =
    check.state === 'checking' ? (
      w.checking
    ) : check.state === 'available' ? (
      w.available
    ) : check.state === 'taken' ? (
      <span className="text-warn">{messageFor({ code: 'username_taken' }, { language })}</span>
    ) : null

  return (
    <Field
      ref={ref}
      id="signup-username"
      label={w.username}
      size="lg"
      help={wrongFormat ? undefined : w.usernameHelp}
      // null keeps the live line in the page before its first message (Field).
      status={status}
      error={wrongFormat ? messageFor({ code: 'invalid_username' }, { language }) : undefined}
      aria-invalid={check.state === 'taken' || undefined}
      // As the log-in username (auth spec §7.3).
      autoComplete="username"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="next"
      maxLength={30}
      required
      value={value}
      onChange={(event) => onChange(normalizeUsername(event.target.value))}
      onBlur={(event) => {
        if (event.currentTarget.value !== '') onLeave()
      }}
    />
  )
}
