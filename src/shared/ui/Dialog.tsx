import { type ReactNode, type RefObject, useId, useLayoutEffect, useRef } from 'react'

import { useWords } from '@/shared/i18n/context'
import { cn } from '@/shared/lib/cn'
import { useModalDialog } from '@/shared/lib/hooks/useModalDialog'

import { uiWords } from './words'

// Card widths from 768 px (proposed: no dialog is drawn). Under 768 px it fills the screen.
const widths = {
  sm: 'md:max-w-[420px]', // confirmations and short forms
  md: 'md:max-w-[440px]', // ui-kit §3.25
  lg: 'md:max-w-[520px]', // long forms (Add booking)
}

// Kept between the sticky button row and a control scrolled up to it: the 2 px focus ring,
// its 2 px offset and 4 px of air (DESIGN §5).
const RING_ROOM_PX = 8

/**
 * While a dialog with a sticky button row is open, its scroll padding follows the row's height,
 * so a control reached with Tab scrolls clear of the row, focus ring and all (WCAG 2.2 2.4.11;
 * coach-schedule §2.7); and data-overflowing marks a dialog whose content scrolls, which draws
 * the row's top rule (coach-schedule §3.10). jsdom has no ResizeObserver.
 */
function useStickyActions(
  dialogRef: RefObject<HTMLDialogElement | null>,
  rowRef: RefObject<HTMLDivElement | null>,
  active: boolean,
) {
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const row = rowRef.current
    if (!active || !dialog || !row || typeof ResizeObserver !== 'function') return
    const update = () => {
      dialog.style.setProperty('scroll-padding-bottom', `${row.offsetHeight + RING_ROOM_PX}px`)
      dialog.toggleAttribute('data-overflowing', dialog.scrollHeight > dialog.clientHeight)
    }
    const resized = new ResizeObserver(update)
    resized.observe(dialog)
    resized.observe(row)
    // Content that grows or shrinks inside (an error, a list that arrives) changes what scrolls.
    const changed = new MutationObserver(update)
    changed.observe(dialog, { childList: true, subtree: true, characterData: true })
    return () => {
      resized.disconnect()
      changed.disconnect()
    }
  }, [dialogRef, rowRef, active])
}

type DialogProps = {
  /** Shown. The owner keeps this in state; Esc and Close call onClose. */
  open: boolean
  onClose: () => void
  /** The h2 that names the dialog ("Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia?"). */
  title: string
  /** 13 px muted line under the title ("Sat 3 Oct, 9:00–10:00 am"); describes the dialog. */
  subtitle?: string
  /** 14 px body text under the header; describes the dialog. */
  description?: ReactNode
  children?: ReactNode
  /** The button row at the end; on a long form it stays in view while the rest scrolls. */
  actions?: ReactNode
  /** alertdialog for confirmations of destructive actions. */
  role?: 'dialog' | 'alertdialog'
  /** Where focus starts: pass the safe action of a confirmation ("Keep lesson"). Default: the title. */
  initialFocus?: RefObject<HTMLElement | null>
  /** Width from 768 px: sm 420, md 440, lg 520 px. */
  size?: keyof typeof widths
  /** Leave out "Close" when the actions already have a way out ("Keep lesson", "Cancel"). */
  hideClose?: boolean
  /** A request is running ("Cancelling…"): aria-busy on the dialog, which also stops Esc and
   *  Close from closing it unless `dismissible` says otherwise. */
  busy?: boolean
  /** False: Esc, Close and the browser's back gesture do nothing. Default: not while busy. */
  dismissible?: boolean
}

/**
 * A modal dialog (DESIGN §3: white, radius 12, focus trapped, Esc closes; full screen on
 * phones). A native <dialog> shown with showModal(), so the page behind is inert, above the
 * tab bar. From 768 px it is a centred card over an ink scrim. Closing returns focus to the
 * control that opened it.
 */
export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  description,
  children,
  actions,
  role = 'dialog',
  initialFocus,
  size = 'md',
  hideClose = false,
  busy = false,
  dismissible = !busy,
}: DialogProps) {
  const w = useWords(uiWords)
  const ref = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const handlers = useModalDialog(ref, {
    open,
    onClose,
    dismissible,
    initialFocus: initialFocus ?? titleRef,
  })
  useStickyActions(ref, actionsRef, open && Boolean(actions))
  if (!open) return null

  const describedBy =
    [subtitle ? `${id}-subtitle` : null, description ? `${id}-description` : null]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <dialog
      ref={ref}
      role={role === 'alertdialog' ? 'alertdialog' : undefined}
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={describedBy}
      aria-busy={busy || undefined}
      className={cn(
        'group/dialog fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none flex-col gap-4.5 overflow-y-auto overscroll-contain bg-white px-5 pt-6 text-ink backdrop:bg-ink/40 open:flex',
        'md:m-auto md:h-fit md:max-h-[calc(100dvh_-_80px)] md:rounded-frame md:px-6 md:pt-6',
        widths[size],
        !actions && 'pb-[max(32px,env(safe-area-inset-bottom))] md:pb-6',
        // Opens with a 150 ms fade and scale (my-classes §7, coach-schedule §3.10).
        'motion-safe:transition-[opacity,scale] motion-safe:duration-150 motion-safe:starting:open:scale-95 motion-safe:starting:open:opacity-0',
      )}
      {...handlers}
    >
      {/* Close sits on the title's line; with a subtitle, at the top of the two lines, as
          the drawn Record payment panel has it. Names and words of any length wrap. */}
      <div className={cn('flex justify-between gap-3', subtitle ? 'items-start' : 'items-center')}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2
            ref={titleRef}
            id={`${id}-title`}
            tabIndex={-1}
            className="m-0 text-[1.125rem] font-semibold wrap-anywhere"
          >
            {title}
          </h2>
          {subtitle && (
            <p id={`${id}-subtitle`} className="m-0 text-label text-muted wrap-anywhere">
              {subtitle}
            </p>
          )}
        </div>
        {!hideClose && (
          <button
            type="button"
            aria-disabled={dismissible ? undefined : true}
            onClick={() => {
              if (dismissible) onClose()
            }}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center px-1 text-sm font-semibold text-accent hover:text-accent-hover aria-disabled:cursor-default aria-disabled:text-muted"
          >
            {w.close}
          </button>
        )}
      </div>
      {description && (
        <div id={`${id}-description`} className="text-sm leading-normal text-muted">
          {description}
        </div>
      )}
      {children}
      {actions && (
        // Sticky at the bottom, white, so a long form's buttons stay reachable; the negative
        // top margin keeps the drawn 18 px gap when it isn't stuck. While the content scrolls,
        // a --line rule on top shows where it goes under the buttons (coach-schedule §3.10).
        // On phones it keeps 16 px under the buttons, or the safe area when that is larger, as
        // the tab bar does (triage 13).
        <div
          ref={actionsRef}
          className="sticky bottom-0 -mx-5 -mt-3 flex items-center gap-2 border-t border-transparent bg-white px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] group-data-overflowing/dialog:border-line md:-mx-6 md:px-6 md:pb-6"
        >
          {actions}
        </div>
      )}
    </dialog>
  )
}
