import type { UseQueryResult } from '@tanstack/react-query'

import type { PublicSettings } from '@/entities/settings'
import { messageFor } from '@/shared/config/messages'
import { formatMinutes } from '@/shared/lib/format'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'
import { Segmented } from '@/shared/ui/Segmented'
import { Skeleton } from '@/shared/ui/Skeleton'

type LengthChoiceProps = {
  /** usePublicSettings(): lesson_lengths, 60 and 120 in the seed. */
  settings: UseQueryResult<PublicSettings>
  /** The length chosen, or null before the settings are in. */
  value: number | null
  onChange: (minutes: number) => void
}

const label = 'text-label font-medium text-muted'

/**
 * "Length" (the Schedule spec §7.4): "1 hour" / "2 hours" from the settings, as a segmented
 * control. With one length only there is nothing to choose, so it is plain text (§6.7). The
 * settings are usually in already (the layout reads them); until then a placeholder.
 */
export function LengthChoice({ settings, value, onChange }: LengthChoiceProps) {
  const lengths = settings.data?.lesson_lengths ?? []

  if (settings.isError && lengths.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className={label}>Length</p>
        <Banner
          role="alert"
          action={
            <Button variant="quiet" size="sm" tone="accent" onClick={() => void settings.refetch()}>
              Try again
            </Button>
          }
        >
          {messageFor(settings.error, { audience: 'coach' })}
        </Banner>
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
      <div className="flex flex-col gap-1.5">
        <p className={label}>Length</p>
        <p className="text-sm leading-[normal]">{formatMinutes(lengths[0])}</p>
      </div>
    )
  }
  return (
    <Segmented
      name="add-booking-length"
      legend="Length"
      options={lengths.map((minutes) => ({
        value: String(minutes),
        label: formatMinutes(minutes),
      }))}
      value={String(value)}
      onChange={(minutes) => onChange(Number(minutes))}
    />
  )
}
