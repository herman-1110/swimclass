import { cn } from '@/shared/lib/cn'

import type { SummaryState } from '../model/summary'

type SummaryTextProps = {
  state: Pick<SummaryState, 'title' | 'useLine' | 'useTone'>
}

// design/Main.dc.html:150-153: the title 16 px 600 over a 13 px / 1.45 line, muted or, for a
// clash, the credit limit or a refusal, warn. The caller puts both in one live region. The
// line names the group, and a name can be one word of up to 100 characters (DESIGN §6
// invalid_name): both lines break inside words rather than run out of the card (book §6.6).
/** The summary's title and the line under it. */
export function SummaryText({ state }: SummaryTextProps) {
  return (
    <>
      <p className="text-base leading-[normal] font-semibold wrap-anywhere">{state.title}</p>
      <p
        className={cn(
          'text-label leading-[1.45] wrap-anywhere',
          state.useTone === 'warn' ? 'text-warn' : 'text-muted',
        )}
      >
        {state.useLine}
      </p>
    </>
  )
}
