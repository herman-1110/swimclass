import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { Dialog } from './Dialog'

afterEach(cleanup)

const TITLE = 'Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia?'

/** A page with a button that opens the cancel confirmation (the My classes pattern). */
function Page({
  dismissible = true,
  focusKeep = false,
}: {
  dismissible?: boolean
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
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: TITLE }))
  })

  it('closes on Esc and gives focus back to the button that opened it', () => {
    render(<Page />)
    const opener = openFrom('Cancel')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
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

  it('stops the page scrolling while open', () => {
    render(<Page />)
    const before = document.documentElement.style.overflow
    openFrom('Cancel')
    expect(document.documentElement.style.overflow).toBe('hidden')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(document.documentElement.style.overflow).toBe(before)
  })
})
