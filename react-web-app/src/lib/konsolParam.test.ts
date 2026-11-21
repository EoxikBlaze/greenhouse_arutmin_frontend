import { describe, expect, it } from 'vitest'
import { bacaKeluaranParam, bandingkanParam } from './konsolParam'

const CONTOH = [
  '  volume_l                 = 100',
  '  ppm_per_ml_ab            = 0   <- WAJIB, belum diisi',
  '  persen_dosis             = 80',
  '  ph_toleransi             = 0.2',
  '  telemetri_dtk            = 5',
  '  tz_menit                 = 480',
].join('\n') + '\n'

describe('bacaKeluaranParam', () => {
  it('membaca nama dan angka, termasuk baris bertanda WAJIB', () => {
    const m = bacaKeluaranParam(CONTOH)
    expect(m.get('volume_l')).toBe(100)
    expect(m.get('ppm_per_ml_ab')).toBe(0)
    expect(m.get('ph_toleransi')).toBe(0.2)
    expect(m.size).toBe(6)
  })
  it('teks kosong atau terpotong tidak melempar galat', () => {
    expect(bacaKeluaranParam(null).size).toBe(0)
    const terpotong = '  persen_dosis   = 80\n  maks_ab_hari  = 6'
    expect(bacaKeluaranParam(terpotong).get('persen_dosis')).toBe(80)
    // baris terakhir tanpa ganti baris (keluaran konsol terpotong) diabaikan
    expect(bacaKeluaranParam(terpotong).has('maks_ab_hari')).toBe(false)
  })
})

describe('bandingkanParam', () => {
  it('cocok, beda, dan tidak terbaca', () => {
    const alat = bacaKeluaranParam(CONTOH)
    const h = bandingkanParam([
      { param: 'persen_dosis', nilai: 80 },
      { param: 'ph_toleransi', nilai: 0.3 },
      { param: 'maks_ab_hari', nilai: 6 },
    ], alat)
    expect(h.map((x) => x.status)).toEqual(['cocok', 'beda', 'tidak_terbaca'])
  })
})
