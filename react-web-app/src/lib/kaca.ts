/** Material kaca: preferensi transparansi pengguna (blur hanya di chrome, hero, dan modal). */

export type Kaca = 'jernih' | 'standar' | 'pekat'

export const PILIHAN_KACA: { nilai: Kaca; label: string; ket: string }[] = [
  { nilai: 'jernih', label: 'Jernih', ket: 'Lebih tembus pandang' },
  { nilai: 'standar', label: 'Standar', ket: 'Seimbang' },
  { nilai: 'pekat', label: 'Pekat', ket: 'Lebih mudah dibaca' },
]

const KUNCI = 'vsf-kaca'

export function bacaKaca(): Kaca {
  try {
    const v = localStorage.getItem(KUNCI)
    if (v === 'jernih' || v === 'standar' || v === 'pekat') return v
  } catch {
    /* penyimpanan diblokir: pakai bawaan */
  }
  return 'standar'
}

export function setKaca(k: Kaca): void {
  document.documentElement.dataset.kaca = k
  try {
    localStorage.setItem(KUNCI, k)
  } catch {
    /* tidak tersimpan, tetap berlaku di sesi ini */
  }
}

/** Dipanggil sekali saat shell dimuat: terapkan pilihan tersimpan. */
export function mulaiKaca(): void {
  document.documentElement.dataset.kaca = bacaKaca()
}
