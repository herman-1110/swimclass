import { beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { readRows, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { lessonsPriceCents, packagePriceCents } from './packagePrice'

beforeAll(async () => {
  // The last test checks the preview against the demo database: load it here (about 4 s).
  await logOut()
  await getSession()
}, 60_000)

const prices = {
  price_1to1_cents: 24000,
  price_1to2_cents: 40000,
  price_1to3_cents: null,
  lessons_per_package: 4,
}

describe('packagePriceCents', () => {
  it('gives the price of the group’s type', () => {
    expect(packagePriceCents(prices, 1)).toBe(24000)
    expect(packagePriceCents(prices, 2)).toBe(40000)
  })

  it('gives null for a price the coach hasn’t set', () => {
    expect(packagePriceCents(prices, 3)).toBeNull()
  })

  it('gives null for a size that has no type', () => {
    expect(packagePriceCents(prices, 0)).toBeNull()
    expect(packagePriceCents(prices, 4)).toBeNull()
  })
})

describe('lessonsPriceCents', () => {
  it('prices a whole package at the package price', () => {
    expect(lessonsPriceCents(prices, 1, 4)).toBe(24000)
  })

  it('prices other numbers of lessons pro rata', () => {
    expect(lessonsPriceCents(prices, 1, 1)).toBe(6000)
    expect(lessonsPriceCents(prices, 2, 6)).toBe(60000)
  })

  it('rounds to the cent, halves up, as the database does', () => {
    // 1001 × 1 ÷ 2 = 500.5 → 501; 1001 × 1 ÷ 3 = 333.67 → 334.
    expect(
      lessonsPriceCents({ ...prices, price_1to1_cents: 1001, lessons_per_package: 2 }, 1, 1),
    ).toBe(501)
    expect(
      lessonsPriceCents({ ...prices, price_1to1_cents: 1001, lessons_per_package: 3 }, 1, 1),
    ).toBe(334)
  })

  it('gives null when the type has no price', () => {
    expect(lessonsPriceCents(prices, 3, 4)).toBeNull()
  })
})

describe('lessonsPriceCents against the database', () => {
  it('matches what record_payment charges when no amount is typed', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const saved = await rpc('update_settings', { p_settings: { price_1to1_cents: 1002 } })
    const hana = 'c0000000-0000-4000-8000-000000000003'
    for (const lessons of [1, 3, 4]) {
      const id = await rpc('record_payment', {
        p_group_id: hana,
        p_lessons: lessons,
        // null means "the type's price": the generated type can't say so (data-contracts §9.1).
        p_amount_cents: null as unknown as number,
        p_method: 'cash',
      })
      const [payment] = await readRows('payments', { eq: { id } })
      expect(payment.amount_cents).toBe(lessonsPriceCents(saved, 1, lessons))
    }
    // 1002 × 1 ÷ 4 = 250.5, which both round to 251.
    expect(lessonsPriceCents(saved, 1, 1)).toBe(251)
  })
})
