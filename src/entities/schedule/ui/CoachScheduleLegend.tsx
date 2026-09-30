import { Legend, type LegendItem } from '@/shared/ui/Legend'

// design/AdminSchedule.dc.html (the toolbar's right side).
const items: readonly LegendItem[] = [
  { label: 'Lesson', tone: 'accent' },
  { label: 'Travel gap', tone: 'travel' },
  { label: 'Closed', tone: 'closed' },
]

/**
 * The key to CoachWeekGrid's colours: Lesson, Travel gap, Closed (18 px gaps). From 768 px
 * only, like the grid; the phone's day view names its blocks in words.
 */
export function CoachScheduleLegend() {
  return <Legend items={items} spacing="wide" hideOnPhones />
}
