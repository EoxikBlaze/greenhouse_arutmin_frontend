import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { AUTH_KEY, bearerToken, currentToken, isDemoSession, tokenCsrf } from './token'

export const KUNCI_PESAN_SESI = 'vsf_pesan_sesi'
export const EVENT_SESI_HABIS = 'vsf:sesi-habis'
export const KUNCI_SERVER_URL = 'vsf_api_base_url'

/**
 * Apakah aplikasi sedang berjalan di dalam WebView Android APK (file:// atau capacitor://)
 * atau pengguna telah mengatur URL server backend secara kustom?
 */
export function adalahModeApkAtauKustom(): boolean {
  if (typeof window === 'undefined') return false
  const proto = window.location?.protocol ?? ''
  const host = window.location?.hostname ?? ''
  const ua = typeof navigator !== 'undefined' ? (navigator.userAgent ?? '') : ''
  return (
    proto === 'file:' ||
    proto === 'capacitor:' ||
    proto === 'app:' ||
    host === 'appassets.androidplatform.net' ||
    ua.includes('GarapAndroidApk')
  )
}

export function bacaServerUrl(): string {
  try {
    const tersimpan = typeof localStorage !== 'undefined' ? localStorage.getItem(KUNCI_SERVER_URL)?.trim() : ''
    if (tersimpan) return tersimpan.replace(/\/+$/, '')
  } catch {
    /* abaikan */
  }
  const envUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
  if (envUrl) return envUrl
  if (adalahModeApkAtauKustom()) return 'https://garap.net'
  return ''
}

export function aturServerUrl(baru: string): string {
  const bersih = baru.trim().replace(/\/+$/, '')
  try {
    if (bersih) localStorage.setItem(KUNCI_SERVER_URL, bersih)
    else localStorage.removeItem(KUNCI_SERVER_URL)
  } catch {
    /* abaikan */
  }
  api.defaults.baseURL = bersih || bacaServerUrl()
  bersihkanCacheApi()
  return api.defaults.baseURL ?? ''
}

/**
 * Same-origin (default di web) — request dilewatkan proxy Vite/Nginx ke backend.
 * Di APK Android (file://), otomatis memakai server tersimpan atau https://garap.net.
 */
export const API_BASE_URL = bacaServerUrl()

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
    // Halaman /dashboard dan API /dashboard ber-URL sama; nginx menyajikan HTML halaman tanpa Cache-Control,
    // sehingga browser memakai ulang HTML itu untuk GET API pertama (status "Alat terputus" palsu).
    // Header ini membuat browser melewati cache HTTP (Fetch spec: cache mode → no-store).
    'Cache-Control': 'no-cache',
  },
})

// Dedup GET serentak (StrictMode double-effect & multi-komponen seperti AppShell + Dashboard)
// serta micro-cache singkat (300ms) yang otomatis dibersihkan setiap ada mutasi (POST/PUT/PATCH/DELETE).
const getSedangJalan = new Map<string, Promise<AxiosResponse>>()
const getCacheSingkat = new Map<string, { exp: number; res: AxiosResponse }>()
const MASA_CACHE_GET_MS = 300

function kunciGet(url: string, config?: AxiosRequestConfig): string | null {
  if (config?.responseType && config.responseType !== 'json') return null
  if (config?.signal) return null
  const params = config?.params ? JSON.stringify(config.params) : ''
  return `${currentToken() ?? ''}::${url}::${params}`
}

export function bersihkanCacheApi() {
  getSedangJalan.clear()
  getCacheSingkat.clear()
}

// Sesi lewat Bearer token (bebas konflik cookie HTTP/HTTPS) + kompatibel cookie.
// Akun Demo hanya boleh menerima data (GET/HEAD), tidak boleh mengirim data (POST/PUT/PATCH/DELETE).
api.interceptors.request.use((config) => {
  const tok = bearerToken()
  if (tok) {
    config.headers.Authorization = `Bearer ${tok}`
  }
  const method = (config.method ?? 'get').toLowerCase()
  const url = String(config.url ?? '')
  if (method !== 'get' && method !== 'head') {
    if (isDemoSession() && !url.includes('/login') && !url.includes('/logout')) {
      const pesan = 'Mode demo hanya dapat menerima dan melihat data (tidak dapat mengirim atau mengubah data).'
      return Promise.reject({
        response: { status: 403, data: { message: pesan } },
        message: pesan,
      })
    }
    const csrf = tokenCsrf()
    if (csrf) config.headers['X-CSRF-Token'] = csrf
    bersihkanCacheApi()
  }
  return config
})

// Tangkap 401 (Tidak terautentikasi / sesi habis) → simpan peringatan & arahkan kembali ke halaman login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = (err as { response?: { status?: number } })?.response?.status
    const url = String((err as { config?: { url?: string } })?.config?.url ?? '')
    if (status === 401 && !url.includes('/login') && !url.includes('/logout')) {
      bersihkanCacheApi()
      try {
        localStorage.removeItem(AUTH_KEY)
        sessionStorage.setItem(
          KUNCI_PESAN_SESI,
          'Sesi Anda telah berakhir atau Anda belum masuk. Silakan login terlebih dahulu.',
        )
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(EVENT_SESI_HABIS))
        }
      } catch {
        /* abaikan bila storage terkunci */
      }
    }
    return Promise.reject(err)
  },
)

const getAsli = api.get.bind(api)
api.get = ((url: string, config?: AxiosRequestConfig) => {
  const kunci = kunciGet(url, config)
  if (!kunci) return getAsli(url, config)

  const sekarang = Date.now()
  const tersimpan = getCacheSingkat.get(kunci)
  if (tersimpan && tersimpan.exp > sekarang) {
    return Promise.resolve(tersimpan.res)
  }

  const aktif = getSedangJalan.get(kunci)
  if (aktif) {
    return aktif
  }

  const janji = getAsli(url, config)
    .then((res) => {
      if (!import.meta.env.VITEST) {
        getCacheSingkat.set(kunci, { exp: Date.now() + MASA_CACHE_GET_MS, res })
      }
      return res
    })
    .finally(() => {
      getSedangJalan.delete(kunci)
    })

  getSedangJalan.set(kunci, janji)
  return janji
}) as typeof api.get
