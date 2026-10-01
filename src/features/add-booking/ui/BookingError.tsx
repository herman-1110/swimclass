import { clashLines, messageFor } from '@/shared/config/messages'

type BookingErrorProps = {
  /** coach_book's refusal. */
  error: unknown
  /** settings.travel_gap_minutes, for the gap messages. */
  gapMinutes: number | null
}

/**
 * Brings the refusal into view: the form may be scrolled to its top, and the primary button
 * has already changed ("Book anyway"). The bottom scroll margin keeps it clear of the
 * dialog's sticky button row. jsdom has no scrollIntoView.
 */
function showInView(node: HTMLElement | null) {
  node?.scrollIntoView?.({ block: 'nearest' })
}

/**
 * Why nothing was booked, above the buttons (DESIGN §6, the coach's words first): one line,
 * and for `repeat_conflict` each week that clashes with its reason ("Tue 29 Sep: It overlaps
 * another lesson at 5:30–6:30 pm."). `credit_exceeded` ends "…or choose “Book anyway”", which
 * the primary button then says. It scrolls into view when it appears: key it by the attempt.
 */
export function BookingError({ error, gapMinutes }: BookingErrorProps) {
  const options = { audience: 'coach' as const, gapMinutes }
  const lines = clashLines(error, options)
  return (
    <div
      ref={showInView}
      role="alert"
      className="flex scroll-mb-24 flex-col gap-1 text-label leading-normal text-warn"
    >
      <p>{messageFor(error, options)}</p>
      {lines.length > 0 && (
        <ul role="list" className="m-0 list-none p-0">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
