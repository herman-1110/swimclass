import type { ReactNode } from 'react'

import { SectionTitle } from '@/shared/ui/SectionTitle'

type SettingsSectionProps = {
  /** The section's id, for links to it ("packages" → /coach/settings#packages). */
  id: string
  /** The h2: "Booking rules". */
  title: string
  /** The 13 px line under it: "What customers can pick, and when they can change it." */
  note: string
  children: ReactNode
}

/**
 * One of the Settings sections (design/AdminSettings.dc.html, `.sec`): an h2 that names it,
 * its note, then its frame. Linked sections stop 24 px below the top (coach-settings §1).
 */
export function SettingsSection({ id, title, note, children }: SettingsSectionProps) {
  const titleId = `${id}-title`
  return (
    <section id={id} aria-labelledby={titleId} className="flex min-w-0 scroll-mt-6 flex-col">
      <SectionTitle id={titleId} note={note}>
        {title}
      </SectionTitle>
      {children}
    </section>
  )
}
