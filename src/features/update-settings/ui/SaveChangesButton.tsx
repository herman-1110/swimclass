import { Button } from '@/shared/ui/Button'

import { SETTINGS_FORM_ID } from '../model/fields'
import { useSettingsForm } from './formContext'

type SaveChangesButtonProps = {
  /**
   * header: 44 px, at the top right from 768 px and hidden on phones. bar: the Save bar's
   * full-width 48 px button (phones).
   */
  placement: 'header' | 'bar'
}

/**
 * "Save changes" (prompt 10 TASK 1): disabled until something changes, "Saving…" while it
 * saves, then "Settings saved" until the next change (coach-settings §6). It stays in the
 * tab order when it can't be used (aria-disabled), so focus never drops to the page after
 * a save. Outside a ready form (while the settings load) it shows the disabled look.
 */
export function SaveChangesButton({ placement }: SaveChangesButtonProps) {
  const form = useSettingsForm()
  const label = form.saving ? 'Saving…' : form.saved ? 'Settings saved' : 'Save changes'
  return (
    <Button
      type="submit"
      form={SETTINGS_FORM_ID}
      size={placement === 'header' ? 'sm' : 'lg'}
      block={placement === 'bar'}
      // max-md:hidden, not hidden md:inline-flex: a plain `hidden` loses to the button's own
      // inline-flex.
      className={placement === 'header' ? 'max-md:hidden' : undefined}
      pending={form.saving}
      aria-disabled={!form.dirty || form.saving || undefined}
    >
      {label}
    </Button>
  )
}
