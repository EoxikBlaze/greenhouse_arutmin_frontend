import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useApiError } from '../lib/crudApi'

/**
 * Chat bebas dengan asisten AI — POST /api/ai/chat
 * body { pesan, riwayat:[{peran:'user'|'ai', teks}] } → { jawaban, sumber, model, fallback_karena }.
 * Riwayat hanya hidup di sesi halaman ini (tidak disimpan di server).
 */

type Tabel = { judul: string; kolom: string[]; baris: string[][] }
type Pesan = {
  id: number
  peran: 'user' | 'ai'
  teks: string
  sumber?: string
  status?: 'OK' | 'PERHATIAN' | 'KRITIS'
  tabel?: Tabel[]
  galat?: boolean
}

const SARAN = [
  'Bagaimana kondisi pH dan TDS sekarang?',
  'Apa yang harus saya lakukan hari ini?',
  'Kapan tahap semai berikutnya selesai?',
  'Kenapa daun selada menguning?',
]

/** Pintasan jalur deterministik: jawaban + tabel langsung dari database, tanpa LLM. */
const PINTASAN = [
  { label: 'Diagnosa menyeluruh', pesan: 'Lakukan diagnosa menyeluruh' },
  { label: 'Tabel sensor', pesan: 'Tampilkan tabel sensor terbaru' },
  { label: 'Alert terbuka', pesan: 'Tampilkan daftar alert terbuka' },
  { label: 'Status penampung', pesan: 'Tampilkan status penampung dan dosing' },
  { label: 'Tahap tanam', pesan: 'Tampilkan status tahap tanam' },
]

const SUMBER: Record<string, string> = {
  heuristik: 'Saran berbasis aturan dari data terbaru',
  sapaan: 'Asisten GARAP',
  diagnosa: 'Diagnosa otomatis dari database',
  data: 'Data langsung dari database',
  ollama: 'Dijawab AI lokal — cek ulang sebelum bertindak',
  tolak: 'Permintaan ditolak oleh pengaman',
}

function warnaSel(v: string): string {
  const t = v.toUpperCase()
  if (t === 'KRITIS' || t === 'CRITICAL' || t.startsWith('LOCK') || t.startsWith('DI LUAR') || t === 'LEWAT DURASI' || t === 'TIDAK ADA DATA')
    return 'bg-red-50 font-bold text-red-700'
  if (t === 'PERHATIAN' || t === 'WARNING' || t === 'BASI' || t === 'PEMELIHARAAN' || t === 'SEGERA SELESAI')
    return 'bg-amber-50 font-bold text-amber-700'
  if (t === 'OK' || t === 'NORMAL') return 'font-bold text-arutmin-forest'
  return ''
}

function TabelAi({ t }: { t: Tabel }) {
  return (
    <figure className="mt-2.5 min-w-0">
      <figcaption className="mb-1 text-[12px] font-bold uppercase tracking-[.1em] text-slate-500">{t.judul}</figcaption>
      <div className="max-w-full overflow-x-auto overscroll-x-contain rounded-card border border-arutmin-border">
        <table className="w-full min-w-max border-collapse text-left text-[12px]">
          <thead>
            <tr className="bg-arutmin-page">
              {t.kolom.map((k) => (
                <th key={k} scope="col" className="whitespace-nowrap border-b border-arutmin-border px-2.5 py-1.5 font-bold text-slate-600">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.baris.map((b, i) => (
              <tr key={i} className="border-b border-arutmin-border/60 last:border-0">
                {b.map((sel, j) => (
                  <td key={j} className={clsx('px-2.5 py-1.5 align-top', j > 0 && 'whitespace-nowrap', warnaSel(String(sel)))}>
                    {String(sel)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}

const BATAS = 600

/**
 * Riwayat untuk server: pasangan tanya-jawab yang ditolak/galat dibuang UTUH.
 * Dulu hanya jawabannya yang dibuang → pertanyaan luar topik ikut terkirim dan
 * membuat pertanyaan sah berikutnya ditolak juga.
 */
function riwayatUntukServer(pesan: Pesan[]) {
  const out: Pesan[] = []
  for (const p of pesan) {
    if (p.peran === 'ai' && (p.galat || p.sumber === 'tolak')) {
      if (out.length && out[out.length - 1].peran === 'user') out.pop()
      continue
    }
    out.push(p)
  }
  return out.slice(-8).map((p) => ({ peran: p.peran, teks: p.teks }))
}

export function ChatAsisten() {
  const handleApiError = useApiError()
  const [pesan, setPesan] = useState<Pesan[]>([])
  const [isi, setIsi] = useState('')
  const [memuat, setMemuat] = useState(false)
  const gulirRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(0)
  // naik setiap "Hapus percakapan" → jawaban yang datang terlambat dari percakapan lama dibuang
  const sesiRef = useRef(0)

  // Gulir HANYA kotak chat (bukan halaman) ke pesan terbaru.
  useEffect(() => {
    const el = gulirRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [pesan, memuat])

  async function kirim(teks: string) {
    const t = teks.trim()
    if (!t || memuat || t.length > BATAS) return
    const riwayat = riwayatUntukServer(pesan)
    const sesi = sesiRef.current
    const user: Pesan = { id: ++idRef.current, peran: 'user', teks: t }
    setPesan((l) => [...l, user])
    setIsi('')
    setMemuat(true)
    try {
      const res = await api.post('/api/ai/chat', { pesan: t, riwayat })
      const d = res.data as {
        jawaban: string
        sumber: string
        status?: 'OK' | 'PERHATIAN' | 'KRITIS'
        tabel?: Tabel[]
      }
      if (sesi !== sesiRef.current) return
      setPesan((l) => [
        ...l,
        { id: ++idRef.current, peran: 'ai', teks: d.jawaban, sumber: d.sumber, status: d.status, tabel: d.tabel ?? [] },
      ])
    } catch (err) {
      if (sesi !== sesiRef.current) return
      setPesan((l) => [
        ...l,
        { id: ++idRef.current, peran: 'ai', teks: handleApiError(err).message, galat: true },
      ])
    } finally {
      if (sesi === sesiRef.current) setMemuat(false)
    }
  }

  function hapus() {
    sesiRef.current += 1
    setPesan([])
    setMemuat(false)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void kirim(isi)
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void kirim(isi)
    }
  }

  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-labelledby="vsf-chat-title">
      <div className="flex flex-wrap items-center gap-2">
        <div id="vsf-chat-title" className="vsf-judul-bagian">
          Tanya asisten
        </div>
        <span className="flex-1" />
        {pesan.length > 0 && (
          <button type="button" className="vsf-btn-secondary !min-h-[44px] sm:!min-h-[36px] !text-[12px]" onClick={hapus}>
            Hapus percakapan
          </button>
        )}
      </div>

      <div
        ref={gulirRef}
        className="mt-3 max-h-[min(60vh,560px)] min-h-[280px] overflow-y-auto overscroll-contain rounded-card border border-arutmin-border bg-arutmin-page p-3"
        role="log"
        aria-live="polite"
        aria-label="Percakapan dengan asisten AI"
      >
        {pesan.length === 0 && (
          <div className="grid h-full min-h-[170px] place-items-center text-center">
            <div>
              <div className="text-[14px] font-bold text-tinta">Tanya apa saja soal kebun Anda</div>
              <p className="mx-auto mt-1 max-w-[420px] text-[12.5px] text-slate-600">
                Jawaban memakai data sensor, ambang, alert, penampung, dan tahap tanam terbaru. Coba “Diagnosa menyeluruh” untuk pemeriksaan lengkap berbentuk tabel.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {SARAN.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="inline-flex min-h-[44px] items-center rounded-full border border-arutmin-moss/50 bg-white px-3 py-1.5 text-[12px] sm:min-h-0 font-semibold text-arutmin-forest transition-colors hover:bg-arutmin-mint/50"
                    onClick={() => void kirim(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
          {pesan.map((p) => (
            <li key={p.id} className={clsx('flex', p.peran === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={clsx(
                  'min-w-0 whitespace-pre-wrap break-words rounded-card px-3.5 py-2.5 text-[13.5px] leading-relaxed',
                  p.tabel && p.tabel.length > 0 ? 'w-full max-w-full' : 'max-w-[88%]',
                  p.peran === 'user' && 'bg-arutmin-forest text-white',
                  p.peran === 'ai' && !p.galat && 'border border-arutmin-border bg-white text-tinta',
                  p.galat && 'vsf-tone-error',
                )}
              >
                {p.status && (
                  <span
                    className={clsx(
                      'mb-1.5 mr-2 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-bold',
                      p.status === 'OK' && 'bg-arutmin-mint/60 text-arutmin-forest',
                      p.status === 'PERHATIAN' && 'bg-amber-100 text-amber-800',
                      p.status === 'KRITIS' && 'bg-red-100 text-red-700',
                    )}
                  >
                    {p.status}
                  </span>
                )}
                {p.teks}
                {p.tabel?.map((t, i) => <TabelAi key={i} t={t} />)}
                {p.peran === 'ai' && !p.galat && p.sumber && SUMBER[p.sumber] && (
                  <div className="mt-1.5 text-[12px] text-slate-500">{SUMBER[p.sumber]}</div>
                )}
              </div>
            </li>
          ))}
          {memuat && (
            <li className="flex justify-start" role="status" aria-label="Asisten sedang menulis">
              <div className="flex items-center gap-1.5 rounded-card border border-arutmin-border bg-white px-3.5 py-3">
                <span className="vsf-dot h-2 w-2 rounded-full bg-arutmin-moss" />
                <span className="vsf-dot h-2 w-2 rounded-full bg-arutmin-moss opacity-70" />
                <span className="vsf-dot h-2 w-2 rounded-full bg-arutmin-moss opacity-40" />
              </div>
            </li>
          )}
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Pintasan">
        {PINTASAN.map((x) => (
          <button
            key={x.label}
            type="button"
            disabled={memuat}
            className="inline-flex min-h-[44px] items-center rounded-full border border-arutmin-border2 bg-white px-2.5 py-1 text-[12px] sm:min-h-0 font-semibold text-slate-700 transition-colors hover:border-arutmin-moss hover:bg-arutmin-mint/40 disabled:opacity-50"
            onClick={() => void kirim(x.pesan)}
          >
            {x.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-2 flex items-end gap-2">
        <label className="sr-only" htmlFor="vsf-chat-input">
          Pesan untuk asisten
        </label>
        <textarea
          id="vsf-chat-input"
          value={isi}
          onChange={(e) => setIsi(e.target.value.slice(0, BATAS))}
          onKeyDown={onKey}
          rows={2}
          placeholder="Tulis pertanyaan… (Enter kirim, Shift+Enter baris baru)"
          className="min-h-[44px] flex-1 resize-none rounded-input border border-arutmin-border2 bg-white px-3 py-2 text-[14px] outline-none focus:border-arutmin-moss"
        />
        <button type="submit" className="vsf-btn-primary" disabled={memuat || !isi.trim()}>
          Kirim
        </button>
      </form>
      <div className="mt-1 text-right text-[12px] text-slate-500">{isi.length}/{BATAS}</div>
    </section>
  )
}
