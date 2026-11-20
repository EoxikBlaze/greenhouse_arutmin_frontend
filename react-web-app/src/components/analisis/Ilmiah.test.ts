import { describe, expect, it } from 'vitest'
import { teksCI, teksMedianIqr, teksP } from './Ilmiah'

describe('format angka ilmiah', () => {
  it('nilai p: ambang < 0,001, tiga desimal, kosong', () => {
    expect(teksP(0.0004)).toBe('< 0,001')
    expect(teksP(0.0391)).toBe('0,039')
    expect(teksP(0.5)).toBe('0,500')
    expect(teksP(null)).toBe('—')
    expect(teksP(Number.NaN)).toBe('—')
  })

  it('angka dengan selang kepercayaan dan median dengan kuartil', () => {
    expect(teksCI(6.52, 6.4, 6.61, 2)).toBe('6,52 [6,40; 6,61]')
    expect(teksCI(6.52, null, null, 2)).toBe('6,52')
    expect(teksCI(null, 1, 2, 2)).toBe('—')
    expect(teksMedianIqr({ median: 6.5, q1: 6.2, q3: 6.8 }, 1)).toBe('6,5 (6,2–6,8)')
    expect(teksMedianIqr(null, 1)).toBe('—')
  })
})
