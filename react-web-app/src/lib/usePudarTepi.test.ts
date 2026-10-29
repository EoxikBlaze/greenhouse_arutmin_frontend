import { describe, expect, it } from 'vitest'
import { hitungPudar } from './usePudarTepi'

describe('hitungPudar', () => {
  it('null untuk elemen di tengah layar', () => expect(hitungPudar(300, 400, 900, 70)).toBeNull())
  it('null untuk elemen di luar layar', () => {
    expect(hitungPudar(-300, -10, 900, 70)).toBeNull()
    expect(hitungPudar(950, 1100, 900, 70)).toBeNull()
  })
  it('aktif di zona atas dan bawah, batas menaik', () => {
    for (const [t, b] of [[20, 150], [780, 900]]) {
      const p = hitungPudar(t, b, 900, 70)
      expect(p).not.toBeNull()
      expect(p![0]).toBeLessThan(p![1])
      expect(p![1]).toBeLessThan(p![2])
      expect(p![2]).toBeLessThan(p![3])
    }
  })
  it('posisi dihitung dari kotak mask yang dilebarkan', () => {
    // top 100 → origin 60; y1 = 64 → p1 = 4
    expect(hitungPudar(100, 140, 900, 70)![0]).toBe(4)
  })
})
