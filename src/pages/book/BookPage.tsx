import { type ReactNode, useId } from 'react'

import { useMyProfile, useUserId } from '@/entities/account'
import { CoachBanner, useLatestAnnouncement } from '@/entities/announcement'
import { useAccountBalances } from '@/entities/balance'
import { useMyGroups } from '@/entities/group'
import { DocumentTitle, usePublicSettings } from '@/entities/settings'
import { messagesIn } from '@/shared/config/messages'
import { useLanguage } from '@/shared/i18n/context'
import { wordsIn } from '@/shared/i18n/words'
import { EmptyState } from '@/shared/ui/EmptyState'
import { PageHeader } from '@/shared/ui/PageHeader'

import { bookPageWords } from './model/words'
import { BookScreen } from './ui/BookScreen'
import { BookSkeleton } from './ui/BookSkeleton'
import { RetryMessage } from './ui/RetryMessage'

/**
 * Book a lesson (DESIGN §4; design/Main.dc.html, MainDesktop.dc.html; book spec): the
 * customer's main screen, which the coach can look at too. The heading shows at once; the
 * rest waits for the settings, the account's groups and their balances. An account with no
 * active group (the coach, a new customer) sees DESIGN §6's empty state, and reads no start
 * times.
 */
export function BookPage() {
  const language = useLanguage()
  const w = wordsIn(bookPageWords, language)
  const titleId = useId()
  const userId = useUserId()
  const profile = useMyProfile()
  const settings = usePublicSettings()
  const groups = useMyGroups(userId)
  const balances = useAccountBalances(userId)
  const announcement = useLatestAnnouncement()
  const name = profile.data?.display_name
  const reads = [settings, groups, balances]
  // Only a read that never loaded fails the screen: a failed refresh (after a booking, or
  // on returning to the tab) keeps what is already shown.
  const failed = reads.find((read) => read.isLoadingError)

  let body: ReactNode
  if (groups.data && !groups.data.some((group) => group.active)) {
    // In a card, as it replaces whole sections (ui-kit §3.23), and as My classes shows it.
    const messages = messagesIn(language)
    const isCoach = profile.data?.role === 'coach'
    body = <EmptyState framed>{isCoach ? messages.noGroupsCoach : messages.noGroups}</EmptyState>
  } else if (failed) {
    const retry = () => {
      // "Try again" goes while the reads run again: focus waits on the page's title.
      document.getElementById(titleId)?.focus()
      for (const read of reads) if (read.isError) void read.refetch()
    }
    body = <RetryMessage error={failed.error} onRetry={retry} />
  } else if (!settings.data || !groups.data || !balances.data) {
    body = <BookSkeleton cutoffHours={settings.data?.cancel_cutoff_hours ?? null} />
  } else {
    body = <BookScreen settings={settings.data} groups={groups.data} balances={balances.data} />
  }

  return (
    // CustomerLayout pads <main> 20 px at the bottom on phones and 32 px from 768 px; the
    // drawing has 0 (the summary sits on the tab bar) and 40 px (book spec §2.6 item 4, C14).
    // From 1024 px the screen stops at 1100 px, in the middle of the space beside the
    // sidebar (Herman, 6 Oct 2026: on a wide laptop it left a blank strip on the right).
    <div className="-mb-5 flex w-full flex-1 flex-col gap-6 md:mb-0 md:gap-7 md:pb-2 lg:mx-auto lg:max-w-[1100px] lg:pb-0">
      <DocumentTitle page={w.title} />
      <PageHeader
        size="customer"
        title={w.title}
        eyebrow={name ? w.hi(name) : ' '}
        titleId={titleId}
        focusable
      />
      {announcement.data && <CoachBanner message={announcement.data.message} />}
      {body}
    </div>
  )
}
