import { describe, expect, it } from 'vitest'

import { accountLabel, accountLine } from './accountLabel'

const hana = { size: 1, display_names: 'Hana', location: 'Sunrise Res.' } as const
const weiJie = { size: 1, display_names: 'Wei Jie', location: 'Palm Court' } as const
const aimanAndSofia = { size: 2, display_names: 'Aiman & Sofia', location: 'Palm Court' } as const

describe('accountLabel', () => {
  it('names the account holder when the group is someone else', () => {
    expect(accountLabel(hana, 'Farah')).toBe('Farah’s account')
    expect(accountLabel(aimanAndSofia, 'Mei Ling')).toBe('Mei Ling’s account')
  })

  it('says "Own account" when the account holder books for themselves', () => {
    expect(accountLabel(weiJie, 'Wei Jie')).toBe('Own account')
  })

  it('compares the names trimmed and in any case', () => {
    expect(accountLabel(weiJie, '  wei jie ')).toBe('Own account')
  })

  it('never calls a group of several students the account holder’s own', () => {
    expect(accountLabel(aimanAndSofia, 'Aiman & Sofia')).toBe('Aiman & Sofia’s account')
  })

  it('trims the account name it shows', () => {
    expect(accountLabel(hana, ' Farah ')).toBe('Farah’s account')
  })
})

describe('accountLine', () => {
  it('adds the pool location, as the Students table writes it', () => {
    expect(accountLine(hana, 'Farah')).toBe('Farah’s account · Sunrise Res.')
    expect(accountLine(weiJie, 'Wei Jie')).toBe('Own account · Palm Court')
  })
})
