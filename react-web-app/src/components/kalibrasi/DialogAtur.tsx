import { useState } from 'react'
import { api } from '../../lib/api'
import { fieldError, useApiError } from '../../lib/crudApi'
import { angkaIsian, type Alat } from '../../lib/kalibrasi'
import { DialogKaca, Pesan } from '../dosing/DialogKaca'
import { Isian } from './Isian'

/** Popup Atur: jadwal, standar (toleransi/referensi), dan konstanta firmware saat ini. */
export function DialogAtur({ alat, onSelesai, onTutup }: { alat: Alat; onSelesai: () => void; onTutup: () => void }) {
  const handleApiError = useApiError()
  const isi = (v: unknown) => (v == null ? '' : String(Number(v)))
  const [f, setF] = useState<Record<string, string>>({
    periode_hari_min: isi(alat.periode_hari_min), periode_hari_max: isi(alat.periode_hari_max), toleransi: isi(alat.toleransi),
    larutan_ref: alat.larutan_ref ?? '', nilai_ref: isi(alat.nilai_ref),
    ...Object.fromEntries(Object.entries(alat.konstanta ?? {}).map(([k, v]) => [`k_${k}`, String(v)])),
  })
  const [errs, setErrs] = useState<Record<string, string[]>>({})
  const [sibuk, setSibuk] = useState(false)
  const kunciKonstanta = Object.keys(alat.konstanta ?? {})
  const ubah = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }))

  async function simpan() {
    setSibuk(true)
    setErrs({})
    const body: Record<string, unknown> = {
      periode_hari_min: angkaIsian(f.periode_hari_min), periode_hari_max: angkaIsian(f.periode_hari_max), toleransi: angkaIsian(f.toleransi),
      larutan_ref: f.larutan_ref.trim() || null, nilai_ref: angkaIsian(f.nilai_ref),
    }
    if (kunciKonstanta.length) body.konstanta = Object.fromEntries(kunciKonstanta.map((k) => [k, angkaIsian(f[`k_${k}`] ?? '')]))
    try {
      await api.put(`/kalibrasi/${alat.sensor}`, body)
      onSelesai()
    } catch (e) {
      const g = handleApiError(e)
      setErrs(Object.keys(g.fieldErrors).length ? g.fieldErrors : { umum: [g.message] })
    } finally {
      setSibuk(false)
    }
  }

  return (
    <DialogKaca judul="Atur kalibrasi" sub={alat.label ?? alat.sensor} onTutup={onTutup} sibuk={sibuk} lebar={520} onSubmit={() => { void simpan() }}>
      <div className="vsf-kal-blok mt-3 p-3">
        <div className="vsf-judul-bagian">Jadwal</div>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Isian label="Kalibrasi paling cepat (hari)" value={f.periode_hari_min} onChange={ubah('periode_hari_min')} galat={fieldError(errs, 'periode_hari_min')} />
          <Isian label="Batas waktu (hari)" value={f.periode_hari_max} onChange={ubah('periode_hari_max')} galat={fieldError(errs, 'periode_hari_max')} />
        </div>
      </div>
      <div className="vsf-kal-blok mt-3 p-3">
        <div className="vsf-judul-bagian">Standar</div>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Isian label={`Toleransi${alat.satuan ? ` (${alat.satuan})` : ''}`} value={f.toleransi} onChange={ubah('toleransi')} galat={fieldError(errs, 'toleransi')} />
          <Isian label="Nilai referensi" value={f.nilai_ref} onChange={ubah('nilai_ref')} galat={fieldError(errs, 'nilai_ref')} />
          <label className="block text-[13px] font-semibold text-slate-700 sm:col-span-2">
            Larutan / alat referensi
            <input className="vsf-input mt-1 w-full" value={f.larutan_ref} onChange={(ev) => ubah('larutan_ref')(ev.target.value)} />
            {fieldError(errs, 'larutan_ref') && <span className="vsf-field-error block font-normal">{fieldError(errs, 'larutan_ref')}</span>}
          </label>
        </div>
      </div>
      {kunciKonstanta.length > 0 && (
        <div className="vsf-kal-blok mt-3 p-3">
          <div className="vsf-judul-bagian">Konstanta firmware saat ini</div>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {kunciKonstanta.map((k) => (
              <Isian key={k} label={k} value={f[`k_${k}`] ?? ''} onChange={ubah(`k_${k}`)} />
            ))}
          </div>
        </div>
      )}
      {fieldError(errs, 'konstanta') && <Pesan jenis="galat">{fieldError(errs, 'konstanta')}</Pesan>}
      {errs.umum && <Pesan jenis="galat">{errs.umum[0]}</Pesan>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="vsf-btn-secondary" onClick={onTutup} disabled={sibuk}>Batal</button>
        <button type="submit" className="vsf-btn-primary" disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan'}</button>
      </div>
    </DialogKaca>
  )
}
