import { describe, expect, it } from 'vitest'

import { parseTimeOfDay, shortTimeOfDay } from './timeText'

describe('parseTimeOfDay', () => {
  it.each([
    ['8:00 pm', '20:00'],
    ['8pm', '20:00'],
    ['8:00 PM', '20:00'],
    ['8:30pm', '20:30'],
    ['  7:45 am ', '07:45'],
    ['20:00', '20:00'],
    ['7:05', '07:05'],
    ['00:30', '00:30'],
    ['12:00 am', '00:00'],
    ['12 pm', '12:00'],
    ['12:15 pm', '12:15'],
    ['11:59 pm', '23:59'],
  ])('reads "%s" as %s', (text, time) => {
    expect(parseTimeOfDay(text)).toBe(time)
  })

  it.each([
    ['8', 'am or pm?'],
    ['800', 'am or pm?'],
    ['24:00', 'the clock never reaches it'],
    ['25:00', 'no such hour'],
    ['13:00 pm', 'no such hour'],
    ['0:30 am', 'no such hour'],
    ['8:60 pm', 'no such minute'],
    ['8.30 pm', 'not a time'],
    ['', 'empty'],
    ['soon', 'not a time'],
  ])('refuses "%s" (%s)', (text) => {
    expect(parseTimeOfDay(text)).toBeNull()
  })
})

describe('shortTimeOfDay', () => {
  it('drops zero seconds and keeps others', () => {
    expect(shortTimeOfDay('17:30:00')).toBe('17:30')
    expect(shortTimeOfDay('24:00:00')).toBe('24:00')
    expect(shortTimeOfDay('17:30:30')).toBe('17:30:30')
    expect(shortTimeOfDay('17:30')).toBe('17:30')
  })
})
