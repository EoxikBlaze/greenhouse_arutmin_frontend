import { describe, expect, it } from 'vitest'
import { tentukanPerforma, ujiHitung } from './performa'

describe('tentukanPerforma', () => {
  it('cepat → bagus, lambat (CPU diperlambat) → ringan', () => {
    expect(tentukanPerforma(2)).toBe('bagus')
    expect(tentukanPerforma(18)).toBe('bagus')
    expect(tentukanPerforma(40)).toBe('ringan')
  })
  it('mode hemat data selalu ringan', () => {
    expect(tentukanPerforma(1, { hematData: true })).toBe('ringan')
  })
  it('uji hitung mengembalikan durasi positif', () => {
    expect(ujiHitung()).toBeGreaterThanOrEqual(0)
  })
})
