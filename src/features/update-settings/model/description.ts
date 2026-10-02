/**
 * The id of a setting's description (RowDescription), for its control's aria-describedby
 * (coach-settings §7.2). It takes the place of the row's help, note and error ids, which
 * FieldRow still gives the text it shows.
 */
export function rowDescriptionId(id: string): string {
  return `${id}-description`
}

/**
 * A setting's description as screen readers hear it (coach-settings §7.2): the row's help,
 * then its note and its error while they show, each a sentence. The drawn help has no full
 * stop, and the parts are separate elements on screen, so naming their ids one after the
 * other runs them together ("Blocked before and after every lesson Changing the travel gap
 * …"). One text, with a full stop after each part that has none, is read with the pauses.
 */
export function describedText(parts: readonly (string | null | undefined)[]): string {
  return parts
    .map((part) => part?.trim() ?? '')
    .filter((part) => part !== '')
    .map((part) => (/[.!?…]$/.test(part) ? part : `${part}.`))
    .join(' ')
}
