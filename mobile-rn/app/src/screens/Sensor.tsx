import React, { useState } from 'react'
import { Text, View } from 'react-native'
import { Garis } from '../chart'
import { useGet } from '../hooks'
import { SensorTerbaru } from '../api'
import { fmt, Judul, Kartu, KotakGalat, Layar, Memuat, Segmen, relatif, Lencana } from '../ui'
import { c } from '../theme'

type Bacaan = { waterTemp: number | null; ph: number | null; tds: number | null; airTemp: number | null; humidity: number | null; created_at: string }
const PARAM = [
  { k: 'ph', l: 'pH', sat: '', d: 2 }, { k: 'tds', l: 'TDS', sat: 'ppm', d: 0 }, { k: 'airTemp', l: 'Suhu udara', sat: '°C', d: 1 },
  { k: 'humidity', l: 'Lembap', sat: '%', d: 0 }, { k: 'waterTemp', l: 'Suhu air', sat: '°C', d: 1 },
] as const
type K = (typeof PARAM)[number]['k']

export function SensorLayar() {
  const live = useGet<SensorTerbaru>('api/latest-sensor', 5000)
  const riwayat = useGet<Bacaan[] | { data: Bacaan[] }>('monitoring/chart-data', 60000)
  const [k, setK] = useState<K>('ph')
  const baris = (Array.isArray(riwayat.data) ? riwayat.data : riwayat.data?.data ?? []).slice().reverse()
  const p = PARAM.find((x) => x.k === k)!
  const anom = live.data?.anomalies?.find((a) => a.sensor === k)
  const s = live.data?.sensor

  return (
    <Layar judul="Sensor" sub={live.data ? `${live.data.is_online ? 'Langsung' : 'Terputus'} · ${relatif(live.data.seconds_ago)}` : 'Memuat…'}
      onRefresh={() => { live.muat(); riwayat.muat() }}>
      {live.galat && <KotakGalat pesan={live.galat} ulang={live.muat} />}
      <Kartu>
        {PARAM.map((x) => {
          const a = live.data?.anomalies?.find((z) => z.sensor === x.k)
          return (
            <View key={x.k} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderColor: c.garis }}>
              <Text style={{ color: c.tinta, fontSize: 15 }}>{x.l}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: a ? c.merah : c.forest, fontWeight: '700', fontSize: 18 }}>{fmt(s?.[x.k], x.d)} {x.sat}</Text>
                {a && <Lencana teks={`di luar ${a.min}–${a.max}`} nada="bahaya" />}
              </View>
            </View>
          )
        })}
        {s?.water_level ? <Text style={{ color: c.abu, marginTop: 8 }}>Level air: {s.water_level}</Text> : null}
      </Kartu>

      <Kartu>
        <Judul>Grafik 24 jam terakhir</Judul>
        <Segmen nilai={k} onUbah={setK} pilihan={PARAM.map((x) => ({ k: x.k, l: x.l }))} />
        <View style={{ marginTop: 12 }}>
          {riwayat.memuat ? <Memuat /> : riwayat.galat ? <Text style={{ color: c.merah }}>{riwayat.galat}</Text> :
            <Garis titik={baris.map((b) => b[k])} min={anom?.min} max={anom?.max} />}
        </View>
      </Kartu>
    </Layar>
  )
}
