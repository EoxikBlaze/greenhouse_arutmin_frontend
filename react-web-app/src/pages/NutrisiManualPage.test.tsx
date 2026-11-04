// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NutrisiManualPage from './NutrisiManualPage'

const mockGet = vi.fn()
const mockPost = vi.fn()
vi.mock('../lib/api', () => ({ api: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a) } }))
vi.mock('../lib/authContext', () => ({ useAuth: () => ({ role: 'admin' }) }))
vi.mock('../lib/crudApi', () => ({ useApiError: () => (e: unknown) => ({ status: 423, message: e instanceof Error ? e.message : 'Galat', errors: {} }) }))

const BATAS = {
  jeda_menit: 20,
  durasi_maks_detik: 600,
  zat: {
    nutrisi_a: { nama: 'Nutrisi A', maks_ml: 214, laju_ml_per_detik: 1, jatah_harian_ml: 500 },
    nutrisi_b: { nama: 'Nutrisi B', maks_ml: 214, laju_ml_per_detik: 2.1, jatah_harian_ml: 500 },
    ph_up: { nama: 'pH Up', maks_ml: 10, laju_ml_per_detik: 1.5, jatah_harian_ml: 100 },
    ph_down: { nama: 'pH Down', maks_ml: 10, laju_ml_per_detik: 1.5, jatah_harian_ml: 100 },
  },
}

describe('NutrisiManualPage', () => {
  let container: HTMLDivElement
  let root: Root
  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    mockGet.mockReset()
    mockPost.mockReset()
    mockGet.mockResolvedValue({ data: { data: [{ id: 1, mulai_pada: '2026-11-04T10:00:00', selesai_pada: null, hasil: 'gagal', alasan: 'Nutrisi Manual: Nutrisi A 20 mL', alasan_akhir: 'eksekusi_diblokir', oleh: 'garap', ronde: [] }], batas: BATAS } })
    mockPost.mockResolvedValue({ data: { message: 'ok' } })
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it('menampilkan batas, mengirim zat+volume, dan menampilkan status gagal di riwayat', async () => {
    await act(async () => {
      root.render(<MemoryRouter><NutrisiManualPage /></MemoryRouter>)
    })
    expect(container.textContent).toContain('gagal')
    expect(container.textContent).toContain('214 mL')
    const tombol = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Dosing') as HTMLButtonElement
    await act(async () => tombol.click())
    expect(mockPost).toHaveBeenCalledWith('/iot-v41/dosing-manual', { zat: 'nutrisi_a', volume_ml: 10 })
  })

  it('tombol STOP mengirim aksi stop', async () => {
    await act(async () => {
      root.render(<MemoryRouter><NutrisiManualPage /></MemoryRouter>)
    })
    const stop = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('STOP')) as HTMLButtonElement
    await act(async () => stop.click())
    expect(mockPost).toHaveBeenCalledWith('/iot-v41/dosing-manual', { aksi: 'stop' })
  })
})
