import { useApiList } from '../../lib/crudApi'
import { n, tgl, urutKonstanta, type Alat, type Log } from '../../lib/kalibrasi'
import { DialogKaca } from '../dosing/DialogKaca'

/** Popup Riwayat: tetap tabel (100 catatan terakhir). */
export function DialogRiwayat({ alat, onTutup }: { alat: Alat; onTutup: () => void }) {
  const { rows, loading, error } = useApiList<Log>(`/kalibrasi/${alat.sensor}/riwayat`)
  return (
    <DialogKaca judul="Riwayat kalibrasi" sub={alat.label ?? alat.sensor} onTutup={onTutup} lebar={780}>
      {error && <div role="alert" className="mt-3 text-[13px] text-red-700">{error}</div>}
      <div className="vsf-kal-blok mt-3 overflow-x-auto">
        <table aria-label="Riwayat kalibrasi" className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[12px] uppercase tracking-[.12em] text-navy">
              <th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Ref</th><th className="px-3 py-2">Bacaan</th>
              <th className="px-3 py-2">Konstanta baru</th><th className="px-3 py-2">Hasil</th><th className="px-3 py-2">Oleh · catatan</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-4"><div className="vsf-skeleton h-5 w-full rounded" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Belum ada kalibrasi tercatat.</td></tr>
            ) : (
              rows.map((l) => (
                <tr key={String(l.id)} className="border-t border-white/50 align-top">
                  <td className="whitespace-nowrap px-3 py-2">{tgl(l.dilakukan_pada)}</td>
                  <td className="px-3 py-2">{n(l.nilai_ref)}</td>
                  <td className="px-3 py-2">{l.bacaan_sesudah != null ? n(l.bacaan_sesudah) : n(l.bacaan_sebelum)}</td>
                  <td className="px-3 py-2 font-mono text-[12px]">{l.konstanta_baru ? urutKonstanta(l.konstanta_baru).map(([k, v]) => `${k}=${v}`).join(' ') : '—'}</td>
                  <td className="px-3 py-2">
                    {l.lulus == null ? '—' : <span className={l.lulus ? 'vsf-chip-nilai is-normal' : 'vsf-chip-nilai is-luar'}>{l.lulus ? 'Lulus' : 'Tidak lulus'}</span>}
                  </td>
                  <td className="px-3 py-2">{l.oleh_label ?? '—'}{l.catatan ? ` · ${l.catatan}` : ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end"><button type="button" className="vsf-btn-secondary" onClick={onTutup}>Tutup</button></div>
    </DialogKaca>
  )
}
