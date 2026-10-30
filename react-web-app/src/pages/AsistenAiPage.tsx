import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useApiError } from '../lib/crudApi'
import { useApiObject } from '../lib/useApiObject'
import { ChatAsisten } from '../components/ChatAsisten'
import { Ikon } from '../components/Ikon'
import { StripKonteks, type KonteksKebun } from '../components/StripKonteks'
import { tglJam } from '../lib/format'

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

/** Satu hasil analisa — blok polos (tanpa kotak dalam kartu); dipakai hasil utama dan riwayat sesi. */
function KartuHasil({ hasil, menonjol }: { hasil: Hasil; menonjol?: boolean }) {
  const konsol = hasil.sumber === 'ollama'
  return (
    <article>
      <div className="flex flex-wrap items-center gap-2">
        <span className={clsx('vsf-pill border px-2 py-0.5 text-[12px] font-bold uppercase tracking-[.1em]', GAYA_PRIORITAS[hasil.prioritas] ?? GAYA_PRIORITAS.rendah)}>
          Prioritas {hasil.prioritas}
        </span>
        <span className="vsf-pill border-white bg-white/70 text-[12px] text-tinta">
          {konsol ? `AI lokal (Ollama) · ${hasil.model ?? 'model tidak diketahui'}` : 'Aturan heuristik'}
        </span>
        <span className="flex-1" />
        <span className="text-[12px] text-abu">{tglJam(hasil.generated_at ?? null)}</span>
      </div>

      <h3 className={clsx('mt-2.5 font-bold text-tinta', menonjol ? 'text-[16px] leading-snug' : 'text-[14px] leading-snug')}>
        {hasil.keputusan}
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed text-abu">{hasil.alasan}</p>

      {!konsol && hasil.fallback_karena && (
        <p className="mt-2 rounded-input border border-amber-500/50 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
          {ALASAN_FALLBACK[hasil.fallback_karena] ?? 'Model AI tidak dipakai — jawaban berasal dari aturan heuristik.'}
        </p>
      )}
      {!konsol && (hasil.aturan?.length ?? 0) > 0 && (
        <ul className="mt-2 list-disc pl-5 text-[12px] leading-relaxed text-abu">
          {hasil.aturan?.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
    </article>
  )
}

/** Pertanyaan awal yang sesuai kondisi kebun sekarang (bukan daftar generik). */
function saranDariKonteks(k: KonteksKebun | null): string[] {
  const terputus = k?.iotStatus?.online === false
  return [
    terputus ? 'Kenapa alat terputus?' : 'Bagaimana kondisi pH dan TDS sekarang?',
    'Apa yang harus saya lakukan hari ini?',
    'Kapan tahap semai berikutnya selesai?',
  ]
}

export default function AsistenAiPage() {
  const handleApiError = useApiError()
  const [hasil, setHasil] = useState<Hasil | null>(null)
  const [riwayat, setRiwayat] = useState<Riwayat[]>([])
  const [memuat, setMemuat] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  // satu pengambilan /dashboard dipakai strip konteks dan pertanyaan awal; senyap tiap 60 dtk
  const { data: konteks, loading: memuatKonteks } = useApiObject<KonteksKebun>('/dashboard', { pollMs: 60_000 })

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
    <div className="mx-auto flex w-full max-w-[780px] flex-col gap-4 vsf-stagger">
      <StripKonteks data={konteks} memuat={memuatKonteks} />

      {/* Langkah berikutnya: satu rekomendasi prioritas, ringkas */}
      <section className="vsf-card px-4 py-3.5 sm:px-5" aria-labelledby="vsf-langkah-title">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div id="vsf-langkah-title" className="vsf-judul-bagian">Langkah berikutnya</div>
            {!hasil && !memuat && (
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-abu">
                Satu rekomendasi prioritas dari kondisi kebun saat ini.
              </p>
            )}
          </div>
          <button
            type="button"
            className="vsf-btn-primary vsf-btn-kecil"
            onClick={() => void mintaAnalisa()}
            disabled={memuat}
            aria-busy={memuat}
          >
            {memuat ? (
              <>
                <span className="vsf-spinner" aria-hidden="true" />
                Menganalisa…
              </>
            ) : (
              <>
                <Ikon nama="ai" className="h-4 w-4" />
                {hasil ? 'Perbarui' : 'Minta langkah'}
              </>
            )}
          </button>
        </div>

        {galat && (
          <div role="alert" className="vsf-banner mt-3 rounded-input vsf-tone-error px-3 py-2 text-[13px]">
            {galat}
          </div>
        )}

        {memuat && !hasil ? (
          <div className="mt-3" role="status" aria-label="Menganalisa data">
            <div className="vsf-skeleton h-[72px] rounded-card" />
          </div>
        ) : hasil ? (
          <div className="mt-3 border-t border-white/60 pt-3">
            <KartuHasil hasil={hasil} menonjol />
          </div>
        ) : null}

        {riwayat.length > 1 && (
          <details className="mt-3 border-t border-white/60 pt-2">
            <summary className="cursor-pointer select-none py-1.5 text-[12px] font-semibold text-abu">
              Sebelumnya ({riwayat.length - 1})
            </summary>
            <div className="mt-2 grid gap-3">
              {riwayat.slice(1).map((r) => (
                <KartuHasil key={r.urut} hasil={r} />
              ))}
            </div>
          </details>
        )}
      </section>

      <ChatAsisten saran={saranDariKonteks(konteks)} />
    </div>
  )
}
