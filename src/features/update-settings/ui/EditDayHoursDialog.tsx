import { useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { formatTimeOfDay, type Weekday, weekdayName } from '@/entities/open-hours'
import { messageFor } from '@/shared/config/messages'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'

import { type RangeProblem, validateDayRanges } from '../model/dayRanges'
import { timeOptions } from '../model/timeOptions'
import type { HoursRange } from '../model/types'
import { HoursRangeFields } from './HoursRangeFields'

type EditDayHoursDialogProps = {
  weekday: Weekday
  /** The day's ranges as the form has them now. */
  ranges: readonly HoursRange[]
  /** "Set … hours" with ranges that pass the checks, in opening order. */
  onApply: (ranges: HoursRange[]) => void
  /** Cancel or Esc: the dialog's changes are dropped. */
  onClose: () => void
}

/** A range in the dialog, with a key that stays while others are added or removed. */
type EditedRange = HoursRange & { key: number }

function rangeName(range: HoursRange, position: number): string {
  return range.opens_at && range.closes_at
    ? `${formatTimeOfDay(range.opens_at)} to ${formatTimeOfDay(range.closes_at)}`
    : `hours ${position}`
}

/**
 * Edit one weekday's open hours (prompt 10 TASK 2; coach-settings §7.3, proposed): add,
 * change or remove its ranges. It changes the form, not the database: "Save changes"
 * writes the whole week. "Set … hours" checks each range first (a time left on "Choose",
 * the end after the start, 5:00 am–11:00 pm, no overlaps), shows the first problem under
 * each range and moves focus to the first select at fault.
 */
export function EditDayHoursDialog({ weekday, ranges, onApply, onClose }: EditDayHoursDialogProps) {
  const day = weekdayName(weekday, 'long')
  const id = useId()
  const addButton = useRef<HTMLButtonElement>(null)
  const [edited, setEdited] = useState<EditedRange[]>(() =>
    ranges.map((range, index) => ({ ...range, key: index })),
  )
  const [nextKey, setNextKey] = useState(ranges.length)
  const [problems, setProblems] = useState<ReadonlyMap<number, RangeProblem>>(new Map())
  // The 15-minute times, plus any saved time that isn't one of them.
  const [options] = useState(() =>
    timeOptions(ranges.flatMap((range) => [range.opens_at, range.closes_at])),
  )

  const fieldsId = (key: number) => `${id}-range-${key}`

  const change = (key: number, part: keyof HoursRange, value: string) => {
    setEdited((current) =>
      current.map((range) => (range.key === key ? { ...range, [part]: value } : range)),
    )
    setProblems((current) => {
      const next = new Map(current)
      next.delete(key)
      return next
    })
  }

  const add = () => {
    const key = nextKey
    flushSync(() => {
      setEdited((current) => [...current, { key, opens_at: '', closes_at: '' }])
      setNextKey(key + 1)
    })
    document.getElementById(`${fieldsId(key)}-from`)?.focus()
  }

  const remove = (key: number) => {
    flushSync(() => setEdited((current) => current.filter((range) => range.key !== key)))
    // The button went with its range.
    addButton.current?.focus()
  }

  const apply = () => {
    const found = validateDayRanges(edited)
    const next = new Map<number, RangeProblem>()
    found.forEach((problem, index) => {
      if (problem) next.set(edited[index].key, problem)
    })
    if (next.size === 0) {
      onApply(edited.map(({ opens_at, closes_at }) => ({ opens_at, closes_at })))
      return
    }
    flushSync(() => setProblems(next))
    const first = edited.find((range) => next.has(range.key))
    const problem = first && next.get(first.key)
    if (first && problem) {
      document.getElementById(`${fieldsId(first.key)}-${problem.from ? 'from' : 'to'}`)?.focus()
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`${day} hours`}
      subtitle={`Repeats every ${day}. Lessons already booked stay booked.`}
      size="sm"
      hideClose
      actions={
        <>
          <Button className="max-md:flex-1" onClick={apply}>
            Set {day} hours
          </Button>
          <Button variant="quiet" tone="muted" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {edited.length === 0 ? (
          <p className="text-sm text-muted">Closed all day.</p>
        ) : (
          edited.map((range, index) => {
            const problem = problems.get(range.key)
            return (
              <HoursRangeFields
                key={range.key}
                id={fieldsId(range.key)}
                position={index + 1}
                range={range}
                options={options}
                problem={problem}
                error={
                  problem &&
                  messageFor({ code: problem.code, detail: { weekday } }, { audience: 'coach' })
                }
                removeLabel={`Remove ${rangeName(range, index + 1)}`}
                onChange={(part, value) => change(range.key, part, value)}
                onRemove={() => remove(range.key)}
              />
            )
          })
        )}
        <Button ref={addButton} variant="link" flush className="self-start" onClick={add}>
          Add hours
        </Button>
      </div>
    </Dialog>
  )
}
