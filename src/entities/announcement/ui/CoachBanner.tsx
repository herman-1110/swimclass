import { Banner } from '@/shared/ui/Banner'

type CoachBannerProps = {
  /** The coach's pinned message, as posted (`useLatestAnnouncement().data.message`). */
  message: string
}

/**
 * The coach's pinned message at the top of Book, Schedule and My classes
 * (design/Main.dc.html:69): a --subtle box, 13 px / 1.5, "Coach:" in 600, then the message
 * with the line breaks the coach typed. Render it only when there is a message.
 */
export function CoachBanner({ message }: CoachBannerProps) {
  return (
    <Banner label="Coach:">
      <span className="whitespace-pre-line">{message}</span>
    </Banner>
  )
}
