import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { currentToken } from './token'

/**
 * Same-origin (default) — request dilewatkan proxy Vite ke backend
 * (lihat vite.config.ts). Domain/port backend TIDAK diketahui browser.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
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

// Lampirkan token sesi (Bearer) di setiap request — dibaca segar dari storage.
api.interceptors.request.use((config) => {
  const token = currentToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  const method = (config.method ?? 'get').toLowerCase()
  if (method !== 'get' && method !== 'head') {
    bersihkanCacheApi()
  }
  return config
})

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
