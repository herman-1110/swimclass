import type { TZDate } from '@date-fns/tz'
import { useEffect, useState } from 'react'

import { env } from '@/shared/config/env'
import { nowMyt } from '@/shared/lib/time'

/** How often "now" moves on by default: a row flips from Cancel to Locked within 30 s. */
const DEFAULT_INTERVAL_MS = 30_000

/**
 * The current moment in Malaysia time, for display only (`nowMyt()`), kept fresh while the
 * page stays open: it moves on every `intervalMs` and when the tab comes back into view,
 * so an upcoming lesson turns Locked at its cutoff and "Today" moves on at midnight without
 * a reload (my-classes spec §4.2). The value only changes on those ticks, so it is safe to
 * pass down and to use in query `select`s.
 *
 * In demo mode `nowMyt()` is always DEMO_NOW, so no timer is set.
 */
export function useNow(intervalMs: number = DEFAULT_INTERVAL_MS): TZDate {
  const [now, setNow] = useState(nowMyt)

  useEffect(() => {
    // The build-time constant first, so a production build drops this line (useNow.test.ts
    // switches env.demo off).
    if (import.meta.env.VITE_DEMO === 'true' && env.demo) return
    const tick = () => setNow(nowMyt())
    const timer = window.setInterval(tick, intervalMs)
    // Phones pause timers in the background; catch up as soon as the page shows again.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])

  return now
}
