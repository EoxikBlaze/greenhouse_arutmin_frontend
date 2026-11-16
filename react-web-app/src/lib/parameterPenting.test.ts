import { describe, expect, it } from 'vitest'
import { barisLevel, barisSensor } from './parameterPenting'

const AMBANG = [
  { sensor: 'ph', min: 5, max: 7, updated_at: '2026-10-14T22:34:33Z' },
  { sensor: 'tds', min: '50', max: '2600' },
]

describe('barisSensor', () => {
  it('bacaan segar: nilai + status batas dari Ambang Sensor, EC dihitung dari TDS', () => {
    const r = barisSensor({ is_online: true, seconds_ago: 3, sensor: { ph: 7.6, tds: 1000, waterTemp: 25 } }, AMBANG)
    const ph = r.find((b) => b.kunci === 'ph')!
    expect(ph.nilai).toBe('7,60')
    expect(ph.status).toBe('di_luar_batas')
    expect(ph.batas).toBe('5,0–7,0')
    const tds = r.find((b) => b.kunci === 'tds')!
    expect(tds.status).toBe('normal')
    expect(tds.catatan).toContain('2,00 mS/cm')
    expect(r.find((b) => b.kunci === 'waterTemp')!.status).toBe('batas_belum_diatur')
  })

  it('bacaan basi tidak ditampilkan sebagai nilai sekarang; batas tetap tampil sebagai batas', () => {
    const r = barisSensor({ is_online: false, seconds_ago: 900, sensor: { ph: 6.1 } }, AMBANG)
    const ph = r.find((b) => b.kunci === 'ph')!
    expect(ph.nilai).toBeNull()
    expect(ph.status).toBe('basi')
    expect(ph.batas).toBe('5,0–7,0')
  })

  it('tanpa data: kosong, tanpa angka pengganti', () => {
    const r = barisSensor(null, [])
    expect(r.every((b) => b.nilai === null && b.status === 'kosong')).toBe(true)
  })
})

describe('barisLevel', () => {
  it('membedakan belum dilaporkan, kurang, cukup, penuh', () => {
    expect(barisLevel(null, null).status).toBe('kosong')
    expect(barisLevel(0, 0).status).toBe('perhatian')
    expect(barisLevel(1, 0).nilai).toBe('Cukup')
    expect(barisLevel(1, 1).nilai).toContain('Penuh')
  })
})
