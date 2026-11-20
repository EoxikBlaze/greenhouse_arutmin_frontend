import type { Workbook } from 'exceljs'
import { kelasWorkbook } from './sensorLaporan'
import { tanggalIso } from './format'

/** Isi GET /api/analisis/paket-riset (sensor 5 menit, dosing, kalibrasi, batch, ambang, perangkat, metadata). */
export type PaketRiset = {
  metadata: { dibuat: string; dari: string; sampai: string; interval_detik: number; catatan: string[]; terpotong: boolean; baris_maks: number }
  ambang: Record<string, { min: number | string | null; max: number | string | null }> | null
  perangkat: { kode: string; nama: string | null; peran: string | null; versi_firmware: string | null; id_meja: number | null }[]
  kalibrasi: { sensor: string; dilakukan_pada: string; nilai_ref: number | null; bacaan_sebelum: number | null; bacaan_sesudah: number | null; lulus: boolean | null; catatan: string | null }[]
  dosing: { t: number; jenis: string }[]
  batch: { id: number | string; tanaman: string | null; meja: string | null; mulai: string; tgl_panen: string | null; status: string; jumlah_benih: number | null; panen_berhasil: number; panen_gagal: number }[]
  sensor: { waktu: string; ph: number | null; tds: number | null; ec_ms_cm: number | null; suhu_air: number | null; suhu_udara: number | null; kelembapan: number | null }[]
}

const NAMA_JENIS: Record<string, string> = { AB: 'Nutrisi A+B', PH: 'Koreksi pH', ENCER: 'Pengenceran', ISI: 'Isi air' }
const dua = (n: number) => String(n).padStart(2, '0')
/** Waktu lokal sebagai teks "2026-11-21 08:05:00" — tanpa konversi zona, supaya persis yang dilihat di web. */
const teksWaktu = (v: string | number | Date | null) => {
  if (v == null) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())} ${dua(d.getHours())}:${dua(d.getMinutes())}:${dua(d.getSeconds())}`
}
const angkaAtauKosong = (v: unknown) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

function lembar(wb: Workbook, nama: string, kolom: { header: string; key: string; width: number }[], baris: Record<string, unknown>[]) {
  const ws = wb.addWorksheet(nama, { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = kolom
  ws.getRow(1).font = { bold: true }
  baris.forEach((b) => ws.addRow(b))
  return ws
}

/** Susun buku kerja: Petunjuk (cara membaca + metadata), lalu satu lembar per jenis data. Dapat diulang oleh peneliti lain. */
export async function bangunPaketRiset(p: PaketRiset): Promise<Workbook> {
  const Wb = await kelasWorkbook()
  const wb = new Wb()
  wb.creator = 'GARAP — Vertonik Smartfarm'
  wb.created = new Date()

  const petunjuk = wb.addWorksheet('Petunjuk')
  petunjuk.columns = [{ width: 28 }, { width: 100 }]
  const baris: [string, string][] = [
    ['Paket data riset', 'GARAP — pemantauan hidroponik'],
    ['Dibuat', teksWaktu(p.metadata.dibuat)],
    ['Rentang', `${teksWaktu(p.metadata.dari)} sampai ${teksWaktu(p.metadata.sampai)}`],
    ['Interval data sensor', `${p.metadata.interval_detik / 60} menit (rata-rata tiap interval)`],
    ['Jumlah baris sensor', String(p.sensor.length)],
    ...(p.metadata.terpotong ? ([['PERINGATAN', `Data sensor dipotong: hanya ${p.metadata.baris_maks} baris terbaru. Persempit rentang untuk data lebih lama.`]] as [string, string][]) : []),
    ['', ''],
    ['Cara membaca', ''],
    ...p.metadata.catatan.map((c): [string, string] => ['•', c]),
    ['', ''],
    ['Lembar', ''],
    ['Sensor', 'pH, nutrisi (ppm), EC (mS/cm), suhu air, suhu udara, kelembapan — rata-rata per interval'],
    ['Dosing', 'waktu tiap kejadian: nutrisi A+B, koreksi pH, pengenceran, isi air (takaran mL tidak dilaporkan alat)'],
    ['Kalibrasi', 'riwayat kalibrasi sensor (nilai acuan, hasil, catatan) — penting untuk menilai ketelitian data'],
    ['Batch', 'batch semai sampai panen beserta hasil panen'],
    ['Ambang', 'rentang aman tiap sensor saat paket dibuat'],
    ['Perangkat', 'perangkat dan versi firmware'],
  ]
  baris.forEach((b) => petunjuk.addRow(b))
  petunjuk.getRow(1).font = { bold: true, size: 14 }
  petunjuk.getColumn(2).alignment = { wrapText: true, vertical: 'top' }

  lembar(wb, 'Sensor', [
    { header: 'Waktu (lokal)', key: 'waktu', width: 20 }, { header: 'pH', key: 'ph', width: 8 }, { header: 'Nutrisi (ppm)', key: 'tds', width: 14 },
    { header: 'EC (mS/cm)', key: 'ec', width: 12 }, { header: 'Suhu air (°C)', key: 'air', width: 14 }, { header: 'Suhu udara (°C)', key: 'udara', width: 16 },
    { header: 'Kelembapan (%)', key: 'rh', width: 16 },
  ], p.sensor.map((s) => ({
    waktu: teksWaktu(s.waktu), ph: angkaAtauKosong(s.ph), tds: angkaAtauKosong(s.tds), ec: angkaAtauKosong(s.ec_ms_cm),
    air: angkaAtauKosong(s.suhu_air), udara: angkaAtauKosong(s.suhu_udara), rh: angkaAtauKosong(s.kelembapan),
  })))

  lembar(wb, 'Dosing', [{ header: 'Waktu (lokal)', key: 'waktu', width: 20 }, { header: 'Jenis', key: 'jenis', width: 16 }],
    p.dosing.map((d) => ({ waktu: teksWaktu(d.t), jenis: NAMA_JENIS[d.jenis] ?? d.jenis })))

  lembar(wb, 'Kalibrasi', [
    { header: 'Waktu', key: 'waktu', width: 20 }, { header: 'Sensor', key: 'sensor', width: 14 }, { header: 'Nilai acuan', key: 'ref', width: 14 },
    { header: 'Bacaan sebelum', key: 'sebelum', width: 16 }, { header: 'Bacaan sesudah', key: 'sesudah', width: 16 }, { header: 'Lulus', key: 'lulus', width: 8 },
    { header: 'Catatan', key: 'catatan', width: 60 },
  ], p.kalibrasi.map((k) => ({
    waktu: teksWaktu(k.dilakukan_pada), sensor: k.sensor, ref: angkaAtauKosong(k.nilai_ref), sebelum: angkaAtauKosong(k.bacaan_sebelum),
    sesudah: angkaAtauKosong(k.bacaan_sesudah), lulus: k.lulus == null ? '' : k.lulus ? 'ya' : 'tidak', catatan: k.catatan ?? '',
  })))

  lembar(wb, 'Batch', [
    { header: 'ID', key: 'id', width: 8 }, { header: 'Tanaman', key: 'tanaman', width: 20 }, { header: 'Meja', key: 'meja', width: 16 },
    { header: 'Mulai semai', key: 'mulai', width: 14 }, { header: 'Tanggal panen', key: 'panen', width: 14 }, { header: 'Status', key: 'status', width: 10 },
    { header: 'Jumlah benih', key: 'benih', width: 14 }, { header: 'Panen berhasil', key: 'ok', width: 14 }, { header: 'Panen gagal', key: 'gagal', width: 12 },
  ], p.batch.map((b) => ({
    id: b.id, tanaman: b.tanaman ?? '', meja: b.meja ?? '', mulai: String(b.mulai).slice(0, 10), panen: b.tgl_panen ? String(b.tgl_panen).slice(0, 10) : '',
    status: b.status, benih: b.jumlah_benih ?? '', ok: b.panen_berhasil, gagal: b.panen_gagal,
  })))

  lembar(wb, 'Ambang', [{ header: 'Sensor', key: 's', width: 14 }, { header: 'Minimum', key: 'min', width: 12 }, { header: 'Maksimum', key: 'max', width: 12 }],
    Object.entries(p.ambang ?? {}).map(([s, b]) => ({ s, min: angkaAtauKosong(b.min), max: angkaAtauKosong(b.max) })))

  lembar(wb, 'Perangkat', [
    { header: 'Kode', key: 'kode', width: 16 }, { header: 'Nama', key: 'nama', width: 20 }, { header: 'Peran', key: 'peran', width: 12 },
    { header: 'Versi firmware', key: 'fw', width: 20 }, { header: 'ID meja', key: 'meja', width: 10 },
  ], p.perangkat.map((d) => ({ kode: d.kode, nama: d.nama ?? '', peran: d.peran ?? '', fw: d.versi_firmware ?? '', meja: d.id_meja ?? '' })))

  return wb
}

export const namaBerkasPaket = (dari: number, sampai: number) => `paket-riset_${tanggalIso(dari)}_sd_${tanggalIso(sampai)}.xlsx`

/** Unduh buku kerja sebagai .xlsx lewat tautan sementara. */
export async function unduhPaketRiset(p: PaketRiset, dari: number, sampai: number): Promise<void> {
  const wb = await bangunPaketRiset(p)
  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = namaBerkasPaket(dari, sampai)
  a.click()
  URL.revokeObjectURL(url)
}
