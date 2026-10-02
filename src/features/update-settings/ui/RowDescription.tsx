import { describedText, rowDescriptionId } from '../model/description'

type RowDescriptionProps = {
  /** The control's id: the description gets rowDescriptionId(id). */
  id: string
  /** The row's help, then its note and error while they show. */
  parts: readonly (string | null | undefined)[]
}

/**
 * What a setting's control is described by, as one hidden text read in sentences
 * (describedText): put it in the row's control, and point the control's aria-describedby
 * at rowDescriptionId(id). The help, note and error stay on screen as FieldRow draws them.
 */
export function RowDescription({ id, parts }: RowDescriptionProps) {
  return (
    <span id={rowDescriptionId(id)} hidden>
      {describedText(parts)}
    </span>
  )
}
