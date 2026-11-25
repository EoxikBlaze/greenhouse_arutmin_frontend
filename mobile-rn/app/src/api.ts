import * as SecureStore from 'expo-secure-store'

const KUNCI_TOKEN = 'garap_token'
const KUNCI_SERVER = 'garap_server'
export const SERVER_BAWAAN = process.env.EXPO_PUBLIC_API_URL ?? 'https://garap.net/m'

let token: string | null = null
let server = SERVER_BAWAAN
let saatSesiHabis: () => void = () => {}

export const pasangSesiHabis = (f: () => void) => { saatSesiHabis = f }

export async function muatSesi(): Promise<{ token: string | null; server: string }> {
  try {
    token = await SecureStore.getItemAsync(KUNCI_TOKEN)
    server = (await SecureStore.getItemAsync(KUNCI_SERVER)) ?? SERVER_BAWAAN
  } catch {
    token = null
  }
  return { token, server }
}

export async function simpanSesi(t: string | null, s?: string) {
  token = t
  if (s) server = s.replace(/\/+$/, '')
  try {
    if (t) await SecureStore.setItemAsync(KUNCI_TOKEN, t)
    else await SecureStore.deleteItemAsync(KUNCI_TOKEN)
    if (s) await SecureStore.setItemAsync(KUNCI_SERVER, server)
  } catch {
    /* penyimpanan aman tidak tersedia: sesi hanya hidup selama app terbuka */
  }
}

export class GalatApi extends Error {
  constructor(public status: number, pesan: string, public kolom: Record<string, string[]> = {}) {
    super(pesan)
  }
}

async function minta(metode: string, path: string, badan?: unknown, terima = 'application/json'): Promise<string> {
  const ctl = new AbortController()
  const waktu = setTimeout(() => ctl.abort(), path.includes('/ai/') ? 70_000 : 20_000)
  try {
    const res = await fetch(`${server}/v1/${path}`, {
      method: metode,
      signal: ctl.signal,
      headers: {
        Accept: terima,
        ...(badan !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: badan !== undefined ? JSON.stringify(badan) : undefined,
    })
    const teks = await res.text()
    if (!res.ok) {
      let j: { message?: string; errors?: Record<string, string[]> } = {}
      try { j = JSON.parse(teks) } catch { /* bukan JSON */ }
      if (res.status === 401 && token && !path.startsWith('login')) saatSesiHabis()
      throw new GalatApi(res.status, j.message ?? `Server menjawab ${res.status}.`, j.errors ?? {})
    }
    return teks
  } catch (e) {
    if (e instanceof GalatApi) throw e
    const batas = e instanceof Error && e.name === 'AbortError'
    throw new GalatApi(0, batas ? 'Server terlalu lama menjawab.' : 'Tidak dapat terhubung ke server. Periksa sinyal.')
  } finally {
    clearTimeout(waktu)
  }
}

const urai = <T>(t: string): T => (t ? (JSON.parse(t) as T) : ({} as T))

export const ambil = async <T>(path: string) => urai<T>(await minta('GET', `p/${path}`))
export const kirim = async <T>(path: string, badan: unknown = {}, metode: 'POST' | 'PUT' = 'POST') =>
  urai<T>(await minta(metode, `p/${path}`, badan))
export const masuk = async (username: string, password: string) =>
  urai<{ token: string; user: Pengguna }>(await minta('POST', 'login', { username, password }))
export const beranda = async () => urai<Beranda>(await minta('GET', 'beranda'))
export const obrolan = (pesan: string, riwayat: unknown[]) => minta('POST', 'p/api/ai/chat', { pesan, riwayat }, 'application/x-ndjson')

export type Pengguna = { id: string; username: string; email: string | null; level: string; is_demo?: boolean }
export type Sensor = {
  waterTemp: number | null; ph: number | null; tds: number | null; airTemp: number | null; humidity: number | null
  water_level: string | null; created_at: string; ec_ms_cm?: number | null
}
export type SensorTerbaru = {
  is_online: boolean; seconds_ago: number
  anomalies: { sensor: string; value: number; min: number; max: number }[]
  sensor: Sensor | null
  water_control?: { mode: string; valve_state: string }
}
export type Batch = {
  id: number | string; tipe: string; status: string; mulai: string; varietas?: string; meja?: string
  jumlah: number; durasi_hari?: number | null; hari_ke?: number; siap?: boolean; tahap_berikut?: string | null
}
export type BarisAlert = {
  id: number | string; type: string; value: string; severity: string; acknowledged: boolean
  created_at: string; sedang_terjadi?: boolean
}
export type KondisiAlat = {
  status: string; ec_ppm: number | null; ph: number | null; suhu_air: number | null; basi?: boolean
  float_bawah: number | null; float_atas: number | null
}
export type StateAlat = {
  otomasi_alat?: { nutrisi: boolean | null; ph: boolean | null; encer: boolean | null; isi: boolean | null } | null
  params: { saklar_ab: number; saklar_ph_up: number; saklar_ph_down: number; saklar_pengenceran: number
    mode_isi: 'otomatis' | 'manual'; ec_setpoint: number; ph_setpoint: number; pemeliharaan: boolean
    tahan_dosing: boolean; tahan_alasan: string | null }
  kondisi: KondisiAlat
  papan: { nama: string; versi: string; status: string }
  arsip_kalibrasi: { id: number | string; sensor: string; dilakukan_pada: string; lulus?: boolean | null; catatan?: string | null }[]
  arsip_ujilab: { id: number | string; sensor: string; dilakukan_pada: string; catatan?: string | null }[]
}
export type Beranda = {
  sensor: SensorTerbaru | null
  kebun: { list?: Batch[] } | null
  peringatan: { data?: BarisAlert[]; aktif?: number } | null
  alat: StateAlat | null
}
