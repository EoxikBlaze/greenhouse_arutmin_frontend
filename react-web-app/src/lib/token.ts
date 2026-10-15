/** Penyimpanan token auth — dipisah agar tanpa siklus import dengan api.ts. */
export const AUTH_KEY = 'vsf-auth'

/** Token sesi saat ini (dibaca segar di tiap request API). */
export function currentToken(): string {
  try {
    return String(JSON.parse(sessionStorage.getItem(AUTH_KEY) ?? '{}').token ?? '')
  } catch {
    return ''
  }
}
