import type { ReactNode } from 'react'

import { PageHeader } from '@/shared/ui/PageHeader'

type SettingsHeaderProps = {
  /** "Save changes", at the top right from 768 px (hidden on phones: the Save bar has it). */
  action: ReactNode
  /** The line under the header after a refused save (from 768 px). */
  status?: ReactNode
}

/**
 * The page's title block (design/AdminSettings.dc.html:100-106): the h1, the subtitle and
 * "Save changes" aligned to the top. As wide as the sections, so Save stays above their
 * right edge on wide screens (coach-settings C14, proposed).
 */
export function SettingsHeader({ action, status }: SettingsHeaderProps) {
  return (
    <div className="flex flex-col gap-2 md:max-w-[760px] xl:max-w-[1140px]">
      <PageHeader
        size="coach"
        align="start"
        title="Settings"
        description="The rules the booking system follows. Changes apply to new bookings."
        actions={action}
      />
      {status}
    </div>
  )
}
