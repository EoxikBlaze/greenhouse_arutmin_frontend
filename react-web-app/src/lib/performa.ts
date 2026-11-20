/**
 * Tingkat tampilan otomatis & manual: 'bagus' (kaca blur penuh + animasi) atau 'ringan' (tanpa blur, animasi minimal).
 * Diukur sekali tiap halaman dimuat dengan uji hitung kecil (±2 ms di laptop biasa). CPU yang diperlambat
 * (mis. DevTools 20x) atau perangkat lemah membuat uji ini > AMBANG_MS → 'ringan'. Hasil ada di html[data-perf].
 * Pengguna juga dapat mengunci mode secara manual lewat localStorage ('vsf-perf': 'otomatis' | 'bagus' | 'ringan').
 */
export type Performa = 'bagus' | 'ringan'
export type PreferensiPerforma = 'otomatis' | Performa

export const PERFORMA_KEY = 'vsf-perf'
export const PILIHAN_PERFORMA: { nilai: PreferensiPerforma; label: string; ket: string }[] = [
  { nilai: 'otomatis', label: 'Otomatis', ket: 'Sesuai kecepatan perangkat' },
  { nilai: 'bagus', label: 'Normal', ket: 'Efek kaca & animasi penuh' },
  { nilai: 'ringan', label: 'Hemat daya', ket: 'Ringan, solid & tanpa blur' },
]

const AMBANG_MS = 18

export function bacaPreferensiPerforma(): PreferensiPerforma {
  try {
    const v = localStorage.getItem(PERFORMA_KEY)
    if (v === 'bagus' || v === 'ringan' || v === 'otomatis') return v
  } catch {
    /* penyimpanan tidak tersedia */
  }
  return 'otomatis'
}

export function ambilPerforma(): Performa {
  return document.documentElement.dataset.perf === 'ringan' ? 'ringan' : 'bagus'
}

/** Uji hitung tetap; dipisah agar bisa diuji. */
export function ujiHitung(): number {
  const mulai = performance.now()
  let x = 0
  for (let i = 0; i < 300_000; i++) x += Math.sqrt(i) * Math.sin(i)
  // pakai x supaya loop tidak dibuang optimizer
  if (x === Number.POSITIVE_INFINITY) return 0
  return performance.now() - mulai
}

export function tentukanPerforma(ms: number, opsi: { hematData?: boolean; geraKurang?: boolean } = {}): Performa {
  if (opsi.hematData) return 'ringan'
  return ms > AMBANG_MS ? 'ringan' : 'bagus'
}

export function aturPreferensiPerforma(pilihan: PreferensiPerforma): Performa {
  try {
    if (pilihan === 'otomatis') localStorage.removeItem(PERFORMA_KEY)
    else localStorage.setItem(PERFORMA_KEY, pilihan)
  } catch {
    /* abaikan bila penyimpanan diblokir */
  }
  if (pilihan === 'bagus' || pilihan === 'ringan') {
    document.documentElement.dataset.perf = pilihan
    return pilihan
  }
  return mulaiPerforma()
}

export function mulaiPerforma(): Performa {
  const tersimpan = bacaPreferensiPerforma()
  if (tersimpan === 'bagus' || tersimpan === 'ringan') {
    document.documentElement.dataset.perf = tersimpan
    return tersimpan
  }

  const pertama = ujiHitung()
  // Uji kedua hanya bila sampel pertama berada di zona ragu (gangguan GC sesaat 18–45 ms).
  // Bila sudah jelas cepat (<=18 ms) atau jelas diperlambat 20x (>45 ms), hemat waktu main-thread.
  const ms = pertama > AMBANG_MS && pertama <= AMBANG_MS * 2.5 ? Math.min(pertama, ujiHitung()) : pertama
  const hematData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
  const hasil = tentukanPerforma(ms, { hematData })
  document.documentElement.dataset.perf = hasil

  // Bila halaman dibuka normal lalu pengguna menyalakan 20x CPU Throttling di tengah sesi,
  // deteksi Long Task (>100 ms) dan turunkan otomatis ke mode 'ringan' agar UI tetap stabil.
  if (hasil === 'bagus' && typeof PerformanceObserver !== 'undefined') {
    try {
      const po = new PerformanceObserver((list) => {
        if (bacaPreferensiPerforma() === 'bagus') return
        for (const entry of list.getEntries()) {
          if (entry.duration >= 100 && ujiHitung() > AMBANG_MS) {
            document.documentElement.dataset.perf = 'ringan'
            po.disconnect()
            break
          }
        }
      })
      po.observe({ type: 'longtask', buffered: false })
    } catch {
      /* browser tidak mendukung tipe longtask */
    }
  }

  return hasil
}
