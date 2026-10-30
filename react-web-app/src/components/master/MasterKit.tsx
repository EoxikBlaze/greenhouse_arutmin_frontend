import type { ReactNode } from 'react'
import { Ikon } from '../Ikon'
import { DialogKaca, DialogKonfirmasi, Kosong, Pesan, Rangka } from '../kaca/DialogKaca'

/** Label ramah + satuan per kunci sensor; kunci data (ESP32) tidak diubah. */
export const SENSOR_INFO: Record<string, { label: string; satuan: string }> = {
  humidity: { label: 'Kelembapan', satuan: '%' },
  airTemp: { label: 'Suhu udara', satuan: '°C' },
  tds: { label: 'TDS', satuan: 'ppm' },
  ph: { label: 'pH', satuan: '' },
  waterTemp: { label: 'Suhu air', satuan: '°C' },
}

export type HapusTarget = { label: string; id: string }

/** Cangkang halaman Master Data: satu kartu kaca berjudul dengan aksi tambah (navigasi tab ada di topbar). */
export function MasterFrame({
  judul,
  deskripsi,
  jumlah,
  tambah,
  onTambah,
  flash,
  children,
}: {
  judul: string
  deskripsi: string
  jumlah?: string
  tambah?: string
  onTambah?: () => void
  flash?: string | null
  children: ReactNode
}) {
  return (
    <div className="vsf-halaman vsf-stagger">
      <section className="vsf-card min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="vsf-judul-bagian">
              {judul}
              {jumlah && <span className="ml-2 text-[12px] font-normal text-abu">{jumlah}</span>}
            </h2>
            <p className="mt-0.5 text-[13px] text-abu">{deskripsi}</p>
          </div>
          {tambah && onTambah && (
            <button type="button" className="vsf-btn-primary" onClick={onTambah}>
              <Ikon nama="tambah" className="h-4 w-4" />
              {tambah}
            </button>
          )}
        </div>
        {flash && <Pesan jenis="ok">{flash}</Pesan>}
        {children}
      </section>
    </div>
  )
}

export type KolomMaster<T> = {
  key: string
  header: string
  /** Rata kanan untuk angka. */
  kanan?: boolean
  render: (r: T) => ReactNode
}

/** Tabel kaca: baris = tint + rim (tanpa blur). Di HP tiap baris jadi kartu berlabel. */
export function TabelMaster<T>({
  kolom,
  rows,
  rowKey,
  aksi,
  memuat,
  galat,
  onUlang,
  kosong,
  label,
}: {
  kolom: KolomMaster<T>[]
  rows: T[]
  rowKey: (r: T) => string
  aksi?: (r: T) => ReactNode
  memuat: boolean
  galat: string | null
  onUlang: () => void
  kosong: string
  label: string
}) {
  if (memuat && rows.length === 0) return <Rangka />
  if (galat) {
    return (
      <Pesan jenis="galat">
        Gagal memuat data: {galat}{' '}
        <button type="button" className="vsf-btn-secondary vsf-btn-kecil ml-2" onClick={onUlang}>
          Muat ulang
        </button>
      </Pesan>
    )
  }
  if (rows.length === 0) return <Kosong>{kosong}</Kosong>
  return (
    <div className="vsf-master-tabel mt-4">
      <table aria-label={label}>
        <thead>
          <tr>
            {kolom.map((k) => (
              <th key={k.key} scope="col" className={k.kanan ? 'is-kanan' : undefined}>
                {k.header}
              </th>
            ))}
            {aksi && (
              <th scope="col" className="is-kanan">
                Aksi
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {kolom.map((k) => (
                <td key={k.key} data-label={k.header} className={k.kanan ? 'is-kanan' : undefined}>
                  {k.render(r)}
                </td>
              ))}
              {aksi && <td className="vsf-master-aksi">{aksi(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Tombol ikon Edit/Hapus; `terkunci` (mode demo) menonaktifkan dan menjelaskan alasannya. */
export function AksiBaris({
  nama,
  terkunci,
  alasan: alasanKunci = 'Mode demo hanya boleh menambah data',
  onUbah,
  onHapus,
}: {
  nama: string
  terkunci: boolean
  alasan?: string
  onUbah: () => void
  onHapus?: () => void
}) {
  const alasan = terkunci ? alasanKunci : undefined
  return (
    <>
      <button
        type="button"
        className="vsf-btn-secondary vsf-btn-kecil"
        disabled={terkunci}
        title={alasan}
        aria-label={`Ubah ${nama}`}
        onClick={onUbah}
      >
        <Ikon nama="ubah" className="h-4 w-4" />
        Ubah
      </button>
      {onHapus && (
        <button
          type="button"
          className="vsf-btn-secondary vsf-btn-kecil vsf-teks-bahaya"
          disabled={terkunci}
          title={alasan}
          aria-label={`Hapus ${nama}`}
          onClick={onHapus}
        >
          <Ikon nama="hapus" className="h-4 w-4" />
          Hapus
        </button>
      )}
    </>
  )
}

/** Popup form kaca: judul + sub, galat server, isi, Batal/Simpan. */
export function DialogMaster({
  judul,
  sub,
  galat,
  menyimpan,
  simpan = 'Simpan',
  onTutup,
  onSimpan,
  children,
}: {
  judul: string
  sub?: ReactNode
  galat: string | null
  menyimpan: boolean
  simpan?: string
  onTutup: () => void
  onSimpan: () => void
  children: ReactNode
}) {
  return (
    <DialogKaca judul={judul} sub={sub} lebar={460} sibuk={menyimpan} onTutup={onTutup} onSubmit={onSimpan}>
      {galat && <Pesan jenis="galat">{galat}</Pesan>}
      <div className="mt-4 grid gap-3">{children}</div>
      <div className="mt-5 flex justify-end gap-2 border-t border-garis pt-4">
        <button type="button" className="vsf-btn-secondary" disabled={menyimpan} onClick={onTutup}>
          Batal
        </button>
        <button type="submit" className="vsf-btn-primary" disabled={menyimpan}>
          {menyimpan && <span className="vsf-spinner" aria-hidden />}
          {menyimpan ? 'Menyimpan…' : simpan}
        </button>
      </div>
    </DialogKaca>
  )
}

export function DialogHapusMaster({
  target,
  menghapus,
  galat,
  onYa,
  onBatal,
}: {
  target: HapusTarget
  menghapus: boolean
  galat: string | null
  onYa: () => void
  onBatal: () => void
}) {
  return (
    <DialogKonfirmasi
      judul="Hapus data?"
      ya="Ya, hapus"
      sibukTeks="Menghapus…"
      bahaya
      sibuk={menghapus}
      galat={galat ?? undefined}
      onYa={onYa}
      onBatal={onBatal}
    >
      Konfirmasi menghapus <b>{target.label}</b>. Tindakan ini tidak bisa dibatalkan.
    </DialogKonfirmasi>
  )
}
