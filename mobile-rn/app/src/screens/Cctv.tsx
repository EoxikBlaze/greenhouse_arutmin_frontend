import React, { useEffect, useState } from 'react'
import { Image, Text } from 'react-native'
import { useGet } from '../hooks'
import { Kartu, KotakGalat, Layar, Lencana, Memuat } from '../ui'
import { c } from '../theme'

type Kamera = { id: number | string; nama: string; lokasi: string | null; tipe: 'mjpeg' | 'snapshot' | 'rtsp'; url: string | null; interval_detik: number; aktif: boolean }

function Gambar({ k }: { k: Kamera }) {
  const [t, setT] = useState(Date.now())
  const [gagal, setGagal] = useState(false)
  useEffect(() => {
    const i = setInterval(() => setT(Date.now()), Math.max(2, k.interval_detik || 5) * 1000)
    return () => clearInterval(i)
  }, [k.interval_detik])
  if (!k.aktif) return <Lencana teks="Nonaktif" nada="netral" />
  if (k.tipe === 'rtsp' || !k.url) return <Text style={{ color: c.abu }}>Kamera RTSP tidak bisa ditampilkan di app ini. Buka lewat web.</Text>
  if (!k.url.startsWith('https://')) return <Text style={{ color: c.abu }}>Alamat kamera bukan HTTPS, diblokir demi keamanan.</Text>
  return (
    <>
      <Image source={{ uri: `${k.url}${k.url.includes('?') ? '&' : '?'}_t=${t}` }} resizeMode="cover" onError={() => setGagal(true)} onLoad={() => setGagal(false)}
        style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 14, backgroundColor: '#0B1A2B' }} />
      {gagal && <Lencana teks="Gambar terputus" nada="bahaya" />}
    </>
  )
}

export function CctvLayar({ navigation }: { navigation: { goBack: () => void } }) {
  const g = useGet<Kamera[] | { data: Kamera[] }>('cctv')
  const daftar = Array.isArray(g.data) ? g.data : g.data?.data ?? []
  return (
    <Layar judul="CCTV" sub="Gambar diperbarui otomatis" kembali={navigation.goBack} onRefresh={g.muat}>
      {g.memuat ? <Memuat /> : g.galat ? <KotakGalat pesan={g.galat} ulang={g.muat} /> :
        !daftar.length ? <Kartu><Text style={{ color: c.abu }}>Belum ada kamera terdaftar.</Text></Kartu> :
          daftar.map((k) => (
            <Kartu key={k.id} style={{ gap: 8 }}>
              <Text style={{ fontWeight: '700', color: c.tinta, fontSize: 16 }}>{k.nama}</Text>
              {k.lokasi ? <Text style={{ color: c.abu }}>{k.lokasi}</Text> : null}
              <Gambar k={k} />
            </Kartu>
          ))}
    </Layar>
  )
}
