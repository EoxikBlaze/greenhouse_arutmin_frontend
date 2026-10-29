import { useState } from 'react'
import { useLocation } from 'react-router-dom'

/** tampil = splash menutup halaman; keluar = splash terbang ke hero; selesai = halaman biasa. */
export type FaseSplash = 'tampil' | 'keluar' | 'selesai'

/** Splash dilewati untuk gerak-dikurangi, tautan ber-hash (/#tim), dan ?splash=0. */
export function bolehSplash(hash: string, search: string, kurangiGerak: boolean): boolean {
  if (kurangiGerak || hash) return false
  return new URLSearchParams(search).get('splash') !== '0'
}

export function useSplash() {
  const { hash, search } = useLocation()
  // diputuskan sekali saat halaman dimuat — klik tautan bagian (#tim) tidak memunculkan splash
  const [awal] = useState(() => bolehSplash(hash, search, window.matchMedia('(prefers-reduced-motion: reduce)').matches))
  const [fase, setFase] = useState<FaseSplash>(awal ? 'tampil' : 'selesai')
  return { awal, fase, keluar: () => setFase('keluar'), selesai: () => setFase('selesai') }
}
