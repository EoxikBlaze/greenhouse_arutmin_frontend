/**
 * Tipe data, kalkulator murni, dan hook state untuk fitur IoT Hidroponik 1 Penampung v4.1
 * (Perancangan_Sistem_v4.1.md, Wiring_Sistem_v2.0.md, Kontrak_MQTT_Hidro_Control.docx).
 *
 * Sumber satu-satunya: endpoint `/iot-v41/*`. Tidak ada nilai cadangan/contoh di sisi web.
 */
import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

export type IotV41Params = {
  volume_l: number
  talang_jumlah: number
  talang_debit: number
  putaran_menit: number
  saran_monitoring_menit: number
  saran_jeda_ab_menit: number
  monitoring_menit: number
  jeda_ab_menit: number
  jeda_ec_menit: number
  persen_dosing: number
  max_ppm_dosing: number
  batas_ec_bawah: number
  batas_ec_atas: number
  batas_ph_bawah: number
  batas_ph_atas: number
  ph_maks_ml: number
  batas_ml_ph_efektif: number
  pemeliharaan_maks_menit: number
  saklar_ab: number
  saklar_ph_up: number
  saklar_ph_down: number
  saklar_pengenceran: number
  mode_isi: 'otomatis' | 'manual'
  ppm_per_ml: number
  ph_up_ml: number
  ph_down_ml: number
  /** Set kedua Uji Lab (kategori buah); null = belum ada hasil ukur nyata. Set sayur = ppm_per_ml/ph_up_ml/ph_down_ml di atas. */
  buah?: { ppm_per_ml: number | null; ph_up_ml: number | null; ph_down_ml: number | null }
  laju_a: number
  laju_b: number
  laju_ph_up: number
  laju_ph_down: number
  maks_ec_hari: number
  maks_encer_hari: number
  maks_ph_hari: number
  ec_setpoint: number
  ph_setpoint: number
  pemeliharaan: boolean
  tahan_dosing: boolean
  tahan_alasan: string | null
}

/** null = tidak ada bacaan segar / belum dilaporkan alat — JANGAN dibaca sebagai 0. */
export type IotV41Kondisi = {
  status: string
  float_bawah: number | null
  float_atas: number | null
  level_diperbarui_pada?: string | null
  ec_ppm: number | null
  ec_ms: number | null
  ec_us: number | null
  ph: number | null
  umur_detik?: number | null
  basi?: boolean
  /** Tegangan mentah probe pH dari alat (V); null/undefined bila alat belum mengirimnya atau datanya basi. */
  ph_volt?: number | null
  suhu_air: number | null
  suhu_ruang: number | null
  rh: number | null
  hit_ec: number
  hit_encer: number
  hit_ph: number
  hit_isi: number
  updated_at: string | null
}

export type IotV41Stabilitas = {
  ec: { stabil: boolean; n: number; sebaran: number | null; batas: number; sebaran_us?: number | null }
  ph: { stabil: boolean; n: number; sebaran: number | null; batas: number }
}

export type IotV41Pratinjau = {
  ec_sekarang: number
  ec_setpoint: number
  kurang_ppm: number
  persen_dosing: number
  dosis_ppm: number
  total_ml: number
  ml_per_pompa: number
  durasi_a_detik: number
  durasi_b_detik: number
}

export type IotV41Papan = {
  kode: string
  nama: string
  versi: string
  terakhir_terlihat: string | null
  status: 'online' | 'offline' | 'BARU'
}

export type ArsipKalibrasiRow = {
  id: number | string
  sensor: string
  dilakukan_pada: string
  nilai_ref?: number | string | null
  bacaan_sebelum?: number | string | null
  bacaan_sesudah?: number | string | null
  lulus?: boolean | null
  konstanta_lama?: Record<string, number> | null
  konstanta_baru?: Record<string, number> | null
  catatan?: string | null
  oleh_label?: string | null
}

/** Perintah JADWAL terakhir (bukti jadwal tersimpan di NVS ESP32 = status 'selesai' dari laporan alat). */
export type JadwalAlat = {
  id: number | string
  status: string
  parameter: Record<string, number> | null
  hasil: { alasan?: string } | null
  dibuat_pada: string
  selesai_pada: string | null
}

export type IotV41State = {
  /** Izin otomasi yang dilaporkan alat (nutrisi, ph, encer, isi); null = belum melapor. */
  otomasi_alat?: { nutrisi: boolean | null; ph: boolean | null; encer: boolean | null; isi: boolean | null } | null
  /** Kunci params yang TIDAK ada di database (nilai bawaan kode, bukan pengaturan tersimpan). */
  params_belum_diatur?: string[]
  jadwal_alat?: JadwalAlat | null
  params: IotV41Params
  kondisi: IotV41Kondisi
  stabilitas: IotV41Stabilitas
  pratinjau_dosis: IotV41Pratinjau
  papan: IotV41Papan
  arsip_kalibrasi: ArsipKalibrasiRow[]
  arsip_ujilab: ArsipKalibrasiRow[]
}

const bulat = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d
const jepit = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export const BAWAAN_PARAMS_V41: IotV41Params = {
  volume_l: 0,
  talang_jumlah: 5,
  talang_debit: 1.0,
  putaran_menit: 0,
  saran_monitoring_menit: 0,
  saran_jeda_ab_menit: 5,
  monitoring_menit: 45,
  jeda_ab_menit: 5,
  jeda_ec_menit: 20,
  persen_dosing: 65,
  max_ppm_dosing: 300,
  batas_ec_bawah: 900,
  batas_ec_atas: 1500,
  batas_ph_bawah: 5.0,
  batas_ph_atas: 7.0,
  ph_maks_ml: 0,
  batas_ml_ph_efektif: 5,
  pemeliharaan_maks_menit: 120,
  saklar_ab: 1,
  saklar_ph_up: 1,
  saklar_ph_down: 1,
  saklar_pengenceran: 1,
  mode_isi: 'otomatis',
  ppm_per_ml: 100.7,
  ph_up_ml: 1.0,
  ph_down_ml: 1.0,
  laju_a: 1.0,
  laju_b: 2.1,
  laju_ph_up: 1.5,
  laju_ph_down: 1.53,
  maks_ec_hari: 10,
  maks_encer_hari: 3,
  maks_ph_hari: 5,
  ec_setpoint: 0,
  ph_setpoint: 6.0,
  pemeliharaan: false,
  tahan_dosing: false,
  tahan_alasan: null,
}

/** Hitung waktu satu putaran larutan (T_putar) dan saran otomatis monitoring_menit (2 × T_putar). */
export function hitungSirkulasi(volume_l: number, talang_jumlah: number, talang_debit: number) {
  if (!(volume_l > 0 && talang_jumlah > 0 && talang_debit > 0)) {
    return { putaran_menit: 0, saran_monitoring_menit: 0, saran_jeda_ab_menit: 5 }
  }
  const putaran = bulat(volume_l / (talang_jumlah * talang_debit), 1)
  const saranMonitoring = jepit(Math.round(putaran * 2), 10, 120)
  const saranJedaAb = jepit(Math.max(3, Math.round(putaran * 0.25)), 1, 10)
  return { putaran_menit: putaran, saran_monitoring_menit: saranMonitoring, saran_jeda_ab_menit: saranJedaAb }
}

/** Hitung batas mL per koreksi pH: 0 = otomatis dari volume (maks(5, round(0,2 × volume_l))). */
export function hitungBatasMlPh(ph_maks_ml: number, volume_l: number): number {
  if (ph_maks_ml > 0) return jepit(Math.round(ph_maks_ml), 1, 200)
  return Math.max(5, Math.round(0.2 * Math.max(0, volume_l)))
}

/** Hitung kenaikan ppm per mL dari Uji Lab EC: ((akhir - awal) × volume) / (ml_a + ml_b). */
export function hitungUjiLabEc(awal: number, akhir: number, volume: number, ml_a: number, ml_b: number): number | null {
  if (!Number.isFinite(awal) || !Number.isFinite(akhir) || akhir <= awal) return null
  if (!Number.isFinite(volume) || volume <= 0 || !Number.isFinite(ml_a) || ml_a <= 0 || !Number.isFinite(ml_b) || ml_b <= 0) return null
  return bulat(((akhir - awal) * volume) / (ml_a + ml_b), 2)
}

/** Hitung mL per 1 pH per 1 L dari Uji Lab pH: ml / (|delta_ph| × volume). */
export function hitungUjiLabPh(volume: number, delta_ph: number, ml: number): number | null {
  const dph = Math.abs(delta_ph)
  if (!Number.isFinite(volume) || volume <= 0 || !Number.isFinite(dph) || dph <= 0 || !Number.isFinite(ml) || ml <= 0) return null
  return bulat(ml / (dph * volume), 3)
}

/** Hitung laju pompa (mL/detik) dari hasil takar gelas ukur: ml ÷ detik. */
export function hitungLajuPompa(detik: number, ml: number): number | null {
  if (!Number.isFinite(detik) || detik < 5 || !Number.isFinite(ml) || ml <= 0) return null
  return bulat(ml / detik, 2)
}

/** Hitung pratinjau takaran dosis A+B sesuai rumus Perancangan v4.1. */
export function hitungPratinjauDosis(p: {
  ec_sekarang: number
  ec_setpoint: number
  persen_dosing: number
  max_ppm_dosing: number
  volume_l: number
  ppm_per_ml: number
  laju_a: number
  laju_b: number
}): IotV41Pratinjau {
  const now = Math.max(0, Math.round(p.ec_sekarang || 0))
  const target = Math.max(0, Math.round(p.ec_setpoint || 0))
  const kurang = Math.max(0, target - now)
  const persen = jepit(Math.round(p.persen_dosing || 65), 50, 90)
  const maks = jepit(Math.round(p.max_ppm_dosing || 300), 50, 300)
  const dosisPpm = Math.min(maks, Math.round(kurang * (persen / 100)))
  const totalMl = p.volume_l > 0 && p.ppm_per_ml > 0 ? Math.round((dosisPpm * p.volume_l) / p.ppm_per_ml) : 0
  const mlPerPompa = bulat(totalMl / 2, 1)
  return {
    ec_sekarang: now,
    ec_setpoint: target,
    kurang_ppm: kurang,
    persen_dosing: persen,
    dosis_ppm: dosisPpm,
    total_ml: totalMl,
    ml_per_pompa: mlPerPompa,
    durasi_a_detik: p.laju_a > 0 ? Math.round(mlPerPompa / p.laju_a) : 0,
    durasi_b_detik: p.laju_b > 0 ? Math.round(mlPerPompa / p.laju_b) : 0,
  }
}

let cacheMemoriState: IotV41State | null = null

// Dulu: localStorage + nilai bawaan dirakit jadi "state" sebelum server menjawab (angka contoh tampil seolah nyata) → dihapus.

/** Hook untuk membaca dan memuat ulang state IoT 1-Penampung v4.1. */
export function useIotV41State(pollMs = 8_000) {
  // Hanya data server yang pernah diterima sesi ini; belum ada → null (panel menampilkan kerangka, bukan angka bawaan).
  const [data, setData] = useState<IotV41State | null>(() => cacheMemoriState)
  const [loading, setLoading] = useState(() => cacheMemoriState === null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const r = await api.get('/iot-v41/state')
      if (!r.data || typeof r.data !== 'object' || !('params' in r.data) || !('kondisi' in r.data)) {
        throw new Error('Respons /iot-v41/state tidak valid')
      }
      const baru = r.data as IotV41State
      cacheMemoriState = baru
      setData(baru)
      setError(null)
    } catch {
      // Data lama (bila ada) tetap tampil dengan peringatan; tidak ada pengganti dari nilai bawaan.
      setData((lama) => lama ?? cacheMemoriState)
      setError(cacheMemoriState ? 'Koneksi terputus: angka yang tampil bukan nilai terbaru.' : 'Data alat belum bisa dimuat dari server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    void reload()
    if (pollMs <= 0) return
    const id = window.setInterval(() => void reload(), pollMs)
    return () => window.clearInterval(id)
  }, [reload, pollMs])

  return { data, loading, error, reload }
}
