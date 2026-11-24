import { describe, expect, it } from 'vitest'
import { bacaCsvSensor, galatTanggal, geserTanggal, hariUntukNutrisi, hitungRentang, labelInterval } from './riwayatSensor'

// 21 Nov 2026 14:30 waktu lokal
const SEKARANG = new Date(2026, 10, 21, 14, 30, 0).getTime()
const HARI = 86_400_000

describe('riwayatSensor', () => {
  it('rentang preset berakhir sekarang dan live', () => {
    const r = hitungRentang('3 Hari', null, SEKARANG)!
    expect(r.live).toBe(true)
    expect(r.sampai).toBe(SEKARANG)
    expect(SEKARANG - r.dari).toBe(3 * HARI)
    expect(SEKARANG - hitungRentang('7 Hari', null, SEKARANG)!.dari).toBe(7 * HARI)
  })

  it('"Hari ini" mulai tengah malam lokal', () => {
    const r = hitungRentang('Hari ini', null, SEKARANG)!
    expect(new Date(r.dari).getHours()).toBe(0)
    expect(new Date(r.dari).getDate()).toBe(21)
  })

  it('tanggal lampau: tidak live, mencakup satu hari penuh', () => {
    const r = hitungRentang('Pilih tanggal', { dari: '2026-11-19', sampai: '2026-11-19' }, SEKARANG)!
    expect(r.live).toBe(false)
    expect(new Date(r.dari).getHours()).toBe(0)
    expect(new Date(r.sampai).getHours()).toBe(23)
  })

  it('tanggal yang mencakup hari ini ikut live dan dipotong di sekarang', () => {
    const r = hitungRentang('Pilih tanggal', { dari: '2026-11-20', sampai: '2026-11-21' }, SEKARANG)!
    expect(r.live).toBe(true)
    expect(r.sampai).toBe(SEKARANG)
  })

  it('tanpa waktu sekarang atau tanggal tidak sah → null / pesan galat', () => {
    expect(hitungRentang('3 Hari', null, 0)).toBeNull()
    expect(hitungRentang('Pilih tanggal', null, SEKARANG)).toBeNull()
    expect(galatTanggal('2026-11-20', '2026-11-19')).toMatch(/sebelum/)
    expect(galatTanggal('2026-01-01', '2026-11-21')).toMatch(/92/)
    expect(galatTanggal('', '')).not.toBeNull()
    expect(galatTanggal('2026-11-01', '2026-11-07')).toBeNull()
  })

  it('geser sepanjang rentangnya sendiri', () => {
    expect(geserTanggal({ dari: '2026-11-19', sampai: '2026-11-19' }, -1)).toEqual({ dari: '2026-11-18', sampai: '2026-11-18' })
    expect(geserTanggal({ dari: '2026-11-15', sampai: '2026-11-21' }, -1)).toEqual({ dari: '2026-11-08', sampai: '2026-11-14' })
    expect(geserTanggal({ dari: '2026-11-15', sampai: '2026-11-21' }, 1)).toEqual({ dari: '2026-11-22', sampai: '2026-11-28' })
  })

  it('membaca CSV sensor: sel kosong null, komentar dan baris rusak dilewati', () => {
    const csv = '\uFEFFWAKTU,SUHU AIR (C),PH,NUTRISI (PPM),EC (MS/CM),SUHU UDARA (C),KELEMBAPAN (%)\n'
      + '2026-11-14 00:45:04,29,6.4,430,0.86,30,60\n'
      + '2026-11-14 00:50:04,,6.5,,,31,\n'
      + 'rusak,1,2,3,4,5,6\n'
      + '# DIPOTONG: hanya 5000 bacaan terbaru'
    const r = bacaCsvSensor(csv)
    expect(r).toHaveLength(2)
    expect(r[0]).toMatchObject({ waktu: '2026-11-14T00:45:04', waterTemp: 29, ph: 6.4, tds: 430, ec_ms_cm: 0.86, airTemp: 30, humidity: 60 })
    expect(r[1]).toMatchObject({ waterTemp: null, ph: 6.5, tds: null, ec_ms_cm: null, airTemp: 31, humidity: null })
  })

  it('hari untuk grafik nutrisi dibatasi 1–14; label interval terbaca', () => {
    expect(hariUntukNutrisi({ dari: SEKARANG - 3 * 3_600_000, sampai: SEKARANG, live: true })).toBe(1)
    expect(hariUntukNutrisi({ dari: SEKARANG - 7 * HARI, sampai: SEKARANG, live: true })).toBe(7)
    expect(hariUntukNutrisi({ dari: SEKARANG - 60 * HARI, sampai: SEKARANG, live: true })).toBe(14)
    expect(labelInterval(30)).toBe('30 detik')
    expect(labelInterval(300)).toBe('5 menit')
    expect(labelInterval(7200)).toBe('2 jam')
  })
})
