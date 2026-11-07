/** Penanda sesi web — menyimpan sesi & token Bearer agar bebas masalah cookie antar HTTP/HTTPS lokal. */
export const AUTH_KEY = 'vsf-auth'

function bacaRawAuth(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(AUTH_KEY) ?? sessionStorage.getItem(AUTH_KEY) ?? '{}'
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

/** Token JWT Bearer untuk header Authorization. */
export function bearerToken(): string {
  const d = bacaRawAuth()
  return typeof d.token === 'string' ? d.token : ''
}

/** Apakah sesi saat ini adalah akun Demo (hanya terima data, tidak boleh kirim data). */
export function isDemoSession(): boolean {
  const d = bacaRawAuth()
  return d.demo === true || d.role === 'demo'
}

/**
 * Pengenal sesi untuk kunci cache GET.
 */
export function currentToken(): string {
  const d = bacaRawAuth()
  return String(d.token ?? d.username ?? '')
}

/** Nilai cookie vsf_csrf (double-submit) untuk header X-CSRF-Token. */
export function tokenCsrf(): string {
  const m = document.cookie.split('; ').find((c) => c.startsWith('vsf_csrf='))
  return m ? decodeURIComponent(m.slice('vsf_csrf='.length)) : ''
}
