import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useWords } from '@/shared/i18n/context'
import { LanguageScope } from '@/shared/i18n/LanguageScope'
import { LanguageToggle } from '@/shared/ui/LanguageToggle'

import { layoutWords } from '../layouts/words'
import { LanguageProvider } from './LanguageProvider'

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.lang = 'en'
})

function Tabs() {
  const w = useWords(layoutWords)
  return <p>{w.myClasses}</p>
}

describe('LanguageProvider', () => {
  it('switches to Chinese once its words are in, and remembers it on this phone', async () => {
    render(
      <LanguageProvider>
        <LanguageToggle />
        <Tabs />
      </LanguageProvider>,
    )
    expect(screen.getByText('My classes')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'English' }).getAttribute('aria-pressed')).toBe(
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: '中文' }))
    expect(await screen.findByText('我的课程')).toBeTruthy()
    expect(screen.getByRole('button', { name: '中文' }).getAttribute('aria-pressed')).toBe('true')
    expect(document.documentElement.lang).toBe('zh-Hans')
    expect(localStorage.getItem('swimclass.language')).toBe('zh')

    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByText('My classes')).toBeTruthy()
    expect(document.documentElement.lang).toBe('en')
  })

  it('starts in Chinese when this phone chose it, without showing English first', async () => {
    localStorage.setItem('swimclass.language', 'zh')
    render(
      <LanguageProvider>
        <Tabs />
      </LanguageProvider>,
    )
    expect(screen.queryByText('My classes')).toBeNull()
    expect(await screen.findByText('我的课程')).toBeTruthy()
  })

  it('keeps the coach’s screens English whatever the toggle says', async () => {
    localStorage.setItem('swimclass.language', 'zh')
    render(
      <LanguageProvider>
        <LanguageScope language="en" wholePage>
          <Tabs />
        </LanguageScope>
      </LanguageProvider>,
    )
    expect(await screen.findByText('My classes')).toBeTruthy()
    expect(document.documentElement.lang).toBe('en')
  })
})
