// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { bangunLaporanWorkbook, namaBerkasMatriks, normalisasiMatriks, ringkasMatriks, type Matriks } from './laporanXlsx'
import { kelasWorkbook } from './sensorLaporan'

const SAMPEL: Matriks[] = [
  { periode: '2026-10', semai: 2, remaja: 1, dewasa: 1, panen_kg: 213, rata_ph: null },
  { periode: '2026-05', semai: 2, remaja: 2, dewasa: 1, panen_kg: 2, rata_ph: 6.1 },
]

async function bacaBalik(rows: Matriks[]) {
  const wb = await bangunLaporanWorkbook({ rows, periode: 'Seluruh data', dibuat: Date.UTC(2026, 9, 30, 4) })
  const buf = await wb.xlsx.writeBuffer()
  const Kelas = await kelasWorkbook()
  const baca = new Kelas()
  await baca.xlsx.load(buf)
  return baca
}

describe('ringkasMatriks', () => {
  it('menjumlahkan kolom dan memilih bulan tertinggi/terendah', () => {
    const [semai, , , panen, ph] = ringkasMatriks(SAMPEL)
    expect(semai.total).toBe(4)
    expect(semai.rata).toBe(2)
    expect(panen.tertinggi).toEqual({ periode: '2026-10', nilai: 213 })
    expect(panen.terendah).toEqual({ periode: '2026-05', nilai: 2 })
    expect(ph.total).toBeNull()
    expect(ph.rata).toBeCloseTo(6.1)
  })

  it('seri sama → bulan paling baru', () => {
    const seri: Matriks[] = [
      { periode: '2026-04', semai: 3 },
      { periode: '2026-06', semai: 3 },
    ]
    expect(ringkasMatriks(seri)[0].tertinggi?.periode).toBe('2026-06')
  })

  it('kolom tanpa nilai sama sekali → total dan rata null', () => {
    const [, , , , ph] = ringkasMatriks([{ periode: '2026-01' }])
    expect(ph.rata).toBeNull()
    expect(ph.tertinggi).toBeNull()
  })
})

describe('normalisasiMatriks', () => {
  it('mengubah rata_ph string dari PostgreSQL menjadi angka', () => {
    const [r] = normalisasiMatriks([{ periode: '2026-10', semai: 2, panen_kg: 213, rata_ph: '6.35' }])
    expect(r.rata_ph).toBe(6.35)
    expect(r.remaja).toBeNull()
    expect(ringkasMatriks([r])[4].rata).toBeCloseTo(6.35)
  })
})

describe('namaBerkasMatriks', () => {
  it('memakai awal/kini bila rentang kosong', () => {
    expect(namaBerkasMatriks('', '')).toBe('laporan-matriks_awal_sd_kini.xlsx')
    expect(namaBerkasMatriks('2026-10-01', '2026-10-30')).toBe('laporan-matriks_2026-10-01_sd_2026-10-30.xlsx')
  })
})

describe('bangunLaporanWorkbook', () => {
  it('membuat dua lembar Ringkasan dan Data', async () => {
    const wb = await bacaBalik(SAMPEL)
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Ringkasan', 'Data'])
  })

  it('lembar Data: urut periode naik, angka sebagai angka, header beku dan filter', async () => {
    const ws = (await bacaBalik(SAMPEL)).getWorksheet('Data')!
    expect(ws.getCell('B2').value).toBe('2026-05')
    expect(ws.getCell('B3').value).toBe('2026-10')
    expect(ws.getCell('C2').value).toBe(2)
    expect(typeof ws.getCell('F3').value).toBe('number')
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
    expect(ws.autoFilter).toBe('A1:H1')
  })

  it('sel kosong ditandai abu-abu dan baris ditandai tidak lengkap', async () => {
    const ws = (await bacaBalik(SAMPEL)).getWorksheet('Data')!
    const kosong = ws.getCell('G3')
    expect(kosong.value).toBeNull()
    expect(kosong.fill).toMatchObject({ type: 'pattern', fgColor: { argb: 'FFE5E7EB' } })
    expect(ws.getCell('H3').value).toBe('Tidak lengkap')
    expect(ws.getCell('H2').value).toBe('Lengkap')
  })

  it('lembar Ringkasan memuat total dan periode bulan tertinggi', async () => {
    const ws = (await bacaBalik(SAMPEL)).getWorksheet('Ringkasan')!
    expect(ws.getCell('A1').value).toBe('Laporan Matriks Tanam')
    expect(ws.getCell('B4').value).toBe('Seluruh data')
    expect(ws.getCell('B7').value).toBe(2)
    // baris 10 = Semai (urutan kolom mengikuti KOLOM_MATRIKS), baris 13 = Panen
    expect(ws.getCell('A13').value).toBe('Panen (tanaman)')
    expect(ws.getCell('D13').value).toBe(213)
    expect(ws.getCell('E13').value).toBe('2026-10')
  })
})
