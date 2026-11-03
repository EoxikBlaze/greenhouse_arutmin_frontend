import { describe, expect, it } from 'vitest'
import {
  hitungBatasMlPh,
  hitungLajuPompa,
  hitungPratinjauDosis,
  hitungSirkulasi,
  hitungUjiLabEc,
  hitungUjiLabPh,
} from './iotV41'

describe('iotV41 kalkulator murni', () => {
  it('menghitung waktu satu putaran larutan (T_putar) dan saran monitoring (2x T_putar)', () => {
    expect(hitungSirkulasi(0, 5, 1)).toEqual({
      putaran_menit: 0,
      saran_monitoring_menit: 0,
      saran_jeda_ab_menit: 5,
    })
    expect(hitungSirkulasi(200, 10, 1)).toEqual({
      putaran_menit: 20,
      saran_monitoring_menit: 40,
      saran_jeda_ab_menit: 5,
    })
  })

  it('menghitung batas mL koreksi pH otomatis dari volume (0,2 x volume, minimal 5 mL)', () => {
    expect(hitungBatasMlPh(0, 10)).toBe(5)
    expect(hitungBatasMlPh(0, 200)).toBe(40)
    expect(hitungBatasMlPh(12, 200)).toBe(12)
  })

  it('menghitung uji lab EC (ppm/mL) dan uji lab pH (mL/pH/L)', () => {
    expect(hitungUjiLabEc(100, 1000, 1, 5, 5)).toBe(90)
    expect(hitungUjiLabEc(800, 700, 1, 5, 5)).toBeNull()
    expect(hitungUjiLabPh(1, 0.5, 0.5)).toBe(1)
    expect(hitungUjiLabPh(1, 0, 0.5)).toBeNull()
  })

  it('menghitung laju pompa (mL/detik) dan pratinjau dosis A+B 65%', () => {
    expect(hitungLajuPompa(30, 60)).toBe(2)
    expect(hitungLajuPompa(3, 10)).toBeNull()
    const pr = hitungPratinjauDosis({
      ec_sekarang: 500,
      ec_setpoint: 900,
      persen_dosing: 65,
      max_ppm_dosing: 300,
      volume_l: 200,
      ppm_per_ml: 100,
      laju_a: 1,
      laju_b: 2,
    })
    expect(pr.kurang_ppm).toBe(400)
    expect(pr.dosis_ppm).toBe(260)
    expect(pr.total_ml).toBe(520)
    expect(pr.durasi_a_detik).toBe(260)
    expect(pr.durasi_b_detik).toBe(130)
  })
})

