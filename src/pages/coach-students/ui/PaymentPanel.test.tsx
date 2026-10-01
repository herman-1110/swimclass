import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { GroupBalance } from '@/entities/balance'
import type { Group } from '@/entities/group'
import { AppError } from '@/shared/api/rpc'

import type { PackageRow } from '../model/rows'
import { stubWidth } from '../testing'
import { PaymentPanel } from './PaymentPanel'

// The panel's own states (coach-students §6): nothing to show yet, and prices that can't be
// read. Neither reads data, so no database.

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const HANA: PackageRow = {
  group: { group_id: 'g-hana', display_names: 'Hana', size: 1, type_label: '1-to-1' } as Group,
  balance: { group_id: 'g-hana', package_size: 4, paid_lessons: 20 } as GroupBalance,
  accountName: 'Farah',
  bucket: 'unpaid',
}

function renderPanel(
  row: PackageRow | null,
  settings: Parameters<typeof PaymentPanel>[0]['settings'],
) {
  stubWidth(1440)
  render(
    <PaymentPanel
      row={row}
      loading={false}
      settings={settings}
      open={false}
      wide
      now="2026-09-26T04:00:00Z"
      onClose={() => {}}
      onEngage={() => {}}
    />,
  )
  return screen.getByRole('complementary', { name: 'Record payment' })
}

describe('PaymentPanel', () => {
  it('asks for a row from 1280 px when there is no group to show', () => {
    const panel = renderPanel(null, { isError: false, error: null, refetch: () => {} })
    expect(within(panel).getByText('Choose Record payment on a row to start.')).toBeTruthy()
    expect(within(panel).queryByRole('combobox')).toBeNull()
  })

  it('shows why the prices can’t be read instead of the form, with Try again', () => {
    const refetch = vi.fn()
    const panel = renderPanel(HANA, { isError: true, error: new AppError('network'), refetch })
    expect(panel.getAttribute('aria-describedby')).toBeTruthy()
    expect(within(panel).getByText('Hana · Farah’s account')).toBeTruthy()
    const alert = within(panel).getByRole('alert')
    expect(alert.textContent).toContain(
      'Couldn’t reach the server. Check your connection and try again.',
    )
    expect(within(panel).queryByRole('combobox', { name: 'Package' })).toBeNull()
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
