import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PackageFilter } from '../model/rows'
import { PackagesList } from './PackagesList'

// The list with nothing to show (coach-students §6, Empty): no data is read, so no database.

afterEach(cleanup)

function renderEmpty(filter: PackageFilter, query = '') {
  const onClearSearch = vi.fn()
  render(
    <PackagesList
      rows={[]}
      filter={filter}
      query={query}
      showAll={false}
      onShowAll={() => {}}
      onClearSearch={onClearSearch}
      highlighted={new Set()}
      now="2026-09-26T04:00:00Z"
      onRecordPayment={() => {}}
      onHistory={() => {}}
    />,
  )
  return { onClearSearch }
}

describe('PackagesList with nothing to show', () => {
  it('says there are no students yet, without a second "Add students" link', () => {
    renderEmpty('all')
    expect(screen.getByText('No students yet')).toBeTruthy()
    expect(screen.getByText('Add students to create their first package.')).toBeTruthy()
    // The header has the screen's only "Add students" link (conventions §12.3).
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByText(/^Needs action first/)).toBeNull()
  })

  it('says why each tab is empty', () => {
    renderEmpty('unpaid')
    expect(screen.getByText('No unpaid packages.')).toBeTruthy()
    cleanup()
    renderEmpty('last-lesson')
    expect(screen.getByText('No one is on their last lesson.')).toBeTruthy()
    cleanup()
    renderEmpty('paid')
    expect(screen.getByText('No paid packages.')).toBeTruthy()
  })

  it('says when a search matches nothing, with Clear search', () => {
    const { onClearSearch } = renderEmpty('unpaid', '  zz ')
    expect(screen.getByText('No students match “zz”.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(onClearSearch).toHaveBeenCalledOnce()
  })
})
