import { describe, expect, it } from 'vitest'

import { intersectRanges, mergeRanges, subtractRanges } from './ranges'

const r = (start: number, end: number) => ({ start, end })

describe('mergeRanges', () => {
  it('sorts and joins overlapping and touching ranges, dropping empty ones', () => {
    expect(mergeRanges([r(1170, 1230), r(1110, 1170), r(1300, 1320), r(900, 900)])).toEqual([
      r(1110, 1230),
      r(1300, 1320),
    ])
    expect(mergeRanges([r(0, 100), r(50, 80)])).toEqual([r(0, 100)])
  })

  it('never changes what it was given', () => {
    const given = [r(10, 20), r(20, 30)]
    mergeRanges(given)
    expect(given).toEqual([r(10, 20), r(20, 30)])
  })
})

describe('subtractRanges', () => {
  it('cuts holes out of ranges', () => {
    expect(subtractRanges([r(1050, 1320)], [r(1170, 1230), r(1110, 1170)])).toEqual([
      r(1050, 1110),
      r(1230, 1320),
    ])
  })

  it('takes out whole ranges and ignores holes elsewhere', () => {
    expect(subtractRanges([r(420, 720), r(960, 1320)], [r(400, 730), r(0, 10)])).toEqual([
      r(960, 1320),
    ])
  })
})

describe('intersectRanges', () => {
  it('keeps what is in both, joined', () => {
    expect(intersectRanges([r(990, 1050), r(1110, 1170)], [r(1050, 1320)])).toEqual([r(1110, 1170)])
    expect(intersectRanges([r(1110, 1170), r(1170, 1230)], [r(1050, 1200), r(1200, 1320)])).toEqual(
      [r(1110, 1230)],
    )
  })
})
