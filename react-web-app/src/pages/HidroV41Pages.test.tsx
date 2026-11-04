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
import { PanelPengaturanAlat } from '../components/dosing/PanelPengaturanAlat'
import { PanelSaklarMode } from '../components/dosing/PanelSaklarMode'
import { PanelUjiLab } from '../components/dosing/PanelUjiLab'
import { PanelKalibrasiLangsungV41 } from '../components/kalibrasi/PanelKalibrasiLangsungV41'
import {
  MqttDiagnostikPage,
  PemulihanPapanPage,
  PeringatanPage,
} from './HidroV41Pages'

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

vi.mock('../lib/crudApi', () => ({
  useApiError: () => (err: unknown) => ({
    status: 500,
    message: err instanceof Error ? err.message : 'Galat',
    errors: {},
  }),
}))

describe('Debugging Tombol demi Tombol UI Hidroponik v4.1 (Langkah Petani)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    mockApiGet.mockReset()
    mockApiPut.mockReset()
    mockApiPost.mockReset()
    mockApiGet.mockResolvedValue({ data: BAWAAN_V41 })
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

  it('Langkah 1 — PanelPengaturanAlat: tombol [pakai] saran otomatis, [Simpan pengaturan], dan [Batalkan] bisa diklik', async () => {
    const onReload = vi.fn()
    await act(async () => {
      root.render(
        <MemoryRouter>
          <PanelPengaturanAlat iot={BAWAAN_V41} loading={false} onReload={onReload} />
        </MemoryRouter>,
      )
    })

    // Ubah volume ke 200 L supaya tombol [pakai] saran otomatis muncul
    const inputVolume = container.querySelector('input[type="number"]') as HTMLInputElement
    expect(inputVolume).toBeTruthy()
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      setter?.call(inputVolume, '200')
      inputVolume.dispatchEvent(new Event('input', { bubbles: true }))
      inputVolume.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const btnPakai = cariTombol('pakai')
    await act(async () => {
      btnPakai.click()
    })

    const btnSimpan = cariTombol('Simpan pengaturan')
    await act(async () => {
      btnSimpan.click()
    })
    expect(mockApiPut).toHaveBeenCalledWith('/iot-v41/pengaturan', expect.objectContaining({ volume_l: 200 }))

    const btnBatal = cariTombol('Batalkan')
    await act(async () => {
      btnBatal.click()
    })
  })

  it('Langkah 2 — PanelKalibrasiLangsungV41: tombol pemeliharaan, ambil titik EC/pH, balik kalibrasi, dan kalibrasi pompa bisa diklik', async () => {
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

    // Klik Ambil titik 1.413 lalu Ambil titik 12.880
    await act(async () => {
      cariTombol('Ambil titik 1.413').click()
    })
    await act(async () => {
      cariTombol('Ambil titik 12.880').click()
    })
    expect(mockApiPost).toHaveBeenCalledWith(
      '/iot-v41/kalibrasi-dua-titik',
      expect.objectContaining({ sensor: 'ec' }),
    )

    // Klik Balik kalibrasi EC
    await act(async () => {
      cariTombol('Balik kalibrasi EC ke nilai sebelumnya').click()
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

  it('Langkah 4 — PanelSaklarMode: ke-5 switch saklar, tombol [Simpan pengaturan], dan [Batalkan] bisa diklik', async () => {
    const onReload = vi.fn()
    await act(async () => {
      root.render(<PanelSaklarMode iot={BAWAAN_V41} loading={false} onReload={onReload} />)
    })

    const switches = Array.from(container.querySelectorAll('button[role="switch"]'))
    expect(switches.length).toBe(5)

    // Klik switch terakhir (Isi air otomatis -> OFF) untuk memicu peringatan pengenceran
    await act(async () => {
      ;(switches[4] as HTMLButtonElement).click()
    })
    expect(container.textContent).toContain('Pengenceran menyala tetapi isi air otomatis mati')

    await act(async () => {
      cariTombol('Simpan pengaturan').click()
    })
    expect(mockApiPut).toHaveBeenCalledWith(
      '/iot-v41/saklar',
      expect.objectContaining({ mode_isi: 'manual' }),
    )
  })

  it('Langkah 8 — Halaman Pemulihan Papan, MQTT Diagnostik, dan Peringatan: semua tombol aksi bisa diklik', async () => {
    // 8a. PemulihanPapanPage
    await act(async () => {
      root.render(
        <MemoryRouter>
          <PemulihanPapanPage />
        </MemoryRouter>,
      )
    })
    await act(async () => {
      cariTombol('Siapkan paket pemulihan (belum dikirim)').click()
    })
    expect(mockApiPost).toHaveBeenCalledWith('/iot-v41/pulihkan')

    // 8b. MqttDiagnostikPage
    await act(async () => {
      root.render(
        <MemoryRouter>
          <MqttDiagnostikPage />
        </MemoryRouter>,
      )
    })
    await act(async () => {
      cariTombol('Catat uji (tidak diterbitkan)').click()
    })
    expect(mockApiPost).toHaveBeenCalledWith(
      '/iot-v41/mqtt-uji',
      expect.objectContaining({ topic: 'hidro/HIDRO-01/cmd' }),
    )

    // 8c. PeringatanPage
    await act(async () => {
      root.render(
        <MemoryRouter>
          <PeringatanPage />
        </MemoryRouter>,
      )
    })
    await act(async () => {
      cariTombol('Catat permintaan RESET').click()
    })
    expect(mockApiPost).toHaveBeenCalledWith('/iot-v41/reset-peringatan')

    await act(async () => {
      cariTombol('tandai selesai').click()
    })
  })
})
