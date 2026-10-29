import { useState } from 'react'
import { api } from '../../lib/api'
import { CONTOH_URL, formDari, type Form, type Kamera, type Tipe } from '../../lib/cctv'
import { fieldError, useApiError } from '../../lib/crudApi'
import { DialogKaca, Pesan } from '../kaca/DialogKaca'

import { Ikon } from '../Ikon'
import { Pilihan } from './Pilihan'

const LABEL = 'block min-w-0 text-[13px] font-semibold text-slate-700'
const OPSI_TIPE: Array<{ nilai: Tipe; teks: string }> = [
  { nilai: 'rtsp', teks: 'RTSP lewat server (EZVIZ / kamera IP)' },
  { nilai: 'snapshot', teks: 'Snapshot (JPEG dimuat ulang)' },
  { nilai: 'mjpeg', teks: 'Aliran MJPEG' },
]

/** Popup Tambah / Ubah kamera. `kamera` kosong = tambah. Validasi tetap di server. */
export function DialogKamera({ kamera, onSelesai, onTutup }: { kamera?: Kamera; onSelesai: (teks: string) => void; onTutup: () => void }) {
  const handleApiError = useApiError()
  const [form, setForm] = useState<Form>(() => formDari(kamera))
  const [fe, setFe] = useState<Record<string, string[]>>({})
  const [umum, setUmum] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const ubah = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }))

  async function simpan() {
    setSibuk(true)
    setFe({})
    setUmum('')
    const body = {
      nama: form.nama,
      lokasi: form.lokasi,
      tipe: form.tipe,
      url: form.url,
      interval_detik: Number(form.interval_detik),
      aktif: form.aktif,
    }
    try {
      if (kamera) await api.put(`/cctv/${kamera.id}`, body)
      else await api.post('/cctv', body)
      onSelesai(kamera ? 'Kamera diperbarui.' : 'Kamera ditambahkan.')
    } catch (e) {
      const f = handleApiError(e)
      setFe(f.fieldErrors)
      if (!Object.keys(f.fieldErrors).length) setUmum(f.message)
    } finally {
      setSibuk(false)
    }
  }

  const galat = (k: string) => {
    const g = fieldError(fe, k)
    return g ? <span className="vsf-field-error block font-normal">{g}</span> : null
  }

  return (
    <DialogKaca judul={kamera ? 'Ubah kamera' : 'Tambah kamera'} sub="Pilih jenis tayangan sesuai kamera Anda." onTutup={onTutup} sibuk={sibuk} lebar={560} onSubmit={() => { void simpan() }}>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className={LABEL}>
          Nama
          <input className="vsf-input mt-1 w-full" value={form.nama} maxLength={100} required
            aria-invalid={!!fieldError(fe, 'nama') || undefined}
            onChange={(e) => ubah({ nama: e.target.value })} />
          {galat('nama')}
        </label>
        <label className={LABEL}>
          Lokasi
          <input className="vsf-input mt-1 w-full" value={form.lokasi} maxLength={100} placeholder="mis. Greenhouse A"
            onChange={(e) => ubah({ lokasi: e.target.value })} />
          {galat('lokasi')}
        </label>
        <div className={LABEL}>
          Jenis tayangan
          <Pilihan label="Jenis tayangan" nilai={form.tipe} opsi={OPSI_TIPE} onPilih={(tipe) => ubah({ tipe })} />
        </div>
        <label className={LABEL}>
          Interval muat ulang (detik)
          <input className="vsf-input mt-1 w-full" type="number" min={1} max={60} value={form.interval_detik}
            disabled={form.tipe === 'mjpeg'}
            aria-invalid={!!fieldError(fe, 'interval_detik') || undefined}
            onChange={(e) => ubah({ interval_detik: e.target.value })} />
          {galat('interval_detik')}
        </label>
        <label className={`${LABEL} sm:col-span-2`}>
          URL kamera
          <input className="vsf-input mt-1 w-full" value={form.url} required placeholder={CONTOH_URL[form.tipe]}
            autoComplete="off" spellCheck={false}
            aria-invalid={!!fieldError(fe, 'url') || undefined}
            onChange={(e) => ubah({ url: e.target.value })} />
          <span className="mt-1 block text-[12px] font-normal leading-relaxed text-abu">
            {form.tipe === 'rtsp'
              ? 'Kamera RTSP (EZVIZ) diambil lewat server. Sandi = kode verifikasi 6 huruf di stiker kamera; tersimpan di server dan tampil sebagai *** — biarkan *** saat mengubah bila sandinya tetap.'
              : 'Snapshot dan MJPEG ditarik langsung dari kamera di jaringan Anda.'}
          </span>
          {galat('url')}
        </label>
        <label className="vsf-batch flex cursor-pointer items-center gap-3 p-3 text-[13px] font-semibold text-slate-700 sm:col-span-2">
          <span className="relative grid h-[22px] w-[22px] shrink-0 place-items-center">
            <input
              type="checkbox"
              className="peer h-[22px] w-[22px] cursor-pointer appearance-none rounded-[7px] border-2 border-slate-400 bg-white/80 outline-none transition-colors checked:border-arutmin-forest checked:bg-arutmin-forest focus-visible:ring-2 focus-visible:ring-arutmin-moss/60"
              checked={form.aktif}
              onChange={(e) => ubah({ aktif: e.target.checked })}
            />
            <Ikon nama="centang" className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100" />
          </span>
          <span className="min-w-0">
            Kamera aktif
            <span className="block text-[12px] font-normal text-abu">Kamera nonaktif tidak menayangkan feed.</span>
          </span>
        </label>
      </div>
      {umum && <Pesan jenis="galat">{umum}</Pesan>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="vsf-btn-secondary" onClick={onTutup} disabled={sibuk}>Batal</button>
        <button type="submit" className="vsf-btn-primary" disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan'}</button>
      </div>
    </DialogKaca>
  )
}
