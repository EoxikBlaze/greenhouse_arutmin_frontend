import { useEffect, useState } from 'react'
import { api } from './api'
import type { RentangMs } from './riwayatSensor'

/** Jenis kejadian dosing yang dicatat server dari hitungan harian alat (jumlah mL tidak dilaporkan alat). */
export type JenisDosing = 'AB' | 'PH' | 'ENCER' | 'ISI'
export type Penanda = { t: number; jenis: JenisDosing }

export const NAMA_PENANDA: Record<JenisDosing, string> = { AB: 'Nutrisi A+B', PH: 'Koreksi pH', ENCER: 'Pengenceran', ISI: 'Isi air' }
export const WARNA_PENANDA: Record<JenisDosing, string> = { AB: '#B7791F', PH: '#6B46C1', ENCER: '#2B6CB0', ISI: '#0F766E' }

/** Ringkasan sebaran tanpa asumsi normal: median dan kuartil. */
export type Sebaran = { n: number; median: number; q1: number; q3: number; iqr: number; min: number; maks: number }
export type SelangKepercayaan = { n: number; rata: number; sd: number; bawah: number; atas: number }

export type KestabilanSensor = {
  sebaran?: Sebaran | null
  ci_dalam_batas?: SelangKepercayaan | null
  hari_n?: number
  n: number
  rata: number | null
  sd: number | null
  min: number | null
  maks: number | null
  ada_batas: boolean
  dalam_batas_persen: number | null
  batas: { min: number; max: number } | null
  per_hari: { tanggal: string; n: number; rata: number; dalam_batas_persen: number | null }[]
}
export type ResponKestabilan = {
  cakupan_persen: number | null
  sensor: Record<'ph' | 'tds' | 'waterTemp' | 'airTemp' | 'humidity', KestabilanSensor>
}
export type ResponRespons = {
  statistik?: { sebaran: Sebaran | null; ci_median: { n: number; bawah: number; atas: number } | null }
  jumlah_ab: number
  jumlah_bersih: number
  median_naik: number | null
  rendah: number[]
  kejadian: { t: number; sebelum: number; sesudah: number; naik: number; bersih: boolean }[]
}
export type ResponKonsumsi = {
  statistik?: { sebaran_segmen_per_hari: Sebaran | null; ci_median: { n: number; bawah: number; atas: number } | null }
  normalisasi?: { volume_l: number | null; tanaman_aktif: number | null; gram_per_hari: number | null; gram_per_tanaman_per_hari: number | null }
  ppm_turun_per_hari: number | null
  total_jam: number
  segmen: { dari: number; sampai: number; turun_per_jam: number; jam: number }[]
  kegiatan_per_hari: { tanggal: string; ab: number; ph: number; encer: number; isi: number }[]
}
export type SelPola = { tanggal: string; jam: number; suhu: number | null; rh: number | null; vpd: number | null }
export type ResponPola = {
  sel: SelPola[]
  per_jam: { jam: number; suhu: number | null; rh: number | null; vpd: number | null }[]
  kategori_vpd: { jam: number; nilai: 'terlalu_lembap' | 'baik' | 'terlalu_kering' | null }[]
  catatan: string
}
export type RingkasBatch = {
  id: number | string
  tanaman: string | null
  meja: string | null
  mulai: string
  status: string
  tgl_panen: string | null
  panen_berhasil: number
  panen_gagal: number
}
export type PasanganKorelasi = {
  a: string; b: string; nama_a: string; nama_b: string
  n: number; n_efektif: number | null; rho: number | null; p: number | null; kekuatan: string | null
}
export type ResponKorelasi = { satuan_waktu: string; jumlah_perbandingan: number; pasangan: PasanganKorelasi[] }

export type KualitasSensor = {
  nama: string
  n: number
  cakupan_persen: number | null
  di_luar_fisik: number
  lonjakan: { n: number; lonjakan: number; persen: number }
  tren: { n: number; kemiringan_per_hari: number; tau: number; p: number } | null
  hari_n: number
  umur_kalibrasi_hari: number | null
}
export type ResponKualitas = { sensor: Record<'ph' | 'tds' | 'waterTemp' | 'airTemp' | 'humidity', KualitasSensor> }

export type UjiBatch = { nama: string; n_pasang: number; selisih_median: number | null; p: number | null; metode: string | null; cukup: boolean }

export type DeretBatch = {
  batch: RingkasBatch
  hari: { n: number; ph: number | null; tds: number | null; waterTemp: number | null; airTemp: number | null; humidity: number | null }[]
  ringkas: Record<'ph' | 'tds' | 'waterTemp' | 'airTemp' | 'humidity', Omit<KestabilanSensor, 'per_hari' | 'batas'>>
  jumlah_titik: number
}

/** Ambil GET /api/analisis/<jalur> untuk satu rentang; data lama tetap tampil saat memuat ulang. Rentang live diperbarui tiap 60 detik. */
export function useAnalisis<T>(jalur: string, r: RentangMs | null, tambahan: Record<string, string | number> = {}) {
  const [data, setData] = useState<T | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(false)
  const dari = r?.dari ?? null
  const sampai = r?.sampai ?? null
  const live = r?.live ?? false
  const kunciTambahan = JSON.stringify(tambahan)
  useEffect(() => {
    if (dari === null || sampai === null) return
    let batal = false
    const ambil = () => {
      setMemuat(true)
      const akhir = live ? Date.now() : sampai
      api
        .get(`/api/analisis/${jalur}`, { params: { dari: new Date(dari).toISOString(), sampai: new Date(akhir).toISOString(), ...JSON.parse(kunciTambahan) } })
        .then((res) => {
          if (batal) return
          setData(res.data as T)
          setGalat(null)
        })
        .catch((err) => {
          if (batal) return
          const pesan = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          setGalat(pesan ?? 'Analisis belum bisa dimuat.')
        })
        .finally(() => {
          if (!batal) setMemuat(false)
        })
    }
    ambil()
    const id = live ? setInterval(ambil, 60_000) : undefined
    return () => {
      batal = true
      if (id) clearInterval(id)
    }
  }, [jalur, dari, sampai, live, kunciTambahan])
  return { data, galat, memuat }
}

/** "78%" atau "—". */
export const persenTeks = (v: number | null | undefined, desimal = 0) =>
  v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(desimal).replace('.', ',')}%`
