import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DEMO_NOW } from '@/shared/config/demo'
import { env } from '@/shared/config/env'

import { useNow } from './useNow'

const demo = env.demo

afterEach(() => {
  cleanup()
  env.demo = demo
  vi.useRealTimers()
})

/** The moment as UTC text, whatever kind of Date it is (TZDate prints its own offset). */
const utc = (date: Date) => new Date(date.getTime()).toISOString()

/** Moves the fake clock on, letting React re-render. */
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('useNow', () => {
  it('stands still at DEMO_NOW in demo mode, with no timer', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useNow())
    expect(result.current.getTime()).toBe(Date.parse(DEMO_NOW))
    expect(result.current.timeZone).toBe('Asia/Kuala_Lumpur')
    expect(vi.getTimerCount()).toBe(0)
    const first = result.current
    advance(120_000)
    expect(result.current).toBe(first)
  })

  it('moves on every interval outside demo mode', () => {
    env.demo = false
    vi.useFakeTimers({ now: new Date('2026-10-03T18:59:50Z') })
    const { result } = renderHook(() => useNow())
    expect(utc(result.current)).toBe('2026-10-03T18:59:50.000Z')
    advance(29_000)
    expect(utc(result.current)).toBe('2026-10-03T18:59:50.000Z')
    advance(1_000)
    expect(utc(result.current)).toBe('2026-10-03T19:00:20.000Z')
    // 3:00:20 am on Sun 4 Oct in Malaysia: a new MYT day, whatever the device's zone.
    expect(result.current.getDate()).toBe(4)
    expect(result.current.getHours()).toBe(3)
  })

  it('takes its own interval', () => {
    env.demo = false
    vi.useFakeTimers({ now: new Date('2026-10-03T00:00:00Z') })
    const { result } = renderHook(() => useNow(1_000))
    advance(1_000)
    expect(utc(result.current)).toBe('2026-10-03T00:00:01.000Z')
  })

  it('catches up when the page comes back into view', () => {
    env.demo = false
    vi.useFakeTimers({ now: new Date('2026-10-03T00:00:00Z') })
    const { result } = renderHook(() => useNow())
    vi.setSystemTime(new Date('2026-10-03T00:10:00Z'))
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(utc(result.current)).toBe('2026-10-03T00:10:00.000Z')
    visibility.mockRestore()
  })

  it('stops its timer when the component goes away', () => {
    env.demo = false
    vi.useFakeTimers()
    const { unmount } = renderHook(() => useNow())
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
