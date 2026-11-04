import { currentToken, tokenCsrf } from './token'

/**
 * Same-origin (default) — request dilewatkan proxy Vite ke backend
 * (lihat vite.config.ts). Domain/port backend TIDAK diketahui browser.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/** Bentuk respons/kegagalan sengaja sama dengan axios (`data`, `status`, `headers`, `err.response`) agar pemanggil tidak berubah. */
export interface AxiosResponse<T = any> {
  data: T
  status: number
  headers: Record<string, string>
}
export interface AxiosRequestConfig {
  params?: Record<string, unknown>
  responseType?: 'json' | 'blob'
  signal?: AbortSignal
  headers?: Record<string, string>
}

class GalatApi extends Error {
  response?: AxiosResponse
  request?: true
}

function buatUrl(url: string, params?: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === undefined || v === null) continue
    if (Array.isArray(v)) v.forEach((x) => q.append(k, String(x)))
    else q.append(k, String(v))
  }
  const teks = q.toString()
  return API_BASE_URL + url + (teks ? (url.includes('?') ? '&' : '?') + teks : '')
}

async function kirim<T>(method: string, url: string, body?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json', ...config?.headers }
  const bukanGet = method !== 'GET' && method !== 'HEAD'
  if (bukanGet) {
    const csrf = tokenCsrf()
    if (csrf) headers['X-CSRF-Token'] = csrf
    bersihkanCacheApi()
  }
  let isi: BodyInit | undefined
  if (body instanceof FormData) isi = body
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    isi = JSON.stringify(body)
  }
  let res: Response
  try {
    res = await fetch(buatUrl(url, config?.params), { method, headers, body: isi, credentials: 'include', signal: config?.signal })
  } catch (e) {
    if (config?.signal?.aborted) throw e
    const g = new GalatApi('Network Error')
    g.request = true
    throw g
  }
  const hdr: Record<string, string> = {}
  res.headers.forEach((v, k) => (hdr[k] = v))
  let data: unknown
  if (config?.responseType === 'blob' && res.ok) data = await res.blob()
  else {
    const teks = await res.text()
    try {
      data = teks ? JSON.parse(teks) : ''
    } catch {
      data = teks
    }
  }
  const hasil = { data: data as T, status: res.status, headers: hdr }
  if (!res.ok) {
    const g = new GalatApi(`Request failed with status code ${res.status}`)
    g.response = hasil
    g.request = true
    throw g
  }
  return hasil
}

const getAsli = <T = any>(url: string, config?: AxiosRequestConfig) => kirim<T>('GET', url, undefined, config)

export const api = {
  get: getAsli,
  post: <T = any>(url: string, body?: unknown, config?: AxiosRequestConfig) => kirim<T>('POST', url, body, config),
  put: <T = any>(url: string, body?: unknown, config?: AxiosRequestConfig) => kirim<T>('PUT', url, body, config),
  patch: <T = any>(url: string, body?: unknown, config?: AxiosRequestConfig) => kirim<T>('PATCH', url, body, config),
  delete: <T = any>(url: string, config?: AxiosRequestConfig) => kirim<T>('DELETE', url, undefined, config),
}

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
}) as typeof getAsli
