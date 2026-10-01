import { cn } from '@/shared/lib/cn'

import type { SummaryState } from '../model/summary'

type SummaryTextProps = {
  state: Pick<SummaryState, 'title' | 'useLine' | 'useTone'>
}

// design/Main.dc.html:150-153: the title 16 px 600 over a 13 px / 1.45 line, muted or, for a
// clash, the credit limit or a refusal, warn. The caller puts both in one live region.
/** The summary's title and the line under it. */
export function SummaryText({ state }: SummaryTextProps) {
  return (
    <>
      <p className="text-base leading-[normal] font-semibold">{state.title}</p>
      <p
        className={cn(
          'text-label leading-[1.45]',
          state.useTone === 'warn' ? 'text-warn' : 'text-muted',
        )}
      >
        {state.useLine}
      </p>
    </>
  )
}
