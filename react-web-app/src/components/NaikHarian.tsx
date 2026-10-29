import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { fieldError, useApiError } from '../lib/crudApi'
import { useApiObject } from '../lib/useApiObject'
import { useDialog } from '../lib/useDialog'
import { kenaikanPerHari } from '../lib/kebun'
import { Ikon } from './Ikon'
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
/** 2400 → "2.400", 33.333 → "33,3" */
const tampil = (v: number) => v.toLocaleString('id-ID', { maximumFractionDigits: 1 })

/** Kolom angka dengan satuan di dalam kolom. */
function KolomAngka({
  label,
  satuan,
  value,
  onChange,
  placeholder,
  autoFocus,
  galat,
}: {
  label: string
  satuan: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoFocus?: boolean
  galat?: string
}) {
  return (
    <label className="mt-3 block">
      <span className="vsf-label !text-tinta">{label}</span>
      <span className="relative mt-1 block">
        <input
          className="vsf-input w-full pr-14"
          inputMode="numeric"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={galat ? true : undefined}
        />
        <span className="vsf-suffix">{satuan}</span>
      </span>
      {galat && <div className="vsf-field-error">{galat}</div>}
    </label>
  )
}

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
  const [info, setInfo] = useState(false)

  const { dialogRef, onKeyDown, backdropProps, closing, handleClose } = useDialog({
    open: ubah !== null,
    onClose: () => setUbah(null),
    closeDisabled: sibuk,
  })

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
    setGalat(null)
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
  const perHari = kenaikanPerHari(pa, pt, angka(hari))
  const targetLewat = pt != null && maksAmbang != null && pt > maksAmbang

  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="vsf-judul-bagian">Target nutrisi harian</div>
          <p className="mt-0.5 text-[13px] text-abu">Naikkan ppm penampung sedikit tiap hari sampai target akhir.</p>
        </div>
        <button
          type="button"
          className="vsf-chrome-tautan !min-h-[40px] !min-w-[40px] shrink-0 justify-center"
          aria-expanded={info}
          aria-controls="vsf-naik-info"
          aria-label="Cara kerja target nutrisi"
          onClick={() => setInfo((v) => !v)}
        >
          <Ikon nama="info" />
        </button>
      </div>
      {info && (
        <p id="vsf-naik-info" className="mt-3 max-w-[760px] text-[13px] leading-relaxed text-abu">
          Cukup isi <b className="text-tinta">target akhir</b> tiap tanaman. Mulai hari pindah netpot (tahap Peremajaan) target ppm
          penampung naik sedikit tiap hari dari ppm awal sampai target akhir, lalu ditahan sampai panen. Tahap Semai tetap memakai
          preset. pH tetap dari preset.
        </p>
      )}

      {pesan && (
        <div role="status" className="vsf-banner mt-3 rounded-input border border-arutmin-moss/50 bg-arutmin-mint/40 px-3 py-2 text-[13px] text-arutmin-forest">
          {pesan}
        </div>
      )}
      {(galat || (error && !loading)) && !ubah && (
        <div role="alert" className="vsf-banner vsf-tone-error mt-3 rounded-input px-3 py-2 text-[13px]">
          {galat ?? error}
        </div>
      )}

      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && rows.length === 0 && <li className="vsf-skeleton h-[112px] rounded-card" />}
        {rows.map((r) => {
          const aktif = r.ppm_target != null
          const lewatAmbang = aktif && maksAmbang != null && Number(r.ppm_target) > maksAmbang
          return (
            <li key={String(r.id_tanaman)} className="vsf-batch">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-bold text-tinta">{r.nama_tanaman}</div>
                  {aktif ? (
                    <>
                      <div className="mt-1 text-[15px] font-semibold tabular-nums text-tinta">
                        {tampil(Number(r.ppm_awal))} → {tampil(Number(r.ppm_target))} <span className="text-[12px] font-normal text-abu">ppm</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="vsf-chip-nilai is-normal">{r.hari_capai} hari</span>
                        <span className="vsf-chip-nilai is-normal">+{r.per_hari == null ? '—' : tampil(r.per_hari)} ppm/hari</span>
                      </div>
                    </>
                  ) : (
                    <div className="mt-1 text-[13px] text-abu">
                      Belum diatur — memakai preset per tahap.
                    </div>
                  )}
                </div>
                {bolehTulis && (
                  <button type="button" className="vsf-btn-secondary !min-h-[40px] shrink-0 !px-3 text-[13px]" onClick={() => buka(r)}>
                    <Ikon nama="ubah" className="h-4 w-4" />
                    {aktif ? 'Ubah' : 'Atur'}
                  </button>
                )}
              </div>
              {lewatAmbang && (
                <div className="vsf-tone-warn mt-3 rounded-input px-2.5 py-1.5 text-[12px]">
                  Ambang alert TDS saat ini {maksAmbang} ppm — alert "di luar batas" akan muncul.{' '}
                  {role === 'petani' ? 'Minta admin menaikkan ambang TDS.' : 'Naikkan ambang TDS di menu Ambang.'}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {ubah && (
        <ModalBackdrop onMouseDown={backdropProps.onMouseDown} closing={closing}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vsf-naik-judul"
            className={clsx('vsf-modal-card w-full max-w-[440px] rounded-card bg-white p-5 sm:p-6', closing && 'is-closing')}
            onKeyDown={onKeyDown}
          >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void simpan()
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="vsf-naik-judul" data-dialog-title tabIndex={-1} className="font-heading text-[20px] font-bold text-tinta outline-none">
                  Atur target nutrisi
                </h2>
                <p className="mt-0.5 text-[13px] text-abu">{ubah.nama_tanaman}</p>
              </div>
              <button
                type="button"
                className="vsf-chrome-tautan !min-h-[40px] !min-w-[40px] justify-center"
                aria-label="Tutup"
                disabled={sibuk}
                onClick={handleClose}
              >
                <Ikon nama="tutup" />
              </button>
            </div>

            {galat && (
              <div role="alert" className="vsf-banner vsf-tone-error mt-3 rounded-input px-3 py-2 text-[13px]">
                {galat}
              </div>
            )}

            <KolomAngka label="Target akhir" satuan="ppm" value={target} onChange={setTarget} placeholder="2400" autoFocus galat={fieldError(errs, 'ppm_target')} />
            <KolomAngka label="Dicapai dalam (hari sejak pindah netpot)" satuan="hari" value={hari} onChange={setHari} placeholder="60" galat={fieldError(errs, 'hari_capai')} />
            <KolomAngka label="ppm awal saat pindah netpot" satuan="ppm" value={awal} onChange={setAwal} placeholder="400" galat={fieldError(errs, 'ppm_awal')} />

            <div className={clsx('vsf-ringkasan-form mt-4', perHari == null && 'is-kosong')} aria-live="polite">
              <Ikon nama="tetes" className="h-4 w-4" />
              <span>
                {perHari == null
                  ? 'Isi ketiga angka untuk melihat kenaikan per hari.'
                  : `Naik ±${tampil(perHari)} ppm per hari, dari ${tampil(pa ?? 0)} ke ${tampil(pt ?? 0)} ppm.`}
              </span>
            </div>
            {targetLewat && (
              <div className="vsf-tone-warn mt-2 rounded-input px-3 py-2 text-[12px]" role="status">
                Target di atas ambang alert TDS ({tampil(maksAmbang ?? 0)} ppm) — alert "di luar batas" akan muncul.
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {ubah.ppm_target != null && (
                <button type="button" className="vsf-btn-secondary mr-auto !text-arutmin-error" onClick={() => void simpan(true)} disabled={sibuk}>
                  Matikan target
                </button>
              )}
              <button type="button" className="vsf-btn-secondary" onClick={handleClose} disabled={sibuk}>
                Batal
              </button>
              <button type="submit" className="vsf-btn-primary" disabled={sibuk}>
                {sibuk && <span className="vsf-spinner" aria-hidden />}
                {sibuk ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
          </div>
        </ModalBackdrop>
      )}
    </section>
  )
}
