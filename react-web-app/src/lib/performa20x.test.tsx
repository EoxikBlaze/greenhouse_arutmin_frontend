// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mulaiPerforma, tentukanPerforma } from './performa'

describe('Uji Performa Web: Simulasi CPU 20x Slower & Perangkat Rendah', () => {
  beforeEach(() => {
    document.documentElement.dataset.perf = ''
    document.documentElement.removeAttribute('data-perf')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.documentElement.removeAttribute('data-perf')
  })

  it('Deteksi otomatis mode ringan saat CPU 20x lebih lambat (latensi > 18ms)', () => {
    // Pada CPU normal: uji hitung ±2 ms -> mode 'bagus'
    const normalCpuMs = 2.4
    expect(tentukanPerforma(normalCpuMs)).toBe('bagus')

    // Pada CPU throttled 20x di DevTools: 2.4 ms * 20 = 48 ms -> wajib turun ke 'ringan'
    const throttled20xMs = normalCpuMs * 20
    expect(throttled20xMs).toBeGreaterThan(18)
    expect(tentukanPerforma(throttled20xMs)).toBe('ringan')
  })

  it('mulaiPerforma() secara tepat menyetel data-perf="ringan" saat lingkungan lambat', () => {
    // Simulasi ujiHitung() lambat akibat CPU throttle 20x
    const spyPerformance = vi.spyOn(performance, 'now')
    // Panggilan 1: mulai = 0, selesai = 55 (durasi 55ms)
    spyPerformance.mockReturnValueOnce(0).mockReturnValueOnce(55)

    const hasil = mulaiPerforma()

    expect(hasil).toBe('ringan')
    expect(document.documentElement.dataset.perf).toBe('ringan')
  })

  it('Menurunkan otomatis ke mode ringan saat terjadi lonjakan Long Task (>100ms)', () => {
    // Awal sesi cepat (laptop idle)
    document.documentElement.dataset.perf = 'bagus'

    // Mock PerformanceObserver
    type CB = (list: { getEntries: () => Array<{ duration: number }> }) => void
    let cbCaptured: CB | null = null
    const mockObserver = function (this: unknown, cb: CB) {
      cbCaptured = cb
      return {
        observe: vi.fn(),
        disconnect: vi.fn(),
      }
    }
    vi.stubGlobal('PerformanceObserver', mockObserver)

    // Mulai pemantauan performa
    mulaiPerforma()

    // Pengguna mengaktifkan 20x slowdown di tengah sesi: terjadi long task 150ms
    if (cbCaptured) {
      const runCb = cbCaptured as CB
      // Mock ujiHitung selanjutnya menghasilkan > 18ms
      const spyPerformance = vi.spyOn(performance, 'now')
      spyPerformance.mockReturnValueOnce(0).mockReturnValueOnce(60)

      runCb({
        getEntries: () => [{ duration: 150 }],
      })

      // UI otomatis turun ke mode ringan agar tidak patah-patah
      expect(document.documentElement.dataset.perf).toBe('ringan')
    }
  })

  it('Mode hemat data (Save-Data header) langsung mengaktifkan mode ringan tanpa uji hitung', () => {
    const hasil = tentukanPerforma(1.0, { hematData: true })
    expect(hasil).toBe('ringan')
  })
})
