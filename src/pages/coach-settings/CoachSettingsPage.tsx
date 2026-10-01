import { useEffect } from 'react'
import { useLocation } from 'react-router'

import { useWeeklyHours } from '@/entities/open-hours'
import { DocumentTitle, useCoachSettings } from '@/entities/settings'
import {
  SaveBar,
  SaveChangesButton,
  SaveStatus,
  SettingsFormProvider,
  SettingsSections,
} from '@/features/update-settings'

import { SettingsHeader } from './ui/SettingsHeader'
import { SettingsLoadError } from './ui/SettingsLoadError'
import { SettingsSkeleton } from './ui/SettingsSkeleton'

/**
 * Settings (prompt 10; design/AdminSettings.dc.html and AdminSettingsPhone.dc.html): the
 * open hours and every rule the booking system follows, saved together with "Save
 * changes". The coach only (RequireCoach); the database refuses anyone else too.
 */
export function CoachSettingsPage() {
  const settings = useCoachSettings()
  const hours = useWeeklyHours()
  const { hash } = useLocation()
  const ready = settings.data !== undefined && hours.data !== undefined
  // A read that failed and isn't being tried again ("Try again" shows the skeleton meanwhile).
  const failed = [settings, hours].find(
    (query) => query.data === undefined && query.isError && !query.isFetching,
  )

  // A link to a section (/coach/settings#packages; coach-settings §1, proposed) lands on it
  // once the sections are in: the browser looked for it before they were.
  useEffect(() => {
    if (ready && hash) document.getElementById(hash.slice(1))?.scrollIntoView?.()
  }, [ready, hash])

  return (
    <SettingsFormProvider settings={settings.data} weeklyHours={hours.data}>
      {/* Padded as drawn (`.set`): 24 20 0 on phones, so the Save bar meets the tab bar; 32
          from 768 px; 32 40 24 from 1024 px. */}
      <div className="flex flex-1 flex-col gap-6 px-5 pt-6 md:gap-7 md:p-8 lg:px-10 lg:pb-6">
        <DocumentTitle page="Settings" />
        <SettingsHeader
          action={<SaveChangesButton placement="header" />}
          status={<SaveStatus placement="header" />}
        />
        {ready ? (
          <SettingsSections />
        ) : failed ? (
          <SettingsLoadError
            error={failed.error}
            onRetry={() => {
              void settings.refetch()
              void hours.refetch()
            }}
          />
        ) : (
          <SettingsSkeleton />
        )}
        {(ready || !failed) && <SaveBar />}
      </div>
    </SettingsFormProvider>
  )
}
