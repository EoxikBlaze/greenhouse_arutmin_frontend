/** Penyimpanan token auth — dipisah agar tanpa siklus import dengan api.ts. */
export const AUTH_KEY = 'vsf-auth'

/**
 * Token sesi saat ini (dibaca segar di tiap request API).
 * Disimpan di localStorage (tetap hidup saat tab ditutup); sesi lama di
 * sessionStorage masih dibaca sekali untuk migrasi mulus.
 */
export function currentToken(): string {
  try {
    const raw = localStorage.getItem(AUTH_KEY) ?? sessionStorage.getItem(AUTH_KEY) ?? '{}'
    return String(JSON.parse(raw).token ?? '')
  } catch {
    return ''
  }
}
