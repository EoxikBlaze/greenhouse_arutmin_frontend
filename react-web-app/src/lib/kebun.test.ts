import { describe, expect, it } from 'vitest'
import {
  kenaikanPerHari,
  labelSiap,
  perkiraanSelesai,
  progres,
  ringkasBatch,
  saring,
  type TanamRow,
} from './kebun'

const baris = (o: Partial<TanamRow> = {}): TanamRow => ({
  id: 1,
  tipe: 'semai',
  status: 'proses',
  mulai: '2026-10-20',
  varietas: 'Selada',
  meja: 'Meja Selada',
  hari_ke: 5,
  durasi_hari: 20,
  siap: false,
  tahap_berikut: 'peremajaan',
  ...o,
})

describe('progres', () => {
  it('menghitung persen dan label hari', () => {
    expect(progres(baris())).toMatchObject({ persen: 25, label: 'Hari ke-5 dari 20' })
  })
  it('lewat durasi → 100% dan label tetap jujur', () => {
    expect(progres(baris({ hari_ke: 25 }))).toMatchObject({ persen: 100, label: 'Hari ke-25 dari 20', lewat: 5 })
    expect(progres(baris({ hari_ke: 20 })).lewat).toBe(0)
  })
  it('tanpa durasi (siklus belum diisi admin) → tanpa persen', () => {
    expect(progres(baris({ durasi_hari: null }))).toMatchObject({ persen: 0, durasi: null, label: 'Hari ke-5' })
  })
  it('tanpa hari_ke → dianggap hari pertama', () => {
    expect(progres(baris({ hari_ke: undefined })).hari).toBe(1)
  })
})

describe('labelSiap', () => {
  it('menyebut tahap berikutnya', () => {
    expect(labelSiap(baris({ siap: true }))).toBe('Siap pindah ke Peremajaan')
    expect(labelSiap(baris({ siap: true, tipe: 'pendewasaan', tahap_berikut: 'panen' }))).toBe('Siap panen')
  })
  it('belum siap → null', () => {
    expect(labelSiap(baris())).toBeNull()
  })
})

describe('ringkasBatch', () => {
  it('menghitung batch, siap, dan meja berbeda', () => {
    const r = ringkasBatch([
      baris({ id: 1 }),
      baris({ id: 2, siap: true, meja: 'Meja Seledri' }),
      baris({ id: 3, meja: 'Meja Selada' }),
      baris({ id: 4, meja: null }),
    ])
    expect(r).toEqual({ aktif: 4, siap: 1, meja: 2 })
  })
  it('daftar kosong', () => {
    expect(ringkasBatch([])).toEqual({ aktif: 0, siap: 0, meja: 0 })
  })
})

describe('saring', () => {
  const data = [
    baris({ id: 1, varietas: 'Selada', tipe: 'semai' }),
    baris({ id: 2, varietas: 'Seledri', tipe: 'peremajaan', meja: 'Meja B' }),
    baris({ id: 3, varietas: 'Bayam', tipe: 'pendewasaan', meja: 'Meja C' }),
  ]
  it('tanpa kata kunci dan "Semua" → semuanya', () => {
    expect(saring(data, '', 'Semua')).toHaveLength(3)
  })
  it('filter tahap', () => {
    expect(saring(data, '', 'Peremajaan').map((r) => r.id)).toEqual([2])
  })
  it('pencarian mencakup varietas, meja, dan nama tahap, tanpa peduli huruf besar', () => {
    expect(saring(data, 'BAYAM', 'Semua').map((r) => r.id)).toEqual([3])
    expect(saring(data, 'meja b', 'Semua').map((r) => r.id)).toEqual([2])
    expect(saring(data, 'pendewasaan', 'Semua').map((r) => r.id)).toEqual([3])
  })
  it('kata kunci dan filter digabung', () => {
    expect(saring(data, 'sela', 'Semai').map((r) => r.id)).toEqual([1])
    expect(saring(data, 'sela', 'Peremajaan')).toEqual([])
  })
})

describe('perkiraanSelesai', () => {
  it('mulai + durasi hari', () => {
    const ms = perkiraanSelesai('2026-10-20', 14)!
    const d = new Date(ms)
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 3])
  })
  it('durasi atau tanggal tak valid → null', () => {
    expect(perkiraanSelesai('2026-10-20', null)).toBeNull()
    expect(perkiraanSelesai('bukan-tanggal', 14)).toBeNull()
    expect(perkiraanSelesai(null, 14)).toBeNull()
  })
})

describe('kenaikanPerHari', () => {
  it('(target − awal) / hari', () => {
    expect(kenaikanPerHari(400, 2400, 60)).toBeCloseTo(33.333, 2)
  })
  it('kosong, hari 0, atau target di bawah awal → null', () => {
    expect(kenaikanPerHari(null, 2400, 60)).toBeNull()
    expect(kenaikanPerHari(400, null, 60)).toBeNull()
    expect(kenaikanPerHari(400, 2400, 0)).toBeNull()
    expect(kenaikanPerHari(2500, 2400, 60)).toBeNull()
  })
})
