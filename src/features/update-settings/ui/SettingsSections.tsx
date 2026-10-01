import type { ReactNode } from 'react'

import { SETTINGS_FORM_ID } from '../model/fields'
import { BookingRulesSection } from './BookingRulesSection'
import { useSettingsForm } from './formContext'
import { OpenHoursSection } from './OpenHoursSection'
import { PackagesSection } from './PackagesSection'
import { RemindersSection } from './RemindersSection'

type SettingsSectionsProps = {
  /** What the page places after the four sections, in the same grid (the email log). */
  children?: ReactNode
}

/**
 * The Settings form (design/AdminSettings.dc.html `.sections`): the four sections in one
 * column up to 760 px, two columns from 1280 px filled row by row, each section as tall as
 * its own content. Wide screens stop at 1140 px, the 1440 px drawing's width
 * (coach-settings C15, proposed). The Save buttons sit outside it and submit it by its id;
 * Enter in a box does the same. Renders nothing until the settings and hours are in.
 */
export function SettingsSections({ children }: SettingsSectionsProps) {
  const form = useSettingsForm()
  if (!form.ready) return null
  return (
    <form
      id={SETTINGS_FORM_ID}
      // The database judges the values; the browser's own checks would only get in the way.
      noValidate
      aria-busy={form.saving || undefined}
      onSubmit={(event) => {
        event.preventDefault()
        form.save()
      }}
      className="grid grid-cols-1 items-start gap-y-8 md:max-w-[760px] xl:max-w-[1140px] xl:grid-cols-2 xl:gap-x-12 xl:gap-y-7"
    >
      <OpenHoursSection form={form} />
      <BookingRulesSection form={form} />
      <PackagesSection form={form} />
      <RemindersSection form={form} />
      {children}
    </form>
  )
}
