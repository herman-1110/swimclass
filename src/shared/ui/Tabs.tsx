import { type KeyboardEvent, useLayoutEffect, useRef } from 'react'

import { cn } from '@/shared/lib/cn'

export type TabsItem = {
  value: string
  /** "Unpaid" */
  label: string
  /** Shown after the label: "Unpaid 2". */
  count?: number
}

type TabsProps = {
  /** Names the group for screen readers ("Filter packages"). */
  label: string
  items: readonly TabsItem[]
  /** The chosen item's value. */
  value: string
  onChange: (value: string) => void
  /** A 12 px note at the right end, from 768 px ("One row per package · needs action first"). */
  note?: string
}

/** A tab's words: "Unpaid 2", or "Unpaid" while the count isn't known. */
function tabText(item: TabsItem): string {
  return item.count === undefined ? item.label : `${item.label} ${item.count}`
}

/** Where an arrow key, Home or End moves from the focused tab (wrapping round), or null for
 *  other keys. */
function moveTo(key: string, index: number, count: number): number | null {
  const from = Math.max(index, 0)
  if (key === 'ArrowRight') return (from + 1) % count
  if (key === 'ArrowLeft') return (from - 1 + count) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}

/**
 * Filter tabs over one list (design/AdminStudents.dc.html): 44 px buttons with a 2 px accent
 * underline on the chosen one, over a --line rule, 20 px apart (24 px from 768 px); they
 * scroll sideways when they don't fit. They filter one table, so they are aria-pressed
 * buttons in a named group (no tab panels), each a Tab stop as drawn (coach-students §7). The
 * arrow keys, Home and End also move along them and choose.
 */
export function Tabs({ label, items, value, onChange, note }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null)
  // The words on the tabs: when the counts come in the tabs widen, which can push the chosen
  // one out of view again (a page opened on its last tab).
  const words = items.map(tabText).join('\n')

  // On a phone, scroll the row sideways so the chosen tab is in view (never the page).
  useLayoutEffect(() => {
    const list = listRef.current
    const tab = list?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!list || !tab) return
    const start = tab.offsetLeft
    const end = start + tab.offsetWidth
    if (start < list.scrollLeft) list.scrollLeft = start
    else if (end > list.scrollLeft + list.clientWidth) list.scrollLeft = end - list.clientWidth
  }, [value, words])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // From the focused tab: Tab can reach any of them, not only the chosen one.
    const buttons = [...(listRef.current?.querySelectorAll<HTMLElement>('button') ?? [])]
    const focused = buttons.findIndex((button) => button === event.target)
    const next = moveTo(event.key, focused, items.length)
    const item = next === null ? undefined : items.at(next)
    if (next === null || !item) return
    event.preventDefault()
    onChange(item.value)
    buttons.at(next)?.focus()
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line">
      {/* -1 px at the bottom: the chosen underline covers the rule below the row. */}
      <div
        ref={listRef}
        role="group"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="relative -mb-px flex min-w-0 gap-5 overflow-x-auto md:gap-6"
      >
        {items.map((item) => {
          const on = item.value === value
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(item.value)}
              className={cn(
                'h-11 shrink-0 cursor-pointer border-b-2 px-0.5 text-sm whitespace-nowrap focus-visible:outline-offset-[-2px]',
                on
                  ? 'border-accent font-semibold text-ink'
                  : 'border-transparent font-medium text-muted',
              )}
            >
              {tabText(item)}
            </button>
          )
        })}
      </div>
      {/* flex-1: the note takes only the room the tabs leave and wraps in it, so the tabs
          scroll only when they alone don't fit (coach-students C8). */}
      {note && (
        <span className="hidden flex-1 text-right text-small text-muted md:block">{note}</span>
      )}
    </div>
  )
}
