import { Banner } from '@/shared/ui/Banner'

import type { NoticeState } from './useNotice'

type ScheduleNoticeProps = {
  /** useNotice()'s state: the notice, its box's ref, and what happens when focus leaves it. */
  state: Pick<NoticeState, 'notice' | 'ref' | 'onBlur'>
}

/**
 * The notice under the toolbar after a change (the Schedule spec §3.9, proposed): the kit's
 * Banner in a status region that is always in the page, so a new notice is read out. While
 * there is none it takes no room (the margin cancels the column's 16 px gap).
 */
export function ScheduleNotice({ state: { notice, ref, onBlur } }: ScheduleNoticeProps) {
  return (
    <div role="status" className="empty:-mt-4">
      {notice && (
        <Banner key={notice.key} ref={ref} tabIndex={-1} onBlur={onBlur}>
          {notice.text}
        </Banner>
      )}
    </div>
  )
}
