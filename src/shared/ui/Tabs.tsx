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

/** Where an arrow key, Home or End moves the choice (wrapping round), or null for other keys. */
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
 * scroll sideways on a phone. They filter one table, so they are aria-pressed buttons in a
 * named group (no tab panels). One Tab stop: the arrow keys, Home and End choose.
 */
export function Tabs({ label, items, value, onChange, note }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // On a phone, scroll the row sideways so the chosen tab is in view (never the page).
  useLayoutEffect(() => {
    const list = listRef.current
    const tab = list?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!list || !tab) return
    const start = tab.offsetLeft
    const end = start + tab.offsetWidth
    if (start < list.scrollLeft) list.scrollLeft = start
    else if (end > list.scrollLeft + list.clientWidth) list.scrollLeft = end - list.clientWidth
  }, [value])

  const index = items.findIndex((item) => item.value === value)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = moveTo(event.key, index, items.length)
    const item = next === null ? undefined : items.at(next)
    if (next === null || !item) return
    event.preventDefault()
    onChange(item.value)
    listRef.current?.querySelectorAll<HTMLElement>('button').item(next).focus()
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
        {items.map((item, position) => {
          const on = item.value === value
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={on}
              // One Tab stop: the chosen tab (the first while none is chosen).
              tabIndex={on || (index < 0 && position === 0) ? 0 : -1}
              onClick={() => onChange(item.value)}
              className={cn(
                'h-11 shrink-0 cursor-pointer border-b-2 px-0.5 text-sm whitespace-nowrap focus-visible:outline-offset-[-2px]',
                on
                  ? 'border-accent font-semibold text-ink'
                  : 'border-transparent font-medium text-muted',
              )}
            >
              {item.count === undefined ? item.label : `${item.label} ${item.count}`}
            </button>
          )
        })}
      </div>
      {note && (
        <span className="hidden min-w-0 text-right text-small text-muted md:block">{note}</span>
      )}
    </div>
  )
}
