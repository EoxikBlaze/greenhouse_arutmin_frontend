import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useApiError } from '../lib/crudApi'
import { Ikon } from './Ikon'
import { riwayatUntukServer, type Pesan, type Tabel } from '../lib/riwayatChat'

/**
 * Chat bebas dengan asisten AI — POST /api/ai/chat
 * body { pesan, riwayat:[{peran:'user'|'ai', teks}] } → { jawaban, sumber, model, fallback_karena }.
 * Riwayat hanya hidup di sesi halaman ini (tidak disimpan di server).
 *
 * Tata letak: thread mengalir di halaman (tanpa kotak dalam), composer kaca menempel di bawah layar.
 */

/** Pintasan jalur deterministik: jawaban + tabel langsung dari database, tanpa LLM. */
const PINTASAN = [
  { label: 'Diagnosa menyeluruh', pesan: 'Lakukan diagnosa menyeluruh', utama: true },
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
      <figcaption className="mb-1 text-[12px] font-bold uppercase tracking-[.1em] text-abu">{t.judul}</figcaption>
      <div className="max-w-full overflow-x-auto overscroll-x-contain rounded-card border border-arutmin-border bg-white">
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
const TAMPIL_HITUNG = 400
const TINGGI_MAKS = 132

/** Waktu saat ini (ms); dipanggil hanya dari handler kirim, bukan saat render. */
const sekarang = () => Date.now()

function jam(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function ChatAsisten({ saran }: { saran: string[] }) {
  const handleApiError = useApiError()
  const [pesan, setPesan] = useState<Pesan[]>([])
  const [isi, setIsi] = useState('')
  const [memuat, setMemuat] = useState(false)
  const akhirRef = useRef<HTMLDivElement>(null)
  const kolomRef = useRef<HTMLTextAreaElement>(null)
  const idRef = useRef(0)
  // naik setiap "Hapus percakapan" → jawaban yang datang terlambat dari percakapan lama dibuang
  const sesiRef = useRef(0)

  // Gulir halaman ke pesan terbaru (tidak saat masih kosong: jangan menggeser halaman waktu dibuka).
  useEffect(() => {
    if (pesan.length === 0) return
    akhirRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [pesan, memuat])

  // Textarea tumbuh mengikuti isi, sampai batas tinggi.
  useEffect(() => {
    const el = kolomRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, TINGGI_MAKS)}px`
  }, [isi])

  async function kirim(teks: string, dasar: Pesan[] = pesan) {
    const t = teks.trim()
    if (!t || memuat || t.length > BATAS) return
    const riwayat = riwayatUntukServer(dasar)
    const sesi = sesiRef.current
    const user: Pesan = { id: ++idRef.current, peran: 'user', teks: t, waktu: sekarang() }
    setPesan([...dasar, user])
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
      const waktu = sekarang()
      setPesan((l) => [
        ...l,
        { id: ++idRef.current, peran: 'ai', teks: d.jawaban, waktu, sumber: d.sumber, status: d.status, tabel: d.tabel ?? [] },
      ])
    } catch (err) {
      if (sesi !== sesiRef.current) return
      const waktu = sekarang()
      setPesan((l) => [
        ...l,
        { id: ++idRef.current, peran: 'ai', teks: handleApiError(err).message, waktu, galat: true, ulang: t },
      ])
    } finally {
      if (sesi === sesiRef.current) setMemuat(false)
    }
  }

  /** "Coba lagi": buang pesan galat beserta pertanyaan pengguna sebelumnya, lalu kirim ulang. */
  function cobaLagi(id: number) {
    const i = pesan.findIndex((p) => p.id === id)
    const teks = i >= 0 ? pesan[i].ulang : undefined
    if (!teks || memuat) return
    void kirim(teks, pesan.slice(0, Math.max(0, i - 1)))
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
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void kirim(isi)
    }
  }

  const kosong = pesan.length === 0

  return (
    <section aria-label="Percakapan dengan asisten AI" className="flex min-w-0 flex-col gap-3">
      {kosong ? (
        <div className="grid min-h-[34vh] place-items-center py-6 text-center">
          <div className="vsf-card w-full max-w-[560px] px-4 py-5">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-activePill text-white shadow-[var(--lg-rim-kecil)]">
              <Ikon nama="ai" className="h-6 w-6" />
            </span>
            <h2 className="mt-3 font-display text-[22px] font-bold leading-tight text-tinta">Tanya apa saja soal kebun</h2>
            <p className="mx-auto mt-1 max-w-[440px] text-[13px] leading-relaxed text-abu">
              Jawaban dibaca dari data sensor, alert, penampung, dan tahap tanam terbaru.
            </p>
            <div className="mt-4 grid gap-2 text-left">
              {saran.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={memuat}
                  onClick={() => void kirim(s)}
                  className="vsf-card flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5 text-[14px] font-semibold text-tinta disabled:opacity-60"
                >
                  <span>{s}</span>
                  <Ikon nama="kanan" className="h-4 w-4 shrink-0 text-abu" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <button type="button" className="vsf-btn-secondary vsf-btn-kecil" onClick={hapus}>
              <Ikon nama="hapus" className="h-3.5 w-3.5" />
              Hapus percakapan
            </button>
          </div>
          <ul role="log" aria-live="polite" aria-label="Pesan" className="grid grid-cols-[minmax(0,1fr)] gap-3">
            {pesan.map((p) => (
              <li key={p.id} className={clsx('flex min-w-0', p.peran === 'user' ? 'justify-end' : 'justify-start gap-2.5')}>
                {p.peran === 'ai' && (
                  <span
                    aria-hidden
                    className={clsx(
                      'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-white',
                      p.galat ? 'bg-arutmin-error' : 'bg-activePill',
                    )}
                  >
                    <Ikon nama={p.galat ? 'peringatan' : 'ai'} className="h-4 w-4" />
                  </span>
                )}
                <div
                  className={clsx(
                    'min-w-0 whitespace-pre-wrap break-words px-4 py-2.5 text-[14px] leading-relaxed shadow-sm',
                    p.tabel && p.tabel.length > 0 ? 'w-full max-w-full' : 'max-w-[86%]',
                    p.peran === 'user' && 'rounded-[22px] rounded-br-md bg-activePill text-white',
                    p.peran === 'ai' && !p.galat && 'rounded-[22px] rounded-tl-md border border-white bg-white/85 text-tinta',
                    p.galat && 'vsf-tone-error rounded-[22px] rounded-tl-md',
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
                  {p.galat && p.ulang && (
                    <div className="mt-2">
                      <button
                        type="button"
                        disabled={memuat}
                        className="vsf-btn-secondary vsf-btn-kecil"
                        onClick={() => cobaLagi(p.id)}
                      >
                        Coba lagi
                      </button>
                    </div>
                  )}
                  <div className={clsx('mt-1.5 flex flex-wrap gap-x-2 text-[12px]', p.peran === 'user' ? 'justify-end text-white/80' : 'text-abu')}>
                    {p.peran === 'ai' && !p.galat && p.sumber && SUMBER[p.sumber] && <span>{SUMBER[p.sumber]}</span>}
                    <span className="tabular-nums">{jam(p.waktu)}</span>
                  </div>
                </div>
              </li>
            ))}
            {memuat && (
              <li className="flex justify-start gap-2.5" role="status" aria-label="Asisten sedang menulis">
                <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-activePill text-white">
                  <Ikon nama="ai" className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-1.5 rounded-[22px] rounded-tl-md border border-white bg-white/85 px-4 py-3 shadow-sm">
                  <span className="vsf-dot h-2 w-2 rounded-full bg-arutmin-moss" />
                  <span className="vsf-dot h-2 w-2 rounded-full bg-arutmin-moss opacity-70" />
                  <span className="vsf-dot h-2 w-2 rounded-full bg-arutmin-moss opacity-40" />
                </div>
              </li>
            )}
          </ul>
        </>
      )}

      {/* penanda akhir thread: tujuan gulir otomatis, jarak bawah menyisakan ruang untuk composer yang menempel */}
      <div ref={akhirRef} aria-hidden className="scroll-mb-40" />

      {/* composer menempel di bawah layar */}
      <div className="sticky bottom-3 z-10 grid gap-2">
        <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none]" aria-label="Pintasan">
          {PINTASAN.map((x) => (
            <button
              key={x.label}
              type="button"
              disabled={memuat}
              onClick={() => void kirim(x.pesan)}
              className={clsx(
                'inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-semibold transition-colors disabled:opacity-50',
                x.utama
                  ? 'border-transparent bg-activePill text-white shadow-[var(--lg-rim-kecil)]'
                  : 'border-white bg-white/75 text-tinta hover:bg-white',
              )}
            >
              {x.utama && <Ikon nama="ai" className="h-3.5 w-3.5" />}
              {x.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={onSubmit}
          className="glass-chrome flex items-end gap-2 !rounded-[28px] p-2 pl-4 transition-shadow focus-within:shadow-[0_0_0_3px_rgb(107_157_74/0.35)]"
        >
          <label className="sr-only" htmlFor="vsf-chat-input">
            Pesan untuk asisten
          </label>
          <textarea
            ref={kolomRef}
            id="vsf-chat-input"
            value={isi}
            onChange={(e) => setIsi(e.target.value.slice(0, BATAS))}
            onKeyDown={onKey}
            rows={1}
            placeholder="Tulis pertanyaan…"
            className="max-h-[132px] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[14px] leading-relaxed text-tinta outline-none placeholder:text-abu"
          />
          {isi.length > TAMPIL_HITUNG && (
            <span className="self-center text-[12px] tabular-nums text-abu" aria-live="polite">
              {isi.length}/{BATAS}
            </span>
          )}
          <button
            type="submit"
            aria-label="Kirim pesan"
            disabled={memuat || !isi.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-activePill text-white shadow-[var(--lg-rim-kecil)] transition-[transform,opacity] active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Ikon nama="kirim" className="h-5 w-5" />
          </button>
        </form>
      </div>
    </section>
  )
}
