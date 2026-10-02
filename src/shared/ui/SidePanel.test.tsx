import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { type ReactNode, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Dialog } from './Dialog'
import { SidePanel } from './SidePanel'

// jsdom has no matchMedia: a window of a chosen width, told when it "resizes".
let width = 1440
const listeners = new Set<() => void>()

beforeEach(() => {
  listeners.clear()
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      const min = /min-width:\s*(\d+)px/.exec(query)
      return min ? width >= Number(min[1]) : false
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function resize(to: number) {
  width = to
  act(() => listeners.forEach((listener) => listener()))
}

/** The Students page, reduced: a row's "Record payment" opens the panel. */
function Page({ alwaysModal = false, children }: { alwaysModal?: boolean; children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Record payment for Hana
      </button>
      <SidePanel
        title="Record payment"
        subtitle="Hana · Farah’s account"
        open={open}
        onClose={() => setOpen(false)}
        alwaysModal={alwaysModal}
      >
        <label htmlFor="pay-amount">Amount</label>
        <input id="pay-amount" />
        <button type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
        {children}
      </SidePanel>
    </div>
  )
}

function openPanel() {
  const opener = screen.getByRole('button', { name: 'Record payment for Hana' })
  opener.focus()
  fireEvent.click(opener)
  return opener
}

describe('SidePanel from 1280 px', () => {
  it('is a plain column, always shown, named by its title, with no Close', () => {
    width = 1280
    render(<Page />)
    const column = screen.getByRole('complementary', {
      name: 'Record payment',
      description: 'Hana · Farah’s account',
    })
    expect(within(column).getByLabelText('Amount')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('lets the page move focus to its title', () => {
    width = 1440
    function Focusing() {
      const [title, setTitle] = useState<HTMLHeadingElement | null>(null)
      return (
        <>
          <button type="button" onClick={() => title?.focus()}>
            Record payment for Hana
          </button>
          <SidePanel title="Record payment" open onClose={() => {}} titleRef={setTitle}>
            <p>Form</p>
          </SidePanel>
        </>
      )
    }
    render(<Focusing />)
    fireEvent.click(screen.getByRole('button', { name: 'Record payment for Hana' }))
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Record payment' }))
  })
})

describe('SidePanel below 1280 px', () => {
  it('shows only while open, as a modal drawer with Close and focus on its title', () => {
    width = 768
    render(<Page />)
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    openPanel()
    const panel = screen.getByRole('dialog', {
      name: 'Record payment',
      description: 'Hana · Farah’s account',
    })
    expect(panel.getAttribute('aria-modal')).toBe('true')
    // A 44 px target, whatever the word's width.
    expect(within(panel).getByRole('button', { name: 'Close' }).className).toContain('min-w-11')
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Record payment' }))
    // Names and locations of any length wrap inside the panel (DESIGN §5).
    expect(screen.getByText('Hana · Farah’s account').className).toContain('wrap-anywhere')
  })

  it('closes on Esc, Close or Cancel, and focus goes back to the opener', () => {
    width = 1024
    render(<Page />)
    for (const close of [
      () => fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }),
      () => fireEvent.click(screen.getByRole('button', { name: 'Close' })),
      () => fireEvent.click(screen.getByRole('button', { name: 'Cancel' })),
    ]) {
      const opener = openPanel()
      close()
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.activeElement).toBe(opener)
    }
  })

  it('keeps focus inside: Tab from the last control goes round to Close', () => {
    width = 390
    render(<Page />)
    openPanel()
    const close = screen.getByRole('button', { name: 'Close' })
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    cancel.focus()
    fireEvent.keyDown(cancel, { key: 'Tab' })
    expect(document.activeElement).toBe(close)
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(cancel)
    screen.getByRole('button', { name: 'Record payment for Hana' }).focus()
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })

  it('becomes the column when the window grows past 1280 px while open, and back', () => {
    width = 1024
    render(<Page />)
    openPanel()
    expect(screen.getByRole('dialog', { name: 'Record payment' })).toBeTruthy()
    resize(1280)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('complementary', { name: 'Record payment' })).toBeTruthy()
    resize(1279)
    expect(screen.getByRole('dialog', { name: 'Record payment' })).toBeTruthy()
  })
})

describe('SidePanel alwaysModal (the History drawer)', () => {
  it('is a modal drawer even at 1440 px', () => {
    width = 1440
    render(<Page alwaysModal />)
    expect(screen.queryByRole('complementary')).toBeNull()
    openPanel()
    expect(screen.getByRole('dialog', { name: 'Record payment' })).toBeTruthy()
  })

  it('Esc in a dialog opened from it closes only that dialog', () => {
    width = 1440
    function Confirm() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Deactivate group
          </button>
          <Dialog open={open} onClose={() => setOpen(false)} title="Deactivate Hana?" />
        </>
      )
    }
    render(
      <Page alwaysModal>
        <Confirm />
      </Page>,
    )
    openPanel()
    const deactivate = screen.getByRole('button', { name: 'Deactivate group' })
    deactivate.focus()
    fireEvent.click(deactivate)
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Deactivate Hana?' }), { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Deactivate Hana?' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Record payment' })).toBeTruthy()
    expect(document.activeElement).toBe(deactivate)
  })
})
