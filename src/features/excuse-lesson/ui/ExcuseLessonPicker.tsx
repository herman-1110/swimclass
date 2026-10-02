import { useCallback, useId, useRef, useState } from 'react'

import { messageFor } from '@/shared/config/messages'
import { cn } from '@/shared/lib/cn'
import { useFocusFallback } from '@/shared/lib/hooks/useFocusFallback'
import { useNow } from '@/shared/lib/hooks/useNow'
import { useReadFailure } from '@/shared/lib/hooks/useReadFailure'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'
import { Fieldset } from '@/shared/ui/Fieldset'
import { OptionRow } from '@/shared/ui/OptionRow'
import { Skeleton } from '@/shared/ui/Skeleton'

import { useExcuseLesson, useRefreshAfterExcuse } from '../api/useExcuseLesson'
import {
  EXCUSE_HELP,
  excuseButtonLabel,
  excuseOption,
  LESSON_EXCUSED,
  NO_LESSONS_TO_EXCUSE,
} from '../model/copy'
import { excuseErrorOutcome, refreshesAfter } from '../model/errorOutcome'
import type { ExcusableLesson, ExcusableLessonsQuery } from '../model/types'

/** The latest started lessons offered (the Students spec, Q17's proposed default). */
const SHOWN = 10

const newestFirst = (a: ExcusableLesson, b: ExcusableLesson) =>
  Date.parse(b.starts_at) - Date.parse(a.starts_at)

type ExcuseLessonPickerProps = {
  id: string
  lessons: ExcusableLessonsQuery
  packageSize: number
  onExcused?: (notice: string) => void
  onCancel: () => void
}

/**
 * The open "Excuse a missed lesson" block (the Students spec §3.9 and §5.3 W3, proposed):
 * the rule, the group's started lessons as option rows (newest first), "Excuse {day}
 * lesson" and "Cancel". It stays open after a success, which it says ("Lesson excused"),
 * and the excused lesson leaves the list when it refreshes.
 *
 * Focus never falls to the page: "Try again" stays, busy, while the lessons are read again,
 * and then focus goes to the line above the list; a control that leaves with the list (the
 * Excuse button when the last lesson goes) hands focus to the refusal or that line.
 */
export function ExcuseLessonPicker({
  id,
  lessons,
  packageSize,
  onExcused,
  onCancel,
}: ExcuseLessonPickerProps) {
  const name = useId()
  const helpId = useId()
  const [chosenId, setChosenId] = useState('')
  const [excused, setExcused] = useState(false)
  const refresh = useRefreshAfterExcuse()
  const excuse = useExcuseLesson({
    onExcused: () => {
      setChosenId('')
      setExcused(true)
      onExcused?.(LESSON_EXCUSED)
    },
  })
  // The help line, or "No lessons to excuse" in its place, and the refusal line: where focus
  // goes when what had it leaves.
  const intro = useRef<HTMLParagraphElement>(null)
  const refusal = useRef<HTMLParagraphElement>(null)
  const failure = useReadFailure(
    [lessons],
    useCallback(() => intro.current, []),
  )
  const fallback = useFocusFallback(() => refusal.current ?? intro.current)
  // Only to tell this year's lessons from older ones ("Fri 12 Dec 2025").
  const now = useNow()
  const shown = (lessons.data ?? []).toSorted(newestFirst).slice(0, SHOWN)
  const chosen = shown.find((lesson) => lesson.booking_id === chosenId)
  const outcome = excuse.isError ? excuseErrorOutcome(excuse.error) : null

  const choose = (bookingId: string) => {
    setChosenId(bookingId)
    setExcused(false)
    excuse.reset()
  }

  const submit = () => {
    if (!chosen) return
    excuse.mutate(
      { bookingId: chosen.booking_id },
      {
        // The block stays, so the list can refresh at once: the message stays with it.
        onError: (error) => {
          if (refreshesAfter(error)) void refresh()
        },
      },
    )
  }

  return (
    <div
      id={id}
      aria-busy={(lessons.isPending && !failure) || undefined}
      className="flex flex-col gap-3 self-stretch"
      {...fallback}
    >
      {failure ? (
        <Banner
          // A new alert for each failure: one that fails again is read out again.
          key={failure.failedAt}
          role="alert"
          action={
            <Button
              variant="link"
              textSize="label"
              pending={failure.retrying}
              onClick={failure.retry}
            >
              Try again
            </Button>
          }
        >
          {messageFor(failure.error, { audience: 'coach' })}
        </Banner>
      ) : lessons.isPending ? (
        <>
          <p role="status" className="sr-only">
            Loading lessons…
          </p>
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </>
      ) : shown.length === 0 ? (
        <p ref={intro} tabIndex={-1} className="text-label leading-normal text-muted">
          {NO_LESSONS_TO_EXCUSE}
        </p>
      ) : (
        <>
          <p ref={intro} id={helpId} tabIndex={-1} className="text-label leading-normal text-muted">
            {EXCUSE_HELP}
          </p>
          <Fieldset legend="Lesson to excuse" hideLegend aria-describedby={helpId}>
            <div className="flex flex-col gap-2">
              {shown.map((lesson) => {
                const option = excuseOption(lesson, packageSize, now)
                return (
                  <OptionRow
                    key={lesson.booking_id}
                    name={name}
                    value={lesson.booking_id}
                    checked={lesson.booking_id === chosenId}
                    disabled={excuse.isPending}
                    onChange={choose}
                    // The position goes under the date: beside it, neither fits one line in
                    // the 292 px panel. The space keeps the two apart in the radio's name.
                    label={
                      <span className="flex flex-col gap-0.5 py-1.5">
                        <span className="text-sm">{option.when}</span>{' '}
                        <span className="text-small font-normal text-muted">{option.position}</span>
                      </span>
                    }
                  />
                )
              })}
            </div>
          </Fieldset>
        </>
      )}
      {outcome && (
        <p ref={refusal} role="alert" tabIndex={-1} className="text-label leading-normal text-warn">
          {outcome.message}
        </p>
      )}
      {/* Always there, so the result is announced; out of the way until then. */}
      <p role="status" className={cn('text-label leading-normal', !excused && 'sr-only')}>
        {excused ? LESSON_EXCUSED : ''}
      </p>
      <div className="flex items-center gap-2">
        {shown.length > 0 && (
          <Button
            className="flex-1"
            pending={excuse.isPending}
            aria-disabled={!chosen || excuse.isPending || undefined}
            onClick={submit}
          >
            {excuseButtonLabel(chosen)}
          </Button>
        )}
        <Button variant="quiet" tone="muted" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
