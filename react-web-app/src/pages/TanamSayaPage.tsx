import { useState } from 'react'
import clsx from 'clsx'
import { useSearchParams } from 'react-router-dom'

type Tanam = {
  batch: string
  varietas: string
  meja: string
  tahap: string
  mulai: string
}

const CONTOH: Tanam[] = [
  { batch: 'Batch A-01', varietas: 'Selada', meja: 'Meja 1', tahap: 'Penyemaian', mulai: '02 Okt' },
  { batch: 'Batch A-02', varietas: 'Bayam', meja: 'Meja 3', tahap: 'Peremajaan', mulai: '28 Sep' },
  { batch: 'Batch B-01', varietas: 'Kangkung', meja: 'Meja 2', tahap: 'Pendewasaan', mulai: '18 Sep' },
]

export default function TanamSayaPage() {
  const [filter, setFilter] = useState('')
  const [confirmHapus, setConfirmHapus] = useState<string | null>(null)
  // State variant via URL (QA/debug): ?state=empty
  const [searchParams] = useSearchParams()
  const isEmpty = searchParams.get('state') === 'empty'

  const rows = CONTOH.filter((t) =>
    (t.batch + t.varietas + t.meja + t.tahap).toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {/* Toolbar */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Toolbar</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="vsf-btn-primary">+ Mulai Tanam</button>
          <input
            className="vsf-input w-[230px]"
            placeholder="filter: varietas / meja / status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </section>

      {/* Tabel tanam aktif */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Tabel tanam aktif</div>
        {isEmpty || rows.length === 0 ? (
          <div className="mt-3 h-[80px] rounded-card border border-dashed border-arutmin-border flex items-center justify-center text-[13px] text-slate-600">
            Belum ada tanam aktif — tombol “Mulai Tanam” di pojok kanan atas
          </div>
        ) : (
          <div className="mt-3 overflow-auto rounded-card border border-arutmin-border bg-white vsf-table">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-arutmin-mint/25">
                  {['Nama / Batch', 'Varietas', 'Meja', 'Tahap', 'Mulai', 'Aksi'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-[11px] uppercase tracking-[.12em] text-arutmin-forest border-b-2 border-arutmin-moss"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.batch} className="hover:bg-arutmin-mint/15">
                    <td className="px-3 py-2 font-semibold text-slate-900">{t.batch}</td>
                    <td className="px-3 py-2 text-slate-700">{t.varietas}</td>
                    <td className="px-3 py-2 text-slate-700">{t.meja}</td>
                    <td className="px-3 py-2 text-slate-700">{t.tahap}</td>
                    <td className="px-3 py-2 text-slate-700">{t.mulai}</td>
                    <td className="px-3 py-2">
                      <button className="text-[12px] font-semibold text-arutmin-forest underline mr-3">Selesai</button>
                      <button
                        onClick={() => setConfirmHapus(t.batch)}
                        className="text-[12px] font-semibold text-red-700 underline"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal konfirmasi hapus */}
      {confirmHapus && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 vsf-modal-backdrop">
          <div className="w-full max-w-[420px] rounded-card bg-white p-5 vsf-modal-card">
            <div className="text-[16px] font-bold">Hapus tanam?</div>
            <div className="mt-2 text-[13px] text-slate-700">
              Kamu akan menghapus <b>{confirmHapus}</b>. Tindakan ini tidak bisa dibatalkan.
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="vsf-input rounded-full" onClick={() => setConfirmHapus(null)}>
                Batal
              </button>
              <button
                className="rounded-full bg-red-700 px-4 py-2 text-[13px] font-semibold text-white"
                onClick={() => setConfirmHapus(null)}
              >
                Ya, hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <section className={clsx('vsf-card p-4')}>
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Catatan struktur & state</div>
        <ul className="mt-2 list-disc pl-5 text-[13px] text-slate-700 leading-relaxed">
          <li>Aksi “Selesai” per tahap → memindahkan data ke modul tahap berikutnya (sem→rem→dewasa→panen).</li>
          <li>Hapus selalu lewat modal konfirmasi (nama batch disebut di dialog).</li>
          <li>Petani: tanpa tombol hapus (read-only untuk data tim), tetap bisa Mulai/Selesai.</li>
        </ul>
      </section>
    </div>
  )
}
