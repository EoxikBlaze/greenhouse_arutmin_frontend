import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useApiError } from '../lib/crudApi'
import { ChatAsisten } from '../components/ChatAsisten'

/**
 * Asisten AI — terhubung ke endpoint riil:
 *   POST /api/ai/langkah-selanjutnya   (Bearer JWT, role admin | petani — demo ditolak)
 *   body opsional { id_tanaman?, id_meja? } → balas JSON {keputusan, prioritas, alasan,
 *   sumber: 'ollama' | 'heuristik', ...} (routes/ai.js).
 * Tidak ada jawaban simulasi: setiap klik membaca data terbaru dari server.
 */

type Prioritas = 'tinggi' | 'sedang' | 'rendah'

type Hasil = {
  keputusan: string
  alasan: string
  prioritas: Prioritas
  sumber: string
  model: string | null
  fallback_karena: string | null
  aturan?: string[]
  generated_at?: string
}

type Riwayat = Hasil & { urut: number }

/** Penjelasan jujur kenapa jawaban berasal dari heuristik, bukan model. */
const ALASAN_FALLBACK: Record<string, string> = {
  koneksi: 'AI lokal tidak dapat dihubungi — jawaban diambil dari aturan heuristik transparan.',
  timeout: 'AI lokal tidak merespons dalam batas 30 detik — jawaban diambil dari aturan heuristik transparan.',
  respons_ollama_tidak_valid: 'AI lokal mengirim balasan tidak valid — jawaban diambil dari aturan heuristik transparan.',
  output_tidak_sah: 'Balasan AI tidak lolos pemeriksaan format — jawaban diambil dari aturan heuristik transparan.',
}

const GAYA_PRIORITAS: Record<Prioritas, string> = {
  tinggi: 'vsf-tone-error',
  sedang: 'vsf-tone-warn',
  rendah: 'border-arutmin-moss/50 bg-arutmin-mint/40 text-arutmin-forest',
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function tgl(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const jam = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()} · ${jam}`
}

/** Data yang benar-benar dibaca asisten (routes/ai.js). */
const SUMBER_DATA = ['Sensor terakhir', 'Ambang sensor', 'Alert terbuka', 'Penampung & dosing', 'Tahap tanam', 'Panen terakhir']

/** Kartu satu hasil analisa — dipakai hasil utama & riwayat sesi. */
function KartuHasil({ hasil, menonjol }: { hasil: Hasil; menonjol?: boolean }) {
  const konsol = hasil.sumber === 'ollama'
  return (
    <article
      className={clsx(
        'rounded-card border bg-white p-4',
        menonjol ? 'border-arutmin-moss/50' : 'border-arutmin-border',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={clsx('vsf-pill border px-2 py-0.5 text-[12px] font-bold uppercase tracking-[.1em]', GAYA_PRIORITAS[hasil.prioritas] ?? GAYA_PRIORITAS.rendah)}>
          Prioritas {hasil.prioritas}
        </span>
        <span className="vsf-pill border-arutmin-border bg-white text-slate-600 text-[12px]">
          {konsol ? `AI lokal (Ollama) · ${hasil.model ?? 'model tidak diketahui'}` : 'Aturan heuristik'}
        </span>
        <span className="flex-1" />
        <span className="text-[12px] text-slate-500">{tgl(hasil.generated_at ?? null)}</span>
      </div>

      <h3 className={clsx('mt-3 font-bold text-slate-900', menonjol ? 'text-[16px] leading-snug' : 'text-[14px] leading-snug')}>
        {hasil.keputusan}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{hasil.alasan}</p>

      {!konsol && hasil.fallback_karena && (
        <p className="mt-2 rounded-input border border-amber-500/50 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
          {ALASAN_FALLBACK[hasil.fallback_karena] ?? 'Model AI tidak dipakai — jawaban berasal dari aturan heuristik.'}
        </p>
      )}
      {!konsol && (hasil.aturan?.length ?? 0) > 0 && (
        <ul className="mt-2 list-disc pl-5 text-[12px] leading-relaxed text-slate-500">
          {hasil.aturan?.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
    </article>
  )
}

export default function AsistenAiPage() {
  const handleApiError = useApiError()
  const [hasil, setHasil] = useState<Hasil | null>(null)
  const [riwayat, setRiwayat] = useState<Riwayat[]>([])
  const [memuat, setMemuat] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  // Efek samping setState di dalam async handler (bukan sinkron di dalam effect).
  async function mintaAnalisa() {
    if (memuat) return
    setMemuat(true)
    setGalat(null)
    try {
      const res = await api.post('/api/ai/langkah-selanjutnya', {})
      const data = res.data as Hasil
      setHasil(data)
      setRiwayat((lama) => [{ ...data, urut: Date.now() }, ...lama].slice(0, 5))
    } catch (err) {
      setGalat(handleApiError(err).message)
    } finally {
      setMemuat(false)
    }
  }

  // Auto-hilang untuk banner error agar layar tidak menumpuk.
  useEffect(() => {
    if (!galat) return
    const id = window.setTimeout(() => setGalat(null), 6000)
    return () => window.clearTimeout(id)
  }, [galat])

  return (
    <div className="mx-auto grid w-full max-w-[1180px] grid-cols-[minmax(0,1fr)] items-start gap-4 vsf-stagger lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      {/* Kiri: chat sebagai fokus utama */}
      <div className="grid min-w-0 gap-3">
        <header className="px-1">
          <h2 className="font-display text-[20px] font-bold leading-tight text-tinta">Asisten AI</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
            Tanya soal kebun atau minta diagnosa menyeluruh. Jawaban dibaca dari data terbaru di server.
          </p>
        </header>
        <ChatAsisten />
      </div>

      {/* Kanan: langkah berikutnya + data yang dibaca */}
      <aside className="grid min-w-0 gap-4">
        <section className="vsf-card w-full min-w-0 p-4 sm:p-5">
          <div className="text-[12px] font-bold uppercase tracking-[.14em] text-slate-500">Langkah berikutnya</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">
            Satu rekomendasi prioritas beserta alasannya, dari kondisi kebun saat ini.
          </p>
          <button
            type="button"
            className="vsf-btn-primary mt-3 w-full justify-center"
            onClick={() => void mintaAnalisa()}
            disabled={memuat}
            aria-busy={memuat}
          >
            {memuat ? (
              <>
                <span className="vsf-spinner" aria-hidden="true" />
                Menganalisa data…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M10 2.5 12 7.6l5.1 2-5.1 2-2 5.1-2-5.1-5.1-2 5.1-2z" fill="currentColor" />
                </svg>
                Minta langkah selanjutnya
              </>
            )}
          </button>

          {galat && (
            <div
              role="alert"
              className="vsf-banner mt-3 rounded-input vsf-tone-error px-3 py-2 text-[13px]"
            >
              {galat}
            </div>
          )}

          <div className="mt-3">
            {memuat && !hasil ? (
              <div className="grid gap-3" role="status" aria-label="Menganalisa data">
                <div className="vsf-skeleton h-[92px] rounded-card" />
              </div>
            ) : hasil ? (
              <KartuHasil hasil={hasil} menonjol />
            ) : (
              <p className="rounded-card border border-dashed border-arutmin-border px-3 py-4 text-center text-[12.5px] leading-relaxed text-slate-500">
                Belum ada analisa. Tekan tombol di atas untuk membuatnya dari data sistem saat ini.
              </p>
            )}
          </div>

          {riwayat.length > 1 && (
            <div className="mt-4">
              <div className="text-[12px] font-bold uppercase tracking-[.14em] text-slate-500">
                Sebelumnya ({riwayat.length - 1})
              </div>
              <div className="mt-2 grid gap-2">
                {riwayat.slice(1).map((r) => (
                  <KartuHasil key={r.urut} hasil={r} />
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="vsf-card w-full min-w-0 p-4 sm:p-5">
          <div className="text-[12px] font-bold uppercase tracking-[.14em] text-slate-500">Data yang dibaca</div>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {SUMBER_DATA.map((k) => (
              <li
                key={k}
                className="rounded-full border border-arutmin-border bg-arutmin-page px-2.5 py-1 text-[12px] font-semibold text-slate-700"
              >
                {k}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
            Bila AI lokal mati, jawaban memakai aturan tetap dan alasannya ditampilkan apa adanya.
          </p>
        </section>
      </aside>
    </div>
  )
}
