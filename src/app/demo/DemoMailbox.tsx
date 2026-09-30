import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { demoMailbox } from '@/shared/api/backend'

import { sentAtText } from './demoClock'
import { demoKeys } from './demoKeys'

/**
 * The emails the site would have sent so far (the outbox the Gmail mailer empties in
 * production), newest first. Each opens to show its text.
 */
export function DemoMailbox() {
  // Read again each time the panel opens: the last booking may have queued more.
  const mail = useQuery({
    queryKey: demoKeys.mailbox(),
    queryFn: () => demoMailbox(),
    refetchOnMount: 'always',
  })
  const [openId, setOpenId] = useState<number | null>(null)

  return (
    <section aria-labelledby="demo-mailbox-title" className="flex flex-col gap-3">
      <h3 id="demo-mailbox-title" className="text-label font-medium text-muted">
        Sent emails
      </h3>
      {mail.isPending && (
        <p role="status" className="text-sm text-muted">
          Loading…
        </p>
      )}
      {mail.isError && (
        <p role="alert" className="text-sm text-warn">
          Couldn’t read the sent emails. Reload the page and try again.
        </p>
      )}
      {mail.data?.length === 0 && <p className="text-sm text-muted">No emails sent yet.</p>}
      {mail.data && mail.data.length > 0 && (
        <ul role="list" className="flex flex-col border-t border-line">
          {mail.data.map((email) => {
            const open = openId === email.id
            const bodyId = `demo-email-${email.id}`
            return (
              <li key={email.id} className="border-b border-line">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={bodyId}
                  onClick={() => setOpenId(open ? null : email.id)}
                  className="flex min-h-11 w-full flex-col gap-1 py-2.5 text-left"
                >
                  <span className="flex w-full justify-between gap-3 text-small text-muted">
                    <span className="min-w-0 truncate">To {email.to}</span>{' '}
                    <span className="shrink-0">{sentAtText(email.createdAt)}</span>
                  </span>{' '}
                  <span className="text-sm leading-[normal] font-medium text-ink">
                    {email.subject}
                  </span>
                </button>
                {open && (
                  <p
                    id={bodyId}
                    className="pb-3 text-label leading-normal break-words whitespace-pre-wrap text-ink"
                  >
                    {email.text}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
