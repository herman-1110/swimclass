import { useEffect, useRef, useState } from 'react'

import { useSession } from '@/entities/account'

import { DemoPanel } from './DemoPanel'

const PANEL_ID = 'demo-panel'
const TITLE_ID = 'demo-panel-title'

// jsdom (the unit tests) has no showModal() or close(): the open attribute shows it there.
function showPanel(dialog: HTMLDialogElement) {
  if (dialog.hasAttribute('open')) return
  if (typeof dialog.showModal === 'function') dialog.showModal()
  else dialog.setAttribute('open', '')
}

function hidePanel(dialog: HTMLDialogElement) {
  if (!dialog.hasAttribute('open')) return
  if (typeof dialog.close === 'function') dialog.close()
  else dialog.removeAttribute('open')
}

/**
 * Demo mode's tools, never part of the real site (RootLayout loads them only in demo
 * builds): a small "Demo" button that floats where no drawing puts a control, and the
 * panel it opens as a modal dialog (focus stays inside, Esc and Close shut it).
 */
export function DemoTools() {
  const session = useSession()
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      showPanel(dialog)
    } else {
      hidePanel(dialog)
      // Back to the button that opened it (not on the first render).
      if (wasOpen.current) buttonRef.current?.focus()
    }
    wasOpen.current = open
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <div
        // Placed where no drawing has a control or text at rest (360–1440 px), and it
        // never moves the page: the top-right corner on phones; from 768 px the top edge
        // at 40 % of the width, between the page title and the header's buttons (the tab
        // bar's links fill their whole cells); beside the business name in the sidebar
        // from 1024 px. z-[15]: above the tab bar (z-10), under the focused skip link
        // (z-20) and anything a page opens over itself (conventions §7.7).
        className="fixed top-2 right-2 z-[15] flex flex-col items-end gap-1 md:right-auto md:left-[40%] md:items-start lg:top-[15px] lg:left-[168px]"
      >
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={PANEL_ID}
          onClick={() => setOpen(true)}
          className="flex size-11 items-center justify-center rounded-full border border-field bg-white text-[0.6875rem] font-semibold text-muted hover:text-ink"
        >
          Demo
        </button>
        {session.status === 'loading' && (
          <p
            role="status"
            className="rounded-full border border-line bg-white px-3 py-1.5 text-small whitespace-nowrap text-muted"
          >
            Starting the demo…
          </p>
        )}
      </div>
      <dialog
        ref={dialogRef}
        id={PANEL_ID}
        aria-labelledby={TITLE_ID}
        // Esc closes a modal dialog by itself; the state follows.
        onClose={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close()
        }}
        // The panel fills the dialog, so a click on the dialog itself is on the backdrop.
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
        className="m-0 ml-auto h-dvh max-h-none w-full max-w-none bg-white p-0 text-ink backdrop:bg-ink/30 open:flex md:w-[400px] md:border-l md:border-line"
      >
        {open && <DemoPanel titleId={TITLE_ID} onClose={close} />}
      </dialog>
    </>
  )
}
