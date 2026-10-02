import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { GroupIdentity } from './GroupIdentity'

afterEach(cleanup)

describe('GroupIdentity', () => {
  it('shows the names over the account holder and the pool', () => {
    render(
      <GroupIdentity
        group={{ display_names: 'Hana', size: 1, location: 'Sunrise Res.' }}
        accountName="Farah"
      />,
    )
    expect(screen.getByText('Hana')).toBeTruthy()
    expect(screen.getByText('Farah’s account · Sunrise Res.')).toBeTruthy()
  })

  it('says "Own account" when the student is the account holder', () => {
    render(
      <GroupIdentity
        group={{ display_names: 'Wei Jie', size: 1, location: 'Palm Court' }}
        accountName="Wei Jie"
        variant="card"
      />,
    )
    expect(screen.getByText('Own account · Palm Court')).toBeTruthy()
  })

  it('reads as one name with the lines apart, in a table’s row header', () => {
    render(
      <table>
        <tbody>
          <tr>
            <th scope="row">
              <GroupIdentity
                group={{ display_names: 'Aiman & Sofia', size: 2, location: 'Palm Court' }}
                accountName="Mei Ling"
              />
            </th>
            <td>1-to-2</td>
          </tr>
        </tbody>
      </table>,
    )
    expect(
      screen.getByRole('rowheader', { name: 'Aiman & Sofia Mei Ling’s account · Palm Court' }),
    ).toBeTruthy()
  })

  it('wraps long names and places inside a word, so the Students column can shrink', () => {
    const { container } = render(
      <GroupIdentity
        group={{
          display_names: 'Nurulhidayahbintimohdzulkifli'.repeat(3),
          size: 1,
          location: 'Palm Court',
        }}
        accountName="Farah"
      />,
    )
    expect(container.firstElementChild?.className).toContain('min-w-0')
    expect(container.firstElementChild?.className).toContain('wrap-anywhere')
  })
})
