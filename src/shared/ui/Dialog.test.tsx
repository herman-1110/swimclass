import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Dialog } from './Dialog'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const TITLE = 'Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia?'

/** A page with a button that opens the cancel confirmation (the My classes pattern). */
function Page({
  dismissible,
  busy = false,
  focusKeep = false,
}: {
  dismissible?: boolean
  busy?: boolean
  focusKeep?: boolean
}) {
  const [open, setOpen] = useState(false)
  const keep = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Cancel
      </button>
      <button type="button">Past lessons and receipts</button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={TITLE}
        description="The lesson goes back to your package."
        role={focusKeep ? 'alertdialog' : 'dialog'}
        initialFocus={focusKeep ? keep : undefined}
        busy={busy}
        dismissible={dismissible}
        actions={
          <>
            <button type="button">Cancel lesson</button>
            <button ref={keep} type="button" onClick={() => setOpen(false)}>
              Keep lesson
            </button>
          </>
        }
      />
    </>
  )
}

function openFrom(name: string) {
  const opener = screen.getByRole('button', { name })
  opener.focus()
  fireEvent.click(opener)
  return opener
}

describe('Dialog', () => {
  it('shows nothing while closed', () => {
    render(<Page />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens as a modal named by its title and described by its text, with focus on the title', () => {
    render(<Page />)
    openFrom('Cancel')
    const dialog = screen.getByRole('dialog', {
      name: TITLE,
      description: 'The lesson goes back to your package.',
    })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.hasAttribute('aria-busy')).toBe(false)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: TITLE }))
  })

  it('closes on Esc and gives focus back to the button that opened it', () => {
    render(<Page />)
    const opener = openFrom('Cancel')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('leaves Esc to a select whose list is open inside it (Chrome’s styled select)', () => {
    function WithSelect() {
      const [open, setOpen] = useState(true)
      return (
        <Dialog open={open} onClose={() => setOpen(false)} title="Block time">
          <label>
            From
            <select defaultValue="7">
              <option value="7">7:00 am</option>
              <option value="8">8:00 am</option>
            </select>
          </label>
        </Dialog>
      )
    }
    render(<WithSelect />)
    const select = screen.getByRole('combobox', { name: 'From' })
    const listOpen = vi.spyOn(select, 'matches').mockImplementation((query) => query === ':open')
    // The list has focus on an option; Esc closes the list, not the dialog.
    fireEvent.keyDown(screen.getAllByRole('option')[0], { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeNull()
    // Once the list is shut, Esc on the select closes the dialog as before.
    listOpen.mockReturnValue(false)
    fireEvent.keyDown(select, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes with Close, and with its own buttons', () => {
    render(<Page />)
    const opener = openFrom('Cancel')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)

    openFrom('Cancel')
    fireEvent.click(screen.getByRole('button', { name: 'Keep lesson' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('keeps Tab and Shift+Tab inside, wrapping round at either end', () => {
    render(<Page />)
    openFrom('Cancel')
    const title = screen.getByRole('heading', { level: 2 })
    const close = screen.getByRole('button', { name: 'Close' })
    const keep = screen.getByRole('button', { name: 'Keep lesson' })

    // Shift+Tab from the title (before the first stop) goes round to the last button.
    fireEvent.keyDown(title, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(keep)
    // Tab from the last button goes round to the first one.
    fireEvent.keyDown(keep, { key: 'Tab' })
    expect(document.activeElement).toBe(close)
    // Shift+Tab from the first goes round to the last.
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(keep)
  })

  it('brings focus back inside when something moves it out', () => {
    render(<Page />)
    openFrom('Cancel')
    screen.getByRole('button', { name: 'Past lessons and receipts' }).focus()
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })

  it('starts on the safe action it is given, as an alertdialog', () => {
    render(<Page focusKeep />)
    openFrom('Cancel')
    expect(screen.getByRole('alertdialog', { name: TITLE })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keep lesson' }))
  })

  it('stays open on Esc and Close while it is not dismissible (a request is running)', () => {
    render(<Page dismissible={false} />)
    openFrom('Cancel')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(close)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('is busy while a request runs: aria-busy, and Esc and Close do nothing', () => {
    render(<Page busy />)
    openFrom('Cancel')
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-busy')).toBe('true')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('dialog')).toBe(dialog)
  })

  it('answers the browser’s close request (the back gesture) only when dismissible', () => {
    const { unmount } = render(<Page />)
    const opener = openFrom('Cancel')
    const request = new Event('cancel', { cancelable: true })
    fireEvent(screen.getByRole('dialog'), request)
    // Cancelled, so React state closes it rather than the browser.
    expect(request.defaultPrevented).toBe(true)
    expect(document.querySelector('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
    unmount()

    render(<Page dismissible={false} />)
    openFrom('Cancel')
    const held = new Event('cancel', { cancelable: true })
    fireEvent(screen.getByRole('dialog'), held)
    expect(held.defaultPrevented).toBe(true)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('opens again when the browser closes it itself while it is not dismissible', () => {
    render(<Page dismissible={false} />)
    openFrom('Cancel')
    const dialog = screen.getByRole('dialog')
    // A close request the browser wouldn't let us cancel (Esc again and again with focus on
    // the page): it closes the dialog, then fires close.
    dialog.removeAttribute('open')
    fireEvent(dialog, new Event('close'))
    expect(document.querySelector('dialog')).toBe(dialog)
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('tells the owner when the browser closes it itself', () => {
    render(<Page />)
    const opener = openFrom('Cancel')
    const dialog = screen.getByRole('dialog')
    dialog.removeAttribute('open')
    fireEvent(dialog, new Event('close'))
    expect(document.querySelector('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('puts Close on the title’s line, and makes it a 44 px target', () => {
    render(<Page />)
    openFrom('Cancel')
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close.className).toContain('min-w-11')
    expect(close.className).toContain('min-h-11')
    // No subtitle: the title and Close share one centre line.
    expect(close.parentElement?.className).toContain('items-center')
    // Names of any length wrap rather than run out of the dialog (DESIGN §5).
    expect(screen.getByRole('heading', { level: 2 }).className).toContain('wrap-anywhere')
  })

  it('keeps a focused control clear of the sticky buttons, and rules them off while it scrolls', () => {
    // jsdom has no layout and no ResizeObserver: stand-ins for a long form (916 px of content
    // in an 820 px dialog) over an 82 px button row.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        callback: () => void
        constructor(callback: () => void) {
          this.callback = callback
        }
        observe() {
          this.callback()
        }
        disconnect() {}
      },
    )
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(82)
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(916)
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(820)
    render(<Page />)
    openFrom('Cancel')
    const dialog = screen.getByRole('dialog')
    // The row's height plus 8 px, so the 2 px focus ring and its offset clear it too.
    expect(dialog.style.getPropertyValue('scroll-padding-bottom')).toBe('90px')
    expect(dialog.hasAttribute('data-overflowing')).toBe(true)
    const row = screen.getByRole('button', { name: 'Keep lesson' }).parentElement
    expect(row?.className).toContain('group-data-overflowing/dialog:border-line')
  })

  it('stops the page scrolling while open', () => {
    render(<Page />)
    const before = document.documentElement.style.overflow
    openFrom('Cancel')
    expect(document.documentElement.style.overflow).toBe('hidden')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(document.documentElement.style.overflow).toBe(before)
  })
})
