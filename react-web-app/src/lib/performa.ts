/**
 * Tingkat tampilan otomatis: 'bagus' (kaca blur penuh + animasi) atau 'ringan' (tanpa blur, animasi minimal).
 * Diukur sekali tiap halaman dimuat dengan uji hitung kecil (±2 ms di laptop biasa). CPU yang diperlambat
 * (mis. DevTools 20x) atau perangkat lemah membuat uji ini > AMBANG_MS → 'ringan'. Hasil ada di html[data-perf].
 */
export type Performa = 'bagus' | 'ringan'

const AMBANG_MS = 18

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

export function mulaiPerforma(): Performa {
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
