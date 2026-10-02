import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Banner } from './Banner'
import { Button } from './Button'

afterEach(cleanup)

describe('Banner', () => {
  it('shows a bold lead-in, a space, then the text', () => {
    const { container } = render(
      <Banner label="Coach:">
        If lightning closes the pool, your lesson goes back to your package.
      </Banner>,
    )
    const box = container.firstElementChild as HTMLElement
    expect(box.textContent).toBe(
      'Coach: If lightning closes the pool, your lesson goes back to your package.',
    )
    expect(screen.getByText('Coach:').className).toBe('font-semibold')
    expect(box.hasAttribute('role')).toBe(false)
  })

  it('can be a status the page moves focus to', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Banner ref={ref} role="status" tabIndex={-1}>
        Lesson cancelled.
      </Banner>,
    )
    const status = screen.getByRole('status')
    expect(status).toBe(ref.current)
    ref.current?.focus()
    expect(document.activeElement).toBe(status)
  })

  it('wraps its text inside a long word, with or without an action', () => {
    const { container } = render(
      <>
        <Banner>https://example.com/a-very-long-link</Banner>
        <Banner action={<button type="button">Try again</button>}>Couldn’t load.</Banner>
      </>,
    )
    const [plain, withAction] = [...container.children]
    expect(plain.className).toContain('wrap-anywhere')
    expect(withAction.firstElementChild?.className).toContain('wrap-anywhere')
  })

  it('shows an action beside the text', () => {
    const onRetry = vi.fn()
    render(
      <Banner
        tone="warn"
        role="alert"
        action={
          <Button variant="link" onClick={onRetry}>
            Try again
          </Button>
        }
      >
        Couldn’t reach the server. Check your connection and try again.
      </Banner>,
    )
    expect(screen.getByRole('alert').className).toContain('bg-warn-tint')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
