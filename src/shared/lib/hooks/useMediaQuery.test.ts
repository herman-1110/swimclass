import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useMediaQuery } from './useMediaQuery'

afterEach(() => vi.unstubAllGlobals())

describe('useMediaQuery', () => {
  it('is false where the browser has no matchMedia (jsdom)', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1280px)'))
    expect(result.current).toBe(false)
  })

  it('follows the query as the window changes', () => {
    let matches = true
    const listeners = new Set<() => void>()
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return matches
      },
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    }))
    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 1280px)'))
    expect(result.current).toBe(true)
    matches = false
    act(() => listeners.forEach((listener) => listener()))
    expect(result.current).toBe(false)
    unmount()
    expect(listeners.size).toBe(0)
  })
})
