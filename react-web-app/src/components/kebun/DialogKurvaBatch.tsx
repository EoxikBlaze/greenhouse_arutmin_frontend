import { useState } from 'react'
import { api } from '../../lib/api'
import { fieldError, useApiError } from '../../lib/crudApi'
import { FieldError } from '../CrudScreen'
import { DialogKaca } from '../kaca/DialogKaca'
import type { TanamRow } from '../../lib/kebun'

/**
 * Ubah kurva nutrisi SATU batch — PUT /tanam/semai/:id_semai/kurva.
 * Sebelum pindah netpot: seluruh kurva diganti. Sesudahnya: target hari ini tetap, lalu naik rata ke target baru
 * (hitungan hari semai → panen tidak berubah). Batch lain dari tanaman yang sama tidak ikut berubah.
 */
export function DialogKurvaBatch({ r, onClose, onSukses }: { r: TanamRow; onClose: () => void; onSukses: (pesan: string) => void }) {
  const handleApiError = useApiError()
  const k = r.nutrisi?.kurva
  const sudahNetpot = r.tipe !== 'semai'
  const teks = (v: unknown) => (v == null ? '' : String(v))
  const [isi, setIsi] = useState({ ppm_awal: teks(k?.ppm_awal), ppm_target: teks(k?.ppm_target), hari_capai: teks(k?.hari_capai) })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [galat, setGalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  async function simpan() {
    if (sibuk || r.id_semai == null) return
    setSibuk(true)
    setGalat(null)
    try {
      const body: Record<string, number> = {}
      for (const [kunci, v] of Object.entries(isi)) {
        if (kunci === 'ppm_awal' && sudahNetpot) continue
        if (v.trim()) body[kunci] = Number(v.trim())
      }
      const res = await api.put(`/tanam/semai/${r.id_semai}/kurva`, body)
      const d = res.data as { message?: string; peringatan?: string | null }
      onSukses([d.message ?? 'Kurva diubah.', d.peringatan].filter(Boolean).join(' '))
    } catch (err) {
      const f = handleApiError(err)
      setFieldErrors(f.fieldErrors)
      setGalat(f.message)
    } finally {
      setSibuk(false)
    }
  }

  const kolom = (
    [
      ['ppm_awal', 'ppm awal (saat pindah netpot)'],
      ['ppm_target', 'ppm target'],
      ['hari_capai', 'hari capai (sejak netpot)'],
    ] as const
  ).filter(([kunci]) => !(kunci === 'ppm_awal' && sudahNetpot))

  return (
    <DialogKaca
      judul="Ubah target nutrisi batch"
      sub={`${r.varietas ?? 'Tanaman'} · #${r.id}`}
      onTutup={onClose}
      sibuk={sibuk}
      lebar={460}
      onSubmit={() => void simpan()}
    >
      <p className="mt-3 text-[13px] leading-relaxed text-tinta">
        {sudahNetpot && r.nutrisi?.target_hari_ini != null ? (
          <>
            Target hari ini <b>{r.nutrisi.target_hari_ini} ppm</b> tetap (hari ke-{r.nutrisi.hari_netpot} sejak netpot). Mulai besok ppm naik
            rata ke target baru. Hitungan hari semai sampai panen tidak berubah, dan batch lain tidak ikut berubah.
          </>
        ) : (
          <>Batch belum pindah netpot: seluruh kurva diganti. Batch lain dari tanaman yang sama tidak ikut berubah.</>
        )}
      </p>
      {galat && (
        <div role="alert" className="vsf-banner vsf-tone-error mt-3 rounded-std px-3 py-2 text-[13px]">
          {galat}
        </div>
      )}
      <div className={`mt-3 grid gap-2 ${kolom.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {kolom.map(([kunci, label]) => (
          <label key={kunci} className="block">
            <span className="text-[12px] text-abu">{label}</span>
            <input
              className="vsf-input mt-1 w-full"
              inputMode="numeric"
              value={isi[kunci]}
              onChange={(e) => setIsi((v) => ({ ...v, [kunci]: e.target.value }))}
            />
            <FieldError message={fieldError(fieldErrors, kunci)} />
          </label>
        ))}
      </div>
      <FieldError message={fieldError(fieldErrors, 'kurva')} />
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="vsf-btn-secondary" disabled={sibuk} onClick={onClose}>
          Batal
        </button>
        <button type="submit" className="vsf-btn-primary" disabled={sibuk}>
          {sibuk ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </DialogKaca>
  )
}
