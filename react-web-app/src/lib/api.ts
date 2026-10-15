import axios from 'axios'
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

// Lampirkan token sesi (Bearer) di setiap request — dibaca segar dari storage.
api.interceptors.request.use((config) => {
  const token = currentToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
