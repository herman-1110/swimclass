import { useWords } from '@/shared/i18n/context'
import { Legend } from '@/shared/ui/Legend'

import { scheduleWords } from '../model/words'

/** The key to CustomerWeekGrid's colours: Free, Booked, Travel, Yours, Closed (12 px gaps, wraps). */
export function CustomerScheduleLegend() {
  const w = useWords(scheduleWords)
  // design/Schedule.dc.html; DESIGN §4 lists the same order.
  return (
    <Legend
      items={[
        { label: w.legendFree, tone: 'free' },
        { label: w.legendBooked, tone: 'booked-other' },
        { label: w.legendTravel, tone: 'travel' },
        { label: w.legendYours, tone: 'accent' },
        { label: w.legendClosed, tone: 'closed' },
      ]}
    />
  )
}
