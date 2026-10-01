import { useId, useRef, useState } from 'react'

import { Button } from '@/shared/ui/Button'

import { FreeLessonForm } from './FreeLessonForm'

type AddFreeLessonProps = {
  groupId: string
  /** The group's names ("Hana"): "Adds 1 lesson at RM 0 to Hana’s package, dated today." */
  names: string
  /** After the lesson is added and the data is fresh (the form says "Free lesson added"). */
  onAdded?: () => void
}

/**
 * "Add a free lesson" under "Other adjustments" in the Record payment panel
 * (AdminStudents.dc.html:313; drawn as a link button): it opens an inline block below it that
 * says what happens, takes an optional note and adds the lesson (BR-20; coach-students §5.3
 * W2).
 */
export function AddFreeLesson({ groupId, names, onAdded }: AddFreeLessonProps) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const blockId = useId()
  return (
    <div className="flex flex-col items-start gap-1 self-stretch">
      <Button
        ref={trigger}
        variant="link"
        flush
        aria-expanded={open}
        aria-controls={open ? blockId : undefined}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        Add a free lesson
      </Button>
      {open && (
        <FreeLessonForm
          id={blockId}
          groupId={groupId}
          names={names}
          onAdded={onAdded}
          onCancel={() => {
            setOpen(false)
            trigger.current?.focus()
          }}
        />
      )}
    </div>
  )
}
