/**
 * Tema terang/gelap. Sumber kebenaran = atribut `html[data-tema]` ("terang" | "gelap"); pilihan pengguna disimpan di
 * localStorage (`vsf-tema`). Selama pengguna belum memilih, tema mengikuti sistem (prefers-color-scheme).
 * Dipasang sebelum cat pertama oleh public/tema-awal.js (mencegah kedipan); modul ini menjaga sinkron sesudahnya.
 */
import { useSyncExternalStore } from 'react'

export type Tema = 'terang' | 'gelap'
export const TEMA_KEY = 'vsf-tema'

export function bacaTersimpan(): Tema | null {
  try {
    const v = localStorage.getItem(TEMA_KEY)
    return v === 'terang' || v === 'gelap' ? v : null
  } catch {
    return null
  }
}

export function temaSistem(): Tema {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'gelap' : 'terang'
  } catch {
    return 'terang'
  }
}

/** Pilihan tersimpan menang atas sistem. */
export const temaAwal = (): Tema => bacaTersimpan() ?? temaSistem()
export const balikTema = (t: Tema): Tema => (t === 'gelap' ? 'terang' : 'gelap')

export function ambilTema(): Tema {
  return document.documentElement.dataset.tema === 'gelap' ? 'gelap' : 'terang'
}

/** Pasang ke <html> (atribut + color-scheme untuk kontrol bawaan browser: scrollbar, input). */
export function terapkanTema(t: Tema, el: HTMLElement = document.documentElement): void {
  el.dataset.tema = t
  el.style.colorScheme = t === 'gelap' ? 'dark' : 'light'
}

const pendengar = new Set<() => void>()
const beritahu = () => pendengar.forEach((f) => f())

/** Ganti tema. `simpan = false` untuk perubahan yang berasal dari sistem (bukan pilihan pengguna). */
export function aturTema(t: Tema, simpan = true): void {
  terapkanTema(t)
  if (simpan) {
    try {
      localStorage.setItem(TEMA_KEY, t)
    } catch {
      /* penyimpanan tidak tersedia (mode privat): tema tetap berlaku untuk sesi ini */
    }
  }
  beritahu()
}

export function langgananTema(f: () => void): () => void {
  pendengar.add(f)
  return () => {
    pendengar.delete(f)
  }
}

/** Panggil sekali saat aplikasi mulai: terapkan tema awal, ikuti perubahan sistem dan tab lain. */
export function mulaiTema(): () => void {
  terapkanTema(temaAwal())
  beritahu()
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
  const ikutSistem = () => {
    if (!bacaTersimpan()) aturTema(temaSistem(), false)
  }
  const dariTabLain = (e: StorageEvent) => {
    if (e.key !== TEMA_KEY) return
    terapkanTema(bacaTersimpan() ?? temaSistem())
    beritahu()
  }
  mq?.addEventListener?.('change', ikutSistem)
  window.addEventListener('storage', dariTabLain)
  return () => {
    mq?.removeEventListener?.('change', ikutSistem)
    window.removeEventListener('storage', dariTabLain)
  }
}

export function useTema(): { tema: Tema; gelap: boolean; ganti: () => void; atur: (t: Tema) => void } {
  const tema = useSyncExternalStore(langgananTema, ambilTema, () => 'terang' as Tema)
  return { tema, gelap: tema === 'gelap', ganti: () => aturTema(balikTema(tema)), atur: (t) => aturTema(t) }
}
