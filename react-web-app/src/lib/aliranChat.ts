import type { AxiosProgressEvent } from 'axios'

/**
 * Aliran jawaban asisten (Accept: application/x-ndjson) — lihat backend src/aiStreamKalimat.js.
 * Baris: {tipe:'kalimat', teks} … lalu satu {tipe:'selesai', …jawaban akhir}.
 * Kalimat hanya pratinjau: jawaban akhir (sudah lolos guard penuh) selalu menggantikannya.
 */
export type HasilAliran<T> = { kalimat: string[]; selesai: T | null }

function urai(baris: string): Record<string, unknown> | null {
  try {
    const o: unknown = JSON.parse(baris)
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function bacaAliran<T>(teks: string): HasilAliran<T> {
  const lengkap = teks.split('\n').slice(0, -1) // potongan terakhir belum tentu utuh
  const kalimat: string[] = []
  let selesai: T | null = null
  for (const b of lengkap) {
    const o = urai(b)
    if (o?.tipe === 'kalimat' && typeof o.teks === 'string') kalimat.push(o.teks)
    else if (o?.tipe === 'selesai') selesai = o as T
  }
  // backend lama / proxy yang membalas JSON biasa
  if (!selesai && !kalimat.length) {
    const o = urai(teks.trim())
    if (o && 'jawaban' in o) selesai = o as T
  }
  return { kalimat, selesai }
}

/** Teks yang sudah diterima sejauh ini (adapter XHR axios). */
export function teksDiterima(e: AxiosProgressEvent): string {
  const xhr = e.event?.target as XMLHttpRequest | undefined
  return typeof xhr?.responseText === 'string' ? xhr.responseText : ''
}
