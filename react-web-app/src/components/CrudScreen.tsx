import { useState, type ReactNode } from 'react'

export type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
}

type Props<T> = {
  /** Judul sesuai mockup, mis. "Semai" */
  title: string
  /** Label tombol utama, mis. "+ Tambah Semai" */
  addButton: string
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Isi form tambah/edit (field khas modul) */
  form?: ReactNode
  /** catatan state dari mockup */
  notes?: string[]
  /**
   * Aksi per baris. `askHapus(label)` membuka modal konfirmasi hapus
   * (nama data disebut di dialog, sesuai mockup).
   */
  actions?: (row: T, askHapus: (label: string) => void) => ReactNode
}

/**
 * Komponen CRUD bersama untuk modul Data Tahap (06–09), Durasi Siklus (10),
 * Master Data (11–13), dan Manajemen User (16).
 * Pola identik: toolbar (+Tambah) → tabel → modal form → modal konfirmasi hapus.
 */
export function CrudScreen<T>({
  title,
  addButton,
  columns,
  rows,
  rowKey,
  form,
  notes,
  actions,
}: Props<T>) {
  const [showForm, setShowForm] = useState(false)
  const [hapus, setHapus] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      <section className="vsf-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">{title}</div>
          <span className="flex-1" />
          <button className="vsf-btn-primary" disabled={!form} onClick={() => setShowForm(true)}>
            {addButton}
          </button>
        </div>

        <div className="mt-3 overflow-auto rounded-card border border-arutmin-border bg-white vsf-table">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-arutmin-mint/25">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="text-left px-3 py-2 text-[11px] uppercase tracking-[.12em] text-arutmin-forest border-b-2 border-arutmin-moss"
                  >
                    {c.header}
                  </th>
                ))}
                {actions && (
                  <th className="text-left px-3 py-2 text-[11px] uppercase tracking-[.12em] text-arutmin-forest border-b-2 border-arutmin-moss">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="px-3 py-8 text-center text-slate-500">
                    {/* State Gallery: ikon + 1 kalimat + aksi utama */}
                    <div className="grid justify-items-center gap-2 py-4">
                      <span className="text-[28px]" aria-hidden>📭</span>
                      <b className="text-slate-700">Belum ada data</b>
                      <span className="text-[13px]">Belum ada data {title.toLowerCase()} — tambah data pertama untuk memulai.</span>
                      <button
                        type="button"
                        className="vsf-btn-primary mt-1"
                        disabled={!form}
                        onClick={() => setShowForm(true)}
                      >
                        Tambah Data Pertama
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={rowKey(r)} className="hover:bg-arutmin-mint/15">
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-2 text-slate-700">
                        {c.render(r)}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-3 py-2 whitespace-nowrap">{actions(r, setHapus)}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {notes && (
        <section className="vsf-card p-4">
          <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">
            Catatan struktur & state
          </div>
          <ul className="mt-2 list-disc pl-5 text-[13px] text-slate-700 leading-relaxed">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Modal form tambah/edit */}
      {showForm && form && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 vsf-modal-backdrop">
          <div className="w-full max-w-[520px] rounded-card bg-white p-5 vsf-modal-card">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Form tambah / edit</div>
            <div className="mt-3 grid gap-1">{form}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="vsf-input rounded-full" onClick={() => setShowForm(false)}>
                Batal
              </button>
              <button className="vsf-btn-primary" onClick={() => setShowForm(false)}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal konfirmasi hapus */}
      {hapus && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 vsf-modal-backdrop">
          <div className="w-full max-w-[420px] rounded-card bg-white p-5 vsf-modal-card">
            <div className="text-[16px] font-bold">Hapus data?</div>
            <div className="mt-2 text-[13px] text-slate-700">
              Konfirmasi menghapus <b>{hapus}</b>. Tindakan ini tidak bisa dibatalkan.
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="vsf-input rounded-full" onClick={() => setHapus(null)}>
                Batal
              </button>
              <button
                className="rounded-full bg-red-700 px-4 py-2 text-[13px] font-semibold text-white"
                onClick={() => setHapus(null)}
              >
                Ya, hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Tombol Edit standar (hijau, outline) untuk kolom Aksi */
export function BtnEdit({ onClick }: { onClick?: () => void }) {
  return (
    <button className="text-[12px] font-semibold text-arutmin-forest underline mr-3" onClick={onClick}>
      Edit
    </button>
  )
}

/** Tombol Hapus standar (merah, outline) untuk kolom Aksi */
export function BtnHapus({ label, onPick }: { label: string; onPick: (label: string) => void }) {
  return (
    <button className="text-[12px] font-semibold text-red-700 underline" onClick={() => onPick(label)}>
      Hapus
    </button>
  )
}

/** Field form standar (label + input) dengan radius 12 & focus ring moss */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
