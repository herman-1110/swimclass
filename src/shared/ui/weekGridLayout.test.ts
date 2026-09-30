import { describe, expect, it } from 'vitest'

import { blockPosition, gridHours, weekGridHours } from './weekGridLayout'

// Minutes from midnight: 7 am = 420, 10 pm = 1320, midnight = 1440.

describe('weekGridHours', () => {
  it('is 7 am to 10 pm when everything falls inside', () => {
    expect(weekGridHours([])).toEqual({ from: 420, to: 1320 })
    expect(
      weekGridHours([
        { start: 1050, end: 1320 }, // open 5:30–10:00 pm
        { start: 420, end: 720 }, // open 7:00 am–12:00 pm
        { start: 540, end: 600 }, // a lesson 9–10 am
      ]),
    ).toEqual({ from: 420, to: 1320 })
  })

  it('starts earlier on the hour for early open time or lessons', () => {
    // "Open extra time" 6:00–7:00 am (customer-schedule spec §3.2)
    expect(weekGridHours([{ start: 360, end: 720 }])).toEqual({ from: 360, to: 1320 })
    // A lesson from 6:30 am starts the grid at 6 am.
    expect(weekGridHours([{ start: 390, end: 450 }])).toEqual({ from: 360, to: 1320 })
  })

  it('ends later on the hour, and never past midnight', () => {
    expect(weekGridHours([{ start: 1320, end: 1380 }])).toEqual({ from: 420, to: 1380 })
    expect(weekGridHours([{ start: 1350, end: 1390 }])).toEqual({ from: 420, to: 1440 })
    // A lesson across midnight, cut at 24:00 by the caller or not.
    expect(weekGridHours([{ start: 1380, end: 1440 }])).toEqual({ from: 420, to: 1440 })
    expect(weekGridHours([{ start: 1380, end: 1500 }])).toEqual({ from: 420, to: 1440 })
  })

  it('ignores empty stretches', () => {
    expect(weekGridHours([{ start: 300, end: 300 }])).toEqual({ from: 420, to: 1320 })
  })
})

describe('blockPosition', () => {
  it('places a block by its minutes in half-hour rows, inset 1 px top and bottom', () => {
    // 7:30–8:30 pm on the 7 am grid: 25 rows down, 2 rows tall (design rows 26/28).
    expect(blockPosition({ start: 1170, end: 1230 }, 420, 1320)).toEqual({
      top: 'calc(25 * var(--row) + 1px)',
      height: 'max(1px, calc(2 * var(--row) - 2px))',
    })
    // Closed 7:00 am–5:30 pm: rows 1/22.
    expect(blockPosition({ start: 420, end: 1050 }, 420, 1320)).toEqual({
      top: 'calc(0 * var(--row) + 1px)',
      height: 'max(1px, calc(21 * var(--row) - 2px))',
    })
  })

  it('places any minute, not just half hours', () => {
    // Blocked from 3:10 pm to 4:00 pm.
    expect(blockPosition({ start: 910, end: 960 }, 420, 1320)).toEqual({
      top: 'calc(16.3333 * var(--row) + 1px)',
      height: 'max(1px, calc(1.6667 * var(--row) - 2px))',
    })
  })

  it('counts from the first hour shown', () => {
    expect(blockPosition({ start: 360, end: 420 }, 360, 1320)).toEqual({
      top: 'calc(0 * var(--row) + 1px)',
      height: 'max(1px, calc(2 * var(--row) - 2px))',
    })
  })

  it('cuts off what falls outside the hours shown, and drops what is all outside', () => {
    expect(blockPosition({ start: 360, end: 480 }, 420, 1320)).toEqual({
      top: 'calc(0 * var(--row) + 1px)',
      height: 'max(1px, calc(2 * var(--row) - 2px))',
    })
    expect(blockPosition({ start: 1290, end: 1380 }, 420, 1320)).toEqual({
      top: 'calc(29 * var(--row) + 1px)',
      height: 'max(1px, calc(1 * var(--row) - 2px))',
    })
    expect(blockPosition({ start: 300, end: 420 }, 420, 1320)).toBeNull()
    expect(blockPosition({ start: 1320, end: 1380 }, 420, 1320)).toBeNull()
  })
})

describe('gridHours', () => {
  it('lists the hour lines that get a label: the first hour to the last but one', () => {
    const hours = gridHours(420, 1320)
    expect(hours).toHaveLength(15)
    expect(hours[0]).toBe(420)
    expect(hours.at(-1)).toBe(1260)
    expect(gridHours(360, 1440)).toHaveLength(18)
  })
})
