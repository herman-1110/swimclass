import { type FormEvent, useEffect, useId, useRef, useState } from 'react'

import { toAppError } from '@/shared/api/rpc'
import { messageFor } from '@/shared/config/messages'
import { Button } from '@/shared/ui/Button'
import { Textarea } from '@/shared/ui/Textarea'

import { useAddFreeLesson } from '../api/useAddFreeLesson'
import {
  ADD_FREE_LESSON,
  FREE_LESSON_ADDED,
  FREE_LESSON_ADDED_STATUS,
  freeLessonHelp,
} from '../model/copy'

type FreeLessonFormProps = {
  id: string
  groupId: string
  names: string
  onAdded?: () => void
  onCancel: () => void
}

type ShownError = { field: 'note' | 'form'; message: string }

/**
 * The open "Add a free lesson" block (coach-students §3.9, §5.3 W2, proposed): what it does,
 * "Note (optional)", then "Add 1 free lesson" and "Cancel". The button reads "Free lesson
 * added" until the note changes, so one press never adds two lessons.
 */
export function FreeLessonForm({ id, groupId, names, onAdded, onCancel }: FreeLessonFormProps) {
  const helpId = useId()
  const [note, setNote] = useState('')
  const [error, setError] = useState<ShownError | null>(null)
  const [added, setAdded] = useState(false)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const add = useAddFreeLesson()
  // The note takes focus once it shows its message.
  useEffect(() => {
    if (error?.field === 'note') noteRef.current?.focus()
  }, [error])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (add.isPending || added) return
    setError(null)
    add.mutate(
      { groupId, note },
      {
        onSuccess: () => {
          setNote('')
          setAdded(true)
          onAdded?.()
        },
        onError: (failure) =>
          setError({
            field: toAppError(failure).code === 'invalid_note' ? 'note' : 'form',
            message: messageFor(failure, { audience: 'coach' }),
          }),
      },
    )
  }

  return (
    <form id={id} noValidate onSubmit={submit} className="flex flex-col gap-3 self-stretch">
      <p id={helpId} className="text-label leading-normal text-muted">
        {freeLessonHelp(names)}
      </p>
      <Textarea
        ref={noteRef}
        label="Note (optional)"
        value={note}
        readOnly={add.isPending}
        onChange={(event) => {
          setNote(event.target.value)
          setAdded(false)
          setError(null)
        }}
        error={error?.field === 'note' ? error.message : undefined}
      />
      {error?.field === 'form' && (
        <p role="alert" className="text-label leading-normal text-warn">
          {error.message}
        </p>
      )}
      <div className="flex items-center gap-2">
        {/* The help line says what the button does: it describes the button (an unnamed
            form's description isn't read out). */}
        <Button
          type="submit"
          className="flex-1"
          pending={add.isPending}
          aria-disabled={added || undefined}
          aria-describedby={helpId}
        >
          {added ? FREE_LESSON_ADDED : ADD_FREE_LESSON}
        </Button>
        <Button variant="quiet" tone="muted" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <p role="status" className="sr-only">
        {added ? FREE_LESSON_ADDED_STATUS : ''}
      </p>
    </form>
  )
}
