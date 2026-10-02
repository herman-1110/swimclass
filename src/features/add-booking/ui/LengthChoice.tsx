import type { UseQueryResult } from '@tanstack/react-query'
import { useId } from 'react'

import type { PublicSettings } from '@/entities/settings'
import { formatMinutes } from '@/shared/lib/format'
import { useReadFailure } from '@/shared/lib/hooks/useReadFailure'
import { Segmented } from '@/shared/ui/Segmented'
import { Skeleton } from '@/shared/ui/Skeleton'

import { ReadError } from './ReadError'

type LengthChoiceProps = {
  /** usePublicSettings(): lesson_lengths, 60 and 120 in the seed. */
  settings: UseQueryResult<PublicSettings>
  /** The length chosen, or null before the settings are in. */
  value: number | null
  /** It is booking: the choice holds until the answer is in. */
  disabled?: boolean
  onChange: (minutes: number) => void
}

const label = 'text-label font-medium text-muted'

/**
 * "Length" (the Schedule spec §7.4): "1 hour" / "2 hours" from the settings, as a segmented
 * control. With one length only there is nothing to choose, so it is plain text (§6.7). The
 * settings are usually in already (the layout reads them); until then a placeholder. If they
 * never loaded, the problem and "Try again" stay while they are read again; once they are
 * in, focus goes to the chosen length.
 */
export function LengthChoice({ settings, value, disabled, onChange }: LengthChoiceProps) {
  const id = useId()
  const failure = useReadFailure([settings], () => {
    const length = document.getElementById(id)
    return length?.querySelector<HTMLElement>('input:checked') ?? length
  })
  const lengths = settings.data?.lesson_lengths ?? []

  if (failure) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className={label}>Length</p>
        <ReadError failure={failure} />
      </div>
    )
  }
  if (lengths.length === 0 || value === null) {
    return (
      <div aria-busy="true" className="flex flex-col gap-1.5">
        <p className={label}>Length</p>
        <Skeleton className="h-12.5" />
        <p role="status" className="sr-only">
          Loading…
        </p>
      </div>
    )
  }
  if (lengths.length === 1) {
    return (
      // Focusable, so "Try again" can hand focus to the length it brought.
      <div id={id} tabIndex={-1} className="flex flex-col gap-1.5">
        <p className={label}>Length</p>
        <p className="text-sm leading-[normal]">{formatMinutes(lengths[0])}</p>
      </div>
    )
  }
  return (
    <Segmented
      id={id}
      name="add-booking-length"
      legend="Length"
      options={lengths.map((minutes) => ({
        value: String(minutes),
        label: formatMinutes(minutes),
        disabled,
      }))}
      value={String(value)}
      onChange={(minutes) => onChange(Number(minutes))}
    />
  )
}
