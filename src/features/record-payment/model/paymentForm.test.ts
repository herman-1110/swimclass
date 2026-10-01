import { describe, expect, it } from 'vitest'

import {
  amountPrefill,
  lessonsFrom,
  packageOptionLabel,
  paymentErrorField,
  paymentInput,
  type PriceSettings,
} from './paymentForm'

const noPrices: PriceSettings = {
  price_1to1_cents: null,
  price_1to2_cents: null,
  price_1to3_cents: null,
  lessons_per_package: 4,
}
const prices: PriceSettings = {
  price_1to1_cents: 24000,
  price_1to2_cents: 40000,
  price_1to3_cents: 54000,
  lessons_per_package: 4,
}

const draft = {
  lessonsText: '4',
  amountText: '',
  method: 'cash' as const,
  paidOn: '2026-09-26',
  note: '',
}

describe('packageOptionLabel', () => {
  it('names the package this payment starts to pay for, as drawn', () => {
    // Hana: 20 paid in packages of 4, so the payment pays for Package 6.
    expect(packageOptionLabel('1-to-1', { package_size: 4, paid_lessons: 20 })).toBe(
      '1-to-1 · Package 6 · 4 lessons',
    )
    // Priya is on Package 4 with 16 paid: the next payment is Package 5.
    expect(packageOptionLabel('1-to-1', { package_size: 4, paid_lessons: 16 })).toBe(
      '1-to-1 · Package 5 · 4 lessons',
    )
    expect(packageOptionLabel('1-to-3', { package_size: 4, paid_lessons: 4 })).toBe(
      '1-to-3 · Package 2 · 4 lessons',
    )
  })

  it('reads naturally for a package of one lesson', () => {
    expect(packageOptionLabel('1-to-1', { package_size: 1, paid_lessons: 0 })).toBe(
      '1-to-1 · Package 1 · 1 lesson',
    )
  })
})

describe('lessonsFrom', () => {
  it('reads a whole number of lessons, zero included', () => {
    expect(lessonsFrom('4')).toBe(4)
    expect(lessonsFrom(' 12 ')).toBe(12)
    expect(lessonsFrom('0')).toBe(0)
  })

  it('gives null for anything else', () => {
    expect(lessonsFrom('')).toBeNull()
    expect(lessonsFrom('2.5')).toBeNull()
    expect(lessonsFrom('-1')).toBeNull()
    expect(lessonsFrom('four')).toBeNull()
  })
})

describe('amountPrefill', () => {
  it('is empty while no price is set, as in the seed', () => {
    expect(amountPrefill(noPrices, 1, 4)).toBe('')
  })

  it('prices the lessons from the type’s package price, like record_payment', () => {
    expect(amountPrefill(prices, 1, 4)).toBe('240')
    expect(amountPrefill(prices, 2, 3)).toBe('300')
    expect(amountPrefill(prices, 3, 1)).toBe('135')
    expect(amountPrefill({ ...prices, price_1to1_cents: 25000 }, 1, 1)).toBe('62.50')
  })

  it('is empty until the lessons are a number of at least 1', () => {
    expect(amountPrefill(prices, 1, null)).toBe('')
    expect(amountPrefill(prices, 1, 0)).toBe('')
  })
})

describe('paymentInput', () => {
  it('sends the lessons, the amount in cents, the method, the date and the trimmed note', () => {
    expect(
      paymentInput('g1', { ...draft, amountText: 'RM 1,240.50', note: '  Paid at the pool ' }),
    ).toEqual({
      input: {
        groupId: 'g1',
        lessons: 4,
        amountCents: 124050,
        method: 'cash',
        paidOn: '2026-09-26',
        note: 'Paid at the pool',
      },
    })
  })

  it('sends no amount, date or note when they are empty (the database fills them in)', () => {
    expect(paymentInput('g1', { ...draft, paidOn: '', note: '   ' })).toEqual({
      input: { groupId: 'g1', lessons: 4, amountCents: null, method: 'cash' },
    })
  })

  it('leaves a negative amount and zero lessons to the database', () => {
    const result = paymentInput('g1', { ...draft, lessonsText: '0', amountText: '-1' })
    expect(result).toMatchObject({ input: { lessons: 0, amountCents: -100 } })
  })

  it('stops an amount that isn’t ringgit, or lessons that aren’t a number', () => {
    expect(paymentInput('g1', { ...draft, amountText: '240.505' })).toEqual({
      check: { code: 'amount_format' },
    })
    expect(paymentInput('g1', { ...draft, amountText: 'abc' })).toEqual({
      check: { code: 'amount_format' },
    })
    expect(paymentInput('g1', { ...draft, lessonsText: '' })).toEqual({
      check: { code: 'invalid_lessons' },
    })
  })
})

describe('paymentErrorField', () => {
  it('puts each refusal under the field it is about', () => {
    expect(paymentErrorField('invalid_lessons')).toBe('lessons')
    expect(paymentErrorField('price_not_set')).toBe('amount')
    expect(paymentErrorField('invalid_amount')).toBe('amount')
    expect(paymentErrorField('amount_format')).toBe('amount')
    expect(paymentErrorField('invalid_method')).toBe('method')
    expect(paymentErrorField('invalid_date')).toBe('date')
    expect(paymentErrorField('invalid_note')).toBe('note')
  })

  it('puts everything else above the buttons', () => {
    expect(paymentErrorField('not_found')).toBe('form')
    expect(paymentErrorField('network')).toBe('form')
    expect(paymentErrorField('unknown')).toBe('form')
  })
})
