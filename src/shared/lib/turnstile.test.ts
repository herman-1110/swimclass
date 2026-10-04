import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TurnstileApi } from './turnstile'

// jsdom never runs the script, so each test plays the browser: it fires the script's load
// or error event itself. A fresh copy of the module per test, as it remembers the load.

const api: TurnstileApi = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() }

async function freshModule() {
  vi.resetModules()
  return import('./turnstile')
}

const scripts = () =>
  [...document.head.querySelectorAll('script')].filter((script) =>
    script.src.startsWith('https://challenges.cloudflare.com/'),
  )

beforeEach(() => {
  delete window.turnstile
})

afterEach(() => {
  for (const script of scripts()) script.remove()
  delete window.turnstile
})

describe('loadTurnstile', () => {
  it('adds Cloudflare’s script once, for explicit rendering, and resolves to its API', async () => {
    const { loadTurnstile, TURNSTILE_SCRIPT } = await freshModule()
    const first = loadTurnstile()
    const second = loadTurnstile()
    expect(scripts().map((script) => script.src)).toEqual([TURNSTILE_SCRIPT])
    expect(TURNSTILE_SCRIPT).toContain('render=explicit')
    window.turnstile = api
    scripts()[0]?.dispatchEvent(new Event('load'))
    await expect(first).resolves.toBe(api)
    await expect(second).resolves.toBe(api)
  })

  it('uses Turnstile at once when it is already there', async () => {
    const { loadTurnstile } = await freshModule()
    window.turnstile = api
    await expect(loadTurnstile()).resolves.toBe(api)
    expect(scripts()).toEqual([])
  })

  it('fails when the script doesn’t load, and tries again next time', async () => {
    const { loadTurnstile } = await freshModule()
    const failed = loadTurnstile()
    scripts()[0]?.dispatchEvent(new Event('error'))
    await expect(failed).rejects.toThrow('Turnstile did not load')
    expect(scripts()).toEqual([])

    const retried = loadTurnstile()
    expect(scripts()).toHaveLength(1)
    window.turnstile = api
    scripts()[0]?.dispatchEvent(new Event('load'))
    await expect(retried).resolves.toBe(api)
  })
})
