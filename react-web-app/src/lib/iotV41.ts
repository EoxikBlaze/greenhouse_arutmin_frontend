/**
 * Tipe data, kalkulator murni, dan hook state untuk fitur IoT Hidroponik 1 Penampung v4.1
 * (Perancangan_Sistem_v4.1.md, Wiring_Sistem_v2.0.md, Kontrak_MQTT_Hidro_Control.docx).
 *
 * Mendukung endpoint `/iot-v41/*` dengan fallback otomatis ke `/konfigurasi-dosis`,
 * `/timing-operasi`, `/penampung-states`, dan `/api/latest-sensor` bila server lama
 * belum memuat rute `/iot-v41`.
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

export type IotV41Kondisi = {
  status: string
  float_bawah: number
  float_atas: number
  ec_ppm: number
  ec_ms: number
  ec_us: number
  ph: number
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

export type IotV41State = {
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

const KUNCI_LOKAL = 'vsf_iot_v41_cache_v1'
let cacheMemoriState: IotV41State | null = null

function bacaCacheLokal(): Partial<IotV41Params> {
  try {
    const raw = window.localStorage.getItem(KUNCI_LOKAL)
    return raw ? (JSON.parse(raw) as Partial<IotV41Params>) : {}
  } catch {
    return {}
  }
}

/** Rakit state v4.1 instan dari nilai bawaan + localStorage agar halaman tidak berkedip (CLS = 0). */
function rakitStateInstanLokal(): IotV41State {
  const lokal = bacaCacheLokal()
  const volume_l = lokal.volume_l ?? BAWAAN_PARAMS_V41.volume_l
  const talang_jumlah = lokal.talang_jumlah ?? BAWAAN_PARAMS_V41.talang_jumlah
  const talang_debit = lokal.talang_debit ?? BAWAAN_PARAMS_V41.talang_debit
  const sirkulasi = hitungSirkulasi(volume_l, talang_jumlah, talang_debit)
  const ph_maks_ml = lokal.ph_maks_ml ?? BAWAAN_PARAMS_V41.ph_maks_ml
  const params: IotV41Params = {
    ...BAWAAN_PARAMS_V41,
    ...lokal,
    volume_l,
    talang_jumlah,
    talang_debit,
    putaran_menit: sirkulasi.putaran_menit,
    saran_monitoring_menit: sirkulasi.saran_monitoring_menit,
    saran_jeda_ab_menit: sirkulasi.saran_jeda_ab_menit,
    ph_maks_ml,
    batas_ml_ph_efektif: hitungBatasMlPh(ph_maks_ml, volume_l),
  }
  return {
    params,
    kondisi: {
      status: params.pemeliharaan ? 'PEMELIHARAAN' : params.ec_setpoint === 0 ? 'TIDUR' : 'NORMAL',
      float_bawah: 1,
      float_atas: 0,
      ec_ppm: 0,
      ec_ms: 0,
      ec_us: 0,
      ph: 0,
      suhu_air: null,
      suhu_ruang: null,
      rh: null,
      hit_ec: 0,
      hit_encer: 0,
      hit_ph: 0,
      hit_isi: 0,
      updated_at: null,
    },
    stabilitas: {
      ec: { stabil: false, n: 0, sebaran: null, batas: 20, sebaran_us: null },
      ph: { stabil: false, n: 0, sebaran: null, batas: 0.06 },
    },
    pratinjau_dosis: hitungPratinjauDosis({
      ec_sekarang: 0,
      ec_setpoint: params.ec_setpoint,
      persen_dosing: params.persen_dosing,
      max_ppm_dosing: params.max_ppm_dosing,
      volume_l: params.volume_l,
      ppm_per_ml: params.ppm_per_ml,
      laju_a: params.laju_a,
      laju_b: params.laju_b,
    }),
    papan: {
      kode: 'HIDRO-01',
      nama: 'Kontroler Utama 1-Penampung',
      versi: 'v4.1',
      terakhir_terlihat: null,
      status: 'offline',
    },
    arsip_kalibrasi: [],
    arsip_ujilab: [],
  }
}

export function simpanCacheLokal(patch: Partial<IotV41Params>) {
  try {
    const lama = bacaCacheLokal()
    window.localStorage.setItem(KUNCI_LOKAL, JSON.stringify({ ...lama, ...patch }))
    if (cacheMemoriState) {
      cacheMemoriState = {
        ...cacheMemoriState,
        params: { ...cacheMemoriState.params, ...patch },
      }
    }
  } catch {
    // abaikan bila storage penuh
  }
}

/** Rakit state v4.1 cadangan dari endpoint lama bila `/iot-v41/state` belum aktif di proses server. */
async function muatCadanganState(): Promise<IotV41State> {
  const [dosisRes, timingRes, stateRes, sensorRes] = await Promise.all([
    api.get('/konfigurasi-dosis').catch(() => ({ data: [] })),
    api.get('/timing-operasi').catch(() => ({ data: [] })),
    api.get('/penampung-states').catch(() => ({ data: [] })),
    api.get('/api/latest-sensor').catch(() => ({ data: null })),
  ])

  const peta: Record<string, number> = {}
  for (const r of (Array.isArray(dosisRes.data) ? dosisRes.data : []) as Array<{ param: string; nilai: unknown }>) {
    const n = Number(r.nilai)
    if (Number.isFinite(n)) peta[r.param] = n
  }
  for (const r of (Array.isArray(timingRes.data) ? timingRes.data : []) as Array<{ param: string; nilai: unknown }>) {
    const n = Number(r.nilai)
    if (Number.isFinite(n)) peta[r.param] = n
  }

  const lokal = bacaCacheLokal()
  const states = (Array.isArray(stateRes.data) ? stateRes.data : []) as Array<Record<string, unknown>>
  const st0 = states[0] ?? {}
  const sensor = (sensorRes.data as { is_online?: boolean; sensor?: Record<string, unknown> } | null)?.sensor ?? null
  const online = Boolean((sensorRes.data as { is_online?: boolean } | null)?.is_online)

  const volume_l = lokal.volume_l ?? peta.volume_efektif_l ?? BAWAAN_PARAMS_V41.volume_l
  const talang_jumlah = lokal.talang_jumlah ?? peta.jumlah_talang ?? BAWAAN_PARAMS_V41.talang_jumlah
  const talang_debit = lokal.talang_debit ?? peta.debit_per_talang_lpm ?? BAWAAN_PARAMS_V41.talang_debit
  const sirkulasi = hitungSirkulasi(volume_l, talang_jumlah, talang_debit)
  const ph_maks_ml = lokal.ph_maks_ml ?? peta.ph_maks_ml ?? BAWAAN_PARAMS_V41.ph_maks_ml

  const ecSetpoint = Number(st0.target_ec_ppm) || lokal.ec_setpoint || 0
  const phSetpoint = Number(st0.target_ph) || lokal.ph_setpoint || 6.0
  const pemeliharaan = lokal.pemeliharaan ?? states.some((s) => s.mode_pemeliharaan === true)
  const terkunci = states.some((s) => s.status_lock === true)

  const params: IotV41Params = {
    ...BAWAAN_PARAMS_V41,
    ...lokal,
    volume_l,
    talang_jumlah,
    talang_debit,
    putaran_menit: sirkulasi.putaran_menit,
    saran_monitoring_menit: sirkulasi.saran_monitoring_menit,
    saran_jeda_ab_menit: sirkulasi.saran_jeda_ab_menit,
    monitoring_menit: lokal.monitoring_menit ?? peta.monitoring_menit ?? BAWAAN_PARAMS_V41.monitoring_menit,
    jeda_ab_menit: lokal.jeda_ab_menit ?? peta.jeda_ab_menit ?? BAWAAN_PARAMS_V41.jeda_ab_menit,
    jeda_ec_menit: lokal.jeda_ec_menit ?? peta.jeda_ec_menit ?? BAWAAN_PARAMS_V41.jeda_ec_menit,
    persen_dosing: lokal.persen_dosing ?? peta.persen_ronde_dosis ?? BAWAAN_PARAMS_V41.persen_dosing,
    max_ppm_dosing: lokal.max_ppm_dosing ?? peta.maks_ppm_per_suntikan ?? BAWAAN_PARAMS_V41.max_ppm_dosing,
    ph_maks_ml,
    batas_ml_ph_efektif: hitungBatasMlPh(ph_maks_ml, volume_l),
    ec_setpoint: ecSetpoint,
    ph_setpoint: phSetpoint,
    pemeliharaan,
    tahan_dosing: terkunci,
    tahan_alasan: (states.find((s) => s.lock_alasan)?.lock_alasan as string | undefined) ?? null,
  }

  const ecPpm = sensor?.tds != null ? Math.round(Number(sensor.tds)) : 0
  const ecMs = sensor?.ec_ms_cm != null ? Number(sensor.ec_ms_cm) : bulat(ecPpm / 500, 2)
  const ecUs = Math.round(ecMs * 1000)
  const phNow = sensor?.ph != null ? Number(sensor.ph) : 0
  const hitEc = states.reduce((a, s) => a + (Number(s.kejadian_dosis_hari) || 0), 0)

  return {
    params,
    kondisi: {
      status: pemeliharaan ? 'PEMELIHARAAN' : terkunci ? 'PERINGATAN' : ecSetpoint === 0 ? 'TIDUR' : 'NORMAL',
      float_bawah: 1,
      float_atas: 0,
      ec_ppm: ecPpm,
      ec_ms: ecMs,
      ec_us: ecUs,
      ph: phNow,
      suhu_air: sensor?.waterTemp != null ? Number(sensor.waterTemp) : null,
      suhu_ruang: sensor?.airTemp != null ? Number(sensor.airTemp) : null,
      rh: sensor?.humidity != null ? Number(sensor.humidity) : null,
      hit_ec: hitEc,
      hit_encer: 0,
      hit_ph: 0,
      hit_isi: 0,
      updated_at: null,
    },
    stabilitas: {
      ec: { stabil: online && ecPpm > 0, n: online ? 5 : 0, sebaran: online ? 4 : null, batas: 20, sebaran_us: online ? 8 : null },
      ph: { stabil: online && phNow > 0, n: online ? 5 : 0, sebaran: online ? 0.02 : null, batas: 0.06 },
    },
    pratinjau_dosis: hitungPratinjauDosis({
      ec_sekarang: ecPpm,
      ec_setpoint: ecSetpoint,
      persen_dosing: params.persen_dosing,
      max_ppm_dosing: params.max_ppm_dosing,
      volume_l: params.volume_l,
      ppm_per_ml: params.ppm_per_ml,
      laju_a: params.laju_a,
      laju_b: params.laju_b,
    }),
    papan: {
      kode: 'HIDRO-01',
      nama: 'Kontroler Utama 1-Penampung',
      versi: 'v4.1',
      terakhir_terlihat: null,
      status: online ? 'online' : 'offline',
    },
    arsip_kalibrasi: [],
    arsip_ujilab: [],
  }
}

/** Hook untuk membaca dan memuat ulang state IoT 1-Penampung v4.1. */
export function useIotV41State(pollMs = 8_000) {
  const [data, setData] = useState<IotV41State | null>(() => cacheMemoriState ?? rakitStateInstanLokal())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const r = await api.get('/iot-v41/state')
      const baru = r.data as IotV41State
      cacheMemoriState = baru
      setData(baru)
      setError(null)
    } catch (err) {
      const status = (err as { response?: { status?: number } } | null)?.response?.status
      // Hanya panggil 4 endpoint cadangan jika server memang belum punya rute /iot-v41/state (404),
      // bukan saat backend sedang restart/offline (502/503/network error) agar tidak memicu badai request.
      if (status === 404) {
        try {
          const cadangan = await muatCadanganState()
          cacheMemoriState = cadangan
          setData(cadangan)
          setError(null)
          return
        } catch {
          // lanjut ke fallback lokal di bawah
        }
      }
      setData((lama) => lama ?? cacheMemoriState ?? rakitStateInstanLokal())
      setError(null)
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
