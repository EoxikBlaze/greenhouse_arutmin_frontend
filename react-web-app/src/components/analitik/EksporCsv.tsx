import { useState } from 'react'
import { unduhCsv, type JenisEkspor } from '../../lib/analitik'
import { Ikon } from '../Ikon'

const TOMBOL: { jenis: JenisEkspor; label: string }[] = [
  { jenis: 'sensor', label: 'Data sensor' },
  { jenis: 'peringatan', label: 'Peringatan' },
  { jenis: 'panen', label: 'Panen' },
]

/** Ekspor CSV mentah dari server (GET /api/analitik/ekspor/{jenis}.csv?dari&sampai). */
export function EksporCsv() {
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [proses, setProses] = useState<JenisEkspor | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  async function unduh(jenis: JenisEkspor) {
    setProses(jenis)
    setGalat(null)
    try {
      await unduhCsv(jenis, dari, sampai)
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Gagal mengunduh CSV.')
    } finally {
      setProses(null)
    }
  }

  return (
    <section className="vsf-card p-4 sm:p-5" aria-label="Ekspor CSV">
      <div className="vsf-judul-bagian">Ekspor CSV</div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="vsf-label">Dari</span>
          <input type="date" className="vsf-input mt-1 block w-[170px]" value={dari} onChange={(e) => setDari(e.target.value)} aria-label="Ekspor dari tanggal" />
        </label>
        <label className="block">
          <span className="vsf-label">Sampai</span>
          <input type="date" className="vsf-input mt-1 block w-[170px]" value={sampai} onChange={(e) => setSampai(e.target.value)} aria-label="Ekspor sampai tanggal" />
        </label>
        {TOMBOL.map((t) => (
          <button key={t.jenis} type="button" className="vsf-btn-secondary" disabled={proses !== null} onClick={() => void unduh(t.jenis)}>
            <Ikon nama="unduh" className="h-4 w-4" />
            {proses === t.jenis ? 'Menyiapkan…' : t.label}
          </button>
        ))}
      </div>
      <div className="mt-2 text-[12px] text-slate-500">Tanggal kosong = rentang bawaan server.</div>
      {galat && (
        <div role="alert" className="mt-2 text-[13px] text-red-700">
          {galat}
        </div>
      )}
    </section>
  )
}
