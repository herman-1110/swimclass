import type { ReactNode } from 'react'

type LessonRowLayoutProps = {
  /** li (default) inside the page's <ul role="list">, or div. */
  as?: 'li' | 'div'
  /** "Today, 5:00–6:00 pm" (15 px, 600). */
  when: string
  /** "Aiman & Sofia · 1-to-2 · lesson 2 of 4" (13 px ink). */
  detail: string
  /** "Palm Court" (13 px muted). */
  location: string
  /** On the right, centred on the three lines: a button, "Locked", "Done". */
  aside?: ReactNode
  /** The 12 px line under the row. */
  note?: string | null
  noteId?: string
}

/**
 * My classes' lesson row (MyClasses.dc.html:58-68; ui-kit §3.33): three lines, something on
 * the right, a note under them, and a divider under every row. Long names and locations wrap.
 */
export function LessonRowLayout({
  as: Element = 'li',
  when,
  detail,
  location,
  aside,
  note,
  noteId,
}: LessonRowLayoutProps) {
  return (
    <Element className="flex flex-col gap-1.5 border-b border-line py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5 break-words">
          <span className="text-body font-semibold">{when}</span>
          <span className="text-label text-ink">{detail}</span>
          <span className="text-label text-muted">{location}</span>
        </div>
        {aside}
      </div>
      {note && (
        <span id={noteId} className="text-small leading-[1.45] text-muted">
          {note}
        </span>
      )}
    </Element>
  )
}
