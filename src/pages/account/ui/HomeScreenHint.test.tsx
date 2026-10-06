import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HomeScreenHint } from './HomeScreenHint'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'standalone')
})

/** A window whose matchMedia matches only the given query. */
function matchOnly(match: string) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === match,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('HomeScreenHint', () => {
  it('says how to add the site on an iPhone and on Android', () => {
    render(<HomeScreenHint />)
    const section = screen.getByRole('region', { name: 'Home screen' })
    expect(section.querySelector('p')?.textContent).toBe(
      'Add this site to your phone’s home screen to open it like an app.',
    )
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'iPhone: in Safari, tap Share, then Add to Home Screen.',
      'Android: in Chrome, tap the ⋮ menu, then Add to home screen.',
    ])
  })

  it('shows in a browser tab', () => {
    matchOnly('(min-width: 1280px)')
    render(<HomeScreenHint />)
    expect(screen.getByRole('heading', { name: 'Home screen', level: 2 })).toBeTruthy()
  })

  it('is left out when the site is already open from the home screen', () => {
    matchOnly('(display-mode: standalone)')
    const { container } = render(<HomeScreenHint />)
    expect(container.innerHTML).toBe('')
  })

  it('is left out on an iPhone opened from the home screen', () => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true })
    const { container } = render(<HomeScreenHint />)
    expect(container.innerHTML).toBe('')
  })
})
