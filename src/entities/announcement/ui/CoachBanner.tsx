import { useWords } from '@/shared/i18n/context'
import { Banner } from '@/shared/ui/Banner'

import { announcementWords } from '../model/words'

type CoachBannerProps = {
  /** The coach's pinned message, as posted (`useLatestAnnouncement().data.message`). */
  message: string
  /** Layout only: margins or grid placement (My classes puts it 24 px under its h1). */
  className?: string
}

/**
 * The coach's pinned message at the top of Book, Schedule and My classes
 * (design/Main.dc.html:69): a --subtle box, 13 px / 1.5, "Coach:" in 600, then the message
 * with the line breaks the coach typed. Render it only when there is a message.
 */
export function CoachBanner({ message, className }: CoachBannerProps) {
  const w = useWords(announcementWords)
  return (
    <Banner label={w.coach} className={className}>
      <span className="whitespace-pre-line">{message}</span>
    </Banner>
  )
}
