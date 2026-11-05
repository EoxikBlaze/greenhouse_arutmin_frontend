import { describe, expect, it } from 'vitest'
import { labelStatusManual, periksaIsian, type BatasManual } from './nutrisiManual'
import { susunHasil, titikGrafik, type HasilUjiLab } from './ujiLab'

const BATAS: BatasManual = {
  jeda_menit: 20,
  durasi_maks_detik: 600,
  zat: {
    nutrisi_a: { nama: 'Nutrisi A', maks_ml: 214, laju_ml_per_detik: 2, jatah_harian_ml: 500 },
    nutrisi_b: { nama: 'Nutrisi B', maks_ml: 214, laju_ml_per_detik: 2, jatah_harian_ml: 500 },
    ph_up: { nama: 'pH Up', maks_ml: 10, laju_ml_per_detik: 1.5, jatah_harian_ml: 100 },
    ph_down: { nama: 'pH Down', maks_ml: 10, laju_ml_per_detik: 1.5, jatah_harian_ml: 100 },
  },
}

describe('periksaIsian (Nutrisi Manual)', () => {
  it('menolak kosong/nol/negatif', () => {
    expect(periksaIsian('ph_up', 'volume', '', BATAS)).toBeTruthy()
    expect(periksaIsian('ph_up', 'volume', '0', BATAS)).toBeTruthy()
    expect(periksaIsian('ph_up', 'volume', '-3', BATAS)).toBeTruthy()
  })
  it('menolak melewati batas per sekali dosing (volume dan durasi×laju)', () => {
    expect(periksaIsian('ph_up', 'volume', '10.5', BATAS)).toMatch(/batas 10 mL/)
    expect(periksaIsian('nutrisi_a', 'durasi', '120', BATAS)).toMatch(/batas 214 mL/)
    expect(periksaIsian('nutrisi_a', 'durasi', '700', BATAS)).toMatch(/600 detik/)
  })
  it('menerima isian sah (koma desimal)', () => {
    expect(periksaIsian('ph_up', 'volume', '5,5', BATAS)).toBeNull()
    expect(periksaIsian('nutrisi_b', 'durasi', '30', BATAS)).toBeNull()
  })
})

describe('labelStatusManual', () => {
  it('berjalan / selesai / gagal / dibatalkan', () => {
    expect(labelStatusManual('berjalan').teks).toBe('berjalan')
    expect(labelStatusManual('sukses').teks).toBe('selesai')
    expect(labelStatusManual('gagal').teks).toBe('gagal')
    expect(labelStatusManual('lock').teks).toBe('gagal')
    expect(labelStatusManual('dibatalkan').teks).toBe('dibatalkan')
  })
})

describe('Uji Lab: susunHasil & titikGrafik', () => {
  const spek = {
    brix: { nama: 'Brix', satuan: '°Brix', min: 0, max: 40 },
    bobot_g: { nama: 'Bobot', satuan: 'g', min: 0, max: 50000 },
  }
  it('hanya kolom terisi yang dikirim; koma desimal diterima', () => {
    expect(susunHasil(spek, { brix: '12,5', bobot_g: '' })).toEqual({ hasil: [{ parameter: 'brix', nilai: 12.5 }], galat: null })
  })
  it('menolak kosong dan di luar rentang', () => {
    expect(susunHasil(spek, {}).galat).toMatch(/minimal satu/)
    expect(susunHasil(spek, { brix: '99' }).galat).toMatch(/Brix/)
  })
  it('titik grafik urut tanggal naik, hanya parameter yang dipilih', () => {
    const h = (tanggal: string, parameter: string, nilai: number) => ({ id: tanggal + parameter, kategori: 'buah', tanggal, parameter, nilai, satuan: null, catatan: null, dicatat_oleh: null }) as HasilUjiLab
    const t = titikGrafik([h('2026-11-03T00:00:00', 'brix', 11), h('2026-11-01', 'brix', 9), h('2026-11-02', 'bobot_g', 1500)], 'brix')
    expect(t).toEqual([{ tanggal: '2026-11-01', nilai: 9 }, { tanggal: '2026-11-03', nilai: 11 }])
  })
})
