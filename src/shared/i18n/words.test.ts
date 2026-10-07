import { describe, expect, it } from 'vitest'

import { defineWords, registerChinese, wordsIn } from './words'

describe('wordsIn', () => {
  const greeting = defineWords('test-greeting', {
    hello: 'Hello',
    hi: (name: string) => `Hi ${name}`,
  })

  it('gives English until the Chinese is registered, and for English always', () => {
    expect(wordsIn(greeting, 'zh').hello).toBe('Hello')
    registerChinese({
      key: 'test-greeting',
      words: { hello: '你好', hi: (name: string) => `${name}，你好` },
    })
    expect(wordsIn(greeting, 'zh').hello).toBe('你好')
    expect(wordsIn(greeting, 'zh').hi('Aiman')).toBe('Aiman，你好')
    expect(wordsIn(greeting, 'en').hello).toBe('Hello')
  })
})
