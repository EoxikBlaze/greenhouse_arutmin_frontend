import { useEffect, useState } from 'react'
import { api } from './api'

/** Batas yang sama dengan backend (src/fotoProfil.js): maks 512 KB, hanya PNG/JPEG/WebP. */
export const BATAS_FOTO_BYTE = 512 * 1024
export const TIPE_FOTO_OK = ['image/png', 'image/jpeg', 'image/webp'] as const

/** Ukuran akhir dengan sisi terpanjang <= [maks], rasio tetap, tidak pernah diperbesar. */
export function ukuranKecil(lebar: number, tinggi: number, maks = 512): { lebar: number; tinggi: number } {
  const terpanjang = Math.max(lebar, tinggi)
  if (terpanjang <= maks || terpanjang <= 0) return { lebar, tinggi }
  const skala = maks / terpanjang
  return { lebar: Math.max(1, Math.round(lebar * skala)), tinggi: Math.max(1, Math.round(tinggi * skala)) }
}

export function tipeFotoDiizinkan(tipe: string): boolean {
  return (TIPE_FOTO_OK as readonly string[]).includes(tipe)
}

/** Kecilkan gambar ke JPEG di bawah batas unggah. Melempar Error berpesan jelas bila gagal. */
export async function kecilkanFoto(file: File, maks = 512): Promise<Blob> {
  if (!tipeFotoDiizinkan(file.type)) throw new Error('Pilih gambar PNG, JPEG, atau WebP.')
  const bmp = await createImageBitmap(file)
  const { lebar, tinggi } = ukuranKecil(bmp.width, bmp.height, maks)
  const kanvas = document.createElement('canvas')
  kanvas.width = lebar
  kanvas.height = tinggi
  const ctx = kanvas.getContext('2d')
  if (!ctx) throw new Error('Peramban tidak mendukung pengolahan gambar.')
  ctx.drawImage(bmp, 0, 0, lebar, tinggi)
  bmp.close()
  for (const mutu of [0.88, 0.8, 0.7, 0.6, 0.5]) {
    const blob = await new Promise<Blob | null>((ok) => kanvas.toBlob(ok, 'image/jpeg', mutu))
    if (blob && blob.size <= BATAS_FOTO_BYTE - 4096) return blob
  }
  throw new Error('Foto terlalu besar. Pilih gambar yang lebih kecil.')
}

/** Unggah foto akun sendiri (isi permintaan = berkas mentah). Mengembalikan foto_versi baru. */
export async function unggahFoto(file: File): Promise<number | null> {
  const blob = await kecilkanFoto(file)
  const res = await api.post('/profil/foto', blob, { headers: { 'Content-Type': blob.type } })
  const versi = (res.data as { foto_versi?: unknown })?.foto_versi
  return typeof versi === 'number' ? versi : null
}

export async function hapusFoto(): Promise<void> {
  await api.delete('/profil/foto')
}

/**
 * Muat foto akun sendiri sebagai blob-URL. Header `<img>` tidak bisa membawa Bearer,
 * jadi dimuat lewat axios. [ada] false = belum punya foto, tanpa permintaan jaringan.
 */
export function useFotoProfil(ada: boolean | undefined, versi: number | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!ada) return
    let batal = false
    let objek: string | null = null
    api
      .get('/profil/foto', { responseType: 'blob' })
      .then((r) => {
        if (batal) return
        objek = URL.createObjectURL(r.data as Blob)
        setUrl(objek)
      })
      .catch(() => {
        if (!batal) setUrl(null)
      })
    return () => {
      batal = true
      if (objek) URL.revokeObjectURL(objek)
    }
  }, [ada, versi])
  return ada ? url : null
}
