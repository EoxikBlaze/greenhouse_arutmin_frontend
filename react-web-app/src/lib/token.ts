/** Penanda sesi web — token JWT hidup di cookie HttpOnly (tidak terbaca JS). */
export const AUTH_KEY = 'vsf-auth'

/**
 * Pengenal sesi untuk kunci cache GET (bukan rahasia): username tersimpan.
 * Nama lama dipertahankan agar pemanggil tidak berubah.
 */
export function currentToken(): string {
  try {
    const raw = localStorage.getItem(AUTH_KEY) ?? '{}'
    return String(JSON.parse(raw).username ?? '')
  } catch {
    return ''
  }
}

/** Nilai cookie vsf_csrf (double-submit) untuk header X-CSRF-Token. */
export function tokenCsrf(): string {
  const m = document.cookie.split('; ').find((c) => c.startsWith('vsf_csrf='))
  return m ? decodeURIComponent(m.slice('vsf_csrf='.length)) : ''
}
