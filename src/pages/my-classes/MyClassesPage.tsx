import { useState } from 'react'

import { useAccountStudents, useMyProfile, useUserId } from '@/entities/account'
import { useLatestAnnouncement } from '@/entities/announcement'
import { useAccountBalances } from '@/entities/balance'
import { useUpcomingLessons } from '@/entities/booking'
import { useMyGroups } from '@/entities/group'
import { DocumentTitle, usePublicSettings } from '@/entities/settings'
import { noGroupsMessage } from '@/shared/config/messages'
import { useNow } from '@/shared/lib/hooks/useNow'
import { EmptyState } from '@/shared/ui/EmptyState'

import { MyClassesHeader } from './ui/MyClassesHeader'
import { PackagesSection } from './ui/PackagesSection'
import { PastSection } from './ui/PastSection'
import { UpcomingSection } from './ui/UpcomingSection'

/**
 * A customer's lessons and packages (design/MyClasses.dc.html, MyClassesDesktop; my-classes
 * spec): upcoming lessons with Cancel, each active group's package, and past lessons and
 * payments on request. Every read is filtered by the signed-in account: RLS would show the
 * coach everyone's, and his "View as customer" must find none of his own.
 */
export function MyClassesPage() {
  const me = useUserId()
  const now = useNow()
  const profile = useMyProfile()
  const settings = usePublicSettings()
  const groups = useMyGroups(me)
  const students = useAccountStudents(me, { order: 'name' })
  const balances = useAccountBalances(me)
  const announcement = useLatestAnnouncement()
  const upcoming = useUpcomingLessons(groups.data?.map((group) => group.group_id) ?? null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pastOpen, setPastOpen] = useState(false)

  // Paused groups have no package to show: with none active, Packages goes (my-classes §6).
  const anyActive = groups.data?.some((group) => group.active) ?? true

  return (
    // Stops at 1100 px, in the middle of the space beside the sidebar (DESIGN §5).
    <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-y-8 md:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] md:grid-rows-[auto_auto_1fr] md:items-start md:gap-x-12">
      <DocumentTitle page="My classes" />
      <MyClassesHeader
        className="md:col-span-2"
        // A failed read leaves its part out rather than loading for ever.
        displayName={profile.isPending ? undefined : (profile.data?.display_name ?? null)}
        groups={groups.isError ? [] : groups.data}
        students={students.isError ? [] : students.data}
        announcement={announcement.data?.message ?? null}
      />
      {groups.data?.length === 0 ? (
        // No groups (the coach's "View as customer" too): nothing to list, and no Past.
        <div className="md:col-span-2">
          <EmptyState framed>{noGroupsMessage(profile.data?.role === 'coach')}</EmptyState>
        </div>
      ) : (
        <>
          <UpcomingSection
            className="md:col-start-1 md:row-start-2"
            upcoming={upcoming}
            groups={groups}
            balances={balances}
            settings={settings}
            now={now}
            notice={notice}
            onCancelled={setNotice}
          />
          {anyActive && (
            <PackagesSection
              className="md:col-start-2 md:row-start-2 md:row-span-2"
              groups={groups}
              balances={balances}
              settings={settings}
              now={now}
            />
          )}
          {groups.data && (
            <PastSection
              className="md:col-start-1 md:row-start-3"
              groups={groups.data}
              settings={settings}
              me={me}
              now={now}
              open={pastOpen}
              onToggle={() => setPastOpen((open) => !open)}
            />
          )}
        </>
      )}
    </div>
  )
}
