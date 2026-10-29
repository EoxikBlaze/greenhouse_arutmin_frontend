import { useState } from 'react'
import { api } from '../../lib/api'
import { useApiError } from '../../lib/crudApi'
import type { Kamera } from '../../lib/cctv'
import { DialogKaca, Pesan } from '../dosing/DialogKaca'

/** Konfirmasi hapus kamera (menggantikan window.confirm). */
export function DialogHapusKamera({ k, onSelesai, onTutup }: { k: Kamera; onSelesai: () => void; onTutup: () => void }) {
  const handleApiError = useApiError()
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')

  async function hapus() {
    setSibuk(true)
    setGalat('')
    try {
      await api.delete(`/cctv/${k.id}`)
      onSelesai()
    } catch (e) {
      setGalat(handleApiError(e).message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <DialogKaca judul="Hapus kamera?" onTutup={onTutup} sibuk={sibuk} lebar={420} onSubmit={() => { void hapus() }}>
      <p className="mt-3 text-[13px] leading-relaxed text-slate-700">
        Kamera <b className="text-tinta">“{k.nama}”</b> akan dihapus dari daftar. Tindakan ini tidak bisa dibatalkan.
      </p>
      {galat && <Pesan jenis="galat">{galat}</Pesan>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="vsf-btn-secondary" onClick={onTutup} disabled={sibuk}>Batal</button>
        <button type="submit" className="vsf-btn-danger" disabled={sibuk}>{sibuk ? 'Menghapus…' : 'Ya, hapus'}</button>
      </div>
    </DialogKaca>
  )
}
