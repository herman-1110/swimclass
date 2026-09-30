import {
  type KeyboardEvent,
  type RefObject,
  type SyntheticEvent,
  useLayoutEffect,
  useRef,
} from 'react'

type ModalDialogOptions = {
  /** The <dialog> is rendered and should be showing. */
  open: boolean
  /** Esc, or the browser closing the dialog itself (for example the Android back gesture). */
  onClose: () => void
  /** False while a request runs: Esc, the back gesture and the browser's own close requests
   *  do nothing, and the dialog stays open. */
  dismissible?: boolean
  /** Where focus goes when it opens (a dialog's title, or its safest action). */
  initialFocus: RefObject<HTMLElement | null>
}

/** Props to spread on the <dialog>. */
export type ModalDialogHandlers = {
  onKeyDown: (event: KeyboardEvent<HTMLDialogElement>) => void
  onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void
  onClose: (event: SyntheticEvent<HTMLDialogElement>) => void
}

// Open modals, innermost last (a dialog opened from a side panel): only the top one keeps
// focus and answers Esc.
const stack: HTMLDialogElement[] = []

let locks = 0
let savedScroll: { overflow: string; gutter: string } | null = null

/** The page behind a modal doesn't scroll (showModal doesn't stop it; DESIGN §3 Dialog). */
function lockScroll() {
  locks += 1
  if (locks > 1) return
  const root = document.documentElement
  savedScroll = {
    overflow: root.style.getPropertyValue('overflow'),
    gutter: root.style.getPropertyValue('scrollbar-gutter'),
  }
  // Keep the scrollbar's space so the page doesn't shift sideways when it goes.
  const scrollbar = window.innerWidth - root.clientWidth
  root.style.setProperty('overflow', 'hidden')
  if (scrollbar > 0) root.style.setProperty('scrollbar-gutter', 'stable')
}

function unlockScroll() {
  locks -= 1
  if (locks > 0 || !savedScroll) return
  const root = document.documentElement
  for (const [name, value] of [
    ['overflow', savedScroll.overflow],
    ['scrollbar-gutter', savedScroll.gutter],
  ] as const) {
    if (value) root.style.setProperty(name, value)
    else root.style.removeProperty(name)
  }
  savedScroll = null
}

const FOCUSABLE =
  'a[href], area[href], button, input, select, textarea, iframe, [tabindex], [contenteditable="true"]'

/** The elements Tab stops at inside `root`, in order. */
function tabStops(root: HTMLElement): HTMLElement[] {
  const all = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)]
  return all.filter((el) => {
    if (el.tabIndex < 0 || el.matches(':disabled') || el.closest('[inert]')) return false
    if (el instanceof HTMLInputElement && el.type === 'hidden') return false
    // Hidden by CSS (a phone-only button on a computer). jsdom has no checkVisibility.
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility()) return false
    // In a radio group Tab stops at the checked radio only.
    if (el instanceof HTMLInputElement && el.type === 'radio' && !el.checked && el.name) {
      return !all.some(
        (other) =>
          other instanceof HTMLInputElement &&
          other.type === 'radio' &&
          other.name === el.name &&
          other.checked,
      )
    }
    return true
  })
}

/** Is `node` before `other` in the document? */
function precedes(node: Node, other: Node): boolean {
  return (other.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING) !== 0
}

/** Shows the dialog as a modal. jsdom has no showModal: the open attribute shows it there,
 *  and the focus guard keeps focus inside. */
function show(dialog: HTMLDialogElement) {
  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) dialog.showModal()
  } else {
    dialog.setAttribute('open', '')
  }
}

/** Focus on `preferred`, or the first Tab stop when it can't take focus (it is disabled
 *  while a request runs). */
function focusInside(dialog: HTMLDialogElement, preferred: HTMLElement | null) {
  preferred?.focus()
  if (!dialog.contains(document.activeElement)) tabStops(dialog).at(0)?.focus()
}

/**
 * A native <dialog> shown as a modal (DESIGN §3): while `open`, it is shown with showModal()
 * (the page behind becomes inert), focus starts on `initialFocus`, Tab and Shift+Tab stay
 * inside it, Esc calls `onClose`, the page doesn't scroll, and when it closes focus goes back
 * to the element that opened it (unless the page has moved focus on since). While
 * `dismissible` is false, nothing but the owner closes it: if the browser closes it anyway,
 * it opens again at once.
 *
 * The component renders the <dialog> only while open; React state owns `open`, so Esc asks
 * the owner to close instead of closing it behind React's back.
 */
export function useModalDialog(
  ref: RefObject<HTMLDialogElement | null>,
  { open, onClose, dismissible = true, initialFocus }: ModalDialogOptions,
): ModalDialogHandlers {
  // The latest options, read by the handlers and the open effect without re-running it.
  const latest = useRef({ onClose, dismissible, initialFocus })
  useLayoutEffect(() => {
    latest.current = { onClose, dismissible, initialFocus }
  })

  useLayoutEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null

    show(dialog)
    stack.push(dialog)
    lockScroll()
    focusInside(dialog, latest.current.initialFocus.current)

    // If focus lands outside anyway (something scripted it there), bring it back.
    const guard = (event: FocusEvent) => {
      if (stack.at(-1) !== dialog) return
      if (event.target instanceof Node && !dialog.contains(event.target)) {
        focusInside(dialog, latest.current.initialFocus.current)
      }
    }
    document.addEventListener('focusin', guard)

    return () => {
      document.removeEventListener('focusin', guard)
      const place = stack.indexOf(dialog)
      if (place >= 0) stack.splice(place, 1)
      unlockScroll()
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
      // Back to the opener, unless focus has already moved somewhere else on the page.
      const active = document.activeElement
      const lost = !active || active === document.body || dialog.contains(active)
      if (opener?.isConnected && lost) opener.focus()
    }
  }, [open, ref])

  return {
    onKeyDown: (event) => {
      const dialog = event.currentTarget
      if (stack.at(-1) !== dialog) return
      if (event.key === 'Escape') {
        // Handled here, so the browser doesn't close the dialog behind React's back.
        event.preventDefault()
        event.stopPropagation()
        if (latest.current.dismissible) latest.current.onClose()
        return
      }
      if (event.key !== 'Tab') return
      const stops = tabStops(dialog)
      const first = stops.at(0)
      const last = stops.at(-1)
      // The element the key was pressed on: the focused one.
      const active = event.target instanceof Node ? event.target : null
      if (!first || !last || !active) {
        event.preventDefault()
        return
      }
      // Wrap around at either end. Focus on something that isn't a Tab stop (the title)
      // counts as before the first stop or after the last one, by its place in the page.
      const isStop = stops.some((el) => el === active)
      const atStart = active === first || (!isStop && precedes(active, first))
      const atEnd = active === last || (!isStop && precedes(last, active))
      if (event.shiftKey ? atStart : atEnd) {
        event.preventDefault()
        if (event.shiftKey) last.focus()
        else first.focus()
      }
    },
    onCancel: (event) => {
      // A close request that didn't come through the dialog's keydown: the Android back
      // gesture, or Esc while focus is on the page (a focused button became disabled).
      event.preventDefault()
      if (latest.current.dismissible) latest.current.onClose()
    },
    onClose: (event) => {
      // Our own close() (the owner closed it, or React re-ran the effect) takes it off the
      // stack first, and the event comes later: ignore it, and ignore a dialog that is
      // showing again. What's left is a close the browser made on its own, because its
      // close request couldn't be cancelled (Esc pressed again and again with focus on the
      // page, or back pressed twice).
      const dialog = event.currentTarget
      if (!stack.includes(dialog) || dialog.open) return
      if (latest.current.dismissible) {
        latest.current.onClose()
        return
      }
      // Not now (a request is running): show it again, with focus inside.
      show(dialog)
      focusInside(dialog, latest.current.initialFocus.current)
    },
  }
}
