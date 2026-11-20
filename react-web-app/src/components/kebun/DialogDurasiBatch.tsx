import { useState } from 'react'
import { api } from '../../lib/api'
import { fieldError, useApiError } from '../../lib/crudApi'
import { FieldError } from '../CrudScreen'
import { DialogKaca } from '../kaca/DialogKaca'
import type { TanamRow } from '../../lib/kebun'
import { durasiDariIsian, durasiDariServer, isianDurasi, jumlahTahap, kosongSemua } from '../../lib/durasiTahap'

/**
 * Ubah lama tiap tahap SATU batch — PUT /tanam/semai/:id_semai/durasi.
 * Berlaku hanya untuk batch ini (durasi di Master Data → Jenis Tanaman tidak berubah) dan memengaruhi penanda "siap pindah",
 * progres, dan perkiraan panen batch ini. Cukup isi total hari (dibagi otomatis) atau atur ketiga tahap sendiri.
 */
export function DialogDurasiBatch({ r, onClose, onSukses }: { r: TanamRow; onClose: () => void; onSukses: (pesan: string) => void }) {
  const handleApiError = useApiError()
  const awal = durasiDariServer(r.durasi_batch?.semai, r.durasi_batch?.peremajaan, r.durasi_batch?.pendewasaan)
  const [isi, setIsi] = useState(isianDurasi(awal))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [galat, setGalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  const efektif = durasiDariIsian(isi.dur_total, isi.dur_semai, isi.dur_peremajaan, isi.dur_pendewasaan)
  const manual = !kosongSemua(isi.dur_semai, isi.dur_peremajaan, isi.dur_pendewasaan)

  async function simpan() {
    if (sibuk || r.id_semai == null) return
    if (!efektif) {
      setFieldErrors({ dur_total: ['Isi total hari (3–365), atau ketiga tahap (1–365 hari).'] })
      return
    }
    setSibuk(true)
    setGalat(null)
    setFieldErrors({})
    try {
      const res = await api.put(`/tanam/semai/${r.id_semai}/durasi`, efektif)
      onSukses(String((res.data as { message?: string } | null)?.message ?? 'Durasi batch diubah.'))
    } catch (err) {
      const f = handleApiError(err)
      setFieldErrors(f.fieldErrors)
      setGalat(f.message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <DialogKaca judul="Ubah durasi batch" sub={`${r.varietas ?? 'Tanaman'} · #${r.id}`} onTutup={onClose} sibuk={sibuk} lebar={460} onSubmit={() => void simpan()}>
      <p className="mt-3 text-[13px] leading-relaxed text-tinta">
        Lama tiap tahap untuk <b>batch ini saja</b>. Durasi di Master Data → Jenis Tanaman tidak berubah, dan batch lain tidak ikut berubah.
        Durasi memengaruhi penanda &quot;siap pindah&quot;, progres, dan perkiraan panen. Pindah tahap tetap menunggu konfirmasi Anda.
      </p>
      {galat && <div role="alert" className="vsf-banner vsf-tone-error mt-3 rounded-std px-3 py-2 text-[13px]">{galat}</div>}
      <label className="mt-3 block">
        <span className="vsf-label vsf-label-tinta">Total semai sampai panen (hari)</span>
        <input
          className="vsf-input mt-1 w-32" inputMode="numeric" value={isi.dur_total}
          onChange={(e) => setIsi({ dur_total: e.target.value, dur_semai: '', dur_peremajaan: '', dur_pendewasaan: '' })}
        />
        <FieldError message={fieldError(fieldErrors, 'dur_total')} />
      </label>
      <p className="mt-2 text-[12px] text-abu">
        {efektif
          ? `${manual ? 'Per tahap (diatur sendiri)' : 'Dibagi otomatis'}: Semai ${efektif.semai}, Peremajaan ${efektif.peremajaan}, Pendewasaan ${efektif.pendewasaan} hari. Total ${jumlahTahap(efektif)} hari.`
          : 'Isi total hari atau ketiga tahap.'}
      </p>
      <details className="mt-2" open={manual}>
        <summary className="cursor-pointer text-[12px] font-semibold text-arutmin-forest">Atur per tahap sendiri (opsional)</summary>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {([['dur_semai', 'Semai'], ['dur_peremajaan', 'Peremajaan'], ['dur_pendewasaan', 'Pendewasaan']] as const).map(([k, label]) => (
            <label key={k} className="block">
              <span className="text-[12px] text-abu">{label} (hari)</span>
              <input className="vsf-input mt-1 w-full" inputMode="numeric" value={isi[k]} onChange={(e) => setIsi((v) => ({ ...v, [k]: e.target.value }))} />
            </label>
          ))}
        </div>
      </details>
      <FieldError message={fieldError(fieldErrors, 'semai')} />
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="vsf-btn-secondary" disabled={sibuk} onClick={onClose}>Batal</button>
        <button type="submit" className="vsf-btn-primary" disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan'}</button>
      </div>
    </DialogKaca>
  )
}
