import { type FormEvent, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import type { Profile } from '@/entities/account'
import { messageFor } from '@/shared/config/messages'
import { useLanguage } from '@/shared/i18n/context'
import { wordsIn } from '@/shared/i18n/words'
import { focusProblem } from '@/shared/lib/focusProblem'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'

import { useUpdateProfile } from '../api/useUpdateProfile'
import {
  profileChanged,
  profileProblems,
  profileUpdate,
  type ProfileValues,
  profileValues,
} from '../model/profileChecks'
import { updateProfileWords } from '../model/words'

type ProfileFormProps = {
  /** The signed-in account's saved details. */
  profile: Pick<Profile, 'id' | 'display_name' | 'phone'>
  /** The id of the section heading that names the form ("Your details"). */
  labelledBy?: string
}

/**
 * Account's name and phone (auth spec §2.7, §6.6, W6). "Save details" looks unavailable
 * until something changes (it keeps focus: aria-disabled). A blank name is named before any
 * call; a refusal shows above the button. Once saved, "Details saved." shows under the button
 * until the next edit.
 */
export function ProfileForm({ profile, labelledBy }: ProfileFormProps) {
  const language = useLanguage()
  const w = wordsIn(updateProfileWords, language)
  const [values, setValues] = useState<ProfileValues>(() => profileValues(profile))
  const [nameProblem, setNameProblem] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const nameInput = useRef<HTMLInputElement>(null)
  const update = useUpdateProfile()
  const changed = profileChanged(profile, values)

  function edit(field: keyof ProfileValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field === 'name') setNameProblem(null)
    setSaved(false)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (update.isPending || !changed) return
    const found = profileProblems(values).name ?? null
    flushSync(() => {
      setNameProblem(found)
      update.reset()
    })
    if (found) {
      // Said out loud also when Enter was pressed in the name itself.
      focusProblem(nameInput.current, messageFor({ code: found }, { language }))
      return
    }
    const details = profileUpdate(values)
    update.mutate(
      { accountId: profile.id, ...details },
      {
        onSuccess: () => {
          // Show what was saved: trimmed, and no phone as empty.
          setValues({ name: details.displayName, phone: details.phone ?? '' })
          setSaved(true)
        },
      },
    )
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby={labelledBy} className="flex flex-col gap-4">
      <Field
        ref={nameInput}
        id="account-name"
        label={w.name}
        size="lg"
        autoComplete="name"
        maxLength={100}
        required
        value={values.name}
        onChange={(event) => edit('name', event.target.value)}
        error={nameProblem ? messageFor({ code: nameProblem }, { language }) : undefined}
      />
      <Field
        id="account-phone"
        // Optional, as every optional field says (auth Q3: until the owner makes it required).
        label={w.phone}
        type="tel"
        inputMode="tel"
        size="lg"
        autoComplete="tel"
        maxLength={30}
        value={values.phone}
        onChange={(event) => edit('phone', event.target.value)}
      />
      {update.isError && (
        <p role="alert" className="text-label leading-normal text-warn">
          {messageFor(update.error, { language })}
        </p>
      )}
      <div className="mt-2 flex flex-col">
        <Button
          type="submit"
          size="xl"
          block
          pending={update.isPending}
          aria-disabled={!changed && !update.isPending}
        >
          {update.isPending ? w.saving : w.save}
        </Button>
        {/* Always in the page, so the news is read out; empty, it takes no room. */}
        <p role="status" className="text-label leading-normal text-muted not-empty:mt-3">
          {saved ? w.saved : null}
        </p>
      </div>
    </form>
  )
}
