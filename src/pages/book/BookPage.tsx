import type { ReactNode } from 'react'

import { useMyProfile, useUserId } from '@/entities/account'
import { CoachBanner, useLatestAnnouncement } from '@/entities/announcement'
import { useAccountBalances } from '@/entities/balance'
import { useMyGroups } from '@/entities/group'
import { DocumentTitle, usePublicSettings } from '@/entities/settings'
import { NO_GROUPS_MESSAGE } from '@/shared/config/messages'
import { EmptyState } from '@/shared/ui/EmptyState'
import { PageHeader } from '@/shared/ui/PageHeader'

import { BookScreen } from './ui/BookScreen'
import { BookSkeleton } from './ui/BookSkeleton'
import { RetryMessage } from './ui/RetryMessage'

const TITLE = 'Book a lesson'

/**
 * Book a lesson (DESIGN §4; design/Main.dc.html, MainDesktop.dc.html; book spec): the
 * customer's main screen, which the coach can look at too. The heading shows at once; the
 * rest waits for the settings, the account's groups and their balances. An account with no
 * active group (the coach, a new customer) sees DESIGN §6's empty state, and reads no start
 * times.
 */
export function BookPage() {
  const userId = useUserId()
  const profile = useMyProfile()
  const settings = usePublicSettings()
  const groups = useMyGroups(userId)
  const balances = useAccountBalances(userId)
  const announcement = useLatestAnnouncement()
  const name = profile.data?.display_name
  const reads = [settings, groups, balances]
  const failed = reads.find((read) => read.isError)

  let body: ReactNode
  if (groups.data && !groups.data.some((group) => group.active)) {
    body = <EmptyState>{NO_GROUPS_MESSAGE}</EmptyState>
  } else if (failed) {
    const retry = () => {
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
    // From 1024 px the screen stops at 1100 px, left-aligned (Main@1440).
    <div className="-mb-5 flex flex-1 flex-col gap-6 md:mb-0 md:gap-7 md:pb-2 lg:max-w-[1100px] lg:pb-0">
      <DocumentTitle page={TITLE} />
      <PageHeader size="customer" title={TITLE} eyebrow={name ? `Hi, ${name}` : ' '} />
      {announcement.data && <CoachBanner message={announcement.data.message} />}
      {body}
    </div>
  )
}
