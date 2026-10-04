import { act, cleanup, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadTurnstile, type TurnstileApi } from '@/shared/lib/turnstile'

import { Captcha, type CaptchaHandle } from './Captcha'

vi.mock('@/shared/lib/turnstile', () => ({ loadTurnstile: vi.fn() }))

type Options = Parameters<TurnstileApi['render']>[1]

/** A stand-in for Cloudflare's script: remembers the widget's options to call them back. */
function fakeTurnstile() {
  let options: Options | undefined
  const api = {
    render: vi.fn((_container: HTMLElement, given: Options) => {
      options = given
      return 'widget-1'
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  }
  const widget = () => {
    if (!options) throw new Error('Not rendered')
    return options
  }
  return { api, widget }
}

let turnstile: ReturnType<typeof fakeTurnstile>

beforeEach(() => {
  turnstile = fakeTurnstile()
  vi.mocked(loadTurnstile).mockResolvedValue(turnstile.api)
})

afterEach(cleanup)

async function renderCaptcha() {
  const onToken = vi.fn()
  const ref = createRef<CaptchaHandle>()
  const view = render(<Captcha ref={ref} siteKey="test-key" onToken={onToken} />)
  await vi.waitFor(() => expect(turnstile.api.render).toHaveBeenCalledTimes(1))
  return { onToken, ref, view }
}

describe('Captcha', () => {
  it('renders Turnstile with the site key, full width and light', async () => {
    const { view } = await renderCaptcha()
    const [container, options] = turnstile.api.render.mock.calls[0] ?? []
    expect(view.container.contains(container ?? null)).toBe(true)
    expect(options).toMatchObject({ sitekey: 'test-key', size: 'flexible', theme: 'light' })
  })

  it('passes the token on, and null once it expires or fails', async () => {
    const { onToken } = await renderCaptcha()
    act(() => turnstile.widget().callback('token-1'))
    act(() => turnstile.widget()['expired-callback']())
    act(() => turnstile.widget().callback('token-2'))
    act(() => turnstile.widget()['error-callback']())
    act(() => turnstile.widget()['timeout-callback']())
    expect(onToken.mock.calls).toEqual([['token-1'], [null], ['token-2'], [null], [null]])
  })

  it('asks for a fresh check when reset (a token works once)', async () => {
    const { onToken, ref } = await renderCaptcha()
    act(() => turnstile.widget().callback('token-1'))
    act(() => ref.current?.reset())
    expect(turnstile.api.reset).toHaveBeenCalledWith('widget-1')
    expect(onToken).toHaveBeenLastCalledWith(null)
  })

  it('removes the widget when it leaves the page', async () => {
    const { view } = await renderCaptcha()
    view.unmount()
    expect(turnstile.api.remove).toHaveBeenCalledWith('widget-1')
  })

  it('says so when Cloudflare’s script doesn’t load', async () => {
    vi.mocked(loadTurnstile).mockRejectedValue(new Error('Turnstile did not load'))
    render(<Captcha siteKey="test-key" onToken={vi.fn()} />)
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Couldn’t load the security check. Check your connection and refresh the page.',
    )
  })
})
