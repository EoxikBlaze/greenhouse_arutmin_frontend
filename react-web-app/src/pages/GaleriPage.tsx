import { useState } from 'react'
import { Ikon, type NamaIkon } from '../components/Ikon'
import { ModalBackdrop } from '../components/ModalBackdrop'
import { PageHeader } from '../components/PageHeader'

/** Halaman uji SEMENTARA desain v2 (dihapus di F5): komponen bersama berdampingan. */
const IKON: NamaIkon[] = [
  'dashboard', 'ai', 'sensor', 'air', 'dosing', 'tanam', 'cctv', 'siklus', 'daun', 'meja', 'ambang', 'laporan',
  'profil', 'user', 'audit', 'info', 'kalibrasi', 'tetes', 'peringatan', 'ok', 'salah', 'tambah', 'hapus', 'ubah',
]

export default function GaleriPage() {
  const [modal, setModal] = useState(false)
  return (
    <div className="mx-auto grid w-full max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        eyebrow="Galeri desain v2"
        judul="Komponen bersama"
        deskripsi="Glass asli hanya untuk sidebar, topbar, dan latar modal. Kartu = glass ringan; tabel, form, dan peringatan = solid."
        aksi={<button className="vsf-btn-primary" type="button" onClick={() => setModal(true)}>Buka modal</button>}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="vsf-card p-4 sm:p-5">
          <div className="vsf-eyebrow">Kartu glass ringan</div>
          <div className="mt-2 font-display text-[28px] font-bold text-tinta">6,20</div>
          <p className="mt-1 text-[13px] text-slate-600">batas aman 5–7 · perangkat online</p>
        </div>
        <div className="glass-dark p-4 sm:p-5">
          <div className="vsf-eyebrow vsf-eyebrow-light">Glass gelap (hero)</div>
          <div className="mt-2 font-display text-[28px] font-bold">850 ppm</div>
          <p className="mt-1 text-[13px] text-white/80">TDS nutrisi</p>
        </div>
        <div className="surface-solid p-4 sm:p-5">
          <div className="vsf-eyebrow">Permukaan solid</div>
          <p className="mt-2 text-[13px] text-slate-600">Dipakai untuk tabel, form, dan daftar panjang.</p>
        </div>
      </section>

      <section className="vsf-card grid gap-4 p-4 sm:p-5">
        <div className="vsf-eyebrow">Tombol, input, nada status</div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="vsf-btn-primary" type="button">Simpan</button>
          <button className="vsf-btn-secondary" type="button">Batal</button>
          <button className="vsf-btn-danger" type="button">Hapus</button>
          <input className="vsf-input min-w-[220px]" placeholder="Cari varietas…" aria-label="Cari varietas" />
        </div>
        <div className="vsf-tone-error rounded-std px-3 py-2 text-[13px]">Galat: koneksi ke server terputus.</div>
        <div className="vsf-tone-warn rounded-std px-3 py-2 text-[13px]">Peringatan: data sensor sudah 7 hari.</div>
      </section>

      <section className="vsf-card p-4 sm:p-5">
        <div className="vsf-eyebrow">Tabel (header ringan, isi solid)</div>
        <div className="mt-3 overflow-auto rounded-card border border-arutmin-border bg-white vsf-table">
          <table aria-label="Contoh tabel" className="w-full text-[13px]">
            <thead>
              <tr className="bg-navy/[.055] text-left">
                <th className="px-4 py-2.5">Meja</th><th className="px-4 py-2.5">Mode</th><th className="px-4 py-2.5">EC</th>
              </tr>
            </thead>
            <tbody>
              {['Selada', 'Peremajaan 1'].map((m) => (
                <tr key={m} className="border-t border-arutmin-border"><td className="px-4 py-2.5">{m}</td><td className="px-4 py-2.5">Otomatis</td><td className="px-4 py-2.5">—</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="vsf-card p-4 sm:p-5">
        <div className="vsf-eyebrow">Ikon (Lucide, garis 1.75)</div>
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-8 lg:grid-cols-12">
          {IKON.map((n) => (
            <div key={n} className="grid place-items-center gap-1 rounded-std bg-white/70 p-3 text-tinta">
              <Ikon nama={n} className="h-5 w-5" />
              <span className="text-[12px] text-slate-600">{n}</span>
            </div>
          ))}
        </div>
      </section>

      {modal && (
        <ModalBackdrop onMouseDown={() => setModal(false)}>
          <div role="dialog" aria-modal="true" aria-label="Contoh modal" className="vsf-modal-card w-full max-w-[420px] rounded-[28px] bg-white p-5" onMouseDown={(e) => e.stopPropagation()}>
            <div className="font-display text-[18px] font-bold">Contoh modal</div>
            <p className="mt-2 text-[13px] text-slate-600">Bingkai glass, isi putih solid.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="vsf-btn-secondary" type="button" onClick={() => setModal(false)}>Tutup</button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </div>
  )
}
