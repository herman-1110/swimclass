import { describe, expect, it } from 'vitest'

import { messageWords } from '@/shared/config/messages'
import type { ZhModule } from '@/shared/i18n/words'

// The Chinese words as a whole (HANDOFF v0.26): every part that defines English words has
// Chinese beside it under the same key, every Chinese file imports types only (it is the
// Chinese chunk: a run-time import would pull English code into it, or it into the main
// bundle), and the messages cover every code of the customer table.

const ENGLISH = import.meta.glob<string>('/src/**/words.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
})
const CHINESE_SOURCE = import.meta.glob<string>('/src/**/*.zh.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
})
const CHINESE = import.meta.glob<{ default: ZhModule }>('/src/**/*.zh.ts', { eager: true })

const keyIn = (source: string) => /defineWords\('([^']+)'/.exec(source)?.[1]

describe('the Chinese words', () => {
  it('has a words.zh.ts with the same key beside every words.ts', () => {
    // shared/i18n/words.ts is the mechanism itself, with no words of its own.
    const parts = Object.entries(ENGLISH).filter(([, source]) => keyIn(source) !== undefined)
    expect(parts.length).toBeGreaterThan(0)
    for (const [path, source] of parts) {
      const zh = CHINESE[path.replace(/\.ts$/, '.zh.ts')]
      expect(zh, `${path} has no words.zh.ts`).toBeDefined()
      expect(zh?.default.key, path).toBe(keyIn(source))
    }
  })

  it('files each part under its own key', () => {
    const keys = Object.values(CHINESE).map((module) => module.default.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('imports nothing but types in the Chinese files', () => {
    for (const [path, source] of Object.entries(CHINESE_SOURCE)) {
      const imports = source.split('\n').filter((line) => line.startsWith('import '))
      for (const line of imports) expect(line, path).toMatch(/^import type /)
    }
  })

  it('has Chinese for every message of the customer table', () => {
    const zh = CHINESE['/src/shared/config/messages.zh.ts']?.default.words as
      typeof messageWords.en | undefined
    expect(zh).toBeDefined()
    expect(Object.keys(zh?.customer ?? {}).sort()).toEqual(
      Object.keys(messageWords.en.customer).sort(),
    )
  })
})
