import { useMutation } from '@tanstack/react-query'

import { resetDemoData } from '@/shared/api/backend'

/** "Reset demo data": forgets every change in this browser, signs out and reloads. */
export function DemoReset() {
  const reset = useMutation({ mutationFn: resetDemoData })

  return (
    <section
      aria-labelledby="demo-reset-title"
      className="flex flex-col items-start gap-2 border-t border-line pt-6"
    >
      <h3 id="demo-reset-title" className="sr-only">
        Reset
      </h3>
      <button
        type="button"
        aria-disabled={reset.isPending || undefined}
        onClick={() => {
          if (!reset.isPending) reset.mutate()
        }}
        className="inline-flex min-h-11 items-center rounded-control border border-field bg-white px-4 text-sm font-semibold text-ink hover:bg-subtle"
      >
        {reset.isPending ? 'Resetting…' : 'Reset demo data'}
      </button>
      <p className="text-small leading-normal text-muted">
        Puts the sample data back as it was, signs you out and reloads the page.
      </p>
      {reset.isError && (
        <p role="alert" className="text-label leading-normal text-warn">
          Couldn’t reset the demo data. Close the site’s other tabs and try again.
        </p>
      )}
    </section>
  )
}
