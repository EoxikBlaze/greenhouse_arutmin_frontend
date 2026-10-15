import axios from 'axios'

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
