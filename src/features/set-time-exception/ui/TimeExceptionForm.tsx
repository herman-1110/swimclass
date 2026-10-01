import { useId, useRef } from 'react'

import type { ExceptionKind } from '@/entities/schedule'
import { messageFor } from '@/shared/config/messages'
import type { DateKey } from '@/shared/lib/time'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Textarea } from '@/shared/ui/Textarea'

import { useAddExceptions } from '../api/useAddExceptions'
import {
  DIALOG_WORDS,
  NOTE_HELP,
  NOTE_MAX_LENGTH,
  NOTE_PLACEHOLDER,
  savedNotice,
} from '../model/copy'
import { PartlySavedError } from '../model/partlySaved'
import { DayFields } from './DayFields'
import { ExceptionPreview } from './ExceptionPreview'
import { SaveError } from './SaveError'
import { TimeSelects } from './TimeSelects'
import { type ExceptionDraft, useExceptionDraft } from './useExceptionDraft'

/** What the page hears once the time is saved. */
export type TimeExceptionSaved = {
  /** The first day saved: the page shows its week. */
  firstDate: DateKey
  /** "Time blocked.", "Time blocked on 3 days.", "Extra time opened.". */
  notice: string
}

export type TimeExceptionFormProps = {
  kind: ExceptionKind
  onClose: () => void
  /** The day it opens on: the page's ?day, or today. */
  defaultDate: DateKey
  onSaved: (saved: TimeExceptionSaved) => void
}

/**
 * Block time or Open extra time, open (DESIGN §4 "not drawn"; the Schedule spec §6.5, §7.4):
 * Date (and for Block time "Until (optional)"), From and To in start steps, an optional
 * private note, and what the coach's week says about it before saving. Mounted only while
 * open, so each opening starts fresh.
 */
export function TimeExceptionForm({ kind, onClose, defaultDate, onSaved }: TimeExceptionFormProps) {
  const words = DIALOG_WORDS[kind]
  const formId = useId()
  const dateRef = useRef<HTMLInputElement>(null)
  const form = useExceptionDraft(kind, defaultDate)
  const { draft, from, to, badRange } = form
  const add = useAddExceptions({
    onSaved: (input) =>
      onSaved({ firstDate: input.dates[0], notice: savedNotice(kind, input.dates.length) }),
  })
  const ready = form.complete && !add.isPending

  const update = (patch: Partial<ExceptionDraft>) => {
    form.setDraft((current) => ({ ...current, ...patch }))
    // Any change makes the last refusal out of date.
    if (add.isError) add.reset()
  }

  const save = () => {
    if (!ready || from === null || to === null) return
    add.mutate(
      { kind, dates: form.dates, from, to, note: draft.note },
      {
        // The days before it stay saved: carry on from the first that wasn't (§6.5).
        onError: (error) => {
          if (error instanceof PartlySavedError) {
            form.setDraft((current) => ({ ...current, date: error.failed }))
          }
        },
      },
    )
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      busy={add.isPending}
      initialFocus={dateRef}
      title={words.title}
      description={words.description}
      actions={
        <>
          <Button
            type="submit"
            form={formId}
            className="flex-1"
            pending={add.isPending}
            aria-disabled={!ready || undefined}
          >
            {add.isPending ? words.saving : words.submit}
          </Button>
          <Button
            variant="quiet"
            tone="muted"
            aria-disabled={add.isPending || undefined}
            onClick={onClose}
          >
            Cancel
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-4.5"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <DayFields
          kind={kind}
          date={draft.date}
          until={draft.until}
          untilBefore={form.untilBefore}
          readOnly={add.isPending}
          dateRef={dateRef}
          onChange={update}
        />
        <TimeSelects
          step={form.step}
          from={from}
          to={to}
          disabled={add.isPending}
          error={
            badRange ? messageFor({ code: 'invalid_range' }, { audience: 'coach' }) : undefined
          }
          onChange={(times) => update({ times })}
        />
        <Textarea
          label="Note (optional)"
          help={NOTE_HELP}
          placeholder={NOTE_PLACEHOLDER}
          maxLength={NOTE_MAX_LENGTH}
          value={draft.note}
          readOnly={add.isPending}
          onChange={(event) => update({ note: event.target.value })}
        />
        <ExceptionPreview
          kind={kind}
          weeks={form.weeks}
          dates={form.dates}
          from={badRange ? null : from}
          to={badRange ? null : to}
        />
        {/* A new attempt's refusal scrolls into view again. */}
        {add.isError && <SaveError key={add.submittedAt} error={add.error} />}
      </form>
    </Dialog>
  )
}
