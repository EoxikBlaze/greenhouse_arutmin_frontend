import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/authContext'
import { useApiError } from '../../lib/crudApi'
import { tglPendek } from '../../lib/format'
import { Pesan } from '../kaca/DialogKaca'
import {
  KATEGORI_BAWAAN,
  KATEGORI_UJI,
  susunHasil,
  titikGrafik,
  type HasilUjiLab,
  type KategoriUji,
  type SpekUjiLab,
} from '../../lib/ujiLab'

/** Grafik garis sederhana (SVG murni) untuk satu parameter. */
function GrafikGaris({ titik, satuan }: { titik: Array<{ tanggal: string; nilai: number }>; satuan: string }) {
  if (titik.length < 2) return <p className="text-[12.5px] text-abu">Grafik muncul setelah ada minimal 2 hasil untuk parameter ini.</p>
  const W = 320
  const H = 110
  const nilai = titik.map((t) => t.nilai)
  const lo = Math.min(...nilai)
  const hi = Math.max(...nilai)
  const rentang = hi - lo || 1
  const xy = titik.map((t, i) => [8 + (i * (W - 16)) / (titik.length - 1), H - 14 - ((t.nilai - lo) / rentang) * (H - 28)] as const)
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grafik hasil uji lab" className="h-[110px] w-full">
        <polyline points={xy.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" className="text-arutmin-forest" />
        {xy.map(([x, y], i) => (<circle key={titik[i].tanggal + i} cx={x} cy={y} r="3" className="fill-arutmin-forest" />))}
      </svg>
      <figcaption className="mt-1 text-[11.5px] text-abu">
        {titik[0].tanggal} → {titik[titik.length - 1].tanggal} · terendah {lo} {satuan}, tertinggi {hi} {satuan}
      </figcaption>
    </figure>
  )
}

/** Tab Uji Lab di halaman Data: opsi Buah/Sayur, form per kategori, riwayat + filter, grafik. */
export function PanelUjiLabHasil() {
  const { role } = useAuth()
  const bolehUbah = role === 'admin'
  const handleApiError = useApiError()
  const [kategori, setKategori] = useState<KategoriUji>(KATEGORI_BAWAAN)
  const [spek, setSpek] = useState<SpekUjiLab | null>(null)
  const [daftar, setDaftar] = useState<HasilUjiLab[]>([])
  const [isian, setIsian] = useState<Record<string, string>>({})
  const [tanggal, setTanggal] = useState('')
  const [catatan, setCatatan] = useState('')
  const [paramGrafik, setParamGrafik] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  const muat = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([api.get('/uji-lab/parameter'), api.get('/uji-lab', { params: { kategori, limit: 200 } })])
      setSpek(s.data?.data as SpekUjiLab)
      setDaftar((d.data?.data ?? []) as HasilUjiLab[])
    } catch (e) {
      setGalat(handleApiError(e).message)
    }
  }, [kategori, handleApiError])

  useEffect(() => {
    void muat()
  }, [muat])

  const spekKategori = spek?.[kategori] ?? {}
  const kodeGrafik = paramGrafik && spekKategori[paramGrafik] ? paramGrafik : Object.keys(spekKategori)[0] ?? ''
  const titik = useMemo(() => titikGrafik(daftar, kodeGrafik), [daftar, kodeGrafik])

  function pilihKategori(k: KategoriUji) {
    setKategori(k)
    setIsian({})
    setParamGrafik('')
    setPesan(null)
    setGalat(null)
  }

  async function simpan() {
    const { hasil, galat: g } = susunHasil(spekKategori, isian)
    if (g) return setGalat(g)
    setSibuk(true)
    setGalat(null)
    try {
      const res = await api.post('/uji-lab', { kategori, hasil, ...(tanggal ? { tanggal } : {}), ...(catatan.trim() ? { catatan: catatan.trim() } : {}) })
      setPesan(String(res.data?.message ?? 'Tersimpan.'))
      setIsian({})
      setCatatan('')
      await muat()
    } catch (e) {
      setGalat(handleApiError(e).message)
    } finally {
      setSibuk(false)
    }
  }

  async function hapus(id: number | string) {
    try {
      await api.delete(`/uji-lab/${id}`)
      await muat()
    } catch (e) {
      setGalat(handleApiError(e).message)
    }
  }

  return (
    <div className="grid gap-4">
      <div role="tablist" aria-label="Kategori uji lab" className="flex gap-2">
        {KATEGORI_UJI.map((k) => (
          <button
            key={k.kode}
            type="button"
            role="tab"
            aria-selected={kategori === k.kode}
            onClick={() => pilihKategori(k.kode)}
            className={kategori === k.kode ? 'vsf-btn-primary' : 'vsf-btn-secondary'}
          >
            {k.nama}{k.kode === KATEGORI_BAWAAN ? ' (Melon)' : ''}
          </button>
        ))}
      </div>
      {pesan && <Pesan jenis="ok" onTutup={() => setPesan(null)}>{pesan}</Pesan>}
      {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="vsf-card min-w-0 p-4 sm:p-5 lg:col-span-5" aria-label={`Input hasil uji lab ${kategori}`}>
          <div className="vsf-judul-bagian">Input hasil lab — {kategori === 'buah' ? 'Buah' : 'Sayur'}</div>
          <form className="mt-3 grid gap-3" onSubmit={(e) => { e.preventDefault(); void simpan() }}>
            <label className="block">
              <span className="vsf-label vsf-label-tinta">Tanggal uji</span>
              <input type="date" className="vsf-input mt-1 w-full" disabled={!bolehUbah} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </label>
            {Object.entries(spekKategori).map(([kode, s]) => (
              <label key={kode} className="block">
                <span className="vsf-label vsf-label-tinta">{s.nama}{s.satuan ? ` (${s.satuan})` : ''}</span>
                <input
                  type="number" inputMode="decimal" step="any" min={s.min} max={s.max}
                  className="vsf-input mt-1 w-full" disabled={!bolehUbah}
                  value={isian[kode] ?? ''} onChange={(e) => setIsian((x) => ({ ...x, [kode]: e.target.value }))}
                />
              </label>
            ))}
            <label className="block">
              <span className="vsf-label vsf-label-tinta">Catatan</span>
              <input type="text" maxLength={500} className="vsf-input mt-1 w-full" disabled={!bolehUbah} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </label>
            {bolehUbah ? (
              <button type="submit" className="vsf-btn-primary" disabled={sibuk}>{sibuk && <span className="vsf-spinner" aria-hidden />}Simpan hasil</button>
            ) : (
              <p className="text-[12.5px] text-abu">Hanya admin yang dapat menyimpan hasil.</p>
            )}
          </form>
        </section>

        <div className="grid min-w-0 content-start gap-4 lg:col-span-7">
          <section className="vsf-card p-4 sm:p-5" aria-label="Grafik hasil uji lab">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="vsf-judul-bagian">Grafik</div>
              <select className="vsf-input" aria-label="Parameter grafik" value={kodeGrafik} onChange={(e) => setParamGrafik(e.target.value)}>
                {Object.entries(spekKategori).map(([kode, s]) => (<option key={kode} value={kode}>{s.nama}</option>))}
              </select>
            </div>
            <div className="mt-3"><GrafikGaris titik={titik} satuan={spekKategori[kodeGrafik]?.satuan ?? ''} /></div>
          </section>

          <section className="vsf-card p-4 sm:p-5" aria-label="Riwayat uji lab">
            <div className="vsf-judul-bagian">Riwayat ({kategori === 'buah' ? 'Buah' : 'Sayur'})</div>
            {daftar.length === 0 ? (
              <div className="vsf-blok mt-3 px-4 py-6 text-center text-[13px] text-abu">Belum ada hasil uji lab.</div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[12.5px]">
                  <thead><tr className="text-abu"><th className="py-1 pr-3">Tanggal</th><th className="pr-3">Parameter</th><th className="pr-3">Nilai</th><th>Catatan</th><th /></tr></thead>
                  <tbody>
                    {daftar.slice(0, 50).map((h) => (
                      <tr key={String(h.id)} className="border-t border-garis">
                        <td className="py-1.5 pr-3">{tglPendek(h.tanggal)}</td>
                        <td className="pr-3">{spekKategori[h.parameter]?.nama ?? h.parameter}</td>
                        <td className="pr-3 font-semibold tabular-nums">{h.nilai} {h.satuan ?? ''}</td>
                        <td className="text-abu">{h.catatan ?? ''}</td>
                        <td className="text-right">{bolehUbah && <button type="button" className="font-semibold text-red-700 underline" aria-label={`Hapus hasil ${h.parameter} ${h.tanggal}`} onClick={() => void hapus(h.id)}>Hapus</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
