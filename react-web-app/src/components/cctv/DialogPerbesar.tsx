import { labelTipe, type Kamera } from '../../lib/cctv'
import { DialogKaca } from '../dosing/DialogKaca'
import { Pratinjau } from './Pratinjau'

/** Popup tayangan besar satu kamera. */
export function DialogPerbesar({ k, onTutup }: { k: Kamera; onTutup: () => void }) {
  return (
    <DialogKaca judul={k.nama} sub={`${k.lokasi || 'Tanpa lokasi'} · ${labelTipe(k)}`} onTutup={onTutup} lebar={1000}>
      <div className="mt-4 overflow-hidden rounded-card">
        <Pratinjau k={k} />
      </div>
      <div className="mt-4 flex justify-end">
        <button type="button" className="vsf-btn-secondary" onClick={onTutup}>Tutup</button>
      </div>
    </DialogKaca>
  )
}
