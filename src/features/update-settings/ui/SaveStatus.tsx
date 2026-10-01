import { cn } from '@/shared/lib/cn'

import { useSettingsForm } from './formContext'

type SaveStatusProps = {
  /** header: under the page header, from 768 px. bar: in the Save bar, above the button (phones). */
  placement: 'header' | 'bar'
}

/**
 * Why the last save didn't go through, near Save (coach-settings §6.8): one line, read out
 * when it appears (role="alert"). It stays until the next save. Only one placement shows at
 * a time; the other is hidden at that width.
 */
export function SaveStatus({ placement }: SaveStatusProps) {
  const { summary } = useSettingsForm()
  if (!summary) return null
  return (
    <p
      role="alert"
      className={cn(
        'text-label leading-[1.45] text-warn',
        placement === 'header' ? 'max-md:hidden' : 'mb-2 md:hidden',
      )}
    >
      {summary}
    </p>
  )
}
