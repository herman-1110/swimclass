import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router'

import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'

type LeaveWithoutSavingDialogProps = {
  /** There are unsaved changes, or a save is running. */
  when: boolean
}

/**
 * The unsaved-changes guard (prompt 10 TASK 1: "warn when leaving with unsaved changes";
 * coach-settings §7.4, words proposed). Leaving the page in the app (the sidebar, the tab
 * bar, "View as customer", Log out, the browser's Back) waits for the coach: "Keep editing"
 * stays, "Leave without saving" goes on and drops the changes. Reloading or closing the tab
 * gets the browser's own question.
 */
export function LeaveWithoutSavingDialog({ when }: LeaveWithoutSavingDialogProps) {
  const keepEditing = useRef<HTMLButtonElement>(null)
  // A link to a section of this page (#packages) isn't leaving.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!when) return
    const ask = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', ask)
    return () => window.removeEventListener('beforeunload', ask)
  }, [when])

  const stay = () => blocker.reset?.()
  return (
    <Dialog
      open={blocker.state === 'blocked'}
      onClose={stay}
      role="alertdialog"
      title="Leave without saving?"
      description="You have changes that aren’t saved."
      size="sm"
      hideClose
      initialFocus={keepEditing}
      actions={
        <>
          <Button ref={keepEditing} className="max-md:flex-1" onClick={stay}>
            Keep editing
          </Button>
          <Button variant="quiet" tone="muted" onClick={() => blocker.proceed?.()}>
            Leave without saving
          </Button>
        </>
      }
    />
  )
}
