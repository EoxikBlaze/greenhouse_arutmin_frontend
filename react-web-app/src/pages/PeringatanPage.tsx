import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { useApiError } from '../lib/crudApi'
import { useApiObject } from '../lib/useApiObject'
import { tglJam } from '../lib/format'
import { relatif } from '../lib/waktu'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { DialogKonfirmasi, Pesan } from '../components/kaca/DialogKaca'

/**
 * Halaman Peringatan — GET /alert-logs. Peringatan dinilai server dari data & keadaan alat (src/peringatan.js,
 * Kontrak MQTT v2.0 §9): kejadian dibuka saat kondisi bertahan dan TERTUTUP SENDIRI saat pulih.
 * "Sedang terjadi" = kunci_kejadian terisi dan selesai_pada kosong; sisanya riwayat.
 */
export type BarisAlert = {
  id: number | string
  type: string
  value: string
  severity: string
  acknowledged: boolean
  created_at: string
  kunci_kejadian?: string | null
  selesai_pada?: string | null
  sedang_terjadi?: boolean
}
type Respons = { data?: BarisAlert[]; aktif?: number; total?: number }

/** Kunci yang bisa dibuka perintah BUKA_KUNCI (Kontrak §6.2); FLOAT_ERROR & SENSOR_RUSAK harus diperbaiki fisik. */
const BISA_DIBUKA = ['kunci_isi_sering', 'kunci_isi_timeout', 'kunci_pompa_kelamaan', 'kunci_ec_curiga']

const JUDUL: Record<string, string> = {
  estop: 'E-STOP', estop_fisik: 'E-STOP fisik', tombol_reset: 'Tombol RESET', alat_offline: 'Alat offline',
  data_tidak_masuk: 'Data sensor', belum_siap: 'Belum siap', ppm_probe: 'Probe EC', air_rendah: 'Air rendah',
  sensor_ph: 'pH', sensor_tds: 'Nutrisi', sensor_waterTemp: 'Suhu air', sensor_airTemp: 'Suhu udara', sensor_humidity: 'Kelembapan',
}
function judul(type: string): string {
  if (JUDUL[type]) return JUDUL[type]
  if (type.startsWith('kunci_')) return `Kunci ${type.slice(6).replace(/_/g, ' ').toUpperCase()}`
  if (type.startsWith('batas_')) return 'Batas harian'
  return type.replace(/_/g, ' ')
}

function Level({ severity }: { severity: string }) {
  const merah = severity === 'critical'
  const kuning = severity === 'warning'
  return <StatusBadge tone={merah ? 'offline' : kuning ? 'warning' : 'online'} label={merah ? 'merah' : kuning ? 'kuning' : 'info'} />
}

function useDetik(ms: number): number {
  const [kini, setKini] = useState(0)
  useEffect(() => {
    const tick = () => setKini(Date.now())
    tick()
    const id = setInterval(tick, ms)
    return () => clearInterval(id)
  }, [ms])
  return kini
}

export function PeringatanPage() {
  const { role } = useAuth()
  const admin = role === 'admin'
  const handleApiError = useApiError()
  const { data, loading, error, reload } = useApiObject<Respons>('/alert-logs?limit=100', { pollMs: 30_000 })
  const kini = useDetik(30_000)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [konfirmasi, setKonfirmasi] = useState(false)
  const [sibuk, setSibuk] = useState(false)

  const semua = data?.data ?? []
  const aktif = semua.filter((a) => a.sedang_terjadi)
  const riwayat = semua.filter((a) => !a.sedang_terjadi)
  const merah = aktif.filter((a) => a.severity === 'critical').length
  const bisaDibuka = aktif.some((a) => a.kunci_kejadian && BISA_DIBUKA.includes(a.kunci_kejadian))

  async function bukaKunci() {
    setSibuk(true)
    setGalat(null)
    try {
      const res = await api.post('/api/aktuator/buka-kunci', { alasan: 'Buka kunci alat dari menu Peringatan' })
      setPesan(String(res.data?.message ?? 'Perintah buka kunci dikirim ke alat.'))
      setKonfirmasi(false)
      reload()
    } catch (err) {
      setGalat(handleApiError(err).message)
    } finally {
      setSibuk(false)
    }
  }

  async function tandaiSelesai(id: BarisAlert['id']) {
    try {
      await api.post(`/alert-logs/${id}/ack`)
      setPesan('Catatan ditandai sudah ditangani.')
      reload()
    } catch (err) {
      setGalat(handleApiError(err).message)
    }
  }

  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Peringatan"
        deskripsi="Dinilai server dari data alat tiap 30 detik. Peringatan muncul bila kondisi bertahan, dan hilang sendiri saat pulih."
      />
      {pesan && <Pesan jenis="ok" onTutup={() => setPesan(null)}>{pesan}</Pesan>}
      {(galat || error) && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat || error}</Pesan>}

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Sedang terjadi">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="vsf-judul-bagian">
            Sedang terjadi <span className="tabular-nums">({aktif.length})</span>
            {merah > 0 && <span className="ml-2 text-[13px] font-semibold text-arutmin-error">{merah} merah</span>}
          </div>
          {admin && bisaDibuka && (
            <button type="button" className="vsf-btn-secondary" onClick={() => setKonfirmasi(true)}>
              Buka kunci alat
            </button>
          )}
        </div>
        {loading && !data ? (
          <div className="vsf-skeleton mt-3 h-[64px] rounded-card" />
        ) : aktif.length === 0 ? (
          <p className="mt-3 text-[13px] text-abu">Tidak ada peringatan. Semua kondisi yang dipantau normal.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {aktif.map((a) => (
              <li key={a.id} className="vsf-blok flex flex-wrap items-start gap-x-3 gap-y-1 p-3">
                <Level severity={a.severity} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-tinta">{judul(a.type)}</div>
                  <div className="text-[13px] text-tinta">{a.value}</div>
                </div>
                <div className="text-[12px] text-abu">
                  sejak {kini > 0 ? relatif(Math.max(0, kini - Date.parse(a.created_at))) : tglJam(a.created_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Riwayat peringatan">
        <div className="vsf-judul-bagian">Riwayat</div>
        {riwayat.length === 0 ? (
          <p className="mt-3 text-[13px] text-abu">Belum ada riwayat.</p>
        ) : (
          <div className="vsf-daftar mt-3">
            {riwayat.map((a) => (
              <div key={a.id} className="vsf-param" style={{ ['--kolom' as string]: '115px 85px 120px minmax(0,1fr) 150px' }}>
                <div className="vsf-param-sel font-mono text-[12px]">{tglJam(a.created_at)}</div>
                <div className="vsf-param-sel"><Level severity={a.severity} /></div>
                <div className="vsf-param-sel text-[12px] font-bold text-tinta">{judul(a.type)}</div>
                <div className="vsf-param-sel text-[13px] text-tinta">{a.value}</div>
                <div className="vsf-param-sel text-[12px] text-abu">
                  {a.selesai_pada ? (
                    <>pulih {tglJam(a.selesai_pada)}</>
                  ) : a.acknowledged ? (
                    'ditangani'
                  ) : admin ? (
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] items-center font-semibold text-arutmin-forest underline"
                      onClick={() => void tandaiSelesai(a.id)}
                    >
                      tandai selesai
                    </button>
                  ) : (
                    'catatan'
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {konfirmasi && (
        <DialogKonfirmasi
          judul="Buka kunci alat?"
          ya="Ya, buka kunci"
          sibuk={sibuk}
          galat={galat ?? undefined}
          onYa={() => void bukaKunci()}
          onBatal={() => setKonfirmasi(false)}
        >
          Perintah <b>BUKA_KUNCI</b> dikirim ke alat: membuka kunci pompa isi, pompa kelamaan, dan EC curiga, sehingga pompa
          boleh bekerja lagi. Pastikan penyebabnya (bocor, sumber air, probe EC) sudah diperiksa. Kunci pelampung error dan
          sensor rusak tidak terbuka dengan perintah ini — perbaiki di alat.
        </DialogKonfirmasi>
      )}
    </div>
  )
}
