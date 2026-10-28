import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { fieldError, useApiError } from '../lib/crudApi'
import { useApiObject } from '../lib/useApiObject'
import { ModalBackdrop } from './ModalBackdrop'

/**
 * Target nutrisi NAIK HARIAN per jenis tanaman — routes/preset.js:
 *   GET /dosing/naik-harian · PUT /dosing/naik-harian/:id_tanaman { ppm_awal, ppm_target, hari_capai }
 * Sejak pindah netpot (mulai Peremajaan) target ppm penampung naik rata tiap hari dari ppm awal sampai
 * target akhir, lalu ditahan sampai panen. Admin & petani boleh mengubah; demo hanya melihat.
 */

type Baris = {
  id_tanaman: number | string
  nama_tanaman: string
  ppm_awal: string | number | null
  ppm_target: string | number | null
  hari_capai: number | null
  per_hari: number | null
}
type Respon = { data: Baris[]; ambang_tds: { min: number; max: number } | null; batas: [number, number] }

const angka = (v: unknown) => (v == null || v === '' ? null : Number(v))
const tampil = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',')

export function NaikHarian() {
  const { role } = useAuth()
  const bolehTulis = role === 'admin' || role === 'petani'
  const handleApiError = useApiError()
  const { data, loading, error, reload } = useApiObject<Respon>('/dosing/naik-harian')
  const [ubah, setUbah] = useState<Baris | null>(null)
  const [awal, setAwal] = useState('')
  const [target, setTarget] = useState('')
  const [hari, setHari] = useState('')
  const [errs, setErrs] = useState<Record<string, string[]>>({})
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 4000)
    return () => window.clearTimeout(id)
  }, [pesan])

  const rows = data?.data ?? []
  const maksAmbang = data?.ambang_tds?.max ?? null

  function buka(r: Baris) {
    setUbah(r)
    setAwal(r.ppm_awal == null ? '400' : String(Number(r.ppm_awal)))
    setTarget(r.ppm_target == null ? '' : String(Number(r.ppm_target)))
    setHari(r.hari_capai == null ? '' : String(r.hari_capai))
    setErrs({})
  }

  async function simpan(matikan = false) {
    if (!ubah) return
    setSibuk(true)
    setGalat(null)
    try {
      const body = matikan
        ? { ppm_awal: null, ppm_target: null, hari_capai: null }
        : { ppm_awal: angka(awal.replace(',', '.')), ppm_target: angka(target.replace(',', '.')), hari_capai: angka(hari) }
      const r = await api.put(`/dosing/naik-harian/${ubah.id_tanaman}`, body)
      setPesan((r.data as { message?: string }).message ?? 'Tersimpan.')
      setUbah(null)
      reload()
    } catch (e) {
      const f = handleApiError(e)
      setErrs(f.fieldErrors)
      if (!Object.keys(f.fieldErrors).length) setGalat(f.message)
    } finally {
      setSibuk(false)
    }
  }

  // pratinjau di form: kenaikan per hari & peringatan ambang alert
  const pa = angka(awal.replace(',', '.'))
  const pt = angka(target.replace(',', '.'))
  const ph = angka(hari)
  const perHari = pa != null && pt != null && ph && ph > 0 && pt >= pa ? (pt - pa) / ph : null

  return (
    <section className="vsf-card w-full min-w-0 p-4">
      <div className="min-w-0 max-w-[760px]">
        <div className="text-[12px] uppercase tracking-[.14em] text-slate-500 font-bold">Target nutrisi naik harian</div>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
          Cukup isi <b>target akhir</b> tiap tanaman. Mulai hari pindah netpot (tahap Peremajaan) target ppm penampung
          naik sedikit tiap hari dari ppm awal sampai target akhir, lalu ditahan sampai panen. Tahap Semai tetap
          memakai preset. pH tetap dari preset.
        </p>
      </div>

      {pesan && <div role="status" className="vsf-banner mt-3 rounded-input border border-arutmin-moss/50 bg-arutmin-mint/40 px-3 py-2 text-[13px] text-arutmin-forest">{pesan}</div>}
      {(galat || (error && !loading)) && <div role="alert" className="vsf-banner mt-3 rounded-input vsf-tone-error px-3 py-2 text-[13px]">{galat ?? error}</div>}

      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {loading && rows.length === 0 && <li className="vsf-skeleton h-[88px] rounded-card" />}
        {rows.map((r) => {
          const aktif = r.ppm_target != null
          const lewatAmbang = aktif && maksAmbang != null && Number(r.ppm_target) > maksAmbang
          return (
            <li key={String(r.id_tanaman)} className="rounded-card border border-arutmin-border bg-white p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900">{r.nama_tanaman}</div>
                  {aktif ? (
                    <div className="mt-0.5 text-[13px] text-slate-700">
                      <span className="tabular-nums font-semibold">{tampil(Number(r.ppm_awal))} → {tampil(Number(r.ppm_target))} ppm</span>
                      <div className="text-[12px] text-slate-600">
                        {r.hari_capai} hari · naik ±{r.per_hari == null ? '—' : tampil(r.per_hari)} ppm/hari
                      </div>
                    </div>
                  ) : (
                    <div className="mt-0.5 text-[12.5px] text-slate-500">Belum diatur — memakai preset per tahap.</div>
                  )}
                </div>
                {bolehTulis && (
                  <button type="button" className="vsf-btn-secondary min-h-[44px] sm:min-h-[36px] px-3 py-1 text-[13px]" onClick={() => buka(r)}>
                    {aktif ? 'Ubah' : 'Atur'}
                  </button>
                )}
              </div>
              {lewatAmbang && (
                <div className="mt-2 rounded-input bg-amber-50 px-2 py-1 text-[12px] text-amber-800">
                  Ambang alert TDS saat ini {maksAmbang} ppm — alert "di luar batas" akan muncul.{' '}
                  {role === 'petani' ? 'Minta admin menaikkan ambang TDS.' : 'Naikkan ambang TDS di menu Ambang.'}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {ubah && (
        <ModalBackdrop onMouseDown={(e) => { if (e.target === e.currentTarget && !sibuk) setUbah(null) }}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="vsf-naik-judul"
            className="w-full max-w-[420px] rounded-card bg-white p-5 vsf-modal-card"
            onSubmit={(e) => { e.preventDefault(); void simpan() }}
            onKeyDown={(e) => { if (e.key === 'Escape' && !sibuk) setUbah(null) }}
          >
            <div id="vsf-naik-judul" className="text-[12px] uppercase tracking-[.14em] font-bold text-slate-500">Naik harian · {ubah.nama_tanaman}</div>
            <label className="mt-3 block text-[13px] font-semibold text-slate-700">
              Target akhir (ppm)
              <input className="vsf-input mt-1 w-full" inputMode="numeric" value={target} autoFocus onChange={(e) => setTarget(e.target.value)} placeholder="2400" />
            </label>
            {fieldError(errs, 'ppm_target') && <div className="vsf-field-error">{fieldError(errs, 'ppm_target')}</div>}
            <label className="mt-3 block text-[13px] font-semibold text-slate-700">
              Dicapai dalam (hari sejak pindah netpot)
              <input className="vsf-input mt-1 w-full" inputMode="numeric" value={hari} onChange={(e) => setHari(e.target.value)} placeholder="60" />
            </label>
            {fieldError(errs, 'hari_capai') && <div className="vsf-field-error">{fieldError(errs, 'hari_capai')}</div>}
            <label className="mt-3 block text-[13px] font-semibold text-slate-700">
              ppm awal saat pindah netpot
              <input className="vsf-input mt-1 w-full" inputMode="numeric" value={awal} onChange={(e) => setAwal(e.target.value)} placeholder="400" />
            </label>
            {fieldError(errs, 'ppm_awal') && <div className="vsf-field-error">{fieldError(errs, 'ppm_awal')}</div>}
            <p className="mt-3 rounded-input bg-navy/[.04] px-3 py-2 text-[13px] text-slate-700" aria-live="polite">
              {perHari == null ? 'Isi ketiga angka untuk melihat kenaikan per hari.'
                : `Naik ±${tampil(perHari)} ppm per hari.`}
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {ubah.ppm_target != null && (
                <button type="button" className="vsf-btn-secondary mr-auto" onClick={() => void simpan(true)} disabled={sibuk}>Matikan</button>
              )}
              <button type="button" className="vsf-btn-secondary" onClick={() => setUbah(null)} disabled={sibuk}>Batal</button>
              <button type="submit" className="vsf-btn-primary" disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
          </form>
        </ModalBackdrop>
      )}
    </section>
  )
}
