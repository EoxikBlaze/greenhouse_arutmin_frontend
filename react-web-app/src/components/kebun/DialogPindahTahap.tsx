import { useState } from 'react'
import { api } from '../../lib/api'
import { fieldError, useApiError } from '../../lib/crudApi'
import { FieldError } from '../CrudScreen'
import { DialogKaca } from '../kaca/DialogKaca'
import { TAHAP_LABEL, infoNutrisiPindah, progres, type TanamRow } from '../../lib/kebun'

/**
 * Konfirmasi pindah tahap (semai → peremajaan → pendewasaan → panen) — POST /tanam/:tipe/:id/selesai { berhasil }.
 * Pindah tahap SELALU lewat konfirmasi ini (tidak otomatis menurut hitungan hari). Untuk batch per siklus, ppm tahap
 * berikutnya baru dikirim ke alat setelah konfirmasi; untuk per hari ppm tidak terpengaruh.
 */
export function DialogPindahTahap({ r, onClose, onSukses }: { r: TanamRow; onClose: () => void; onSukses: (pesan: string) => void }) {
  const handleApiError = useApiError()
  const jumlah = r.tipe === 'semai' ? r.jumlah_benih : r.jumlah_masuk
  const [berhasil, setBerhasil] = useState(typeof jumlah === 'number' ? String(jumlah) : '')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [galat, setGalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  const panen = r.tahap_berikut === 'panen'
  const tujuan = TAHAP_LABEL[r.tahap_berikut ?? ''] ?? 'tahap berikutnya'
  const p = progres(r)

  async function konfirmasi() {
    if (sibuk) return
    const n = /^\d+$/.test(berhasil.trim()) ? Number(berhasil.trim()) : null
    if (n === null) {
      setFieldErrors({ berhasil: ['Isi dengan bilangan bulat ≥ 0.'] })
      return
    }
    if (typeof jumlah === 'number' && n > jumlah) {
      setFieldErrors({ berhasil: [`Tidak boleh lebih dari ${jumlah}.`] })
      return
    }
    setSibuk(true)
    setGalat(null)
    setFieldErrors({})
    try {
      const res = await api.post(`/tanam/${r.tipe}/${r.id}/selesai`, { berhasil: n })
      onSukses(String((res.data as { message?: string } | null)?.message ?? 'Tahap diselesaikan.'))
    } catch (err) {
      const f = handleApiError(err)
      setFieldErrors(f.fieldErrors)
      setGalat(f.message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <DialogKaca
      judul={panen ? 'Catat panen?' : `Pindah ke ${tujuan}?`}
      sub={`${r.varietas ?? 'Tanaman'} · ${TAHAP_LABEL[r.tipe] ?? r.tipe} #${r.id}`}
      onTutup={onClose}
      sibuk={sibuk}
      lebar={460}
      onSubmit={() => void konfirmasi()}
    >
      <p className="mt-3 text-[13px] leading-relaxed text-tinta">
        {p.label}.{' '}
        {r.siap ? 'Sudah mencapai durasi tahap ini.' : <b>Belum mencapai durasi tahap ini.</b>} Pindah tahap hanya terjadi setelah Anda menekan
        konfirmasi di bawah.
      </p>
      {galat && (
        <div role="alert" className="vsf-banner vsf-tone-error mt-3 rounded-std px-3 py-2 text-[13px]">
          {galat}
        </div>
      )}
      <label className="mt-3 block">
        <span className="vsf-label vsf-label-tinta">{panen ? 'Jumlah tanaman berhasil dipanen' : `Jumlah yang berhasil pindah ke ${tujuan}`}</span>
        <input className="vsf-input mt-1 w-full" inputMode="numeric" value={berhasil} onChange={(e) => setBerhasil(e.target.value)} />
        <FieldError message={fieldError(fieldErrors, 'berhasil')} />
      </label>
      <div className="vsf-ringkasan-form mt-3" aria-live="polite">
        <span>{infoNutrisiPindah(r)}</span>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="vsf-btn-secondary" disabled={sibuk} onClick={onClose}>
          Batal
        </button>
        <button type="submit" className="vsf-btn-primary" disabled={sibuk}>
          {sibuk ? 'Menyimpan…' : panen ? 'Ya, catat panen' : `Ya, pindah ke ${tujuan}`}
        </button>
      </div>
    </DialogKaca>
  )
}
