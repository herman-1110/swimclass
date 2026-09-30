import { Legend, type LegendItem } from '@/shared/ui/Legend'

// design/Schedule.dc.html; DESIGN §4 lists the same order.
const items: readonly LegendItem[] = [
  { label: 'Free', tone: 'free' },
  { label: 'Booked', tone: 'booked-other' },
  { label: 'Travel', tone: 'travel' },
  { label: 'Yours', tone: 'accent' },
  { label: 'Closed', tone: 'closed' },
]

/** The key to CustomerWeekGrid's colours: Free, Booked, Travel, Yours, Closed (12 px gaps, wraps). */
export function CustomerScheduleLegend() {
  return <Legend items={items} />
}
