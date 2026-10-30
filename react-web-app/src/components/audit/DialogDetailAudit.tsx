import {
  catatanPerubahan,
  daftarPerubahan,
  namaAktor,
  namaTabel,
  ringkasPerangkat,
  waktuLengkap,
  waktuRelatif,
  type AuditRow,
} from '../../lib/audit'
import { Ikon } from '../Ikon'
import { DialogKaca } from '../kaca/DialogKaca'
import { Avatar } from '../pengguna/Penanda'
import { LencanaAksi } from './Penanda'

/** Popup detail satu catatan audit: siapa, kapan, apa yang berubah (sebelum/sesudah), info teknis dilipat. */
export function DialogDetailAudit({
  row,
  adaSebelumnya,
  adaBerikutnya,
  onSebelumnya,
  onBerikutnya,
  onTutup,
}: {
  row: AuditRow
  adaSebelumnya: boolean
  adaBerikutnya: boolean
  onSebelumnya: () => void
  onBerikutnya: () => void
  onTutup: () => void
}) {
  const perubahan = daftarPerubahan(row)
  const catatan = catatanPerubahan(row)
  const dua = perubahan.some((p) => p.lama !== undefined) && perubahan.some((p) => p.baru !== undefined)
  const aktor = namaAktor(row)

  return (
    <DialogKaca judul="Detail Aktivitas" lebar={560} onTutup={onTutup}>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <LencanaAksi aksi={row.aksi} />
        <b className="text-[15px] text-tinta">{namaTabel(row.tabel)}</b>
        {row.row_id && <span className="text-[12px] text-abu">#{row.row_id}</span>}
      </div>

      <div className="vsf-detail-blok flex items-center gap-3">
        <Avatar nama={aktor} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold text-tinta">
            {aktor}
            {row.meta?.level && <span className="ml-2 text-[12px] font-normal text-abu">{row.meta.level}</span>}
          </div>
          <div className="text-[12px] text-abu" title={row.terjadi_pada}>
            {waktuLengkap(row.terjadi_pada)} · {waktuRelatif(row.terjadi_pada)}
          </div>
        </div>
      </div>

      <section className="vsf-detail-blok">
        <h3 className="vsf-label-form">Perubahan</h3>
        {catatan && <p className="text-[13px] text-tinta">{catatan}</p>}
        {perubahan.length > 0 && (
          <div className="vsf-beda" role="table" aria-label="Perubahan data">
            {dua && (
              <div className="vsf-beda-baris is-kepala" role="row">
                <span role="columnheader">Kolom</span>
                <span role="columnheader">Sebelum</span>
                <span role="columnheader">Sesudah</span>
              </div>
            )}
            {perubahan.map((p) => (
              <div key={p.kunci} className={dua ? 'vsf-beda-baris' : 'vsf-beda-baris is-satu'} role="row">
                <span className="vsf-beda-kunci" role="cell">{p.label}</span>
                {dua ? (
                  <>
                    <span className="vsf-beda-lama" role="cell">{p.lama ?? '—'}</span>
                    <span className="vsf-beda-baru" role="cell">{p.baru ?? '—'}</span>
                  </>
                ) : (
                  <span className={p.baru !== undefined ? 'vsf-beda-baru' : 'vsf-beda-lama'} role="cell">
                    {p.baru ?? p.lama}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {!catatan && perubahan.length === 0 && <p className="text-[13px] text-abu">Tidak ada data yang direkam.</p>}
      </section>

      <details className="vsf-detail-blok vsf-lipat">
        <summary className="vsf-label-form">Info teknis</summary>
        <dl>
          <dt>Alamat IP</dt>
          <dd className="font-mono">{row.ip ?? '—'}</dd>
          <dt>Perangkat</dt>
          <dd title={row.user_agent ?? undefined}>{ringkasPerangkat(row.user_agent)}</dd>
          <dt>Rute</dt>
          <dd className="font-mono">{row.meta?.rute ?? '—'}</dd>
          <dt>Tabel asli</dt>
          <dd className="font-mono">{row.tabel ?? '—'}</dd>
          <dt>ID catatan</dt>
          <dd className="font-mono">{row.id}</dd>
        </dl>
      </details>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-garis pt-4">
        <div className="flex gap-2">
          <button type="button" className="vsf-btn-secondary vsf-btn-kecil" disabled={!adaSebelumnya} onClick={onSebelumnya}>
            <Ikon nama="kiri" className="h-4 w-4" />
            Lebih baru
          </button>
          <button type="button" className="vsf-btn-secondary vsf-btn-kecil" disabled={!adaBerikutnya} onClick={onBerikutnya}>
            Lebih lama
            <Ikon nama="kanan" className="h-4 w-4" />
          </button>
        </div>
        <button type="button" className="vsf-btn-primary" onClick={onTutup}>
          Tutup
        </button>
      </div>
    </DialogKaca>
  )
}
