// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KartuPrediksiPanen } from './KartuPrediksiPanen'
import { KartuSaranDosis } from './KartuSaranDosis'
import { EksporCsv } from './EksporCsv'
import { urlEkspor } from '../../lib/analitik'

const mockGet = vi.fn()
vi.mock('../../lib/api', () => ({ api: { get: (...a: unknown[]) => mockGet(...a) } }))
vi.mock('../../lib/crudApi', () => ({
  useApiError: () => (e: unknown) => ({ status: 500, message: e instanceof Error ? e.message : 'Galat', errors: {} }),
}))

const PREDIKSI = {
  status: true,
  tanpa_prediksi: 1,
  list: [
    { tipe: 'pendewasaan', id: 7, varietas: 'Selada', meja: 'Meja A', mulai: '2026-10-20', prediksi: { tgl_prediksi: '2026-11-12', sisa_hari: 3, status: 'segera' } },
    { tipe: 'semai', id: 9, varietas: 'Pakcoy', meja: null, mulai: '2026-11-01', prediksi: null },
  ],
}
const SARAN = {
  status: true,
  jendela_jam: 6,
  jumlah_bacaan: 42,
  saran: [
    { sensor: 'ph', status: 'perhatian', nilai: 6.8, saran: 'pH naik perlahan, pertimbangkan pH Down.', perkiraan_jam_ke_batas: 4 },
    { sensor: 'tds', status: 'aman', nilai: 900, saran: 'TDS stabil.' },
  ],
  catatan: 'Saran ini hanya informasi; dosis tetap dijalankan oleh sistem.',
}

describe('komponen analitik', () => {
  let container: HTMLDivElement
  let root: Root
  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    mockGet.mockReset()
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it('KartuPrediksiPanen menampilkan prediksi dan teks bila durasi belum diatur', async () => {
    mockGet.mockResolvedValue({ data: PREDIKSI })
    await act(async () => root.render(<KartuPrediksiPanen />))
    expect(mockGet).toHaveBeenCalledWith('/api/analitik/prediksi-panen')
    const teks = container.textContent ?? ''
    expect(teks).toContain('Selada')
    expect(teks).toContain('Meja A')
    expect(teks).toContain('Pendewasaan')
    expect(teks).toContain('12 ')
    expect(teks).toContain('3 hari lagi')
    expect(teks).toContain('Segera')
    expect(teks).toContain('Pakcoy')
    expect(teks).toContain('Durasi siklus belum diatur')
  })

  it('KartuPrediksiPanen menampilkan keadaan kosong', async () => {
    mockGet.mockResolvedValueOnce({ data: { status: true, list: [], tanpa_prediksi: 0 } })
    await act(async () => root.render(<KartuPrediksiPanen />))
    expect(container.textContent).toContain('Belum ada batch')
  })

  it('KartuSaranDosis menampilkan saran + catatan tanpa tombol eksekusi dosis', async () => {
    mockGet.mockResolvedValue({ data: SARAN })
    await act(async () => root.render(<KartuSaranDosis />))
    expect(mockGet).toHaveBeenCalledWith('/api/analitik/saran-dosis?jam=6')
    const teks = container.textContent ?? ''
    expect(teks).toContain('pH naik perlahan')
    expect(teks).toContain('Perhatian')
    expect(teks).toContain(SARAN.catatan)
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })

  it('KartuSaranDosis menampilkan galat dengan tombol coba lagi saja', async () => {
    mockGet.mockRejectedValue(new Error('Server tak terjangkau'))
    await act(async () => root.render(<KartuSaranDosis />))
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Server tak terjangkau')
    const tombol = Array.from(container.querySelectorAll('button')).map((b) => b.textContent)
    expect(tombol).toEqual(['Coba lagi'])
  })

  it('urlEkspor menyusun dari/sampai dan melewatkan yang kosong', () => {
    expect(urlEkspor('sensor', '2026-11-01', '2026-11-09')).toBe('/api/analitik/ekspor/sensor.csv?dari=2026-11-01&sampai=2026-11-09')
    expect(urlEkspor('panen', '', '')).toBe('/api/analitik/ekspor/panen.csv')
  })

  it('EksporCsv mengunduh dengan URL yang benar dan menampilkan galat 422', async () => {
    const createUrl = vi.fn(() => 'blob:x')
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() })
    const klik = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    mockGet.mockResolvedValueOnce({ data: new Blob(['a,b']) })
    await act(async () => root.render(<EksporCsv />))

    const isi = (label: string, v: string) => {
      const el = container.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(el, v)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    await act(async () => {
      isi('Ekspor dari tanggal', '2026-11-01')
      isi('Ekspor sampai tanggal', '2026-11-09')
    })
    const tombol = (nama: string) => Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(nama)) as HTMLButtonElement
    await act(async () => tombol('Peringatan').click())
    expect(mockGet).toHaveBeenCalledWith('/api/analitik/ekspor/peringatan.csv?dari=2026-11-01&sampai=2026-11-09', { responseType: 'blob' })
    expect(klik).toHaveBeenCalled()

    mockGet.mockRejectedValueOnce({ response: { status: 422 } })
    await act(async () => tombol('Panen').click())
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Tanggal tidak valid')
    klik.mockRestore()
  })
})
