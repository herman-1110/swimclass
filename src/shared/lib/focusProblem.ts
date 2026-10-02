// How long the spoken line stays in the page: long enough for any screen reader to read it.
const SPOKEN_MS = 7_000

/** The last line focusProblem spoke, so a new one replaces it. */
let spoken: HTMLElement | null = null

/**
 * Takes a form to the field its message is about (auth spec §7.5: the first field with a
 * problem). Focus moves there, so the field is read out with the message it now describes.
 *
 * When the field has focus already (Enter pressed in it, the usual way to send a form), focus
 * can't move, and a screen reader would say nothing. Then the message is said once, as an
 * alert (WCAG 4.1.3; auth spec §7.4), from a visually hidden line at the end of the form that
 * goes after a few seconds. Moving focus away and back instead is not reliably heard (the
 * browser may treat it as no change), and would close a phone's keyboard.
 */
export function focusProblem(field: HTMLElement | null | undefined, message: string): void {
  if (!field) return
  if (field !== document.activeElement) {
    field.focus()
    return
  }
  spoken?.remove()
  const line = document.createElement('p')
  line.setAttribute('role', 'alert')
  line.className = 'sr-only'
  line.textContent = message
  const form = field.closest('form') ?? document.body
  form.append(line)
  spoken = line
  window.setTimeout(() => line.remove(), SPOKEN_MS)
}
