import { useEffect, useMemo, useState } from 'react'
import { galatTanggal, geserTanggal, hitungRentang, type Rentang, type RentangMs, type RentangTanggal } from './riwayatSensor'
import { tanggalIso } from './format'

/**
 * Keadaan pengatur rentang waktu (dipakai kartu RentangRiwayat): preset, pilih tanggal, geser, dan penanganan galat.
 * `r` = rentang dalam ms (null sebelum waktu sekarang siap atau bila tanggal belum sah). Diperbarui tiap 60 detik.
 */
export function useRentangWaktu(awal: Rentang = '7 Hari') {
  const [rentang, setRentang] = useState<Rentang>(awal)
  const [dari, setDari] = useState(() => tanggalIso(Date.now()))
  const [sampai, setSampai] = useState(() => tanggalIso(Date.now()))
  const [tglAktif, setTglAktif] = useState<RentangTanggal | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [kini, setKini] = useState(0)

  useEffect(() => {
    const tick = () => setKini(Date.now())
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  const r: RentangMs | null = useMemo(() => hitungRentang(rentang, tglAktif, kini), [rentang, tglAktif, kini])

  function pilih(baru: Rentang) {
    setRentang(baru)
    setGalat(null)
    if (baru === 'Pilih tanggal' && !tglAktif) setTglAktif({ dari, sampai })
  }
  function terapkan() {
    const g = galatTanggal(dari, sampai)
    setGalat(g)
    if (!g) setTglAktif({ dari, sampai })
  }
  function geser(arah: -1 | 1) {
    const baru = geserTanggal(tglAktif ?? { dari, sampai }, arah)
    setDari(baru.dari)
    setSampai(baru.sampai)
    const g = galatTanggal(baru.dari, baru.sampai)
    setGalat(g)
    if (!g) setTglAktif(baru)
  }
  const bisaBerikutnya = (tglAktif ?? { dari, sampai }).sampai < tanggalIso(kini || Date.now())

  return { rentang, pilih, dari, sampai, setDari, setSampai, terapkan, geser, bisaBerikutnya, galat, r }
}
