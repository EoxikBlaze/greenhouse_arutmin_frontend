import React, { useState } from 'react'
import { Text, View } from 'react-native'
import { useGet } from '../hooks'
import { fmt, Judul, Kartu, KotakGalat, Layar, Memuat, Segmen, tgl } from '../ui'
import { c } from '../theme'

type B = { ph: number | null; tds: number | null; airTemp: number | null; humidity: number | null; waterTemp: number | null; created_at: string }
const rata = (a: (number | null)[]) => { const v = a.filter((x): x is number => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null }
const hariKe = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }

export function LaporanLayar({ navigation }: { navigation: { goBack: () => void } }) {
  const [hari, setHari] = useState<'1' | '7' | '30'>('7')
  const g = useGet<{ data?: B[] } | B[]>(`monitoring/tarik?dari=${hariKe(Number(hari))}&sampai=${hariKe(-1)}&per_page=200`)
  const baris = Array.isArray(g.data) ? g.data : g.data?.data ?? []
  return (
    <Layar judul="Laporan" sub="Rata-rata sensor per periode" kembali={navigation.goBack} onRefresh={g.muat}>
      <Segmen nilai={hari} onUbah={setHari} pilihan={[{ k: '1', l: '1 hari' }, { k: '7', l: '7 hari' }, { k: '30', l: '30 hari' }]} />
      {g.memuat ? <Memuat /> : g.galat ? <KotakGalat pesan={g.galat} ulang={g.muat} /> : (
        <>
          <Kartu>
            <Judul>Rata-rata ({baris.length} bacaan)</Judul>
            {[['pH', rata(baris.map((b) => b.ph)), 2, ''], ['TDS', rata(baris.map((b) => b.tds)), 0, 'ppm'], ['Suhu udara', rata(baris.map((b) => b.airTemp)), 1, '°C'], ['Kelembapan', rata(baris.map((b) => b.humidity)), 0, '%'], ['Suhu air', rata(baris.map((b) => b.waterTemp)), 1, '°C']].map(([k, v, d, s]) => (
              <View key={String(k)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Text style={{ color: c.abu }}>{k}</Text>
                <Text style={{ color: c.forest, fontWeight: '700' }}>{fmt(v as number | null, d as number)} {s}</Text>
              </View>
            ))}
          </Kartu>
          <Kartu>
            <Judul>Bacaan terbaru</Judul>
            {baris.slice(0, 15).map((b, i) => (
              <Text key={i} style={{ color: c.tinta, paddingVertical: 3, fontSize: 13 }}>{tgl(b.created_at)} · pH {fmt(b.ph, 2)} · {fmt(b.tds, 0)} ppm · {fmt(b.airTemp)}°C</Text>
            ))}
          </Kartu>
        </>
      )}
    </Layar>
  )
}
