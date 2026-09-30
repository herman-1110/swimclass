import { useId, useRef, useState } from 'react'

import { Button } from '@/shared/ui/Button'

import type { ExcusableLessonsQuery } from '../model/types'
import { ExcuseLessonPicker } from './ExcuseLessonPicker'

type ExcuseMissedLessonProps = {
  /**
   * The group's booked lessons that have started (entities/booking; the Students spec R8),
   * as its query: the block shows a skeleton while it loads and "Try again" if it fails. It
   * lists the latest 10, newest first.
   */
  lessons: ExcusableLessonsQuery
  /** `package_size` (group_balance) or `lessons_per_package`: "lesson 2 of 4". */
  packageSize: number
  /** After a lesson is excused (the block itself says "Lesson excused"). */
  onExcused?: (notice: string) => void
}

/**
 * "Excuse a missed lesson" under "Other adjustments" in the Record payment panel
 * (AdminStudents.dc.html; drawn as a link button): it opens an inline block below it where
 * the coach picks a lesson that has started and excuses it (BR-18).
 */
export function ExcuseMissedLesson({ lessons, packageSize, onExcused }: ExcuseMissedLessonProps) {
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
        Excuse a missed lesson
      </Button>
      {open && (
        <ExcuseLessonPicker
          id={blockId}
          lessons={lessons}
          packageSize={packageSize}
          onExcused={onExcused}
          onCancel={() => {
            setOpen(false)
            trigger.current?.focus()
          }}
        />
      )}
    </div>
  )
}
