import { useCallback, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { api } from '../../lib/api'
import { useApiError } from '../../lib/crudApi'
import { tglJam } from '../../lib/format'
import { Ikon } from '../Ikon'

/**
 * Analisis AI harian (07.00 WIB) — GET /api/ai/analisis-harian[/terbaru|/:tanggal], POST /jalankan (admin).
 * Laporan deterministik dari server; hanya rekomendasi, tidak menjalankan alat.
 */
export type Bagian = { judul: string; butir: string[] }
export type Laporan = {
  id: number
  tanggal: string
  pemicu: 'jadwal' | 'manual'
  diperbarui_pada: string
  isi: { judul: string; prioritas: string; ringkasan_utama: string; bagian: Bagian[] }
}
type Ringkas = { id: number; tanggal: string; judul: string; prioritas: string }

const URL = '/api/ai/analisis-harian'
const GAYA: Record<string, string> = {
  tinggi: 'vsf-tone-error',
  sedang: 'vsf-tone-warn',
  rendah: 'border-arutmin-moss/50 bg-arutmin-mint/40 text-arutmin-forest',
}

function Pita({ prioritas }: { prioritas: string }) {
  return (
    <span className={clsx('vsf-pill border px-2 py-0.5 text-[12px] font-bold uppercase tracking-[.1em]', GAYA[prioritas] ?? GAYA.rendah)}>
      Prioritas {prioritas}
    </span>
  )
}

function IsiLaporan({ lap }: { lap: Laporan }) {
  return (
    <article className="vsf-card grid gap-4 px-4 py-4">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Pita prioritas={lap.isi.prioritas} />
          <span className="text-[12px] text-abu">
            {lap.pemicu === 'jadwal' ? 'Terjadwal 07.00 WIB' : 'Dijalankan manual'} · {tglJam(lap.diperbarui_pada)}
          </span>
        </div>
        <h2 className="font-display text-[20px] font-bold leading-tight text-tinta">{lap.isi.judul}</h2>
        <p className="text-[14px] leading-relaxed text-tinta">{lap.isi.ringkasan_utama}</p>
      </header>
      {lap.isi.bagian.map((b) => (
        <section key={b.judul} aria-label={b.judul}>
          <h3 className="text-[12px] font-bold uppercase tracking-[.1em] text-abu">{b.judul}</h3>
          <ul className="mt-1.5 grid gap-1 text-[14px] leading-relaxed text-tinta">
            {b.butir.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </section>
      ))}
      <p className="text-[12px] text-abu">Rekomendasi saja — analisis ini tidak menjalankan alat apa pun.</p>
    </article>
  )
}

export function AnalisisHarian({ admin, onDilihat }: { admin: boolean; onDilihat: (id: number) => void }) {
  const handleApiError = useApiError()
  const [daftar, setDaftar] = useState<Ringkas[]>([])
  const [lap, setLap] = useState<Laporan | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [menjalankan, setMenjalankan] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  // callback induk & penangan galat bisa berganti tiap render: simpan di ref agar muat() stabil (tanpa muat ulang berulang)
  const cb = useRef({ handleApiError, onDilihat })
  useEffect(() => { cb.current = { handleApiError, onDilihat } })

  const muat = useCallback(async (tanggal?: string) => {
    setMemuat(true)
    setGalat(null)
    try {
      const [l, d] = await Promise.all([
        api.get<{ data: Laporan | null }>(tanggal ? `${URL}/${tanggal}` : `${URL}/terbaru`),
        api.get<{ data: Ringkas[] }>(URL),
      ])
      setLap(l.data.data)
      setDaftar(d.data.data)
      if (!tanggal && l.data.data) cb.current.onDilihat(l.data.data.id)
    } catch (e) {
      setGalat(cb.current.handleApiError(e).message)
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => { void muat() }, [muat])

  async function jalankan() {
    setMenjalankan(true)
    setGalat(null)
    try {
      await api.post(`${URL}/jalankan`)
      await muat()
    } catch (e) {
      setGalat(handleApiError(e).message)
    } finally {
      setMenjalankan(false)
    }
  }

  return (
    <section aria-label="Analisis harian" className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="vsf-analisis-tanggal" className="text-[13px] font-semibold text-tinta">Tanggal</label>
        <select
          id="vsf-analisis-tanggal"
          className="vsf-input min-h-[40px] text-[14px]"
          value={lap?.tanggal ?? ''}
          disabled={!daftar.length || memuat}
          onChange={(e) => void muat(e.target.value)}
        >
          {!daftar.length && <option value="">Belum ada</option>}
          {daftar.map((d) => <option key={d.id} value={d.tanggal}>{d.tanggal} · {d.prioritas}</option>)}
        </select>
        <span className="flex-1" />
        {admin && (
          <button type="button" className="vsf-btn-secondary vsf-btn-kecil" disabled={menjalankan} onClick={() => void jalankan()}>
            <Ikon nama="ai" className="h-3.5 w-3.5" />
            {menjalankan ? 'Menganalisis…' : 'Jalankan sekarang'}
          </button>
        )}
      </div>
      {galat && <p role="alert" className="vsf-tone-error rounded-xl px-3 py-2 text-[13px]">{galat}</p>}
      {memuat && !lap && <p className="text-[13px] text-abu">Memuat analisis…</p>}
      {!memuat && !lap && !galat && (
        <p className="vsf-card px-4 py-5 text-center text-[14px] text-abu">
          Belum ada analisis. Analisis otomatis dibuat setiap pukul 07.00 WIB.
        </p>
      )}
      {lap && <IsiLaporan lap={lap} />}
    </section>
  )
}
