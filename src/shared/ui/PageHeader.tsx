import { type ReactNode, useEffect, useRef } from 'react'

import { cn } from '@/shared/lib/cn'

type PageHeaderSize = 'auth' | 'customer' | 'coach'
type PageHeaderAlign = 'center' | 'start' | 'end'

type PageHeaderProps = {
  /** auth: 28 px (Log in). customer: 24 px. coach: 26 px. */
  size: PageHeaderSize
  /** The page's one h1: "Book a lesson". */
  title: string
  /** 13 px muted line above the title: "Hi, Mei Ling", "Your coach’s timetable". */
  eyebrow?: ReactNode
  /** Muted text under the title: "Set up who books together. …". */
  description?: ReactNode
  /** Buttons, search or week navigation: under the title on phones, at the right from 768 px. */
  actions?: ReactNode
  /**
   * How the actions line up with the title from 768 px. Default: center (coach), end
   * (customer). A coach header aligned to the start (Settings) keeps 16 px between them.
   */
  align?: PageHeaderAlign
  /** An id for the h1, so a form or section can be named by it (aria-labelledby). */
  titleId?: string
  /** Moves focus to the h1 when it appears (a form swapped for its result). */
  focusOnMount?: boolean
}

// UI kit spec §3.29: Main.dc.html:65-68, Schedule.dc.html:67-70, MyClasses.dc.html:52-55
// (customer); AdminAddStudents.dc.html:61, AdminSettings.dc.html:103 (coach);
// Login.dc.html:38-41 (auth). The page renders its own <title>.
const blocks: Record<PageHeaderSize, string> = {
  auth: 'flex flex-col gap-2',
  customer: 'flex flex-col gap-0.5',
  coach: 'flex flex-col gap-1',
}

const titles: Record<PageHeaderSize, string> = {
  auth: 'text-[1.75rem] font-semibold leading-[1.2]',
  customer: 'text-title font-semibold leading-tight',
  coach: 'text-title-desktop font-semibold',
}

const descriptions: Record<PageHeaderSize, string> = {
  auth: 'text-body leading-normal text-muted',
  customer: 'text-sm leading-[1.45] text-muted',
  coach: 'text-sm leading-[1.45] text-muted',
}

const alignments: Record<PageHeaderAlign, string> = {
  center: 'md:items-center',
  start: 'md:items-start',
  end: 'md:items-end',
}

/** A page's title block, with its actions (UI kit spec §3.29). */
export function PageHeader({
  size,
  title,
  eyebrow,
  description,
  actions,
  align = size === 'customer' ? 'end' : 'center',
  titleId,
  focusOnMount = false,
}: PageHeaderProps) {
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (focusOnMount) heading.current?.focus()
  }, [focusOnMount])

  const block = (
    <div className={blocks[size]}>
      {eyebrow && <p className="text-label text-muted">{eyebrow}</p>}
      <h1
        ref={heading}
        id={titleId}
        tabIndex={focusOnMount ? -1 : undefined}
        className={titles[size]}
      >
        {title}
      </h1>
      {description && <p className={descriptions[size]}>{description}</p>}
    </div>
  )

  if (!actions) return block

  return (
    <div
      className={cn(
        'flex flex-col md:flex-row md:justify-between',
        // 14 px between the title and the week navigation (customer), 12 px (coach); the
        // top-aligned Settings header has 16 px (AdminSettings.dc.html:25).
        size === 'customer' ? 'gap-3.5' : 'gap-3',
        size === 'coach' && align === 'start' && 'md:gap-4',
        alignments[align],
      )}
    >
      {block}
      {actions}
    </div>
  )
}
