import { describe, expect, it } from 'vitest'
import { saring, teksTenggat, urutUrgensi, type StatusAlat } from './kalibrasi'

const a = (sensor: string, status: StatusAlat) => ({ sensor, status })
const DATA = [a('ph', 'belum'), a('ec', 'aman'), a('suhu_air', 'terlambat'), a('mixing', 'tanpa_jadwal'), a('pulsa_peristaltik', 'segera'), a('suhu_udara', 'belum')]

describe('kalibrasi', () => {
  it('urut urgensi, stabil di status sama', () => {
    expect(urutUrgensi(DATA).map((r) => r.sensor)).toEqual(['suhu_air', 'pulsa_peristaltik', 'ph', 'suhu_udara', 'ec', 'mixing'])
  })
  it('saring kelompok dan status (AND)', () => {
    expect(saring(DATA, 'Sensor', null).map((r) => r.sensor)).toEqual(['ph', 'ec', 'suhu_air', 'suhu_udara'])
    expect(saring(DATA, 'Aktuator', null).map((r) => r.sensor)).toEqual(['mixing', 'pulsa_peristaltik'])
    expect(saring(DATA, 'Perlu tindakan', null)).toHaveLength(4)
    expect(saring(DATA, 'Sensor', 'belum').map((r) => r.sensor)).toEqual(['ph', 'suhu_udara'])
  })
  it('teks tenggat', () => {
    const now = new Date('2026-10-29T00:00:00Z')
    expect(teksTenggat({ status: 'belum', jatuh_tempo: null }, now)).toBe('Belum pernah dikalibrasi')
    expect(teksTenggat({ status: 'terlambat', jatuh_tempo: '2026-10-17T00:00:00Z' }, now)).toBe('Terlambat 12 hari')
    expect(teksTenggat({ status: 'aman', jatuh_tempo: '2026-11-26T00:00:00Z' }, now)).toContain('28 hari lagi')
  })
})
