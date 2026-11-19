import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { useApiError } from '../../lib/crudApi'
import { formatSel, unduhBerkas } from '../../lib/aktivitas'
import { tanggalIso } from '../../lib/format'
import { Ikon } from '../Ikon'
import { Pesan } from '../kaca/DialogKaca'

export type JenisLaporan = 'batch' | 'sensor' | 'dosing' | 'peringatan' | 'kalibrasi'

type Lap = {
  judul: string
  catatan?: string
  kolom: { kunci: string; label: string }[]
  baris: Record<string, unknown>[]
  terpotong?: boolean
  maks_hari?: number
}

const PRESET = [
  { nama: '7 hari', hari: 7 },
  { nama: '30 hari', hari: 30 },
  { nama: '90 hari', hari: 90 },
] as const

const kemarin = (hari: number) => tanggalIso(Date.now() - hari * 86_400_000)

/** Satu laporan tabel dari GET /laporan/{jenis}: rentang tanggal (maks 92 hari) + ekspor CSV. */
export function LaporanTabel({ jenis, penjelasan }: { jenis: JenisLaporan; penjelasan: string }) {
  const handleApiError = useApiError()
  const [dari, setDari] = useState(kemarin(30))
  const [sampai, setSampai] = useState(tanggalIso(Date.now()))
  const [terpakai, setTerpakai] = useState({ dari: kemarin(30), sampai: tanggalIso(Date.now()), n: 0 })
  const [lap, setLap] = useState<Lap | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)
  const [mengunduh, setMengunduh] = useState(false)

  useEffect(() => {
    let batal = false
    void (async () => {
      try {
        const res = await api.get(`/laporan/${jenis}`, { params: { dari: terpakai.dari || undefined, sampai: terpakai.sampai || undefined } })
        if (batal) return
        setLap(res.data as Lap)
        setGalat(null)
      } catch (err) {
        if (!batal) setGalat(handleApiError(err).message)
      } finally {
        if (!batal) setMemuat(false)
      }
    })()
    return () => { batal = true }
  }, [jenis, terpakai, handleApiError])

  function terapkan(e: FormEvent) {
    e.preventDefault()
    setMemuat(true)
    setTerpakai((f) => ({ dari: dari.trim(), sampai: sampai.trim(), n: f.n + 1 }))
  }
  function pilih(hari: number) {
    const r = { dari: kemarin(hari), sampai: tanggalIso(Date.now()) }
    setDari(r.dari)
    setSampai(r.sampai)
    setMemuat(true)
    setTerpakai((f) => ({ ...r, n: f.n + 1 }))
  }
  async function unduh() {
    setMengunduh(true)
    setGalat(null)
    try {
      await unduhBerkas(`/laporan/${jenis}`, { dari: terpakai.dari || undefined, sampai: terpakai.sampai || undefined, format: 'csv' }, `laporan-${jenis}.csv`)
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Gagal mengunduh CSV.')
    } finally {
      setMengunduh(false)
    }
  }

  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label={lap?.judul ?? 'Laporan'}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <div className="vsf-judul-bagian">{lap?.judul ?? 'Laporan'}</div>
          <p className="mt-0.5 text-[12.5px] text-abu">{penjelasan}</p>
        </div>
        <span className="flex-1" />
        <button type="button" className="vsf-btn-primary" disabled={memuat || !lap?.baris.length || mengunduh} onClick={() => void unduh()}>
          <Ikon nama="unduh" className="h-4 w-4" />
          {mengunduh ? 'Menyiapkan…' : 'Unduh CSV'}
        </button>
      </div>

      <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={terapkan}>
        {PRESET.map((p) => (
          <button key={p.nama} type="button" className="vsf-btn-secondary" onClick={() => pilih(p.hari)}>{p.nama}</button>
        ))}
        <input type="date" className="vsf-input w-[165px]" aria-label="Dari tanggal" value={dari} onChange={(e) => setDari(e.target.value)} />
        <span className="text-abu">s/d</span>
        <input type="date" className="vsf-input w-[165px]" aria-label="Sampai tanggal" value={sampai} onChange={(e) => setSampai(e.target.value)} />
        <button type="submit" className="vsf-btn-secondary">Terapkan</button>
      </form>

      {lap?.terpotong && <Pesan jenis="ok">Rentang dibatasi {lap.maks_hari} hari terakhir supaya laporan tetap cepat.</Pesan>}
      {lap?.catatan && <p className="mt-2 text-[12px] text-abu">{lap.catatan}</p>}
      {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}

      {memuat ? (
        <div className="mt-3 grid gap-2" role="status" aria-label="Memuat laporan">
          {[0, 1, 2].map((i) => <div key={i} className="vsf-skeleton h-[40px] rounded-card" />)}
        </div>
      ) : !lap || lap.baris.length === 0 ? (
        <div className="mt-3 rounded-card border border-dashed border-arutmin-border p-8 text-center text-[13px] text-abu">
          Tidak ada data pada rentang ini.
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-wide text-abu">
                {lap.kolom.map((k) => <th key={k.kunci} className="whitespace-nowrap px-2 py-2 font-semibold">{k.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {lap.baris.map((b, i) => (
                <tr key={i} className="border-t border-black/5">
                  {lap.kolom.map((k) => <td key={k.kunci} className="whitespace-nowrap px-2 py-1.5 tabular-nums text-tinta">{formatSel(b[k.kunci])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[12px] text-abu">{lap.baris.length} baris</p>
        </div>
      )}
    </section>
  )
}
