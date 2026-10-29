import { DialogKonfirmasi } from '../kaca/DialogKaca'

/** Konfirmasi sebelum Isi Air / Stop dikirim ke perangkat. */
export function DialogKonfirmasiAksi({
  aksi,
  onBatal,
  onYa,
}: {
  aksi: 'fill' | 'stop'
  onBatal: () => void
  onYa: () => void
}) {
  const fill = aksi === 'fill'
  return (
    <DialogKonfirmasi
      judul={fill ? 'Isi air sekarang?' : 'Hentikan pengisian air?'}
      ya={fill ? 'Ya, isi air' : 'Ya, hentikan'}
      onYa={onYa}
      onBatal={onBatal}
    >
      {fill
        ? 'Katup tandon akan dibuka dan air mulai mengalir sampai Anda menekan Stop.'
        : 'Katup tandon akan ditutup dan pengisian air berhenti.'}
    </DialogKonfirmasi>
  )
}
