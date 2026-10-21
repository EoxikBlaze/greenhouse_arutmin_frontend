import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useApiError } from '../lib/crudApi'

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
  tinggi: 'border-red-500/60 bg-red-50 text-red-700',
  sedang: 'border-amber-500/60 bg-amber-50 text-amber-800',
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

/** Data yang benar-benar dibaca routes/ai.js — bukan daftar rencana. */
const SUMBER_DATA = [
  'Sensor terakhir (pH, suhu air & udara, TDS, kelembapan, level air)',
  'Ambang dari tabel sensor_thresholds (bukan angka tetap di kode)',
  'Alert yang masih terbuka dari alert_logs',
  'Tahap tanam berjalan + durasi siklus (semai → peremajaan → pendewasaan)',
  'Panen terakhir & total riwayat panen',
]

function IlustrasiAsisten() {
  return (
    <svg viewBox="0 0 180 118" className="mx-auto h-[104px] w-[168px]" aria-hidden="true" focusable="false">
      <ellipse cx="90" cy="108" rx="62" ry="7" fill="#E2E8DD" />
      <path
        d="M34 24h84a12 12 0 0 1 12 12v34a12 12 0 0 1-12 12H70l-20 16v-16H34a12 12 0 0 1-12-12V36a12 12 0 0 1 12-12z"
        fill="#fff"
        stroke="#6B9D4A"
        strokeWidth="2"
      />
      <path d="M44 44h64M44 56h48M44 68h34" stroke="#CFE2CE" strokeWidth="6" strokeLinecap="round" />
      <path
        d="M120 66h34a10 10 0 0 1 10 10v18a10 10 0 0 1-10 10h-8v10l-14-10h-12a10 10 0 0 1-10-10V76a10 10 0 0 1 10-10z"
        fill="#CFE2CE"
        stroke="#6B9D4A"
        strokeWidth="2"
      />
      <circle cx="134" cy="85" r="3" fill="#4C6A4B" />
      <circle cx="144" cy="85" r="3" fill="#4C6A4B" />
      <circle cx="154" cy="85" r="3" fill="#4C6A4B" />
      <path d="M150 18l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#F59E0B" opacity=".85" />
      <path d="M22 12l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#6B9D4A" opacity=".7" />
    </svg>
  )
}

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
        <span className={clsx('vsf-pill border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[.1em]', GAYA_PRIORITAS[hasil.prioritas] ?? GAYA_PRIORITAS.rendah)}>
          Prioritas {hasil.prioritas}
        </span>
        <span className="vsf-pill border-arutmin-border bg-white text-slate-600 text-[11px]">
          {konsol ? `AI lokal (Ollama) · ${hasil.model ?? 'model tidak diketahui'}` : 'Aturan heuristik'}
        </span>
        <span className="flex-1" />
        <span className="text-[11px] text-slate-500">{tgl(hasil.generated_at ?? null)}</span>
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
    <div className="mx-auto w-full max-w-[1180px] grid grid-cols-[minmax(0,1fr)] gap-4 vsf-stagger">
      {/* Ringkas modul — status jujur */}
      <section className="vsf-card w-full min-w-0 p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Asisten AI</div>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
              Minta langkah berikutnya untuk kebun: asisten membaca data sensor, ambang, alert, tahap tanam,
              dan panen terbaru dari server, lalu membalas satu keputusan beserta alasannya.
            </p>
          </div>
          <span className="flex-1" />
          <span className="vsf-pill border-arutmin-moss/50 bg-arutmin-mint/40 text-arutmin-forest">
            <span className="vsf-dot mr-1 h-[7px] w-[7px] rounded-full bg-arutmin-forest" aria-hidden="true" />
            Aktif · POST /api/ai/langkah-selanjutnya
          </span>
        </div>
      </section>

      {/* Layar utama: tombol + hasil */}
      <section className="vsf-card w-full min-w-0 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Langkah berikutnya</div>
            <div className="mt-1 text-[12px] text-slate-500">
              Setiap permintaan membaca data terbaru dari server (tanpa cache) dan membalas JSON
              {' '}
              <code className="rounded bg-arutmin-mint/60 px-1 py-0.5 text-[12px]">{'{keputusan, prioritas, alasan}'}</code>.
            </div>
          </div>
          <span className="flex-1" />
          <button
            type="button"
            className="vsf-btn-primary"
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
        </div>

        {galat && (
          <div
            role="alert"
            className="vsf-banner mt-3 rounded-input border border-red-600/50 bg-red-50 px-3 py-2 text-[13px] text-red-700"
          >
            {galat}
          </div>
        )}

        <div className="mt-3">
          {memuat && !hasil ? (
            <div className="grid gap-3" role="status" aria-label="Menganalisa data">
              <div className="vsf-skeleton h-[92px] rounded-card" />
              <div className="vsf-skeleton h-[64px] rounded-card" />
            </div>
          ) : hasil ? (
            <KartuHasil hasil={hasil} menonjol />
          ) : (
            <div className="rounded-card border border-dashed border-arutmin-border px-4 py-8 text-center">
              <IlustrasiAsisten />
              <div className="mx-auto mt-3 max-w-[560px]">
                <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Siap dipakai</div>
                <h2 className="mt-1.5 text-[17px] font-bold text-slate-900">
                  Tekan “Minta langkah selanjutnya” untuk analisa terbaru
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                  Belum ada analisa pada sesi ini. Hasil akan menampilkan keputusan, prioritas, dan alasan
                  berdasarkan data sistem saat ini — bukan jawaban contoh.
                </p>
              </div>
            </div>
          )}
        </div>

        {riwayat.length > 1 && (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">
              Riwayat sesi ini ({riwayat.length})
            </div>
            <div className="mt-2 grid gap-2">
              {riwayat.slice(1).map((r) => (
                <KartuHasil key={r.urut} hasil={r} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Data yang benar-benar dibaca */}
      <section className="vsf-card w-full min-w-0 p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Data yang dibaca asisten</div>
        <ul className="mt-3 grid gap-2">
          {SUMBER_DATA.map((k) => (
            <li
              key={k}
              className="flex items-start gap-2 rounded-input border border-arutmin-border bg-white px-3 py-2 text-[13px] text-slate-700"
            >
              <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" focusable="false">
                <path d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.3 4.2 13.3l.7-4.3-3.1-3 4.3-.6z" fill="#CFE2CE" stroke="#6B9D4A" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              <span>{k}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 text-[12px] text-slate-500">
          Bila AI lokal sedang mati atau balasannya tidak sah, server tetap menjawab dari aturan heuristik
          dan <b>alasan fallback-nya ditampilkan apa adanya</b> — bukan jawaban palsu.
        </div>
      </section>
    </div>
  )
}
