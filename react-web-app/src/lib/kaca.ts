/** Material kaca: preferensi transparansi pengguna dan penghemat blur. */

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

const KACA_SEL = '.vsf-card, .vsf-kpi-kaca, .vsf-kpi-hijau, .vsf-kpi-emas, .glass-card, .glass-hero, .glass-chrome'

/**
 * Matikan backdrop-filter kartu yang jauh di luar layar (kelas .vsf-di-luar); tint tetap.
 * Margin 300px: filter sudah menyala sebelum kartu terlihat, jadi tidak ada "pop".
 * Kartu yang dirender belakangan (data async) ditangkap lewat MutationObserver.
 */
export function pantauKaca(root: HTMLElement): () => void {
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => e.target.classList.toggle('vsf-di-luar', !e.isIntersecting)),
    { rootMargin: '300px 0px' },
  )
  const terpantau = new WeakSet<Element>()
  const pindai = () =>
    root.querySelectorAll(KACA_SEL).forEach((el) => {
      if (terpantau.has(el)) return
      terpantau.add(el)
      io.observe(el)
    })
  pindai()
  let t = 0
  const mo = new MutationObserver(() => {
    window.clearTimeout(t)
    t = window.setTimeout(pindai, 120)
  })
  mo.observe(root, { childList: true, subtree: true })
  return () => {
    io.disconnect()
    mo.disconnect()
    window.clearTimeout(t)
  }
}
