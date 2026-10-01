import { saveErrorMessage } from '../model/copy'

type SaveErrorProps = {
  /** useAddExceptions' refusal: an AppError, or a PartlySavedError for a range of days. */
  error: unknown
}

/**
 * Brings the refusal into view: the form may be scrolled to its top. The bottom scroll
 * margin keeps it clear of the dialog's sticky button row. jsdom has no scrollIntoView.
 */
function showInView(node: HTMLElement | null) {
  node?.scrollIntoView?.({ block: 'nearest' })
}

/**
 * Why the time wasn't saved, above the buttons, in the coach's words (DESIGN §6), or for a
 * range that stopped part way which days were saved (the Schedule spec §6.5). It scrolls
 * into view when it appears: key it by the attempt.
 */
export function SaveError({ error }: SaveErrorProps) {
  return (
    <p ref={showInView} role="alert" className="scroll-mb-24 text-label leading-normal text-warn">
      {saveErrorMessage(error)}
    </p>
  )
}
