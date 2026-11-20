import { useState } from 'react'
import clsx from 'clsx'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/authContext'
import { useApiError } from '../../lib/crudApi'
import { useApiObject } from '../../lib/useApiObject'
import { Ikon } from '../Ikon'
import { DialogKaca, Pesan } from '../kaca/DialogKaca'

type AktuatorStatus = {
  estop: boolean
  estop_sejak: string | null
  perangkat: {
    kode: string
    nama: string
    peran: string
    firmware: string | null
    rssi: number | null
    uptime_detik: number | null
    estop_aktif: boolean | null
    estop_fisik: boolean | null
    float_bawah_rendah: boolean | null
    float_atas_penuh: boolean | null
    terakhir_terlihat: string | null
    online: boolean
  }[]
  v6?: {
    level_air?: string
    mode?: string
    kegiatan?: string
    kunci?: string
    pemeliharaan?: string
    target_ppm?: string
    hari_semai?: string
  }
}

const NAMA_KUNCI: Record<string, { judul: string; deskripsi: string }> = {
  FLOAT_ERROR: {
    judul: 'Pelampung Error',
    deskripsi: 'Sensor mendeteksi pelampung atas naik saat pelampung bawah turun (tidak logis). Cek kabel pelampung.',
  },
  ISI_SERING: {
    judul: 'Curiga Bocor (Isi >6x)',
    deskripsi: 'Pompa isi air telah berjalan lebih dari 6 kali hari ini. Dosis & isi air ditahan untuk mencegah tumpah.',
  },
  ISI_TIMEOUT: {
    judul: 'Pengisian Timeout (>15 mnt)',
    deskripsi: 'Pompa pengisian air menyala lebih dari 15 menit namun penampung belum penuh. Kemungkinan sumber air habis atau bocor.',
  },
  POMPA_KELAMAAN: {
    judul: 'Pompa Menyala Terlalu Lama',
    deskripsi: 'Salah satu pompa dosing menyala lebih lama dari batas aman dan dipaksa mati oleh fail-safe ESP32.',
  },
  SENSOR_RUSAK: {
    judul: 'Sensor Tidak Stabil / Rusak',
    deskripsi: 'Sensor pH atau EC tidak valid atau kabel terlepas.',
  },
  EC_CURIGA: {
    judul: 'EC Turun Mendadak (>40%)',
    deskripsi: 'Nilai EC turun drastis tanpa adanya pengisian air tandon. Dosing ditahan otomatis.',
  },
}

export function PanelFirmwareV6() {
  const { role } = useAuth()
  const bolehUbah = role === 'admin'
  const handleApiError = useApiError()

  const { data, reload } = useApiObject<AktuatorStatus>('/api/aktuator/status', {
    pollMs: 5000,
  })

  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  // Dialog Semai
  const [bukaSemai, setBukaSemai] = useState(false)
  const [targetPpm, setTargetPpm] = useState('600')
  const [phMin, setPhMin] = useState('5.5')
  const [phMax, setPhMax] = useState('6.5')

  const v6 = data?.v6
  const alat = data?.perangkat?.find((p) => p.kode === 'aktuator-01')
  const kunciAktif = v6?.kunci && v6.kunci !== '' ? v6.kunci : null
  const infoKunci = kunciAktif ? NAMA_KUNCI[kunciAktif] || { judul: kunciAktif, deskripsi: `Alat terkunci: ${kunciAktif}` } : null

  async function kirimAksi(url: string, body = {}) {
    if (!bolehUbah || sibuk) return
    setSibuk(true)
    setGalat(null)
    setPesan(null)
    try {
      const res = await api.post(url, body)
      setPesan(res.data?.message || 'Perintah berhasil dikirim ke ESP32.')
      reload()
    } catch (e) {
      const f = handleApiError(e)
      setGalat(f.message)
    } finally {
      setSibuk(false)
    }
  }

  async function aksiBukaKunci() {
    await kirimAksi('/api/aktuator/buka-kunci', { alasan: 'Buka kunci ESP32 via antarmuka web' })
  }

  async function aksiPanen() {
    if (!window.confirm('Hentikan siklus semai/dosing otomatis dan alihkan ke mode PANEN?')) return
    await kirimAksi('/api/aktuator/panen', { alasan: 'Selesai siklus panen' })
  }

  async function simpanSemai() {
    await kirimAksi('/api/aktuator/semai', {
      target_ppm: Number(targetPpm),
      ph_min: Number(phMin),
      ph_max: Number(phMax),
      alasan: 'Mulai mode semai v6 dari web',
    })
    setBukaSemai(false)
  }

  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5 mb-4" aria-label="Status Firmware ESP32 v6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="vsf-judul-bagian">Kontrol & Status ESP32 (Firmware v6)</span>
            <span className={clsx('vsf-chip-nilai', alat?.online ? 'is-normal' : 'is-kosong')}>
              {alat?.online ? 'Online' : 'Offline'}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-abu">
            Sistem terintegrasi firmware v6.0.0 dengan proteksi FreeRTOS, E-STOP ganda, dan pembagian siklus budidaya.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bolehUbah && (
            <>
              {v6?.mode !== 'SEMAI' ? (
                <button
                  type="button"
                  onClick={() => setBukaSemai(true)}
                  disabled={sibuk || !alat?.online}
                  className="vsf-tombol-utama text-[13px]"
                >
                  <Ikon nama="siklus" className="h-4 w-4" />
                  Mulai Mode Semai
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void aksiPanen()}
                  disabled={sibuk || !alat?.online}
                  className="vsf-tombol-batal text-[13px]"
                >
                  Selesai / Panen
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {pesan && <div className="mt-3"><Pesan jenis="ok">{pesan}</Pesan></div>}
      {galat && <div className="mt-3"><Pesan jenis="galat">{galat}</Pesan></div>}

      {/* Banner Kunci Keamanan jika ESP32 terkunci */}
      {infoKunci && (
        <div className="mt-4 rounded-xl border border-red-300 bg-red-50/80 p-4 text-red-900 shadow-sm dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-red-700 dark:text-red-400">
              <Ikon nama="peringatan" className="h-5 w-5" />
              <span>Alat Terkunci: {infoKunci.judul}</span>
            </div>
            {bolehUbah && (
              <button
                type="button"
                onClick={() => void aksiBukaKunci()}
                disabled={sibuk}
                className="vsf-tombol-utama bg-red-600 hover:bg-red-700 text-white text-[12px] px-3 py-1.5"
              >
                Buka Kunci Alat
              </button>
            )}
          </div>
          <p className="mt-1 text-[13px] text-red-800 dark:text-red-300">
            {infoKunci.deskripsi}
          </p>
        </div>
      )}

      {/* Baris Telemetri v6 */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/60 bg-white/40 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-black/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-abu">Mode Operasi</span>
          <div className="mt-1 flex items-center gap-1.5 font-bold text-tinta">
            <span
              className={clsx(
                'inline-block h-2.5 w-2.5 rounded-full',
                v6?.mode === 'SEMAI' ? 'bg-arutmin-forest' : v6?.mode === 'PANEN' ? 'bg-amber-500' : 'bg-gray-400',
              )}
            />
            {v6?.mode || 'BELUM SIAP'}
          </div>
        </div>

        <div className="rounded-xl border border-white/60 bg-white/40 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-black/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-abu">Kegiatan Aktuator</span>
          <div className="mt-1 font-bold text-tinta">
            {v6?.kegiatan || 'DIAM'}
          </div>
        </div>

        <div className="rounded-xl border border-white/60 bg-white/40 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-black/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-abu">Level Air Tandon</span>
          <div className="mt-1 font-bold text-tinta">
            {v6?.level_air || (alat?.float_atas_penuh ? 'PENUH' : alat?.float_bawah_rendah === false ? 'RENDAH' : 'SEDANG')}
          </div>
        </div>

        <div className="rounded-xl border border-white/60 bg-white/40 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-black/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-abu">E-STOP & Proteksi</span>
          <div className="mt-1 font-bold text-tinta">
            {alat?.estop_fisik || data?.estop ? (
              <span className="text-red-600 dark:text-red-400">DARURAT (Aktif)</span>
            ) : (
              <span className="text-arutmin-forest">Aman</span>
            )}
          </div>
        </div>
      </div>

      {bukaSemai && (
        <DialogKaca
          judul="Mulai Mode Semai ESP32"
          sub="Atur target PPM dan rentang pH untuk penjagaan nutrisi mandiri oleh ESP32."
          onTutup={() => setBukaSemai(false)}
          onSubmit={() => void simpanSemai()}
          sibuk={sibuk}
          lebar={460}
        >
          <div className="space-y-4 text-[13px]">
            <div>
              <label className="block font-bold text-tinta mb-1">Target PPM Semai</label>
              <input
                type="number"
                className="vsf-input w-full"
                value={targetPpm}
                onChange={(e) => setTargetPpm(e.target.value)}
                min="100"
                max="2500"
                step="10"
              />
              <span className="text-[11.5px] text-abu">Rekomendasi awal semai melon: 400–600 PPM</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-tinta mb-1">pH Minimum</label>
                <input
                  type="number"
                  className="vsf-input w-full"
                  value={phMin}
                  onChange={(e) => setPhMin(e.target.value)}
                  min="4.0"
                  max="8.0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block font-bold text-tinta mb-1">pH Maksimum</label>
                <input
                  type="number"
                  className="vsf-input w-full"
                  value={phMax}
                  onChange={(e) => setPhMax(e.target.value)}
                  min="4.0"
                  max="8.0"
                  step="0.1"
                />
              </div>
            </div>
            <p className="text-[12px] text-abu">
              ESP32 akan menjaga nilai PPM dan pH secara otomatis sesuai batas harian aman (maks 6x dosing AB/hari, jeda monitoring).
            </p>
          </div>
        </DialogKaca>
      )}
    </section>
  )
}
