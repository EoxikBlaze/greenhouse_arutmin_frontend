import { useState, type FormEvent } from 'react'
import clsx from 'clsx'
import { useSearchParams } from 'react-router-dom'

type Pesan = { dari: 'ANDA' | 'ASISTEN AI'; teks: string; waktu: string }

const AWAL: Pesan[] = [
  {
    dari: 'ANDA',
    teks: 'Bagaimana kondisi pH air tandon hari ini? Apakah aman untuk tahap Pendewasaan?',
    waktu: '07:41',
  },
  {
    dari: 'ASISTEN AI',
    teks: 'pH tandon saat ini 6.2 — dalam rentang aman Pendewasaan (target 6.0–6.5). TDS 1.180 ppm juga stabil. Tidak ada tindakan yang diperlukan saat ini.',
    waktu: '07:41',
  },
  { dari: 'ANDA', teks: "Kalau K-04 terus 'Periksa Alat', apa yang harus dilakukan?", waktu: '07:43' },
]

const QUICK = ['✦ Ringkas sensor hari ini', '✦ Rekomendasi penyiraman', '✦ Jadwal panen terdekat']

function jam(): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
}

export default function AsistenAiPage() {
  const [searchParams] = useSearchParams()
  const stateVariant = searchParams.get('state') ?? 'ok' // loading | offline | ok
  const [pesan, setPesan] = useState<Pesan[]>(AWAL)
  const [input, setInput] = useState('')
  const [mengetik, setMengetik] = useState(false)
  const [sSensor, setSSensor] = useState(true)
  const [sRiwayat, setSRiwayat] = useState(true)

  const offline = stateVariant === 'offline'
  const loading = stateVariant === 'loading'

  function kirim(teks: string) {
    const t = teks.trim()
    if (!t || offline || mengetik) return
    setPesan((p) => [...p, { dari: 'ANDA', teks: t, waktu: jam() }])
    setInput('')
    setMengetik(true)
    // TODO tahap API: streaming per-kalimat dari endpoint asisten
    setTimeout(() => {
      setPesan((p) => [
        ...p,
        {
          dari: 'ASISTEN AI',
          teks: 'Baik — berdasarkan data sensor terkini, kondisi kebun dalam batas normal. Saya akan kabari bila ada nilai keluar ambang.',
          waktu: jam(),
        },
      ])
      setMengetik(false)
    }, 1200)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    kirim(input)
  }

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {/* Konteks percakapan */}
      <section className="vsf-card p-4">
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <b className="text-slate-900">Konteks aktif:</b>
          <span className="text-slate-600">6 sensor live · 12 batch · tahap Pendewasaan</span>
        </div>
        <div className="mt-2 text-[12px] text-slate-500">
          states: loading (bubble skeleton) · AI offline (‘Asisten tidak tersedia — coba lagi’) · guard [petani]
          (hanya baca data sendiri)
        </div>
      </section>

      {/* Panel chat */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Panel chat</div>

        {offline && (
          <div className="vsf-banner mt-3 rounded-input border border-red-600/50 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
            ✖ Asisten tidak tersedia — coba lagi
          </div>
        )}

        <div className="mt-3 grid gap-3 max-h-[420px] overflow-y-auto pr-1" aria-live="polite">
          {loading ? (
            <>
              <div className="vsf-skeleton h-[64px] w-[70%] justify-self-end rounded-2xl" />
              <div className="vsf-skeleton h-[64px] w-[75%] rounded-2xl" />
            </>
          ) : (
            pesan.map((m, i) => (
              <div key={i} className={clsx('flex', m.dari === 'ANDA' ? 'justify-end' : 'justify-start')}>
                <div
                  className={clsx(
                    'max-w-[80%] rounded-2xl px-4 py-2 text-[13px]',
                    m.dari === 'ANDA'
                      ? 'bg-activePill text-white rounded-br-md'
                      : 'bg-arutmin-mint/40 text-slate-800 rounded-bl-md border border-arutmin-border',
                  )}
                >
                  <div className={clsx('text-[10px] font-bold tracking-[.12em] uppercase mb-1', m.dari === 'ANDA' ? 'text-white/70' : 'text-arutmin-forest/70')}>
                    {m.dari}
                  </div>
                  <div>{m.teks}</div>
                  <div className={clsx('mt-1 text-[10px]', m.dari === 'ANDA' ? 'text-white/70' : 'text-slate-500')}>{m.waktu}</div>
                </div>
              </div>
            ))
          )}

          {(mengetik || loading) && (
            <div className="flex items-center gap-2 text-[12px] text-slate-500" role="status">
              <span className="vsf-dot text-arutmin-moss">●</span> Asisten AI sedang mengetik…
            </div>
          )}
        </div>

        {/* Quick prompts */}
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              disabled={offline || loading}
              onClick={() => kirim(q.replace('✦ ', ''))}
              className="vsf-pill border-arutmin-border bg-white text-slate-700 hover:border-arutmin-moss/60 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <form className="mt-3 flex gap-2" onSubmit={onSubmit}>
          <input
            className="vsf-input flex-1"
            placeholder="Tanyakan kondisi kebun…"
            value={input}
            disabled={offline || loading}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Tanyakan kondisi kebun"
          />
          <button type="submit" className="vsf-btn-primary" disabled={offline || loading || mengetik}>
            Kirim ➤
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-slate-600">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={sSensor} onChange={(e) => setSSensor(e.target.checked)} />
            Sertakan data sensor
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={sRiwayat} onChange={(e) => setSRiwayat(e.target.checked)} />
            Sertakan riwayat tanam
          </label>
        </div>
      </section>
    </div>
  )
}
