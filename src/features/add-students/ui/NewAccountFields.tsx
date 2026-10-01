import { normalizeUsername } from '@/entities/account'
import { Field } from '@/shared/ui/Field'
import { Fieldset } from '@/shared/ui/Fieldset'

import { FIELD_IDS } from '../model/fields'
import type { NewAccountDraft } from '../model/types'
import type { UsernameStatus } from '../model/usernameStatus'

type NewAccountFieldsProps = {
  value: NewAccountDraft
  onChange: (field: keyof NewAccountDraft, value: string) => void
  /** The username check as they type: "Checking…", "Available", or why it can't be used. */
  usernameStatus: UsernameStatus | null
  errors: Partial<Record<keyof NewAccountDraft, string>>
}

/**
 * The account "Create a new account…" makes (DESIGN §4; not drawn, the spec §2.1 and
 * §5.2.2): name, username, email and an optional phone. The account gets an email to set
 * its password, so there is no password field. Laid out like the drawn Students rows (an
 * 80 px label beside each input, 12 px apart), so the legend reads as the group's title.
 * Username is lowercased and loses its spaces as they type, as on Sign up: the field shows
 * the username that is checked and sent ("Siti.Rahman" → "siti.rahman").
 */
export function NewAccountFields({
  value,
  onChange,
  usernameStatus,
  errors,
}: NewAccountFieldsProps) {
  return (
    <Fieldset id={FIELD_IDS.newAccount} legend="New account">
      <div className="flex flex-col gap-3">
        <Field
          id={FIELD_IDS.newName}
          layout="inline"
          label="Name"
          value={value.name}
          onChange={(event) => onChange('name', event.target.value)}
          autoComplete="off"
          autoCapitalize="words"
          error={errors.name}
        />
        <Field
          id={FIELD_IDS.newUsername}
          layout="inline"
          label="Username"
          value={value.username}
          onChange={(event) => onChange('username', normalizeUsername(event.target.value))}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          // A polite region from the start, so each new status is read out.
          status={
            usernameStatus === null ? null : usernameStatus.warn ? (
              <span className="text-warn">{usernameStatus.text}</span>
            ) : (
              usernameStatus.text
            )
          }
          error={errors.username}
        />
        <Field
          id={FIELD_IDS.newEmail}
          layout="inline"
          type="email"
          label="Email"
          value={value.email}
          onChange={(event) => onChange('email', event.target.value)}
          autoComplete="off"
          error={errors.email}
        />
        <Field
          id={FIELD_IDS.newPhone}
          layout="inline"
          type="tel"
          label="Phone (optional)"
          value={value.phone}
          onChange={(event) => onChange('phone', event.target.value)}
          autoComplete="off"
          error={errors.phone}
        />
      </div>
    </Fieldset>
  )
}
