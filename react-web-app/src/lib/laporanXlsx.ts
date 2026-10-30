import type { FillPattern, Workbook, Worksheet } from 'exceljs'
import { formatJam, formatTanggal, kelasWorkbook } from './sensorLaporan'

/** Satu baris GET /laporan — matriks per bulan (periode "YYYY-MM"). */
export type Matriks = {
  periode: string
  semai?: number | null
  remaja?: number | null
  dewasa?: number | null
  panen_kg?: number | null
  rata_ph?: number | null
}

export type KunciMatriks = 'semai' | 'remaja' | 'dewasa' | 'panen_kg' | 'rata_ph'

/** Kolom angka matriks: label tampil, format Excel, dan digit desimal. */
export const KOLOM_MATRIKS: { kunci: KunciMatriks; label: string; fmt: string }[] = [
  { kunci: 'semai', label: 'Semai', fmt: '0' },
  { kunci: 'remaja', label: 'Remaja', fmt: '0' },
  { kunci: 'dewasa', label: 'Dewasa', fmt: '0' },
  { kunci: 'panen_kg', label: 'Panen (tanaman)', fmt: '0' },
  { kunci: 'rata_ph', label: 'Rata-rata pH', fmt: '0.00' },
]

export type StatMatriks = {
  kunci: KunciMatriks
  label: string
  /** Jumlah seluruh bulan; null bila tidak ada nilai sama sekali (rata pH). */
  total: number | null
  rata: number | null
  tertinggi: { periode: string; nilai: number } | null
  terendah: { periode: string; nilai: number } | null
}

/** PostgreSQL mengirim numeric (rata_ph) sebagai string — "6.35" — jadi angka dikonversi di sini. */
function nilai(v: unknown): number | null {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Ubah respons GET /laporan mentah (angka bisa berupa string) menjadi Matriks bertipe number. */
export function normalisasiMatriks(mentah: Array<{ periode: string } & Partial<Record<KunciMatriks, unknown>>>): Matriks[] {
  return mentah.map((r) => ({
    periode: r.periode,
    semai: nilai(r.semai),
    remaja: nilai(r.remaja),
    dewasa: nilai(r.dewasa),
    panen_kg: nilai(r.panen_kg),
    rata_ph: nilai(r.rata_ph),
  }))
}

/** Ringkasan per kolom. Seri sama → bulan yang paling baru (periode terbesar) dipilih. */
export function ringkasMatriks(rows: Matriks[]): StatMatriks[] {
  return KOLOM_MATRIKS.map((k) => {
    const pasangan = rows
      .map((r) => ({ periode: r.periode, nilai: nilai(r[k.kunci]) }))
      .filter((p): p is { periode: string; nilai: number } => p.nilai !== null)
    const jumlah = pasangan.reduce((a, p) => a + p.nilai, 0)
    const urut = [...pasangan].sort((a, b) => (a.nilai - b.nilai) || (a.periode < b.periode ? -1 : 1))
    return {
      kunci: k.kunci,
      label: k.label,
      // Rata pH tidak dijumlahkan: total "–", rata-rata dipakai sebagai gantinya.
      total: k.kunci === 'rata_ph' || !pasangan.length ? null : jumlah,
      rata: pasangan.length ? jumlah / pasangan.length : null,
      tertinggi: urut.length ? urut[urut.length - 1] : null,
      terendah: urut.length ? urut[0] : null,
    }
  })
}

const HIJAU = 'FF2D452F'
const ABU = 'FFE5E7EB'
const isi = (argb: string): FillPattern => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })

const dua = (n: number) => String(n).padStart(2, '0')

/** Salinan zonaWaktu dari sensorLaporan.ts (tidak diekspor di sana; jangan ubah perilaku Sensor Real-Time). */
function zonaWaktu(): string {
  const menit = -new Date().getTimezoneOffset()
  const tanda = menit >= 0 ? '+' : '-'
  const abs = Math.abs(menit)
  const nama = Intl.DateTimeFormat().resolvedOptions().timeZone
  return `UTC${tanda}${dua(Math.floor(abs / 60))}:${dua(abs % 60)}${nama ? ` (${nama})` : ''}`
}

export type OpsiLaporanMatriks = {
  rows: Matriks[]
  /** Teks rentang yang dipakai, mis. "21/10/2026 – 30/10/2026" atau "Seluruh data". */
  periode: string
  dibuat: number
}

function lembarRingkasan(ws: Worksheet, o: OpsiLaporanMatriks, stat: StatMatriks[]) {
  ws.columns = [{ width: 20 }, { width: 12 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }]
  ws.mergeCells('A1:G1')
  const judul = ws.getCell('A1')
  judul.value = 'Laporan Matriks Tanam'
  judul.font = { bold: true, size: 16, color: { argb: HIJAU } }
  ws.mergeCells('A2:G2')
  ws.getCell('A2').value = 'Vertonik Smart Farm · GARAP greenhouse hidroponik'
  ws.getCell('A2').font = { color: { argb: 'FF475569' } }

  const info: Array<[string, string | number]> = [
    ['Periode', o.periode],
    ['Dibuat', `${formatTanggal(o.dibuat)} ${formatJam(o.dibuat)}`],
    ['Zona waktu', zonaWaktu()],
    ['Jumlah bulan', o.rows.length],
  ]
  info.forEach(([k, v], i) => {
    const r = 4 + i
    ws.getCell(`A${r}`).value = k
    ws.getCell(`A${r}`).font = { bold: true }
    ws.mergeCells(`B${r}:G${r}`)
    ws.getCell(`B${r}`).value = v
    ws.getCell(`B${r}`).alignment = { horizontal: 'left' }
  })

  const kepala = 9
  const judulTabel = ['Kolom', 'Total', 'Rata-rata / bulan', 'Tertinggi', 'Bulan tertinggi', 'Terendah', 'Bulan terendah']
  judulTabel.forEach((t, i) => {
    const c = ws.getCell(kepala, i + 1)
    c.value = t
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = isi(HIJAU)
    c.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle', wrapText: true }
  })
  ws.getRow(kepala).height = 22

  stat.forEach((s, i) => {
    const fmt = KOLOM_MATRIKS.find((k) => k.kunci === s.kunci)!.fmt
    const r = kepala + 1 + i
    const sel = (kol: number, v: number | string | null, numFmt?: string) => {
      const c = ws.getCell(r, kol)
      c.value = v ?? '–'
      if (typeof v === 'number' && numFmt) c.numFmt = numFmt
      if (kol > 1) c.alignment = { horizontal: 'center' }
    }
    sel(1, s.label)
    sel(2, s.total, fmt)
    sel(3, s.rata, fmt === '0' ? '0.0' : fmt)
    sel(4, s.tertinggi?.nilai ?? null, fmt)
    sel(5, s.tertinggi?.periode ?? null)
    sel(6, s.terendah?.nilai ?? null, fmt)
    sel(7, s.terendah?.periode ?? null)
    if (s.total === null) ws.getCell(r, 2).fill = isi(ABU)
    for (let k = 1; k <= 7; k += 1) {
      ws.getCell(r, k).border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } }
    }
  })

  const bulanTanpaPh = o.rows.filter((r) => nilai(r.rata_ph) === null).length
  const catatan: string[] = [
    'Cara membaca lembar Data:',
    '• Sel abu-abu = kolom tidak punya nilai pada bulan itu.',
    '• Baris "Tidak lengkap" = ada kolom kosong pada bulan itu.',
    '• Panen (tanaman) adalah jumlah tanaman yang dipanen, bukan kilogram.',
    '• Bulan dihitung dari tanggal semai.',
  ]
  if (bulanTanpaPh > 0) catatan.push(`• ${bulanTanpaPh} bulan belum punya data pH.`)
  catatan.forEach((t, i) => {
    const r = kepala + stat.length + 3 + i
    ws.mergeCells(`A${r}:G${r}`)
    ws.getCell(`A${r}`).value = t
    ws.getCell(`A${r}`).font = i === 0 ? { bold: true } : { color: { argb: 'FF475569' } }
  })
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
}

function lembarData(ws: Worksheet, rows: Matriks[]) {
  const kolom = [
    { header: 'No', width: 6 },
    { header: 'Periode', width: 12 },
    ...KOLOM_MATRIKS.map((k) => ({ header: k.label, width: k.kunci === 'rata_ph' ? 14 : 15 })),
    { header: 'Status', width: 22 },
  ]
  ws.columns = kolom
  const kepala = ws.getRow(1)
  kepala.height = 24
  kepala.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = isi(HIJAU)
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })

  rows.forEach((r, i) => {
    const row = ws.getRow(i + 2)
    row.getCell(1).value = i + 1
    row.getCell(2).value = r.periode
    KOLOM_MATRIKS.forEach((k, j) => {
      const c = row.getCell(3 + j)
      const v = nilai(r[k.kunci])
      if (v === null) {
        c.fill = isi(ABU)
      } else {
        c.value = v
        c.numFmt = k.fmt
      }
      c.alignment = { horizontal: 'center' }
    })
    const lengkap = KOLOM_MATRIKS.every((k) => nilai(r[k.kunci]) !== null)
    const cs = row.getCell(3 + KOLOM_MATRIKS.length)
    cs.value = lengkap ? 'Lengkap' : 'Tidak lengkap'
    if (!lengkap) cs.font = { bold: true, color: { argb: 'FF9B1C1C' } }
    ;[1, 2].forEach((k) => (row.getCell(k).alignment = { horizontal: 'center' }))
    row.eachCell({ includeEmpty: true }, (c) => {
      c.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } }
    })
  })

  ws.views = [{ state: 'frozen', ySplit: 1 }]
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: kolom.length } }
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:1' }
}

/** Susun buku kerja matriks: lembar "Ringkasan" lalu "Data" (urut periode naik). */
export async function bangunLaporanWorkbook(o: OpsiLaporanMatriks): Promise<Workbook> {
  const Kelas = await kelasWorkbook()
  const wb = new Kelas()
  wb.creator = 'Vertonik Smart Farm'
  wb.created = new Date(o.dibuat)

  const urut = [...o.rows].sort((a, b) => (a.periode < b.periode ? -1 : a.periode > b.periode ? 1 : 0))
  lembarRingkasan(wb.addWorksheet('Ringkasan'), { ...o, rows: urut }, ringkasMatriks(urut))
  lembarData(wb.addWorksheet('Data'), urut)
  return wb
}

/** "laporan-matriks_2026-10-01_sd_2026-10-30.xlsx"; rentang kosong → "awal"/"kini". */
export function namaBerkasMatriks(dari: string, sampai: string): string {
  return `laporan-matriks_${dari || 'awal'}_sd_${sampai || 'kini'}.xlsx`
}

/** Bangun lalu unduh .xlsx lewat tautan sementara. */
export async function unduhLaporanMatriks(o: OpsiLaporanMatriks & { dari: string; sampai: string }): Promise<void> {
  const wb = await bangunLaporanWorkbook(o)
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaBerkasMatriks(o.dari, o.sampai)
  a.click()
  URL.revokeObjectURL(url)
}
