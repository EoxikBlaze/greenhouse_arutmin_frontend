import { useState, type ReactNode } from 'react'
import { useDialog } from '../lib/useDialog'
import { ModalBackdrop } from './ModalBackdrop'

export type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
}

/** Identitas baris yang akan dihapus (label untuk dialog, id untuk DELETE /x/:id). */
export type HapusTarget = { label: string; id: string }

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
   * Aksi per baris. `askHapus(label, id?)` membuka modal konfirmasi hapus
   * (nama data disebut di dialog, sesuai mockup); `id` dipakai DELETE /x/:id
   * bila `onDelete` diisi.
   */
  actions?: (row: T, askHapus: (label: string, id?: string) => void) => ReactNode

  /* ── Semua prop di bawah OPSIONAL — halaman mock lama tidak berubah ── */

  /** GET daftar sedang berjalan → baris "Memuat data…". */
  loading?: boolean
  /**
   * Error tingkat daftar (kontrak 401/403/404/500/offline) — tampil SEBAGAI
   * state eksklusif di tbody (setelah loading, sebelum empty/data) lengkap
   * dengan tombol "Muat ulang" (QW1 — satu state per layar).
   */
  listError?: string | null
  /** Dipanggil tombol "Muat ulang" — umumnya `reload()` dari useApiList. */
  onRetry?: () => void
  /**
   * Nama modul untuk empty-state, mis. "Jenis Tanaman" →
   * "Belum ada data Jenis Tanaman — …". Tanpa prop ini kalimatnya generik
   * (dulu memakai `title.toLowerCase()` → "Belum ada data toolbar — …").
   */
  moduleName?: string
  /** Sukses mutasi — banner hijau di atas tabel (di-clear host). */
  flash?: string | null
  /** Sembunyikan tombol "+ Tambah" (mis. halaman hanya GET + PUT). */
  hideAdd?: boolean

  /** Modal form — terkontrol host bila `open`/`onOpenChange` diisi. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Error tingkat form (422 non-field, 403 demo, 404, offline). */
  formError?: string | null
  /** true → tombol Simpan disabled + spinner. */
  submitting?: boolean
  submitLabel?: string
  /** Bila diisi, tombol Simpan memanggil ini (host yang menutup modal saat sukses). */
  onSubmit?: () => void
  /** Bila diisi, tombol Batal memanggil ini (default: tutup modal). */
  onFormCancel?: () => void

  /** Modal konfirmasi hapus — terkontrol host bila `hapus`/`onHapusChange` diisi. */
  hapus?: HapusTarget | null
  onHapusChange?: (target: HapusTarget | null) => void
  /** true → tombol "Ya, hapus" disabled + spinner. */
  deleting?: boolean
  deleteError?: string | null
  /** Bila diisi, tombol "Ya, hapus" memanggilnya dengan id baris. */
  onDelete?: (id: string) => void
}

/**
 * Komponen CRUD bersama untuk modul Data Tahap (06–09), Durasi Siklus (10),
 * Master Data (11–13), dan Manajemen User (16).
 * Pola identik: toolbar (+Tambah) → tabel → modal form → modal konfirmasi hapus.
 *
 * Gelombang API: state modal bisa dikontrol host (`open`/`hapus`) + slot
 * loading/error/submitting sehingga halaman tinggal menyambungkan `api.*`
 * tanpa mengubah komponen ini lagi. Tanpa prop baru, perilaku = mock lama.
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
  loading,
  listError,
  onRetry,
  moduleName,
  flash,
  hideAdd,
  open,
  onOpenChange,
  formError,
  submitting,
  submitLabel,
  onSubmit,
  onFormCancel,
  hapus,
  onHapusChange,
  deleting,
  deleteError,
  onDelete,
}: Props<T>) {
  const [innerOpen, setInnerOpen] = useState(false)
  const [innerHapus, setInnerHapus] = useState<HapusTarget | null>(null)

  const controlledForm = open !== undefined
  const formOpen = controlledForm ? open : innerOpen
  const setFormOpen = (v: boolean) => {
    if (!controlledForm) setInnerOpen(v)
    onOpenChange?.(v)
  }

  const controlledHapus = hapus !== undefined
  const hapusTarget = controlledHapus ? hapus : innerHapus
  const setHapusTarget = (v: HapusTarget | null) => {
    if (!controlledHapus) setInnerHapus(v)
    onHapusChange?.(v)
  }

  const askHapus = (label: string, id?: string) => setHapusTarget({ label, id: id ?? label })
  const colSpan = columns.length + (actions ? 1 : 0)

  // QW3 — aksesibilitas modal: fokus judul saat buka, kembali ke pemicu saat
  // tutup, Escape (diblokir saat submitting/deleting), klik backdrop, Tab trap.
  const {
    dialogRef: formRef,
    onKeyDown: formKeyDown,
    backdropProps: formBackdrop,
  } = useDialog({
    open: formOpen && !!form,
    onClose: () => setFormOpen(false),
    closeDisabled: !!submitting,
  })
  const {
    dialogRef: hapusRef,
    onKeyDown: hapusKeyDown,
    backdropProps: hapusBackdrop,
  } = useDialog({
    open: hapusTarget !== null,
    onClose: () => setHapusTarget(null),
    closeDisabled: !!deleting,
  })

  // QW1 — judul modul (tak lagi "Toolbar — X") & nama untuk empty-state.
  const emptyName = moduleName ?? title

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      <section className="vsf-card p-4 min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">{title}</div>
          <span className="flex-1" />
          {!hideAdd && (
            <button className="vsf-btn-primary" disabled={!form} onClick={() => setFormOpen(true)}>
              {addButton}
            </button>
          )}
        </div>

        {flash && (
          <div
            role="status"
            aria-live="polite"
            className="vsf-banner mt-3 rounded-input border border-arutmin-moss bg-arutmin-mint/50 px-3 py-2 text-[13px] text-arutmin-forest"
          >
            {flash}
          </div>
        )}

        {/* QW1 — state daftar HIDUP DI tbody (satu state per layar): loading →
            error → empty → data. Error tak lagi jadi banner terpisah di atas. */}
        <div className="mt-3 min-w-0 overflow-auto rounded-card border border-arutmin-border bg-white vsf-table">
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
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="px-3 py-8 text-center text-slate-500">
                    <div className="grid justify-items-center gap-2 py-4">
                      <span className="vsf-spinner vsf-spinner-dark" aria-hidden />
                      <span className="text-[13px]">Memuat data…</span>
                    </div>
                  </td>
                </tr>
              ) : listError ? (
                <tr>
                  <td colSpan={colSpan} className="px-3 py-8 text-center">
                    <div role="alert" className="grid justify-items-center gap-2 py-4">
                      <span className="text-[28px]" aria-hidden>⚠️</span>
                      <b className="text-red-700">Gagal memuat data</b>
                      <span className="text-[13px] text-red-700">✖ {listError}</span>
                      {onRetry && (
                        <button type="button" className="vsf-btn-primary mt-1" onClick={onRetry}>
                          Muat ulang
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-3 py-8 text-center text-slate-500">
                    {/* State Gallery: ikon + 1 kalimat + aksi utama */}
                    <div className="grid justify-items-center gap-2 py-4">
                      <span className="text-[28px]" aria-hidden>📭</span>
                      <b className="text-slate-700">Belum ada data</b>
                      <span className="text-[13px]">Belum ada data {emptyName} — tambah data pertama untuk memulai.</span>
                      {!hideAdd && (
                        <button
                          type="button"
                          className="vsf-btn-primary mt-1"
                          disabled={!form}
                          onClick={() => setFormOpen(true)}
                        >
                          Tambah Data Pertama
                        </button>
                      )}
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
                      <td className="px-3 py-2 whitespace-nowrap">{actions(r, askHapus)}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Catatan mockup hanya untuk pengembang (QW1 — tak tampil di produksi). */}
      {import.meta.env.DEV && notes && (
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

      {/* Modal form tambah/edit — QW3: role=dialog, aria-modal, label judul,
          fokus judul saat buka & kembali ke pemicu, Escape (diblokir saat
          submitting), klik backdrop, Tab terkunci di dalam modal. */}
      {formOpen && form && (
        <ModalBackdrop onMouseDown={formBackdrop.onMouseDown}>
          <div
            ref={formRef}
            onKeyDown={formKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vsf-form-title"
            className="w-full max-w-[520px] rounded-card bg-white p-5 vsf-modal-card max-h-[90vh] overflow-auto"
          >
            <div
              id="vsf-form-title"
              data-dialog-title
              tabIndex={-1}
              className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold outline-none"
            >
              Form tambah / edit
            </div>
            {formError && (
              <div
                role="alert"
                className="vsf-banner mt-3 rounded-input border border-red-600/50 bg-red-50 px-3 py-2 text-[13px] text-red-700"
              >
                ✖ {formError}
              </div>
            )}
            <div className="mt-3 grid gap-1">{form}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="vsf-input rounded-full"
                disabled={submitting}
                onClick={() => {
                  if (onFormCancel) onFormCancel()
                  else setFormOpen(false)
                }}
              >
                Batal
              </button>
              <button
                className="vsf-btn-primary"
                disabled={submitting}
                onClick={() => {
                  if (onSubmit) onSubmit()
                  else setFormOpen(false)
                }}
              >
                {submitting && <span className="vsf-spinner" />}
                {submitting ? 'Menyimpan…' : (submitLabel ?? 'Simpan')}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* Modal konfirmasi hapus — alertdialog (keputusan destruktif) + aturan
          QW3 yang sama; Escape/backdrop diblokir saat `deleting`. */}
      {hapusTarget && (
        <ModalBackdrop onMouseDown={hapusBackdrop.onMouseDown}>
          <div
            ref={hapusRef}
            onKeyDown={hapusKeyDown}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="vsf-hapus-title"
            aria-describedby="vsf-hapus-desc"
            className="w-full max-w-[420px] rounded-card bg-white p-5 vsf-modal-card"
          >
            <div id="vsf-hapus-title" data-dialog-title tabIndex={-1} className="text-[16px] font-bold outline-none">
              Hapus data?
            </div>
            <div id="vsf-hapus-desc" className="mt-2 text-[13px] text-slate-700">
              Konfirmasi menghapus <b>{hapusTarget.label}</b>. Tindakan ini tidak bisa dibatalkan.
            </div>
            {deleteError && (
              <div
                role="alert"
                className="vsf-banner mt-3 rounded-input border border-red-600/50 bg-red-50 px-3 py-2 text-[13px] text-red-700"
              >
                ✖ {deleteError}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="vsf-input rounded-full"
                disabled={deleting}
                onClick={() => setHapusTarget(null)}
              >
                Batal
              </button>
              <button
                className="rounded-full bg-red-700 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                disabled={deleting}
                onClick={() => {
                  if (onDelete) onDelete(hapusTarget.id)
                  else setHapusTarget(null)
                }}
              >
                {deleting && <span className="vsf-spinner" />}
                {deleting ? 'Menghapus…' : 'Ya, hapus'}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </div>
  )
}

/**
 * Tombol Edit standar (hijau, outline) untuk kolom Aksi.
 * `name` → aria-label "Ubah <nama>" (target sentuh ≥36px, QW2).
 */
export function BtnEdit({ onClick, name }: { onClick?: () => void; name?: string }) {
  return (
    <button
      type="button"
      className="inline-flex min-h-[36px] items-center px-2.5 text-[12px] font-semibold text-arutmin-forest underline"
      onClick={onClick}
      aria-label={name ? `Ubah ${name}` : undefined}
    >
      Edit
    </button>
  )
}

/**
 * Tombol Hapus standar (merah, outline) untuk kolom Aksi.
 * `id` diteruskan ke `askHapus(label, id)` → DELETE /x/:id pada halaman API.
 * aria-label "Hapus <nama>" + target sentuh ≥36px (QW2).
 */
export function BtnHapus({
  label,
  id,
  onPick,
}: {
  label: string
  id?: string
  onPick: (label: string, id?: string) => void
}) {
  return (
    <button
      type="button"
      className="inline-flex min-h-[36px] items-center px-2.5 text-[12px] font-semibold text-red-700 underline"
      onClick={() => onPick(label, id)}
      aria-label={`Hapus ${label}`}
    >
      Hapus
    </button>
  )
}

/**
 * Tombol Detail standar untuk kolom Aksi (mis. modal detail Semai).
 * aria-label "Detail <nama>" + target sentuh ≥36px (QW2).
 */
export function BtnDetail({ name, onClick }: { name: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex min-h-[36px] items-center px-2.5 text-[12px] font-semibold text-arutmin-forest underline"
      onClick={onClick}
      aria-label={`Detail ${name}`}
    >
      Detail
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

/** Pesan validasi merah di bawah satu input (kontrak 422 → errors[field][0]). */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div className="mt-1 text-[12px] text-red-700" role="alert">
      {message}
    </div>
  )
}
