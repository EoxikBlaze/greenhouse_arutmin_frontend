import { describe, expect, it } from 'vitest'
import { angkaId, angkaMaks, tanggalIso, tglJam, tglPendek } from './format'

/** Waktu lokal supaya tes tidak bergantung zona waktu mesin. */
const lokal = new Date(2026, 7, 19, 14, 5, 9)

describe('tglPendek', () => {
  it('tanggal lokal dengan tahun', () => {
    expect(tglPendek(lokal.getTime())).toBe('19 Agu 2026')
    expect(tglPendek(lokal.toISOString())).toBe('19 Agu 2026')
  })
  it('kosong atau tak valid → "—"', () => {
    for (const v of [null, undefined, '', 'bukan-tanggal']) expect(tglPendek(v)).toBe('—')
  })
})

describe('tglJam', () => {
  it('tanggal · jam, tahun bisa dibuang', () => {
    expect(tglJam(lokal.getTime())).toBe('19 Agu 2026 · 14:05')
    expect(tglJam(lokal.getTime(), { tahun: false })).toBe('19 Agu · 14:05')
  })
  it('kosong atau tak valid → "—"', () => {
    expect(tglJam(null)).toBe('—')
    expect(tglJam('xx')).toBe('—')
  })
})

describe('tanggalIso', () => {
  it('YYYY-MM-DD lokal dengan nol di depan', () => {
    expect(tanggalIso(new Date(2026, 0, 5).getTime())).toBe('2026-01-05')
  })
})

describe('angkaId & angkaMaks', () => {
  it('desimal tetap gaya Indonesia', () => {
    expect(angkaId(6.2, 2)).toBe('6,20')
    expect(angkaId(1250, 0)).toBe('1.250')
  })
  it('desimal secukupnya', () => {
    expect(angkaMaks(2400, 1)).toBe('2.400')
    expect(angkaMaks(33.3333, 1)).toBe('33,3')
  })
})
