import { useSession } from '@/entities/account'
import { CloseIcon } from '@/shared/ui/icons/CloseIcon'

import { DemoAccounts } from './DemoAccounts'
import { demoClockText } from './demoClock'
import { DemoMailbox } from './DemoMailbox'
import { DemoReset } from './DemoReset'

type DemoPanelProps = {
  /** The id its heading gets, which names the dialog. */
  titleId: string
  onClose: () => void
}

/** What the Demo button opens: what demo mode is, sign in as anyone, the sent emails, reset. */
export function DemoPanel({ titleId, onClose }: DemoPanelProps) {
  const session = useSession()

  return (
    <div className="flex w-full min-w-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line py-1 pr-2 pl-5">
        <h2 id={titleId} className="text-body font-semibold">
          Demo
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-control text-ink hover:bg-subtle"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-5 pt-4 pb-8">
        {session.status === 'loading' ? (
          <p role="status" className="text-label text-muted">
            Starting the demo…
          </p>
        ) : (
          <p className="text-label leading-normal text-muted">
            Demo mode · sample data · clock stopped at {demoClockText()}
          </p>
        )}
        <DemoAccounts onSignedIn={onClose} />
        <DemoMailbox />
        <DemoReset />
      </div>
    </div>
  )
}
