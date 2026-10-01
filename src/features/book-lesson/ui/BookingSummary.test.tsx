import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { type GroupBalance, useAccountBalance } from '@/entities/balance'
import type { Group } from '@/entities/group'
import { type Slot, startTimeKey } from '@/entities/slot'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { demoDb } from '@/shared/api/demo/db'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { BookingSummary } from './BookingSummary'
import { BookingSummaryPlaceholder } from './BookingSummaryPlaceholder'

// Runs in demo mode: Book presses book_lesson for real (PGlite, clock at Sat 26 Sep 2026
// 12:00 MYT). One database for the whole file: each booking stays for the next test.

const MEILING = 'a0000000-0000-4000-8000-000000000002'
const AIMAN_AND_SOFIA: Group = {
  group_id: 'c0000000-0000-4000-8000-000000000001',
  account_id: MEILING,
  location: 'Palm Court',
  active: true,
  opening_used_lessons: 12,
  opening_paid_lessons: 12,
  created_at: '2026-09-29T16:05:07.107+00:00',
  size: 2,
  type_label: '1-to-2',
  display_names: 'Aiman & Sofia',
  student_ids: ['b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002'],
}
const BALANCE: GroupBalance = {
  group_id: AIMAN_AND_SOFIA.group_id,
  account_id: MEILING,
  package_size: 4,
  paid_lessons: 16,
  used_lessons: 12,
  booked_lessons: 2,
  package_no: 4,
  used_in_package: 0,
  booked_in_package: 2,
  left_in_package: 2,
  unpaid: false,
  unpaid_since: null,
  can_still_book: 6,
  last_lesson_at: null,
  last_paid_on: '2026-09-19',
  last_payment_method: 'fpx',
}
const SETTINGS = { travel_gap_minutes: 60, booking_window_weeks: 4, cancel_cutoff_hours: 6 }

/** A start as week_slots sends it: the MYT day and the UTC moment. */
function slot(day: string, startsAtUtc: string, check: Partial<Slot> = {}): Slot {
  return { day, starts_at: startsAtUtc, ok: true, reason: null, detail: null, ...check } as Slot
}
const TUE_730 = slot('2026-09-29', '2026-09-29T11:30:00+00:00')
const TUE_700_GAP = slot('2026-09-29', '2026-09-29T11:00:00+00:00', {
  ok: false,
  reason: 'gap_after',
  detail: { ends_at: '2026-09-29T18:30:00+08:00' },
})

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

type DemoDb = Awaited<ReturnType<typeof demoDb>>

/**
 * Holds the demo database in an open transaction, from this very moment, so the calls made
 * after it wait (as on a slow connection) until `release` is called.
 */
function holdNow(db: DemoDb): () => Promise<void> {
  let open = () => {}
  const released = new Promise<void>((resolve) => {
    open = resolve
  })
  const held = db.transaction(async () => {
    await released
  })
  return async () => {
    open()
    await held
  }
}

/** holdNow, once the transaction has started (the calls already queued go first). */
async function holdDatabase(): Promise<() => Promise<void>> {
  const db = await demoDb()
  let started = () => {}
  const holding = new Promise<void>((resolve) => {
    started = resolve
  })
  let release = () => {}
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  const held = db.transaction(async () => {
    started()
    await released
  })
  await holding
  return async () => {
    release()
    await held
  }
}

type HarnessProps = {
  first: Slot | null
  /** Reads the balance from the demo database, so the refresh after booking shows. */
  live?: boolean
  /** The page's onBooked, called before the harness forgets the picked time. */
  onBooked?: () => void
  onBookAnother?: () => void
}

/** The summary as the page uses it: the page forgets the picked time once it is booked. */
function Harness({ first, live = false, onBooked, onBookAnother }: HarnessProps) {
  const [picked, setPicked] = useState(first)
  const fresh = useAccountBalance(live ? MEILING : null, AIMAN_AND_SOFIA.group_id)
  const balance = live ? fresh.data : BALANCE
  if (!balance) return null
  return (
    <>
      <BookingSummary
        group={AIMAN_AND_SOFIA}
        balance={balance}
        settings={SETTINGS}
        day={first?.day ?? '2026-09-29'}
        slot={picked}
        time={picked ? startTimeKey(picked) : null}
        minutes={60}
        lastBookableDay="2026-10-25"
        onBooked={() => {
          onBooked?.()
          setPicked(null)
        }}
        onBookAnother={onBookAnother}
      />
      <button type="button" onClick={() => setPicked(TUE_730)}>
        Pick 7:30 pm
      </button>
      <button type="button" onClick={() => setPicked(null)}>
        Forget the time
      </button>
    </>
  )
}

function renderHarness(props: HarnessProps) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Harness {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderSummary(first: Slot | null) {
  renderHarness({ first })
  return within(screen.getByRole('region', { name: 'Booking summary' }))
}

/** The summary with the account's real balance (signed in as meiling), once it is read. */
async function renderLive(first: Slot, props: Omit<HarnessProps, 'first' | 'live'> = {}) {
  renderHarness({ first, live: true, ...props })
  return within(await screen.findByRole('region', { name: 'Booking summary' }))
}

describe('BookingSummary', () => {
  it('asks for a start time, with Book unavailable, while none is picked', () => {
    const summary = renderSummary(null)
    expect(summary.getByText('Pick a start time')).toBeTruthy()
    expect(
      summary.getByText('Crossed-out times clash with another lesson or travel time.'),
    ).toBeTruthy()
    const button = summary.getByRole('button', { name: 'Pick a time' })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(summary.queryByRole('checkbox')).toBeNull()
    expect(summary.getByText('Free to cancel or reschedule up to 6 hours before.')).toBeTruthy()
  })

  it('explains a crossed-out start in the live region and keeps Book unavailable', () => {
    const summary = renderSummary(TUE_700_GAP)
    const live = screen.getByText('7:00 pm isn’t available').parentElement
    expect(live?.getAttribute('aria-live')).toBe('polite')
    expect(
      within(live as HTMLElement).getByText(
        'It starts too soon after the lesson that ends at 6:30 pm. Your coach needs 1 hour to travel between lessons.',
      ),
    ).toBeTruthy()
    const button = summary.getByRole('button', { name: 'Pick a free time' })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    // The button sits outside the live region, so it isn't read out again.
    expect(live?.contains(button)).toBe(false)
  })

  it('shows a free start with what it uses and "Repeat weekly", unchecked (C1, C3)', () => {
    const summary = renderSummary(TUE_730)
    expect(summary.getByText('Tue 29 Sep · 7:30–8:30 pm')).toBeTruthy()
    expect(
      summary.getByText(
        '1-to-2 for Aiman & Sofia · uses 1 lesson from Package 4, 1 left to book after this',
      ),
    ).toBeTruthy()
    const repeat = summary.getByRole<HTMLInputElement>('checkbox', {
      name: 'Repeat weekly for 4 weeks',
    })
    expect(repeat.checked).toBe(false)
    expect(repeat.id).toBe('book-repeat')
    const button = summary.getByRole('button', { name: 'Book 7:30 pm for Aiman & Sofia' })
    expect(button.getAttribute('aria-disabled')).toBeNull()
  })

  it('shows the server’s reason when someone took the start first, and keeps focus on Book', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    // 6:30 pm on Tue 29 Sep looks free here, but the 5:30 pm lesson leaves no travel gap.
    const summary = renderSummary(slot('2026-09-29', '2026-09-29T10:30:00+00:00'))
    const book = summary.getByRole('button', { name: 'Book 6:30 pm for Aiman & Sofia' })
    book.focus()
    fireEvent.click(book)
    expect(await summary.findByText('6:30 pm isn’t available')).toBeTruthy()
    expect(
      summary.getByText(
        'It starts too soon after the lesson that ends at 6:30 pm. Your coach needs 1 hour to travel between lessons.',
      ),
    ).toBeTruthy()
    expect(book.textContent).toBe('Pick a free time')
    expect(book.getAttribute('aria-disabled')).toBe('true')
    expect(document.activeElement).toBe(book)
  })

  it('keeps Book and the checkbox after a weekly booking clashes (repeat_conflict)', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const summary = renderSummary(slot('2026-09-27', '2026-09-27T09:00:00+00:00'))
    fireEvent.click(summary.getByRole('checkbox', { name: 'Repeat weekly for 5 weeks' }))
    fireEvent.click(summary.getByRole('button', { name: 'Book 5:00 pm for Aiman & Sofia' }))
    expect(
      await summary.findByText(
        'These weeks clash: Sun 4 Oct. Nothing was booked. Try another time or turn off repeat.',
      ),
    ).toBeTruthy()
    expect(summary.getByRole<HTMLInputElement>('checkbox').checked).toBe(true)
    const button = summary.getByRole('button', { name: 'Book 5:00 pm for Aiman & Sofia' })
    expect(button.getAttribute('aria-disabled')).toBeNull()
  })

  it('says "Booking…" only while book_lesson runs, then shows the lesson and moves focus to it', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const db = await demoDb()
    const onBookAnother = vi.fn()
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    // The page's refresh after booking waits until releaseRefresh is called.
    let releaseRefresh = async () => {}
    const summary = await renderLive(TUE_730, {
      onBooked: () => {
        releaseRefresh = holdNow(db)
      },
      onBookAnother,
    })
    const releaseBooking = await holdDatabase()
    fireEvent.click(summary.getByRole('button', { name: 'Book 7:30 pm for Aiman & Sofia' }))
    const busy = await summary.findByRole('button', { name: 'Booking…' })
    expect(busy.getAttribute('aria-busy')).toBe('true')
    expect(busy.getAttribute('aria-disabled')).toBe('true')
    expect(summary.getByRole<HTMLInputElement>('checkbox').disabled).toBe(true)
    await releaseBooking()

    const heading = await summary.findByRole('heading', {
      level: 2,
      name: 'Booked 7:30 pm for Aiman & Sofia',
    })
    expect(document.activeElement).toBe(heading)
    // The heading is on screen already: focusing it must not scroll the page (phones).
    expect(focus.mock.contexts).toContain(heading)
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(summary.getByText('Tue 29 Sep · 7:30–8:30 pm')).toBeTruthy()
    expect(summary.getByRole('link', { name: 'See My classes' }).getAttribute('href')).toBe(
      '/my-classes',
    )
    expect(summary.getByText('Free to cancel or reschedule up to 6 hours before.')).toBeTruthy()

    // The screen is still refreshing: the package line waits for the new balance, and
    // nothing says "Booking…" any more.
    expect(summary.queryByText(/^Package 4 · /)).toBeNull()
    fireEvent.click(summary.getByRole('button', { name: 'Book another lesson' }))
    expect(onBookAnother).toHaveBeenCalledTimes(1)
    expect(summary.getByText('Pick a start time')).toBeTruthy()
    expect(
      summary.getByRole('button', { name: 'Pick a time' }).getAttribute('aria-busy'),
    ).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Pick 7:30 pm' }))
    expect(summary.queryByRole('button', { name: 'Booking…' })).toBeNull()
    expect(
      summary
        .getByRole('button', { name: 'Book 7:30 pm for Aiman & Sofia' })
        .getAttribute('aria-busy'),
    ).toBeNull()
    await releaseRefresh()
  })

  it('books every week of a weekly booking and lists them, then the refreshed package', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const summary = await renderLive(slot('2026-09-30', '2026-09-30T09:30:00+00:00'))
    fireEvent.click(summary.getByRole('checkbox', { name: 'Repeat weekly for 4 weeks' }))
    fireEvent.click(summary.getByRole('button', { name: 'Book 5:30 pm for Aiman & Sofia' }))
    expect(
      await summary.findByText('Wed 30 Sep, Wed 7 Oct, Wed 14 Oct and Wed 21 Oct · 5:30–6:30 pm'),
    ).toBeTruthy()
    // 3 booked before, 4 more: Package 4 is fully booked and Package 5 has 3.
    expect(await summary.findByText('Package 4 · 0 used · 4 booked · fully booked')).toBeTruthy()
  })

  it('drops the success panel for good once another start is picked', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const summary = renderSummary(slot('2026-10-02', '2026-10-02T09:30:00+00:00'))
    fireEvent.click(summary.getByRole('button', { name: 'Book 5:30 pm for Aiman & Sofia' }))
    await summary.findByRole('heading', { name: 'Booked 5:30 pm for Aiman & Sofia' })
    fireEvent.click(screen.getByRole('button', { name: 'Pick 7:30 pm' }))
    expect(summary.queryByRole('heading')).toBeNull()
    expect(summary.getByText('Tue 29 Sep · 7:30–8:30 pm')).toBeTruthy()
    // Back to no time picked, as just after the booking: the plain summary, and focus
    // stays where it was.
    const forget = screen.getByRole('button', { name: 'Forget the time' })
    forget.focus()
    fireEvent.click(forget)
    expect(summary.queryByRole('heading')).toBeNull()
    expect(summary.getByText('Pick a start time')).toBeTruthy()
    expect(document.activeElement).toBe(forget)
  })
})

describe('BookingSummaryPlaceholder', () => {
  it('shows state A while the screen loads, with the note once the settings are in', () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <BookingSummaryPlaceholder cutoffHours={6} />
      </QueryClientProvider>,
    )
    const summary = within(screen.getByRole('region', { name: 'Booking summary' }))
    expect(summary.getByText('Pick a start time')).toBeTruthy()
    expect(summary.getByRole('button', { name: 'Pick a time' }).getAttribute('aria-disabled')).toBe(
      'true',
    )
    expect(summary.getByText('Free to cancel or reschedule up to 6 hours before.')).toBeTruthy()
  })

  it('keeps the note’s place while the settings load', () => {
    render(<BookingSummaryPlaceholder cutoffHours={null} />)
    expect(screen.queryByText(/Free to cancel/)).toBeNull()
  })
})
