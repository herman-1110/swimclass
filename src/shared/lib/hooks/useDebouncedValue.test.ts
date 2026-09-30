import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useDebouncedValue } from './useDebouncedValue'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useDebouncedValue', () => {
  it('keeps the old value until the new one has stayed for the delay', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 400), {
      initialProps: { value: 'mei' },
    })
    expect(result.current).toBe('mei')

    rerender({ value: 'meil' })
    act(() => {
      vi.advanceTimersByTime(399)
    })
    expect(result.current).toBe('mei')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('meil')
  })

  it('starts the wait again on every change', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 400), {
      initialProps: { value: 'm' },
    })
    rerender({ value: 'me' })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    rerender({ value: 'mei' })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('m')

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe('mei')
  })
})
