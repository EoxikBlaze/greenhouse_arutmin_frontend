import type { ReactNode } from 'react'
import { angkaId } from '../../lib/format'

/** Tabel gaya makalah: keterangan di atas ("Tabel 1. …"), isi, catatan kaki di bawah. */
export function TabelIlmiah({ nomor, judul, children, catatan }: { nomor: number; judul: ReactNode; children: ReactNode; catatan?: ReactNode }) {
  return (
    <figure className="vsf-ilmiah-blok">
      <figcaption className="vsf-ilmiah-keterangan"><b>Tabel {nomor}.</b> {judul}</figcaption>
      <div className="vsf-ilmiah-tabel-bungkus">{children}</div>
      {catatan && <div className="vsf-ilmiah-catatan">{catatan}</div>}
    </figure>
  )
}

/** Gambar: isi di atas, keterangan di bawah ("Gambar 1. …"). */
export function GambarIlmiah({ nomor, judul, children }: { nomor: number; judul: ReactNode; children: ReactNode }) {
  return (
    <figure className="vsf-ilmiah-blok">
      <div className="vsf-ilmiah-gambar">{children}</div>
      <figcaption className="vsf-ilmiah-keterangan mt-1"><b>Gambar {nomor}.</b> {judul}</figcaption>
    </figure>
  )
}

/** Kotak "Ringkasan temuan": kalimat yang disusun otomatis dari angka pada halaman. */
export function Temuan({ butir }: { butir: string[] }) {
  if (!butir.length) return null
  return (
    <div className="vsf-ilmiah-temuan" role="note" aria-label="Ringkasan temuan">
      <b>Ringkasan temuan</b>
      <ul>{butir.map((b, i) => <li key={i}>{b}</li>)}</ul>
    </div>
  )
}

/** Nilai p: "< 0,001" atau tiga desimal; "—" bila tidak ada. */
export function teksP(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return '—'
  return p < 0.001 ? '< 0,001' : angkaId(p, 3)
}

/** "6,52 [6,40; 6,61]" — angka dengan selang kepercayaannya. */
export function teksCI(nilai: number | null | undefined, bawah: number | null | undefined, atas: number | null | undefined, d: number): string {
  if (nilai == null || !Number.isFinite(nilai)) return '—'
  if (bawah == null || atas == null) return angkaId(nilai, d)
  return `${angkaId(nilai, d)} [${angkaId(bawah, d)}; ${angkaId(atas, d)}]`
}

/** "6,5 (6,2–6,8)" — median dengan kuartil bawah dan atas. */
export function teksMedianIqr(s: { median: number; q1: number; q3: number } | null | undefined, d: number): string {
  return s ? `${angkaId(s.median, d)} (${angkaId(s.q1, d)}–${angkaId(s.q3, d)})` : '—'
}

export const angka = (v: number | null | undefined, d: number): string => (v == null || !Number.isFinite(v) ? '—' : angkaId(v, d))

/** Peringatan ukuran sampel kecil di bawah tabel. */
export function CatatanSampel({ n, minimal = 6 }: { n: number; minimal?: number }) {
  return n < minimal ? <> Sampel kecil (n = {n}): hasil bersifat petunjuk awal, belum dapat disimpulkan.</> : null
}
