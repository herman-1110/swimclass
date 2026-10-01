import { type FormEvent, useEffect, useId, useRef, useState } from 'react'

import { toAppError } from '@/shared/api/rpc'
import { messageFor } from '@/shared/config/messages'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Field } from '@/shared/ui/Field'
import { Fieldset } from '@/shared/ui/Fieldset'

import { useUpdateGroup } from '../api/useUpdateGroup'
import {
  CHANGES_SAVED,
  EDIT_GROUP,
  groupSubtitle,
  LOCATION_HELP,
  SAVE_CHANGES,
} from '../model/copy'
import { groupChanges, groupDraft, groupErrorField, type GroupField } from '../model/groupChanges'
import type { EditableGroup } from '../model/types'

type EditGroupDialogProps = {
  group: EditableGroup
  /** The account holder ("Farah"): the subtitle says "Farah’s account" or "Own account". */
  accountName: string
  onClose: () => void
  /** Saved and refreshed: the owner closes the dialog and shows the notice. */
  onSaved: (notice: string) => void
}

type ShownError = { field: GroupField; message: string }

/**
 * Edit group (coach-add-students §2.7, §5.2.3, proposed): the pool location and the
 * starting balance, then "Save changes", which sends only what changed (nothing changed:
 * it just closes). Mounted only while open, so every opening starts from the group's values.
 */
export function EditGroupDialog({ group, accountName, onClose, onSaved }: EditGroupDialogProps) {
  const formId = useId()
  const [draft, setDraft] = useState(() => groupDraft(group))
  const [error, setError] = useState<ShownError | null>(null)
  const update = useUpdateGroup()
  const ids = { location: useId(), used: useId(), paid: useId() }
  // A message's field takes focus once it shows the message.
  const pendingFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    pendingFocus.current?.focus()
    pendingFocus.current = null
  }, [error])

  const pending = update.isPending
  const errorAt = (field: GroupField) => (error?.field === field ? error.message : undefined)
  const change = (patch: Partial<typeof draft>) => {
    if (pending) return
    setDraft((current) => ({ ...current, ...patch }))
    setError(null)
  }
  const fail = (field: GroupField, message: string) => {
    pendingFocus.current = field === 'form' ? null : document.getElementById(ids[field])
    setError({ field, message })
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const result = groupChanges(group, draft)
    if ('check' in result) {
      fail(result.check.field, messageFor(result.check, { audience: 'coach' }))
      return
    }
    if (result.changes === null) {
      onClose()
      return
    }
    update.mutate(result.changes, {
      onSuccess: () => onSaved(CHANGES_SAVED),
      onError: (failure) =>
        fail(groupErrorField(toAppError(failure).code), messageFor(failure, { audience: 'coach' })),
    })
  }

  const count = {
    type: 'text',
    inputMode: 'numeric',
    pattern: '[0-9]*',
    autoComplete: 'off',
  } as const
  // The counts take digits only (coach-add-students §5.3): anything else typed or pasted is
  // dropped, so "can’t be negative" is left for the database's own refusal.
  const digits = (text: string) => text.replace(/\D/g, '')
  return (
    <Dialog
      open
      onClose={onClose}
      title={EDIT_GROUP}
      subtitle={groupSubtitle(group, accountName)}
      busy={pending}
      actions={
        <>
          <Button type="submit" form={formId} className="flex-1" pending={pending}>
            {SAVE_CHANGES}
          </Button>
          <Button
            variant="quiet"
            tone="muted"
            aria-disabled={pending || undefined}
            onClick={onClose}
          >
            Cancel
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4.5">
        <Field
          id={ids.location}
          label="Pool location"
          autoCapitalize="words"
          autoComplete="off"
          value={draft.location}
          readOnly={pending}
          onChange={(event) => change({ location: event.target.value })}
          help={LOCATION_HELP}
          error={errorAt('location')}
        />
        <Fieldset legend="Starting balance">
          <div className="grid grid-cols-2 gap-3">
            <Field
              id={ids.used}
              {...count}
              label="Lessons already used"
              value={draft.usedText}
              readOnly={pending}
              onChange={(event) => change({ usedText: digits(event.target.value) })}
              error={errorAt('used')}
            />
            <Field
              id={ids.paid}
              {...count}
              label="Lessons already paid"
              value={draft.paidText}
              readOnly={pending}
              onChange={(event) => change({ paidText: digits(event.target.value) })}
              error={errorAt('paid')}
            />
          </div>
        </Fieldset>
        {error?.field === 'form' && (
          <p role="alert" className="text-label leading-normal text-warn">
            {error.message}
          </p>
        )}
      </form>
    </Dialog>
  )
}
