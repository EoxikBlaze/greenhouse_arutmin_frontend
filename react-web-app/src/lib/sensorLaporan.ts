import type { FillPattern, Workbook, Worksheet } from 'exceljs'
import { tanggalIso } from './format'

/** Lima sensor kebun — kunci kolom tabel `monitorings`. */
export type KunciSensor = 'ph' | 'waterTemp' | 'tds' | 'airTemp' | 'humidity'

export type DefParam = { kunci: KunciSensor; label: string; satuan: string; digit: number }

export const PARAMS: DefParam[] = [
  { kunci: 'ph', label: 'pH', satuan: '', digit: 2 },
  { kunci: 'waterTemp', label: 'Suhu Air', satuan: '°C', digit: 1 },
  { kunci: 'tds', label: 'TDS', satuan: 'ppm', digit: 0 },
  { kunci: 'airTemp', label: 'Suhu Udara', satuan: '°C', digit: 1 },
  { kunci: 'humidity', label: 'Kelembapan', satuan: '%', digit: 0 },
]

/** Satu bacaan GET /monitoring/chart-data atau /monitoring/tarik. */
export type Titik = {
  id?: string | number
  created_at?: string | null
  waktu?: string | null
} & Partial<Record<KunciSensor, number | string | null>>

/** Batas aman per sensor (GET /dashboard → ambang); min/max bisa string numerik dari PostgreSQL. */
export type Ambang = Record<string, { min: number | string | null; max: number | string | null }> | null | undefined
type BatasSatu = { min: number | string | null; max: number | string | null } | undefined

export type StatusNilai = 'normal' | 'rendah' | 'tinggi' | 'kosong'

export function nilaiAngka(v: unknown): number | null {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function waktuMs(t: Titik): number | null {
  const ms = Date.parse(t.waktu ?? t.created_at ?? '')
  return Number.isNaN(ms) ? null : ms
}

export function statusNilai(v: number | null, batas: BatasSatu): StatusNilai {
  if (v === null) return 'kosong'
  const min = nilaiAngka(batas?.min)
  const maks = nilaiAngka(batas?.max)
  if (min !== null && v < min) return 'rendah'
  if (maks !== null && v > maks) return 'tinggi'
  return 'normal'
}

/** Buang bacaan kembar (waktu dan kelima nilai sama; id diabaikan). Urutan asli dipertahankan. */
export function hapusDuplikat(rows: Titik[]): { rows: Titik[]; dibuang: number } {
  const lihat = new Set<string>()
  const out: Titik[] = []
  for (const r of rows) {
    const kunci = `${waktuMs(r)}|${PARAMS.map((p) => nilaiAngka(r[p.kunci])).join('|')}`
    if (lihat.has(kunci)) continue
    lihat.add(kunci)
    out.push(r)
  }
  return { rows: out, dibuang: rows.length - out.length }
}

export type StatusBaris = { luar: string[]; kosong: number; teks: string }

export function statusBaris(r: Titik, ambang: Ambang): StatusBaris {
  const luar: string[] = []
  let kosong = 0
  for (const p of PARAMS) {
    const s = statusNilai(nilaiAngka(r[p.kunci]), ambang?.[p.kunci])
    if (s === 'kosong') kosong += 1
    else if (s !== 'normal') luar.push(`${p.label} ${s}`)
  }
  let teks = 'Normal'
  if (luar.length) teks = `Perlu perhatian: ${luar.join(', ')}`
  else if (kosong === PARAMS.length) teks = 'Tidak ada data sensor'
  else if (kosong > 0) teks = 'Data tidak lengkap'
  return { luar, kosong, teks }
}

export type RingkasParam = {
  kunci: KunciSensor
  n: number
  /** Pecahan 0–1 dari semua bacaan yang memuat nilai sensor ini. */
  terisi: number
  rata: number | null
  min: number | null
  maks: number | null
  ambangMin: number | null
  ambangMaks: number | null
  luar: number
}

export function ringkas(rows: Titik[], ambang: Ambang): RingkasParam[] {
  return PARAMS.map((p) => {
    const nilai = rows.map((r) => nilaiAngka(r[p.kunci])).filter((v): v is number => v !== null)
    const batas = ambang?.[p.kunci]
    return {
      kunci: p.kunci,
      n: nilai.length,
      terisi: rows.length ? nilai.length / rows.length : 0,
      rata: nilai.length ? nilai.reduce((a, b) => a + b, 0) / nilai.length : null,
      min: nilai.length ? Math.min(...nilai) : null,
      maks: nilai.length ? Math.max(...nilai) : null,
      ambangMin: nilaiAngka(batas?.min),
      ambangMaks: nilaiAngka(batas?.max),
      luar: nilai.filter((v) => ['rendah', 'tinggi'].includes(statusNilai(v, batas))).length,
    }
  })
}

export type TitikSeri = { t: number; y: number }

/** Deret satu sensor untuk grafik: urut waktu naik, bacaan tanpa nilai dilewati. */
export function seriParam(rows: Titik[], kunci: KunciSensor): TitikSeri[] {
  const out: TitikSeri[] = []
  for (const r of rows) {
    const t = waktuMs(r)
    const y = nilaiAngka(r[kunci])
    if (t !== null && y !== null) out.push({ t, y })
  }
  return out.sort((a, b) => a.t - b.t)
}

/** Nilai terbaru tiap sensor — bisa berasal dari bacaan berbeda bila device mengirim sebagian-sebagian. */
export function terakhirPerParam(rows: Titik[]): Record<KunciSensor, TitikSeri | null> {
  const hasil = {} as Record<KunciSensor, TitikSeri | null>
  for (const p of PARAMS) {
    const s = seriParam(rows, p.kunci)
    hasil[p.kunci] = s.length ? s[s.length - 1] : null
  }
  return hasil
}

const dua = (n: number) => String(n).padStart(2, '0')

/** "21/10/2026" — waktu lokal perangkat, bukan UTC. */
export function formatTanggal(ms: number): string {
  const d = new Date(ms)
  return `${dua(d.getDate())}/${dua(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** "11:45:36" — waktu lokal perangkat. */
export function formatJam(ms: number): string {
  const d = new Date(ms)
  return `${dua(d.getHours())}:${dua(d.getMinutes())}:${dua(d.getSeconds())}`
}

export function namaBerkas(dari: number, sampai: number): string {
  return `laporan-sensor_${tanggalIso(dari)}_sd_${tanggalIso(sampai)}.xlsx`
}

function zonaWaktu(): string {
  const menit = -new Date().getTimezoneOffset()
  const tanda = menit >= 0 ? '+' : '-'
  const abs = Math.abs(menit)
  const nama = Intl.DateTimeFormat().resolvedOptions().timeZone
  return `UTC${tanda}${dua(Math.floor(abs / 60))}:${dua(abs % 60)}${nama ? ` (${nama})` : ''}`
}

/* ── Excel ─────────────────────────────────────────────────────────── */

const HIJAU = 'FF2D452F'
const ABU = 'FFE5E7EB'
const MERAH_MUDA = 'FFFDE2E2'
const isi = (argb: string): FillPattern => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })

/** exceljs dimuat saat dibutuhkan (≈1 MB) — bukan di bundel awal. Paket CJS: konstruktor ada di `default` atau di modul. */
export async function kelasWorkbook(): Promise<typeof Workbook> {
  const m = (await import('exceljs')) as typeof import('exceljs') & { default?: typeof import('exceljs') }
  return (m.default ?? m).Workbook
}

export type OpsiLaporan = {
  rows: Titik[]
  ambang: Ambang
  /** Teks periode apa adanya di lembar Ringkasan, mis. "6 Jam terakhir (21/10/2026 05:45 – 11:45)". */
  periode: string
  dibuat: number
  /** Data yang diambil terhenti di batas jumlah baris — dicatat di Ringkasan. */
  terpotong: boolean
}

function judulKolom(p: DefParam): string {
  return p.satuan ? `${p.label} (${p.satuan})` : p.label
}

function formatAngka(digit: number): string {
  return digit > 0 ? `0.${'0'.repeat(digit)}` : '0'
}

function lembarRingkasan(ws: Worksheet, o: OpsiLaporan, n: number, dibuang: number, stat: RingkasParam[]) {
  ws.columns = [
    { width: 22 }, { width: 10 }, { width: 13 }, { width: 11 }, { width: 11 },
    { width: 13 }, { width: 13 }, { width: 13 }, { width: 11 }, { width: 15 },
  ]
  ws.mergeCells('A1:J1')
  const judul = ws.getCell('A1')
  judul.value = 'Laporan Sensor Kebun'
  judul.font = { bold: true, size: 16, color: { argb: HIJAU } }
  ws.mergeCells('A2:J2')
  ws.getCell('A2').value = 'Vertonik Smart Farm · GARAP greenhouse hidroponik'
  ws.getCell('A2').font = { color: { argb: 'FF475569' } }

  const info: Array<[string, string | number]> = [
    ['Periode', o.periode],
    ['Dibuat', `${formatTanggal(o.dibuat)} ${formatJam(o.dibuat)}`],
    ['Zona waktu', zonaWaktu()],
    ['Jumlah bacaan', n],
  ]
  info.forEach(([k, v], i) => {
    const r = 4 + i
    ws.getCell(`A${r}`).value = k
    ws.getCell(`A${r}`).font = { bold: true }
    ws.mergeCells(`B${r}:J${r}`)
    ws.getCell(`B${r}`).value = v
    ws.getCell(`B${r}`).alignment = { horizontal: 'left' }
  })

  const kepala = 9
  const judulTabel = ['Parameter', 'Satuan', 'Rata-rata', 'Min', 'Maks', 'Ambang min', 'Ambang maks', 'Jumlah data', 'Terisi', 'Di luar ambang']
  judulTabel.forEach((t, i) => {
    const c = ws.getCell(kepala, i + 1)
    c.value = t
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = isi(HIJAU)
    c.alignment = { horizontal: i < 2 ? 'left' : 'center', vertical: 'middle', wrapText: true }
  })
  ws.getRow(kepala).height = 22

  stat.forEach((s, i) => {
    const p = PARAMS.find((x) => x.kunci === s.kunci)!
    const r = kepala + 1 + i
    const angka = formatAngka(p.digit)
    const sel = (kol: number, v: number | string | null, fmt?: string) => {
      const c = ws.getCell(r, kol)
      c.value = v ?? '–'
      if (typeof v === 'number' && fmt) c.numFmt = fmt
      if (kol > 2) c.alignment = { horizontal: 'center' }
    }
    sel(1, p.label)
    sel(2, p.satuan || '–')
    sel(3, s.rata, angka)
    sel(4, s.min, angka)
    sel(5, s.maks, angka)
    sel(6, s.ambangMin, angka)
    sel(7, s.ambangMaks, angka)
    sel(8, s.n, '0')
    sel(9, s.terisi, '0%')
    sel(10, s.luar, '0')
    if (s.luar > 0) ws.getCell(r, 10).fill = isi(MERAH_MUDA)
    if (s.terisi === 0) ws.getCell(r, 9).fill = isi(ABU)
    for (let k = 1; k <= 10; k += 1) {
      ws.getCell(r, k).border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } }
    }
  })

  const catatan: string[] = [
    'Cara membaca lembar Data:',
    '• Sel abu-abu = sensor tidak mengirim nilai pada bacaan itu.',
    '• Sel merah muda = nilai di luar ambang sensor (halaman Ambang Sensor).',
    '• Waktu memakai zona waktu perangkat yang mengunduh laporan.',
  ]
  if (dibuang > 0) catatan.push(`• ${dibuang} baris duplikat (waktu dan nilai sama) tidak ikut dihitung.`)
  if (o.terpotong) catatan.push('• Jumlah baris dibatasi 1.000 — pilih rentang lebih pendek untuk data yang lengkap.')
  catatan.forEach((t, i) => {
    const r = kepala + PARAMS.length + 3 + i
    ws.mergeCells(`A${r}:J${r}`)
    ws.getCell(`A${r}`).value = t
    ws.getCell(`A${r}`).font = i === 0 ? { bold: true } : { color: { argb: 'FF475569' } }
  })
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
}

function lembarData(ws: Worksheet, rows: Titik[], ambang: Ambang) {
  const kolom = [
    { header: 'No', width: 6 },
    { header: 'Tanggal', width: 12 },
    { header: 'Jam', width: 10 },
    ...PARAMS.map((p) => ({ header: judulKolom(p), width: p.label === 'Suhu Udara' ? 17 : 15 })),
    { header: 'Status', width: 38 },
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
    const ms = waktuMs(r)!
    const d = new Date(ms)
    const row = ws.getRow(i + 2)
    // Tanggal/jam disusun dari komponen lokal; exceljs menulis Date sebagai UTC, jadi pakai Date.UTC agar yang tampil di Excel = jam lokal.
    row.getCell(1).value = i + 1
    row.getCell(2).value = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    row.getCell(2).numFmt = 'dd/mm/yyyy'
    row.getCell(3).value = (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400
    row.getCell(3).numFmt = 'hh:mm:ss'
    PARAMS.forEach((p, k) => {
      const c = row.getCell(4 + k)
      const v = nilaiAngka(r[p.kunci])
      const s = statusNilai(v, ambang?.[p.kunci])
      if (v === null) {
        c.fill = isi(ABU)
      } else {
        c.value = v
        c.numFmt = formatAngka(p.digit)
        if (s === 'rendah' || s === 'tinggi') {
          c.fill = isi(MERAH_MUDA)
          c.font = { bold: true, color: { argb: 'FF9B1C1C' } }
        }
      }
      c.alignment = { horizontal: 'center' }
    })
    const st = statusBaris(r, ambang)
    const cs = row.getCell(4 + PARAMS.length)
    cs.value = st.teks
    if (st.luar.length) cs.font = { bold: true, color: { argb: 'FF9B1C1C' } }
    ;[1, 2, 3].forEach((k) => (row.getCell(k).alignment = { horizontal: 'center' }))
    row.eachCell({ includeEmpty: true }, (c) => {
      c.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } }
    })
  })

  ws.views = [{ state: 'frozen', ySplit: 1 }]
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: kolom.length } }
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:1' }
}

/** Susun buku kerja laporan: lembar "Ringkasan" lalu "Data" (urut waktu naik, duplikat dibuang). */
export async function bangunWorkbook(o: OpsiLaporan): Promise<Workbook> {
  const Kelas = await kelasWorkbook()
  const wb = new Kelas()
  wb.creator = 'Vertonik Smart Farm'
  wb.created = new Date(o.dibuat)

  const bersih = hapusDuplikat(o.rows.filter((r) => waktuMs(r) !== null))
  const urut = [...bersih.rows].sort((a, b) => waktuMs(a)! - waktuMs(b)!)

  lembarRingkasan(wb.addWorksheet('Ringkasan'), o, urut.length, bersih.dibuang, ringkas(urut, o.ambang))
  lembarData(wb.addWorksheet('Data'), urut, o.ambang)
  return wb
}

/** Bangun lalu unduh .xlsx lewat tautan sementara. */
export async function unduhLaporan(o: OpsiLaporan & { dari: number; sampai: number }): Promise<void> {
  const wb = await bangunWorkbook(o)
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaBerkas(o.dari, o.sampai)
  a.click()
  URL.revokeObjectURL(url)
}
