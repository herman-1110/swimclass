import { describe, expect, it } from 'vitest'

import { methodInSentence, methodLabel } from './method'
import type { PaymentMethod } from './types'

const METHODS: PaymentMethod[] = ['cash', 'transfer', 'fpx', 'free', 'other']

describe('methodLabel', () => {
  it('names each method as the Students screen does', () => {
    expect(METHODS.map(methodLabel)).toEqual(['Cash', 'Transfer', 'FPX', 'Free lesson', 'Other'])
  })
})

describe('methodInSentence', () => {
  it('writes them in lower case inside a sentence, except FPX', () => {
    expect(METHODS.map(methodInSentence)).toEqual([
      'cash',
      'transfer',
      'FPX',
      'free lesson',
      'other',
    ])
  })
})
