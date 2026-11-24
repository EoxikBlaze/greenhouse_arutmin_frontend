// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BAWAAN_PARAMS_V41,
  hitungPratinjauDosis,
  type IotV41State,
} from '../lib/iotV41'
import { PanelSaklarMode } from '../components/dosing/PanelSaklarMode'
import { PanelUjiLab } from '../components/dosing/PanelUjiLab'
import { PanelKalibrasiLangsungV41 } from '../components/kalibrasi/PanelKalibrasiLangsungV41'
import { PeringatanPage } from './HidroV41Pages'

const BAWAAN_V41: IotV41State = {
  params: BAWAAN_PARAMS_V41,
  kondisi: {
    status: 'TIDUR',
    float_bawah: 1,
    float_atas: 0,
    ec_ppm: 700,
    ec_ms: 1.4,
    ec_us: 1400,
    ph: 6.0,
    suhu_air: 26,
    suhu_ruang: 28,
    rh: 70,
    hit_ec: 0,
    hit_encer: 0,
    hit_ph: 0,
    hit_isi: 0,
    updated_at: '2026-11-02T10:00:00Z',
  },
  stabilitas: {
    ec: { stabil: true, n: 5, sebaran: 4, batas: 20, sebaran_us: 8 },
    ph: { stabil: true, n: 5, sebaran: 0.02, batas: 0.06 },
  },
  pratinjau_dosis: hitungPratinjauDosis({
    ec_sekarang: 700,
    ec_setpoint: 900,
    persen_dosing: BAWAAN_PARAMS_V41.persen_dosing,
    max_ppm_dosing: BAWAAN_PARAMS_V41.max_ppm_dosing,
    volume_l: BAWAAN_PARAMS_V41.volume_l,
    ppm_per_ml: BAWAAN_PARAMS_V41.ppm_per_ml,
    laju_a: BAWAAN_PARAMS_V41.laju_a,
    laju_b: BAWAAN_PARAMS_V41.laju_b,
  }),
  papan: {
    kode: 'HIDRO-01',
    nama: 'Kontroler Utama 1-Penampung',
    versi: 'v4.1',
    terakhir_terlihat: '2026-11-02T10:00:00Z',
    status: 'online',
  },
  arsip_kalibrasi: [],
  arsip_ujilab: [],
}

const mockApiGet = vi.fn()
const mockApiPut = vi.fn()
const mockApiPost = vi.fn()

vi.mock('../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    put: (...args: unknown[]) => mockApiPut(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}))

vi.mock('../lib/authContext', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'garap', nama: 'Admin' },
    role: 'admin',
    isDemo: false,
  }),
}))

// referensi stabil (seperti hook aslinya): fungsi baru tiap render membuat useApiObject memuat ulang tanpa henti
const terjemahGalat = (err: unknown) => ({
  status: 500,
  message: err instanceof Error ? err.message : 'Galat',
  errors: {},
})
vi.mock('../lib/crudApi', () => ({
  useApiList: () => ({ rows: [], loading: false, error: null, reload: () => { }, total: null }),
  useApiError: () => terjemahGalat,
}))

describe('Debugging Tombol demi Tombol UI Hidroponik v4.1 (Langkah Petani)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ; (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    mockApiGet.mockReset()
    mockApiPut.mockReset()
    mockApiPost.mockReset()
    mockApiGet.mockImplementation(async (url: string) =>
      url.startsWith('/alert-logs/riwayat')
        ? {
          data: {
            total: 1,
            page: 1,
            per_page: 50,
            data: [
              { id: 5, type: 'sensor', value: 'pH di luar batas', severity: 'warning', acknowledged: false, created_at: '2026-11-04T05:00:00', kunci_kejadian: null, selesai_pada: null, sedang_terjadi: false },
            ],
          },
        }
        : url.startsWith('/alert-logs')
          ? {
            data: {
              data: [
                { id: 9, type: 'kunci_isi_timeout', value: 'Pompa isi terkunci', severity: 'critical', acknowledged: false, created_at: '2026-11-18T03:00:00', kunci_kejadian: 'kunci_isi_timeout', selesai_pada: null, sedang_terjadi: true },
                { id: 5, type: 'sensor', value: 'pH di luar batas', severity: 'warning', acknowledged: false, created_at: '2026-11-04T05:00:00', kunci_kejadian: null, selesai_pada: null, sedang_terjadi: false },
              ],
            },
          }
          : { data: BAWAAN_V41 },
    )
    mockApiPut.mockResolvedValue({ data: { status: true, message: 'Tersimpan' } })
    mockApiPost.mockResolvedValue({ data: { status: true, message: 'Terkirim' } })
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  function cariTombol(teks: string): HTMLButtonElement {
    const semua = Array.from(container.querySelectorAll('button'))
    const ketemu = semua.find((b) => (b.textContent ?? '').includes(teks))
    if (!ketemu) {
      throw new Error(
        `Tombol "${teks}" tidak ditemukan. Tombol yang ada: ${semua.map((b) => b.textContent?.trim()).join(' | ')}`,
      )
    }
    return ketemu
  }

  it('Langkah 2 — PanelKalibrasiLangsungV41: tombol pemeliharaan, ukur/simpan titik EC (KAL_SENSOR), balik kalibrasi, dan kalibrasi pompa bisa diklik', async () => {
    const onReload = vi.fn()
    // Render dengan pemeliharaan aktif & bacaan stabil supaya tombol Ambil titik aktif
    const stateStabil: IotV41State = {
      ...BAWAAN_V41,
      params: { ...BAWAAN_V41.params, pemeliharaan: true },
      kondisi: { ...BAWAAN_V41.kondisi, ec_us: 1413, ec_ppm: 706, ph: 4.01 },
      stabilitas: {
        ec: { stabil: true, n: 5, sebaran: 4, batas: 20, sebaran_us: 8 },
        ph: { stabil: true, n: 5, sebaran: 0.02, batas: 0.06 },
      },
    }

    await act(async () => {
      root.render(<PanelKalibrasiLangsungV41 iot={stateStabil} loading={false} onReload={onReload} />)
    })

    // Kalibrasi EC firmware v6: alat mengukur sendiri (UKUR) lalu menyimpan (SIMPAN) per titik
    mockApiPost.mockResolvedValue({ data: { status: true, id_perintah: 77, message: 'ok' } })
    await act(async () => {
      cariTombol('Ukur titik 1').click()
    })
    expect(mockApiPost).toHaveBeenCalledWith('/iot-v41/kal-sensor', { sensor: 'ec', titik: 1, aksi: 'UKUR' })
    await act(async () => {
      cariTombol('Titik 2').click()
    })
    await act(async () => {
      cariTombol('Simpan titik 2').click()
    })
    expect(mockApiPost).toHaveBeenCalledWith('/iot-v41/kal-sensor', { sensor: 'ec', titik: 2, aksi: 'SIMPAN' })
    expect(container.textContent).toContain('Kalibrasi EC titik 2 (SIMPAN):')

    // Klik Kembalikan kalibrasi sebelumnya (EC)
    await act(async () => {
      cariTombol('Kembalikan kalibrasi sebelumnya').click()
    })
    expect(mockApiPost).toHaveBeenCalledWith('/iot-v41/kalibrasi-dua-titik', {
      sensor: 'ec',
      aksi: 'balik',
    })

    // Klik Jalankan pompa -> memunculkan kotak input mL & tombol Simpan laju
    await act(async () => {
      cariTombol('Jalankan pompa').click()
    })
    const inputMl = container.querySelector('input[placeholder*="63"]') as HTMLInputElement
    expect(inputMl).toBeTruthy()
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      setter?.call(inputMl, '60')
      inputMl.dispatchEvent(new Event('input', { bubbles: true }))
      inputMl.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => {
      cariTombol('Simpan laju').click()
    })
    expect(mockApiPost).toHaveBeenCalledWith(
      '/iot-v41/kalibrasi-pompa',
      expect.objectContaining({ pompa: 'a', ml: 60 }),
    )

    // Klik Matikan pemeliharaan
    await act(async () => {
      cariTombol('Matikan pemeliharaan').click()
    })
    expect(mockApiPost).toHaveBeenCalledWith('/iot-v41/pemeliharaan', {
      aksi: 'pemeliharaan',
      aktif: false,
    })
  })

  it('Langkah 3 — PanelUjiLab: kedua tombol [Hitung & simpan] (EC dan pH) bisa diklik', async () => {
    const onReload = vi.fn()
    await act(async () => {
      root.render(<PanelUjiLab iot={BAWAAN_V41} loading={false} onReload={onReload} />)
    })

    // Form kosong sampai diisi hasil takar nyata → isi dulu (urutan input: EC awal, akhir, volume, mL A, mL B, lalu pH volume, ΔpH, mL)
    const isian = Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      ;['100', '1000', '1', '5', '5', '1', '0.5', '0.5'].forEach((v, i) => {
        setter?.call(isian[i], v)
        isian[i].dispatchEvent(new Event('input', { bubbles: true }))
      })
    })

    const tombolHitung = Array.from(container.querySelectorAll('button')).filter((b) =>
      (b.textContent ?? '').includes('Hitung & simpan'),
    )
    expect(tombolHitung.length).toBe(2)

    await act(async () => {
      tombolHitung[0].click()
    })
    expect(mockApiPost).toHaveBeenCalledWith(
      '/iot-v41/ujilab',
      expect.objectContaining({ aksi: 'ec', awal: 100, akhir: 1000 }),
    )

    await act(async () => {
      tombolHitung[1].click()
    })
    expect(mockApiPost).toHaveBeenCalledWith(
      '/iot-v41/ujilab',
      expect.objectContaining({ aksi: 'ph', arah: 'up' }),
    )
  })

  it('Langkah 4 — PanelSaklarMode: ke-4 switch saklar, tombol [Simpan dan kirim ke alat], dan [Batalkan] bisa diklik', async () => {
    const onReload = vi.fn()
    await act(async () => {
      root.render(<PanelSaklarMode iot={BAWAAN_V41} loading={false} onReload={onReload} />)
    })

    const switches = Array.from(container.querySelectorAll('button[role="switch"]'))
    expect(switches.length).toBe(4)

    // Klik switch terakhir (Isi air otomatis -> OFF) untuk memicu peringatan pengenceran
    await act(async () => {
      ; (switches[3] as HTMLButtonElement).click()
    })
    expect(container.textContent).toContain('Pengenceran menyala tetapi isi air otomatis mati')

    await act(async () => {
      cariTombol('Simpan dan kirim ke alat').click()
    })
    expect(mockApiPut).toHaveBeenCalledWith(
      '/iot-v41/saklar',
      expect.objectContaining({ mode_isi: 'manual' }),
    )
  })

  it('Langkah 8 — Halaman Peringatan: semua tombol aksi bisa diklik', async () => {
    // 8c. PeringatanPage
    await act(async () => {
      root.render(
        <MemoryRouter>
          <PeringatanPage />
        </MemoryRouter>,
      )
    })
    // kejadian aktif tampil di "Sedang terjadi"; kunci yang bisa dibuka → tombol admin + konfirmasi → BUKA_KUNCI
    expect(container.textContent).toContain('Sedang terjadi (1)')
    await act(async () => {
      cariTombol('Buka kunci alat').click()
    })
    const ya = Array.from(document.body.querySelectorAll('button')).find((b) => b.textContent?.includes('Ya, buka kunci'))
    expect(ya).toBeTruthy()
    await act(async () => {
      ya!.click()
    })
    expect(mockApiPost).toHaveBeenCalledWith('/api/aktuator/buka-kunci', { alasan: 'Buka kunci alat dari menu Peringatan' })

    await act(async () => {
      cariTombol('tandai selesai').click()
    })
    expect(mockApiPost).toHaveBeenCalledWith('/alert-logs/5/ack')
  })
})
