import { ROUTES } from '@/shared/config/routes'
import { Button } from '@/shared/ui/Button'
import { ButtonLink } from '@/shared/ui/ButtonLink'

/**
 * Moves focus to the success heading when it appears (book spec §7.2), which is only right
 * after a booking: a new choice dismisses the panel for good. The heading is already on
 * screen, in the sticky footer or the sticky card, so focusing it must not scroll the page
 * (on phones the footer sits inside the page's scroll-padding-bottom).
 */
function focusOnMount(heading: HTMLHeadingElement | null) {
  heading?.focus({ preventScroll: true })
}

type BookedTextProps = {
  /** "Booked 7:30 pm for Aiman & Sofia". */
  heading: string
  /** "Tue 29 Sep · 7:30–8:30 pm", or several dates for a weekly booking. */
  when: string
  /** "Package 4 · 0 used · 3 booked · 1 left to book", from the refreshed balance; null until it arrives. */
  packageLine: string | null
}

// Book spec §5.3.2 (proposed; not drawn): the heading as the summary's title (16 px 600),
// the lessons in 14 px ink, the package after the booking in 13 px muted.
/** The success panel's text, inside the summary's live region. The heading takes focus. */
export function BookedText({ heading, when, packageLine }: BookedTextProps) {
  return (
    <>
      <h2 ref={focusOnMount} tabIndex={-1} className="text-base leading-[normal] font-semibold">
        {heading}
      </h2>
      <p className="mt-0.5 text-sm leading-[1.4]">{when}</p>
      {packageLine !== null && (
        <p className="text-label leading-[1.45] text-muted">{packageLine}</p>
      )}
    </>
  )
}

type BookedActionsProps = {
  /** Clears the panel; the day, group and length stay. */
  onBookAnother: () => void
}

/** "Book another lesson" and "See My classes", under the success panel's text. */
export function BookedActions({ onBookAnother }: BookedActionsProps) {
  return (
    <div className="-ml-3.5 flex flex-wrap items-center gap-x-2">
      <Button variant="quiet" onClick={onBookAnother}>
        Book another lesson
      </Button>
      <ButtonLink variant="link" to={ROUTES.myClasses}>
        See My classes
      </ButtonLink>
    </div>
  )
}
