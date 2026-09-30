import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Button } from './Button'
import { buttonClasses } from './buttonClasses'
import { ButtonLink } from './ButtonLink'

afterEach(cleanup)

describe('Button', () => {
  it('is a plain button unless the caller asks for a submit button', () => {
    render(
      <>
        <Button>Save payment</Button>
        <Button type="submit">Log in</Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Save payment' }).getAttribute('type')).toBe('button')
    expect(screen.getByRole('button', { name: 'Log in' }).getAttribute('type')).toBe('submit')
  })

  it('calls onClick when pressed', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Send to all customers</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Send to all customers' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('while pending says it is busy, keeps focus and ignores presses without submitting again', () => {
    const onClick = vi.fn()
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" pending onClick={onClick}>
          Logging in…
        </Button>
      </form>,
    )
    const button = screen.getByRole('button', { name: 'Logging in…' })
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.getAttribute('aria-disabled')).toBe('true')
    // Not the disabled attribute: a disabled button would drop focus to the page.
    expect(button.hasAttribute('disabled')).toBe(false)
    button.focus()
    expect(document.activeElement).toBe(button)
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
    // Pending keeps the colours: only aria-disabled from the caller gets the disabled look.
    expect(button.hasAttribute('data-disabled')).toBe(false)
  })

  it('submits its form when it is not pending', () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Log in</Button>
      </form>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('with aria-disabled looks disabled and ignores presses, but stays focusable', () => {
    const onClick = vi.fn()
    render(
      <Button aria-disabled onClick={onClick}>
        Save changes
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Save changes' })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.hasAttribute('data-disabled')).toBe(true)
    expect(button.hasAttribute('disabled')).toBe(false)
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('with disabled is a native disabled button that ignores presses', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Pick a time
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Pick a time' })
    expect(button.hasAttribute('disabled')).toBe(true)
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('passes other attributes through, and adds layout classes after its own', () => {
    render(
      <Button aria-label="Record payment for Hana" form="settings" className="flex-1">
        Record payment
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Record payment for Hana' })
    expect(button.getAttribute('form')).toBe('settings')
    expect(button.className.endsWith(' flex-1')).toBe(true)
    expect(button.className).toContain(buttonClasses())
  })
})

describe('ButtonLink', () => {
  it('is a link with the look of a button', () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <ButtonLink to="/coach/add-students" size="sm">
              Add students
            </ButtonLink>
          ),
        },
      ],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)
    const link = screen.getByRole('link', { name: 'Add students' })
    expect(link.getAttribute('href')).toBe('/coach/add-students')
    expect(link.className).toBe(buttonClasses({ size: 'sm' }))
  })
})

describe('buttonClasses', () => {
  const classes = (look: Parameters<typeof buttonClasses>[0]) => buttonClasses(look).split(' ')

  it('draws the primary sizes at the drawn heights', () => {
    expect(classes({})).toContain('min-h-11.5')
    expect(classes({ size: 'xl' })).toContain('min-h-12.5')
    expect(classes({ size: 'lg' })).toContain('min-h-12')
    expect(classes({ size: 'sm' })).toContain('min-h-11')
    expect(classes({ size: 'compact' })).toEqual(
      expect.arrayContaining(['rounded-small', 'text-label']),
    )
  })

  it('gives every look the disabled and busy states', () => {
    for (const variant of ['primary', 'quiet', 'link', 'underline', 'text'] as const) {
      const c = classes({ variant })
      expect(c).toContain('disabled:cursor-default')
      expect(c).toContain('data-disabled:cursor-default')
      expect(
        c.some(
          (name) => name.startsWith('data-disabled:') && name !== 'data-disabled:cursor-default',
        ),
      ).toBe(true)
    }
    expect(classes({})).toEqual(expect.arrayContaining(['disabled:bg-line', 'disabled:text-muted']))
  })

  it('never gives one element two classes for the same property', () => {
    const flush = classes({ variant: 'link', flush: true })
    expect(flush).toEqual(expect.arrayContaining(['justify-start', 'px-0']))
    expect(flush).not.toContain('justify-center')
    expect(flush).not.toContain('px-1')
    expect(classes({ variant: 'link' })).toEqual(expect.arrayContaining(['justify-center', 'px-1']))
    expect(classes({ variant: 'text', weight: 'medium' })).not.toContain('font-normal')
    expect(classes({ variant: 'quiet', tone: 'muted' })).not.toContain('text-ink')
  })

  it('makes a block button full width', () => {
    expect(classes({ block: true })).toContain('w-full')
    expect(classes({})).not.toContain('w-full')
  })
})
