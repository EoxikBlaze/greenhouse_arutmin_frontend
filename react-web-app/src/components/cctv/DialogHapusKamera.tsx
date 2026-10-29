import { useState } from 'react'
import { api } from '../../lib/api'
import { useApiError } from '../../lib/crudApi'
import type { Kamera } from '../../lib/cctv'
import { DialogKonfirmasi } from '../kaca/DialogKaca'

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
    <DialogKonfirmasi
      judul="Hapus kamera?"
      ya="Ya, hapus"
      sibukTeks="Menghapus…"
      bahaya
      sibuk={sibuk}
      galat={galat}
      onYa={() => void hapus()}
      onBatal={onTutup}
    >
      Kamera <b className="text-tinta">“{k.nama}”</b> akan dihapus dari daftar. Tindakan ini tidak bisa dibatalkan.
    </DialogKonfirmasi>
  )
}
