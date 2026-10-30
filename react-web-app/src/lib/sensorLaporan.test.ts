// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { FillPattern } from 'exceljs'
import {
  bangunWorkbook,
  formatJam,
  formatTanggal,
  hapusDuplikat,
  kelasWorkbook,
  namaBerkas,
  nilaiAngka,
  ringkas,
  seriParam,
  terakhirPerParam,
  statusBaris,
  statusNilai,
  type Ambang,
  type Titik,
} from './sensorLaporan'

const AMBANG: Ambang = {
  ph: { min: 5.5, max: 6.5 },
  tds: { min: '500', max: '1000' },
  waterTemp: { min: 20, max: 35 },
}

/** Waktu lokal (bukan UTC) supaya tes tidak bergantung zona waktu mesin. */
const lokal = (h: number, m = 0, s = 0) => new Date(2026, 9, 21, h, m, s).toISOString()

describe('nilaiAngka', () => {
  it('menerima angka dan string numerik, menolak kosong dan teks', () => {
    expect(nilaiAngka(6.2)).toBe(6.2)
    expect(nilaiAngka('6.2')).toBe(6.2)
    expect(nilaiAngka(0)).toBe(0)
    expect(nilaiAngka('')).toBeNull()
    expect(nilaiAngka(null)).toBeNull()
    expect(nilaiAngka(undefined)).toBeNull()
    expect(nilaiAngka('abc')).toBeNull()
  })
})

describe('statusNilai', () => {
  it('membedakan rendah, tinggi, normal, kosong, dan tanpa ambang', () => {
    expect(statusNilai(5, AMBANG?.ph)).toBe('rendah')
    expect(statusNilai(7, AMBANG?.ph)).toBe('tinggi')
    expect(statusNilai(6, AMBANG?.ph)).toBe('normal')
    expect(statusNilai(5.5, AMBANG?.ph)).toBe('normal')
    expect(statusNilai(null, AMBANG?.ph)).toBe('kosong')
    expect(statusNilai(9, undefined)).toBe('normal')
  })

  it('ambang berupa string numerik tetap terbaca', () => {
    expect(statusNilai(400, AMBANG?.tds)).toBe('rendah')
  })
})

describe('hapusDuplikat', () => {
  const a: Titik = { id: 1, created_at: '2026-10-21T03:45:36.000Z', ph: 6.2 }
  it('membuang baris dengan waktu dan semua nilai sama, id diabaikan', () => {
    const r = hapusDuplikat([a, { ...a, id: 2 }])
    expect(r.rows).toHaveLength(1)
    expect(r.dibuang).toBe(1)
  })
  it('waktu sama tetapi nilai beda tetap dipertahankan', () => {
    const r = hapusDuplikat([a, { ...a, id: 2, ph: 6.3 }])
    expect(r.rows).toHaveLength(2)
    expect(r.dibuang).toBe(0)
  })
  it('"6.2" dan 6.2 dianggap sama', () => {
    expect(hapusDuplikat([a, { ...a, id: 3, ph: '6.2' }]).dibuang).toBe(1)
  })
})

describe('statusBaris', () => {
  it('menyebut parameter yang keluar ambang', () => {
    const s = statusBaris({ created_at: lokal(10), ph: 7, tds: 400, waterTemp: 25 }, AMBANG)
    expect(s.luar).toEqual(['pH tinggi', 'TDS rendah'])
    expect(s.teks).toBe('Perlu perhatian: pH tinggi, TDS rendah')
  })
  it('normal bila semua terisi dan dalam ambang', () => {
    const s = statusBaris({ created_at: lokal(10), ph: 6, tds: 800, waterTemp: 25, airTemp: 28, humidity: 70 }, AMBANG)
    expect(s.teks).toBe('Normal')
  })
  it('data tidak lengkap bila ada sensor yang tidak dikirim', () => {
    expect(statusBaris({ created_at: lokal(10), ph: 6 }, AMBANG).teks).toBe('Data tidak lengkap')
  })
  it('semua kosong → tanpa data sensor', () => {
    expect(statusBaris({ created_at: lokal(10) }, AMBANG).teks).toBe('Tidak ada data sensor')
  })
})

describe('ringkas', () => {
  const rows: Titik[] = [
    { created_at: lokal(8), ph: 6, tds: 800 },
    { created_at: lokal(9), ph: 7, tds: null },
    { created_at: lokal(10), ph: 5, tds: 900 },
    { created_at: lokal(11), ph: '', tds: 700 },
  ]
  const hasil = ringkas(rows, AMBANG)
  const ph = hasil.find((x) => x.kunci === 'ph')!
  const tds = hasil.find((x) => x.kunci === 'tds')!
  const suhu = hasil.find((x) => x.kunci === 'airTemp')!

  it('menghitung n, terisi, rata-rata, min, maks', () => {
    expect(ph.n).toBe(3)
    expect(ph.terisi).toBeCloseTo(0.75)
    expect(ph.rata).toBeCloseTo(6)
    expect(ph.min).toBe(5)
    expect(ph.maks).toBe(7)
    expect(tds.n).toBe(3)
  })
  it('menghitung bacaan di luar ambang', () => {
    expect(ph.luar).toBe(2)
    expect(tds.luar).toBe(0)
  })
  it('parameter tanpa data → semua statistik null, tanpa NaN', () => {
    expect(suhu.n).toBe(0)
    expect(suhu.rata).toBeNull()
    expect(suhu.min).toBeNull()
    expect(suhu.maks).toBeNull()
    expect(suhu.terisi).toBe(0)
  })
  it('daftar kosong tidak melempar', () => {
    expect(ringkas([], AMBANG).every((x) => x.n === 0 && x.terisi === 0)).toBe(true)
  })
})

describe('seriParam & terakhirPerParam', () => {
  const rows: Titik[] = [
    { created_at: lokal(11), ph: 6.4, tds: null },
    { created_at: lokal(9), ph: 6, tds: 800 },
    { created_at: lokal(10), ph: '', tds: 850 },
  ]
  it('urut waktu naik dan melewati nilai kosong', () => {
    expect(seriParam(rows, 'ph').map((x) => x.y)).toEqual([6, 6.4])
    expect(seriParam(rows, 'tds').map((x) => x.y)).toEqual([800, 850])
  })
  it('nilai terakhir tiap sensor boleh dari bacaan berbeda; sensor tanpa data = null', () => {
    const t = terakhirPerParam(rows)
    expect(t.ph?.y).toBe(6.4)
    expect(t.tds?.y).toBe(850)
    expect(t.humidity).toBeNull()
  })
})

describe('format waktu lokal', () => {
  const d = new Date(2026, 9, 21, 11, 45, 36)
  it('tanggal dd/mm/yyyy dan jam HH:mm:ss', () => {
    expect(formatTanggal(d.getTime())).toBe('21/10/2026')
    expect(formatJam(d.getTime())).toBe('11:45:36')
  })
  it('nama berkas memuat rentang tanggal', () => {
    expect(namaBerkas(new Date(2026, 9, 21).getTime(), new Date(2026, 9, 29).getTime())).toBe(
      'laporan-sensor_2026-10-21_sd_2026-10-29.xlsx',
    )
  })
})

describe('bangunWorkbook', () => {
  const rows: Titik[] = [
    { id: 2, created_at: lokal(11, 45, 36), ph: 7, tds: 400, waterTemp: 25 },
    { id: 1, created_at: lokal(10, 21, 12), ph: 6.2, waterTemp: 25 },
    { id: 3, created_at: lokal(11, 45, 36), ph: 7, tds: 400, waterTemp: 25 },
  ]
  const opsi = { rows, ambang: AMBANG, periode: '6 Jam terakhir', dibuat: new Date(2026, 9, 29, 13, 0, 0).getTime(), terpotong: false }

  async function muatUlang() {
    const wb = await bangunWorkbook(opsi)
    const buf = await wb.xlsx.writeBuffer()
    const hasil = new (await kelasWorkbook())()
    await hasil.xlsx.load(buf as ArrayBuffer)
    return hasil
  }

  it('punya dua sheet: Ringkasan dan Data', async () => {
    const wb = await muatUlang()
    expect(wb.worksheets.map((s) => s.name)).toEqual(['Ringkasan', 'Data'])
  })

  it('sheet Data: header bersatuan, baris urut waktu naik, duplikat dibuang', async () => {
    const ws = (await muatUlang()).getWorksheet('Data')!
    const header = (ws.getRow(1).values as unknown[]).slice(1)
    expect(header).toEqual([
      'No', 'Tanggal', 'Jam', 'pH', 'Suhu Air (°C)', 'TDS (ppm)', 'Suhu Udara (°C)', 'Kelembapan (%)', 'Status',
    ])
    expect(ws.rowCount).toBe(3) // header + 2 baris unik
    expect(ws.getRow(2).getCell(1).value).toBe(1)
    // Sel berformat hh:mm:ss dibaca exceljs sebagai Date (basis 1899-12-30 UTC): jam lokal harus tampil apa adanya.
    const jam = (n: number) => {
      const d = ws.getRow(n).getCell(3).value as Date
      return `${d.getUTCHours()}:${d.getUTCMinutes()}:${d.getUTCSeconds()}`
    }
    expect(jam(2)).toBe('10:21:12')
    expect(jam(3)).toBe('11:45:36')
    const tgl = ws.getRow(2).getCell(2).value as Date
    expect([tgl.getUTCFullYear(), tgl.getUTCMonth(), tgl.getUTCDate()]).toEqual([2026, 9, 21])
  })

  it('nilai disimpan sebagai angka, sensor tidak dikirim kosong dan abu-abu', async () => {
    const ws = (await muatUlang()).getWorksheet('Data')!
    const r2 = ws.getRow(2)
    expect(typeof r2.getCell(4).value).toBe('number')
    expect(r2.getCell(4).value).toBe(6.2)
    expect(r2.getCell(6).value).toBeNull() // TDS tidak dikirim
    const fill = r2.getCell(6).fill as FillPattern
    expect(fill.type).toBe('pattern')
    expect(fill.fgColor?.argb).toBe('FFE5E7EB')
  })

  it('status memuat parameter di luar ambang dan sel ditandai merah', async () => {
    const ws = (await muatUlang()).getWorksheet('Data')!
    const r3 = ws.getRow(3)
    expect(r3.getCell(9).value).toBe('Perlu perhatian: pH tinggi, TDS rendah')
    expect((r3.getCell(4).fill as FillPattern).fgColor?.argb).toBe('FFFDE2E2')
  })

  it('header membeku dan punya filter otomatis', async () => {
    const ws = (await muatUlang()).getWorksheet('Data')!
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
    expect(ws.autoFilter).toBeTruthy()
  })

  it('ringkasan memuat statistik per parameter dan catatan duplikat', async () => {
    const ws = (await muatUlang()).getWorksheet('Ringkasan')!
    const teks: string[] = []
    ws.eachRow((r) => r.eachCell((c) => teks.push(String(c.value))))
    expect(teks).toContain('Laporan Sensor Kebun')
    expect(teks.some((t) => t.includes('6 Jam terakhir'))).toBe(true)
    expect(teks.some((t) => /1 baris duplikat/.test(t))).toBe(true)
    expect(teks).toContain('Kelembapan')
  })

  it('catatan data terpotong muncul saat batas tercapai', async () => {
    const wb = await bangunWorkbook({ ...opsi, terpotong: true })
    const teks: string[] = []
    wb.getWorksheet('Ringkasan')!.eachRow((r) => r.eachCell((c) => teks.push(String(c.value))))
    expect(teks.some((t) => /dibatasi/.test(t))).toBe(true)
  })

  it('tanpa baris sama sekali tetap menghasilkan file valid', async () => {
    const wb = await bangunWorkbook({ ...opsi, rows: [] })
    const ws = wb.getWorksheet('Data')!
    expect(ws.rowCount).toBe(1)
  })
})
