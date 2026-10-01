// Times of day as the coach types them in Settings (coach-settings §5.3, proposed rules):
// "8:00 pm", "8pm", "8:00 PM" or "20:00". A bare "8" or "800" is refused: am or pm?

const TWELVE_HOUR = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i
const TWENTY_FOUR_HOUR = /^(\d{1,2}):(\d{2})$/

function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * A typed time of day as "HH:MM", what update_settings is sent ("8:00 pm" → "20:00",
 * "12:00 am" → "00:00", "12 pm" → "12:00"), or null when it isn't one. "24:00" is refused:
 * the daily emails would never go (the database refuses it too).
 */
export function parseTimeOfDay(text: string): string | null {
  const value = text.trim()
  const twelve = TWELVE_HOUR.exec(value)
  if (twelve) {
    const [, hourText, minuteText = '0', half] = twelve
    const hour = Number(hourText)
    const minute = Number(minuteText)
    if (hour < 1 || hour > 12 || minute > 59) return null
    const hours = (hour % 12) + (half.toLowerCase() === 'pm' ? 12 : 0)
    return `${twoDigits(hours)}:${twoDigits(minute)}`
  }
  const twentyFour = TWENTY_FOUR_HOUR.exec(value)
  if (twentyFour) {
    const hours = Number(twentyFour[1])
    const minute = Number(twentyFour[2])
    if (hours > 23 || minute > 59) return null
    return `${twoDigits(hours)}:${twoDigits(minute)}`
  }
  return null
}

/**
 * A stored time of day ("17:30:00", Postgres' text) as the form keeps it: "17:30", with the
 * seconds only when they aren't zero ("17:30:30"). "24:00:00" → "24:00".
 */
export function shortTimeOfDay(time: string): string {
  return /^\d{2}:\d{2}:00$/.test(time) ? time.slice(0, 5) : time
}
