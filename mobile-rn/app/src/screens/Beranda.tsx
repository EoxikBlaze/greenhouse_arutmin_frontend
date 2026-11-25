import React, { useCallback, useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { beranda, Beranda as Data, GalatApi } from '../api'
import { useAuth } from '../auth'
import { fmt, Ikon, Kartu, KotakGalat, Layar, Lencana, Judul, relatif } from '../ui'
import { bayang, c, r } from '../theme'

function Ubin({ nama, nilai, satuan, ikon, salah }: { nama: string; nilai: string; satuan: string; ikon: Ikon; salah?: boolean }) {
  return (
    <View style={{ width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: salah ? c.merah : c.garis }}>
      <Feather name={ikon} size={18} color={salah ? c.merah : c.olive} />
      <Text style={{ color: c.abu, fontSize: 12, marginTop: 8 }}>{nama}</Text>
      <Text style={{ color: salah ? c.merah : c.forest, fontSize: 26, fontWeight: '700' }}>
        {nilai}<Text style={{ fontSize: 13, color: c.abu }}> {satuan}</Text>
      </Text>
    </View>
  )
}

const PINTAS: { l: string; ikon: Ikon; ke: string; sub?: string }[] = [
  { l: 'Otomatis', ikon: 'sliders', ke: 'Otomatis' },
  { l: 'Kalibrasi', ikon: 'crosshair', ke: 'Kalibrasi' },
  { l: 'Uji Lab', ikon: 'droplet', ke: 'UjiLab' },
  { l: 'CCTV', ikon: 'video', ke: 'Cctv' },
  { l: 'Peringatan', ikon: 'bell', ke: 'Peringatan' },
  { l: 'Asisten AI', ikon: 'message-circle', ke: 'Asisten' },
]

export function BerandaLayar() {
  const nav = useNavigation<any>()
  const { pengguna } = useAuth()
  const [d, setD] = useState<Data | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [segar, setSegar] = useState(false)

  const muat = useCallback(async () => {
    try { setD(await beranda()); setGalat(null) }
    catch (e) { setGalat(e instanceof GalatApi ? e.message : 'Gagal memuat.') }
    finally { setSegar(false) }
  }, [])
  useEffect(() => { muat(); const t = setInterval(muat, 15000); return () => clearInterval(t) }, [muat])

  const s = d?.sensor?.sensor
  const salah = (k: string) => !!d?.sensor?.anomalies?.some((a) => a.sensor === k)
  const online = !!d?.sensor?.is_online
  const aktif = d?.peringatan?.aktif ?? d?.peringatan?.data?.filter((x) => x.sedang_terjadi).length ?? 0
  const siap = (d?.kebun?.list ?? []).filter((b) => b.siap)

  return (
    <Layar judul={`Halo, ${pengguna?.username ?? 'petani'}`} sub="Kondisi kebun hari ini" onRefresh={() => { setSegar(true); muat() }} menyegarkan={segar}>
      {galat && <KotakGalat pesan={galat} ulang={muat} />}

      <View style={{ backgroundColor: c.navy, borderRadius: 24, padding: 18, ...bayang }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: online ? c.moss : c.merah }} />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{online ? 'Alat terhubung' : 'Alat terputus'}</Text>
        </View>
        <Text style={{ color: '#9FB3C8', marginTop: 4 }}>
          {d?.sensor ? `Data terakhir ${relatif(d.sensor.seconds_ago)}` : 'Menunggu data…'}
          {d?.alat?.papan?.versi ? `  ·  firmware ${d.alat.papan.versi}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <Lencana teks={aktif ? `${aktif} peringatan aktif` : 'Tidak ada peringatan'} nada={aktif ? 'bahaya' : 'baik'} />
          {d?.sensor?.water_control && <Lencana teks={`Mode ${d.sensor.water_control.mode}`} nada="netral" />}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
        <Ubin nama="pH larutan" nilai={fmt(s?.ph, 2)} satuan="" ikon="droplet" salah={salah('ph')} />
        <Ubin nama="Nutrisi (TDS)" nilai={fmt(s?.tds, 0)} satuan="ppm" ikon="activity" salah={salah('tds')} />
        <Ubin nama="Suhu udara" nilai={fmt(s?.airTemp)} satuan="°C" ikon="thermometer" salah={salah('airTemp')} />
        <Ubin nama="Kelembapan" nilai={fmt(s?.humidity, 0)} satuan="%" ikon="cloud" salah={salah('humidity')} />
      </View>

      {siap.length > 0 && (
        <Kartu>
          <Judul>Siap dipindah / dipanen</Judul>
          {siap.map((b) => (
            <Text key={`${b.tipe}${b.id}`} style={{ color: c.tinta, paddingVertical: 3 }}>
              {b.varietas ?? 'Batch'} · {b.meja ?? ''} · tahap {b.tipe} hari ke-{b.hari_ke}
            </Text>
          ))}
          <Text onPress={() => nav.navigate('Kebun')} style={{ color: c.forest, fontWeight: '700', marginTop: 8 }}>Buka Kebun →</Text>
        </Kartu>
      )}

      <Kartu>
        <Judul>Operasikan alat</Judul>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {PINTAS.map((p) => (
            <Pressable key={p.ke} onPress={() => nav.navigate(p.ke)} style={{ width: '31%', alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: r.input, backgroundColor: c.page }}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={p.ikon} size={20} color={c.forest} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: c.tinta }}>{p.l}</Text>
            </Pressable>
          ))}
        </View>
      </Kartu>
    </Layar>
  )
}
