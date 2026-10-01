import { type RefObject, useEffect, useRef, useState } from 'react'

/** How long a notice stays (the Schedule spec §3.9). */
const NOTICE_MS = 8000

export type Notice = {
  text: string
  /** A new one each time, so the same words twice are read out twice. */
  key: number
  /** Move focus to it: what the coach acted on is gone (a cancelled lesson, a removed row). */
  focus: boolean
}

export type NoticeState = {
  notice: Notice | null
  /** The notice's box, for focus. */
  ref: RefObject<HTMLDivElement | null>
  show: (text: string, options?: { focus?: boolean }) => void
  clear: () => void
  /** Focus left the notice: one that has had its time goes now. */
  onBlur: () => void
}

/**
 * The one-line notice after a change ("Lesson cancelled. Mei Ling will get an email.", the
 * Schedule spec §3.9): a new one replaces the last, the next action clears it, and it goes
 * after 8 s, but never from under focus.
 */
export function useNotice(): NoticeState {
  const [notice, setNotice] = useState<Notice | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const count = useRef(0)
  const expired = useRef(false)

  useEffect(() => {
    if (!notice) return
    expired.current = false
    // After the dialogs that closed with this change have handed focus back.
    if (notice.focus) ref.current?.focus()
    const timer = window.setTimeout(() => {
      if (ref.current?.contains(document.activeElement)) expired.current = true
      else setNotice(null)
    }, NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [notice])

  return {
    notice,
    ref,
    show: (text, options) => {
      count.current += 1
      setNotice({ text, key: count.current, focus: options?.focus ?? false })
    },
    clear: () => setNotice(null),
    onBlur: () => {
      if (expired.current) setNotice(null)
    },
  }
}
