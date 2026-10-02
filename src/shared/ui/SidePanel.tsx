import { type ReactNode, type Ref, type RefObject, useId, useRef } from 'react'

import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery'
import { useModalDialog } from '@/shared/lib/hooks/useModalDialog'

type SidePanelProps = {
  /** The h2 ("Record payment"). */
  title: string
  /** 13 px muted line under it ("Hana · Farah’s account"). */
  subtitle?: string
  /** Below 1280 px (or always with alwaysModal) the panel shows only while open. From 1280 px
   *  it is always there as a column. */
  open: boolean
  /** Esc and Close (the modal panel only); the page's own Cancel calls it too. */
  onClose: () => void
  children: ReactNode
  /** Where focus starts when it opens as a modal. Default: the title. */
  initialFocus?: RefObject<HTMLElement | null>
  /** A drawer at every width, over the 1280 px column (the History drawer). */
  alwaysModal?: boolean
  /** The title element, so the page can move focus to the column (it has tabIndex -1). */
  titleRef?: Ref<HTMLHeadingElement>
}

/** Sets a ref the caller passed in, whichever kind it is. */
function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value)
  else if (ref) ref.current = value
}

/**
 * The Record payment panel (DESIGN §3, §5; design/AdminStudents.dc.html). From 1280 px a plain
 * 340 px column beside the content, with no Close. From 768 px to 1279 px a 380 px drawer from
 * the right edge, and under 768 px the full screen: both are modal (focus trapped, Esc and
 * Close shut it, focus goes back to the opener) with no scrim, as drawn. Render it last in a
 * row that starts `flex-col xl:flex-row`, so the column sits at the right.
 */
export function SidePanel({
  title,
  subtitle,
  open,
  onClose,
  children,
  initialFocus,
  alwaysModal = false,
  titleRef,
}: SidePanelProps) {
  // Behaviour CSS can't change: a modal below 1280 px, a plain column from 1280 px
  // (ARCHITECTURE §3.7).
  const wide = useMediaQuery('(min-width: 1280px)')
  const modal = alwaysModal || !wide
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const id = useId()
  const handlers = useModalDialog(dialogRef, {
    open: modal && open,
    onClose,
    initialFocus: initialFocus ?? headingRef,
  })

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2
          ref={(node) => {
            headingRef.current = node
            setRef(titleRef, node)
          }}
          id={`${id}-title`}
          tabIndex={-1}
          className="m-0 text-[1.125rem] font-semibold wrap-anywhere"
        >
          {title}
        </h2>
        {/* Names and locations of any length wrap (DESIGN §5). */}
        {subtitle && (
          <p id={`${id}-subtitle`} className="m-0 text-label text-muted wrap-anywhere">
            {subtitle}
          </p>
        )}
      </div>
      {modal && (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center px-1 text-sm font-semibold text-accent hover:text-accent-hover"
        >
          Close
        </button>
      )}
    </div>
  )
  const labels = {
    'aria-labelledby': `${id}-title`,
    'aria-describedby': subtitle ? `${id}-subtitle` : undefined,
  }

  if (!modal) {
    return (
      <aside {...labels} className="w-[340px] shrink-0 border-l border-line">
        {/* Stays in view while a long list beside it scrolls. */}
        <div className="sticky top-0 flex max-h-dvh flex-col gap-4.5 overflow-y-auto px-6 py-8">
          {header}
          {children}
        </div>
      </aside>
    )
  }
  if (!open) return null
  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      {...labels}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none flex-col gap-4.5 overflow-y-auto overscroll-contain bg-white px-5 pt-6 pb-[max(32px,env(safe-area-inset-bottom))] text-ink backdrop:bg-transparent open:flex md:left-auto md:w-[380px] md:border-l md:border-line md:px-6 md:py-8 md:shadow-[-8px_0_24px_rgba(20,33,43,0.08)] motion-safe:transition-[opacity,translate] motion-safe:duration-200 motion-safe:starting:open:opacity-0 md:motion-safe:starting:open:translate-x-8"
      {...handlers}
    >
      {header}
      {children}
    </dialog>
  )
}
