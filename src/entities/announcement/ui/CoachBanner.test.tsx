import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { LanguageScope } from '@/shared/i18n/LanguageScope'
import { registerAllChinese } from '@/shared/i18n/registerAllChinese'

import { CoachBanner } from './CoachBanner'

afterEach(cleanup)

describe('CoachBanner', () => {
  it('says the message after a bold "Coach:", as drawn', () => {
    const { container } = render(
      <CoachBanner message="If lightning closes the pool, your lesson goes back to your package." />,
    )
    const label = screen.getByText('Coach:')
    expect(label.className).toContain('font-semibold')
    expect(container.textContent).toBe(
      'Coach: If lightning closes the pool, your lesson goes back to your package.',
    )
  })

  it('keeps the line breaks the coach typed', () => {
    render(<CoachBanner message={'Pool closed Friday.\nLessons move to Saturday.'} />)
    const message = screen.getByText(/Pool closed Friday\./)
    expect(message.textContent).toBe('Pool closed Friday.\nLessons move to Saturday.')
    expect(message.className).toContain('whitespace-pre-line')
  })

  it('wraps a pasted link inside the box instead of running out of it (DESIGN §5)', () => {
    const link = `https://maps.google.com/maps/place/${'Kondominium+Seri+Permaisuri+'.repeat(7)}`
    const { container } = render(<CoachBanner message={`Pool closed, see ${link}`} />)
    expect(link.length).toBeGreaterThan(200)
    expect(container.firstElementChild?.className).toContain('wrap-anywhere')
  })

  it('takes a layout class for the page’s spacing', () => {
    const { container } = render(<CoachBanner message="Pool closed Friday." className="mt-5.5" />)
    expect(container.firstElementChild?.className).toContain('mt-5.5')
  })
})

describe('CoachBanner in Chinese', () => {
  registerAllChinese()

  it('says 教练： with no space after the full-width colon; the message stays as typed', () => {
    const { container } = render(
      <LanguageScope language="zh">
        <CoachBanner message="Pool closed Friday." />
      </LanguageScope>,
    )
    expect(container.textContent).toBe('教练：Pool closed Friday.')
  })
})
