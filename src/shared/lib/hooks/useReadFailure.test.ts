import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type RetryableRead, useReadFailure } from './useReadFailure'

afterEach(cleanup)

/** A read as TanStack Query reports it. */
function read(state: Partial<RetryableRead> = {}): RetryableRead {
  return {
    data: undefined,
    error: null,
    isError: false,
    isFetching: false,
    errorUpdatedAt: 0,
    refetch: vi.fn(() => Promise.resolve()),
    ...state,
  }
}

const offline = new Error('offline')
const failed = (at = 1000, error: unknown = offline) =>
  read({ isError: true, error, errorUpdatedAt: at })
// What TanStack reports while a read with no data runs again: pending, its error forgotten.
const readingAgain = (at = 1000) => read({ isFetching: true, errorUpdatedAt: at })
const answered = () => read({ data: ['a row'], errorUpdatedAt: 1000 })

function renderReads(reads: RetryableRead[], focusAfter: () => HTMLElement | null = () => null) {
  return renderHook(
    (props: { reads: RetryableRead[] }) => useReadFailure(props.reads, focusAfter),
    {
      initialProps: { reads },
    },
  )
}

describe('useReadFailure', () => {
  it('is null while nothing has failed', () => {
    const { result } = renderReads([read({ isFetching: true }), answered()])
    expect(result.current).toBeNull()
  })

  it('keeps the error, busy, while the failed read runs again, until it answers', () => {
    const { result, rerender } = renderReads([failed()])
    expect(result.current).toMatchObject({ error: offline, failedAt: 1000, retrying: false })

    rerender({ reads: [readingAgain()] })
    expect(result.current).toMatchObject({ error: offline, failedAt: 1000, retrying: true })

    // Failing again is a new failure, even with the same words.
    const stillOffline = new Error('offline')
    rerender({ reads: [failed(2000, stillOffline)] })
    expect(result.current).toMatchObject({ error: stillOffline, failedAt: 2000, retrying: false })

    rerender({ reads: [answered()] })
    expect(result.current).toBeNull()
  })

  it('never shows another read’s failure in its place', () => {
    const { result, rerender } = renderReads([failed(1000)])
    // Another week: read for the first time, or failed earlier and now read again.
    rerender({ reads: [read({ isFetching: true })] })
    expect(result.current).toBeNull()
    rerender({ reads: [readingAgain(500)] })
    expect(result.current).toBeNull()
  })

  it('reports the first failure and reads only the failed reads again', () => {
    const settings = answered()
    const groups = failed(1000, new Error('groups'))
    const lessons = failed(1001, new Error('lessons'))
    const { result } = renderReads([settings, groups, lessons])
    expect(result.current?.error).toEqual(new Error('groups'))

    act(() => result.current?.retry())
    expect(settings.refetch).not.toHaveBeenCalled()
    expect(groups.refetch).toHaveBeenCalledOnce()
    expect(lessons.refetch).toHaveBeenCalledOnce()
  })

  it('moves focus on when "Try again" brought the reads back and focus went with it', () => {
    const heading = document.createElement('h2')
    heading.tabIndex = -1
    document.body.append(heading)
    const { result, rerender } = renderReads([failed()], () => heading)

    act(() => result.current?.retry())
    rerender({ reads: [readingAgain()] })
    // The button went with the error: nothing has focus.
    expect(document.activeElement).toBe(document.body)
    rerender({ reads: [answered()] })
    expect(document.activeElement).toBe(heading)
    heading.remove()
  })

  it('leaves focus alone if it moved on, or if the reads came back without "Try again"', () => {
    const heading = document.createElement('h2')
    heading.tabIndex = -1
    const next = document.createElement('button')
    document.body.append(heading, next)

    const tried = renderReads([failed()], () => heading)
    act(() => tried.result.current?.retry())
    next.focus()
    tried.rerender({ reads: [answered()] })
    expect(document.activeElement).toBe(next)

    next.blur()
    const untried = renderReads([failed()], () => heading)
    untried.rerender({ reads: [answered()] })
    expect(document.activeElement).toBe(document.body)
    heading.remove()
    next.remove()
  })
})
