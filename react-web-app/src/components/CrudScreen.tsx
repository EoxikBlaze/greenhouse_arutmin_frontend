import { useEffect, useState, type ReactNode } from 'react'
import { useDialog } from '../lib/useDialog'
import { ModalBackdrop } from './ModalBackdrop'
import { Ikon } from './Ikon'
import { DialogKaca, DialogKonfirmasi, Pesan } from './kaca/DialogKaca'

export type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Mode kartu: `judul` jadi heading kartu, `status` jadi chip di pojok kanan atas. */
  peran?: 'judul' | 'status'
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
  /** `kartu` → tiap baris jadi kartu batch (.vsf-batch); bawaan `tabel`. */
  tampilan?: 'tabel' | 'kartu'
  /**
   * Judul dialog form SPESIFIK per jenis data (mis. "Tambah Panen") —
   * default-nya generik ("Form tambah / edit"). Satu-satunya judul di dialog.
   */
  formTitle?: string

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
  actions,
  loading,
  listError,
  onRetry,
  moduleName,
  flash,
  hideAdd,
  tampilan = 'tabel',
  formTitle,
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
    closing: formClosing,
    handleClose: formClose,
  } = useDialog({
    open: formOpen && !!form,
    onClose: () => setFormOpen(false),
    closeDisabled: !!submitting,
  })
  const {
    dialogRef: hapusRef,
    onKeyDown: hapusKeyDown,
    backdropProps: hapusBackdrop,
    closing: hapusClosing,
    handleClose: hapusClose,
  } = useDialog({
    open: hapusTarget !== null,
    onClose: () => setHapusTarget(null),
    closeDisabled: !!deleting,
  })

  // P3 — animasi keluar banner flash: host menghapus flash di t+4000ms;
  // mulai fade-out (is-closing 150ms) di t+3850ms agar tak hilang mendadak.
  const [flashHiding, setFlashHiding] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- reset siklus kilat saat flash berubah
    setFlashHiding(false)
    if (!flash) return
    const t = window.setTimeout(() => setFlashHiding(true), 3850)
    return () => window.clearTimeout(t)
  }, [flash])

  // QW1 — judul modul (tak lagi "Toolbar — X") & nama untuk empty-state.
  const emptyName = moduleName ?? title

  // Keadaan daftar (memuat / galat / kosong); null bila ada data.
  const keadaan = loading ? (
    <div className="grid justify-items-center gap-2 py-4">
      <span className="vsf-spinner vsf-spinner-dark" aria-hidden />
      <span className="text-[13px]">Memuat data…</span>
    </div>
  ) : listError ? (
    <div role="alert" className="grid justify-items-center gap-2 py-4">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
        <Ikon nama="peringatan" className="h-6 w-6" />
      </span>
      <b className="text-red-700">Gagal memuat data</b>
      <span className="text-[13px] text-red-700">{listError}</span>
      {onRetry && (
        <button type="button" className="vsf-btn-secondary mt-1" onClick={onRetry}>
          Muat ulang
        </button>
      )}
    </div>
  ) : rows.length === 0 ? (
    /* State Gallery: ikon + 1 kalimat + aksi utama */
    <div className="grid justify-items-center gap-2 py-4">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-navy/[.06] text-navy">
        <Ikon nama="kosong" className="h-6 w-6" />
      </span>
      <b className="text-slate-700">Belum ada data</b>
      <span className="text-[13px]">Belum ada data {emptyName} — tambah data pertama untuk memulai.</span>
      {!hideAdd && (
        <button type="button" className="vsf-btn-primary mt-1" disabled={!form} onClick={() => setFormOpen(true)}>
          Tambah Data Pertama
        </button>
      )}
    </div>
  ) : null

  return (
    <div className="vsf-halaman vsf-stagger">
      <section className="vsf-card min-w-0 p-4 sm:p-5">
        {/* Toolbar: hierarki jelas (h2 display + aksen emas) + aksi utama. */}
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="vsf-judul-bagian min-w-0 truncate">{title}</h2>
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
            className={`vsf-banner mt-4 flex items-center gap-2 rounded-std border border-arutmin-moss bg-arutmin-mint/50 px-3 py-2 text-[13px] text-arutmin-forest${flashHiding ? ' is-closing' : ''}`}
          >
            <Ikon nama="centang" className="h-4 w-4" />
            {flash}
          </div>
        )}

        {/* QW1 — satu state per layar (memuat → galat → kosong → data), dipakai tabel & kartu. */}
        {tampilan === 'kartu' ? (
          keadaan ? (
            <div className="mt-4 py-10 text-center text-slate-500">{keadaan}</div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((r) => (
                <li key={rowKey(r)} className="min-w-0">
                  <KartuBaris r={r} columns={columns} aksi={actions?.(r, askHapus)} />
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="mt-4 min-w-0 overflow-auto rounded-std border border-garis bg-white vsf-table">
            <table aria-label={title} className="w-full text-[13px]">
              <thead>
                <tr className="bg-navy/[.055]">
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className="vsf-eyebrow vsf-eyebrow-navy border-b border-navy/25 px-4 py-2.5 text-left"
                    >
                      {c.header}
                    </th>
                  ))}
                  {actions && (
                    <th
                      scope="col"
                      className="vsf-eyebrow vsf-eyebrow-navy border-b border-navy/25 px-4 py-2.5 text-left"
                    >
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {keadaan ? (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-10 text-center text-slate-500">
                      {keadaan}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={rowKey(r)} className="border-b border-garis/70 last:border-0 transition-colors hover:bg-navy/[.04]">
                      {columns.map((c) => (
                        <td key={c.key} className="px-4 py-2.5 text-slate-700">
                          {c.render(r)}
                        </td>
                      ))}
                      {actions && (
                        <td className="whitespace-nowrap px-4 py-2.5">{actions(r, askHapus)}</td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>


      {/* Modal form tambah/edit — QW3: role=dialog, aria-modal, label judul,
          fokus judul saat buka & kembali ke pemicu, Escape (diblokir saat
          submitting), klik backdrop, Tab terkunci di dalam modal. */}
      {/* Mode kartu: popup pakai kaca bersama (DialogKaca / DialogKonfirmasi). */}
      {formOpen && form && tampilan === 'kartu' && (
        <DialogKaca
          judul={formTitle ?? 'Form tambah / edit'}
          onTutup={() => setFormOpen(false)}
          sibuk={!!submitting}
          lebar={480}
          onSubmit={() => (onSubmit ? onSubmit() : setFormOpen(false))}
        >
          {formError && <Pesan jenis="galat">{formError}</Pesan>}
          <div className="mt-4 grid gap-3">{form}</div>
          <div className="mt-5 flex justify-end gap-2 border-t border-garis pt-4">
            <button
              type="button"
              className="vsf-btn-secondary"
              disabled={submitting}
              onClick={() => {
                onFormCancel?.()
                setFormOpen(false)
              }}
            >
              Batal
            </button>
            <button type="submit" className="vsf-btn-primary" disabled={submitting}>
              {submitting && <span className="vsf-spinner" aria-hidden />}
              {submitting ? 'Menyimpan…' : (submitLabel ?? 'Simpan')}
            </button>
          </div>
        </DialogKaca>
      )}
      {hapusTarget && tampilan === 'kartu' && (
        <DialogKonfirmasi
          judul="Hapus data?"
          ya="Ya, hapus"
          sibukTeks="Menghapus…"
          bahaya
          sibuk={!!deleting}
          galat={deleteError ?? undefined}
          onYa={() => (onDelete ? onDelete(hapusTarget.id) : setHapusTarget(null))}
          onBatal={() => setHapusTarget(null)}
        >
          Konfirmasi menghapus <b>{hapusTarget.label}</b>. Tindakan ini tidak bisa dibatalkan.
        </DialogKonfirmasi>
      )}
      {formOpen && form && tampilan !== 'kartu' && (
        <ModalBackdrop onMouseDown={formBackdrop.onMouseDown} closing={formClosing}>
          <div
            ref={formRef}
            onKeyDown={formKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vsf-form-title"
            className={`vsf-modal-card max-h-[90vh] w-full max-w-[520px] overflow-auto rounded-lg border border-garis bg-white p-5${formClosing ? ' is-closing' : ''}`}
          >
            <div
              id="vsf-form-title"
              data-dialog-title
              tabIndex={-1}
              className="vsf-eyebrow outline-none"
            >
              {formTitle ?? 'Form tambah / edit'}
            </div>
            {formError && (
              <div
                role="alert"
                className="vsf-banner mt-3 rounded-std vsf-tone-error px-3 py-2 text-[13px]"
              >
                {formError}
              </div>
            )}
            <div className="mt-4 grid gap-1">{form}</div>
            <div className="mt-5 flex justify-end gap-2 border-t border-garis pt-4">
              <button
                className="vsf-btn-secondary"
                disabled={submitting}
                onClick={() => {
                  if (onFormCancel) onFormCancel()
                  formClose() // P3 — tutup dgn animasi keluar 180ms
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
                {submitting && <span className="vsf-spinner" aria-hidden />}
                {submitting ? 'Menyimpan…' : (submitLabel ?? 'Simpan')}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* Modal konfirmasi hapus — alertdialog (keputusan destruktif) + aturan
          QW3 yang sama; Escape/backdrop diblokir saat `deleting`. */}
      {hapusTarget && tampilan !== 'kartu' && (
        <ModalBackdrop onMouseDown={hapusBackdrop.onMouseDown} closing={hapusClosing}>
          <div
            ref={hapusRef}
            onKeyDown={hapusKeyDown}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="vsf-hapus-title"
            aria-describedby="vsf-hapus-desc"
            className={`vsf-modal-card w-full max-w-[420px] rounded-lg border border-garis bg-white p-5${hapusClosing ? ' is-closing' : ''}`}
          >
            <div id="vsf-hapus-title" data-dialog-title tabIndex={-1} className="flex items-center gap-2 text-[16px] font-bold outline-none">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-50 text-red-700">
                <Ikon nama="hapus" className="h-4 w-4" />
              </span>
              Hapus data?
            </div>
            <div id="vsf-hapus-desc" className="mt-2 text-[13px] text-slate-700">
              Konfirmasi menghapus <b>{hapusTarget.label}</b>. Tindakan ini tidak bisa dibatalkan.
            </div>
            {deleteError && (
              <div
                role="alert"
                className="vsf-banner mt-3 rounded-std vsf-tone-error px-3 py-2 text-[13px]"
              >
                {deleteError}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2 border-t border-garis pt-4">
              <button
                className="vsf-btn-secondary"
                disabled={deleting}
                onClick={hapusClose} // P3 — animasi keluar 180ms
              >
                Batal
              </button>
              <button
                className="vsf-btn-danger"
                disabled={deleting}
                onClick={() => {
                  if (onDelete) onDelete(hapusTarget.id)
                  else setHapusTarget(null)
                }}
              >
                {deleting && <span className="vsf-spinner" aria-hidden />}
                {deleting ? 'Menghapus…' : 'Ya, hapus'}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </div>
  )
}

/** Satu baris daftar dalam mode kartu: judul + chip status di atas, sisa kolom sebagai daftar, aksi di bawah. */
function KartuBaris<T>({ r, columns, aksi }: { r: T; columns: Column<T>[]; aksi?: ReactNode }) {
  const judul = columns.find((c) => c.peran === 'judul') ?? columns[0]
  const status = columns.find((c) => c.peran === 'status') ?? columns.find((c) => c.key === 'status')
  const isi = columns.filter((c) => c !== judul && c !== status)
  return (
    <article className="vsf-batch flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-[15px] font-bold text-tinta">{judul.render(r)}</div>
        {status && <div className="shrink-0">{status.render(r)}</div>}
      </div>
      <dl className="mt-3 grid gap-1.5 text-[13px]">
        {isi.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-3">
            <dt className="text-abu">{c.header}</dt>
            <dd className="text-right font-semibold tabular-nums text-tinta">{c.render(r)}</dd>
          </div>
        ))}
      </dl>
      {aksi && <div className="mt-auto flex flex-wrap justify-end gap-2 pt-3">{aksi}</div>}
    </article>
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
      className="inline-flex min-h-[44px] sm:min-h-[36px] items-center gap-1.5 rounded-full border border-arutmin-moss/45 bg-arutmin-mint/35 px-3 text-[12px] font-semibold text-arutmin-forest transition-colors hover:border-arutmin-moss hover:bg-arutmin-mint/70"
      onClick={onClick}
      aria-label={name ? `Ubah ${name}` : undefined}
    >
      <Ikon nama="ubah" className="h-3.5 w-3.5" />
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
      className="inline-flex min-h-[44px] sm:min-h-[36px] items-center gap-1.5 rounded-full vsf-tone-error px-3 text-[12px] font-semibold transition-colors hover:border-red-600 hover:bg-red-100"
      onClick={() => onPick(label, id)}
      aria-label={`Hapus ${label}`}
    >
      <Ikon nama="hapus" className="h-3.5 w-3.5" />
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
      className="inline-flex min-h-[44px] sm:min-h-[36px] items-center gap-1.5 rounded-full border border-navy/25 bg-white px-3 text-[12px] font-semibold text-navy transition-colors hover:border-navy/50 hover:bg-navy/[.06]"
      onClick={onClick}
      aria-label={`Detail ${name}`}
    >
      <Ikon nama="mata" className="h-3.5 w-3.5" />
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
    <div className="vsf-field-error" role="alert">
      {message}
    </div>
  )
}
