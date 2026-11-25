import React from 'react'
import { Text, View } from 'react-native'
import Svg, { Line, Polyline, Rect } from 'react-native-svg'
import { c } from './theme'

/** Grafik garis sederhana dengan pita rentang aman (min–max). Titik null dilewati. */
export function Garis({ titik, min, max, lebar = 320, tinggi = 140 }: {
  titik: (number | null)[]; min?: number; max?: number; lebar?: number; tinggi?: number
}) {
  const nilai = titik.filter((v): v is number => v != null)
  if (nilai.length < 2) return <Text style={{ color: c.abu }}>Belum cukup data untuk grafik.</Text>
  const lo = Math.min(...nilai, min ?? Infinity)
  const hi = Math.max(...nilai, max ?? -Infinity)
  const span = hi - lo || 1
  const y = (v: number) => tinggi - 8 - ((v - lo) / span) * (tinggi - 16)
  const x = (i: number) => 4 + (i / (titik.length - 1)) * (lebar - 8)
  const garis = titik.map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean).join(' ')
  return (
    <View>
      <Svg width="100%" height={tinggi} viewBox={`0 0 ${lebar} ${tinggi}`}>
        {min != null && max != null && (
          <Rect x={0} y={y(max)} width={lebar} height={Math.max(2, y(min) - y(max))} fill={c.mint} opacity={0.55} />
        )}
        <Line x1={0} y1={tinggi - 1} x2={lebar} y2={tinggi - 1} stroke={c.garis} />
        <Polyline points={garis} fill="none" stroke={c.forest} strokeWidth={2.2} strokeLinejoin="round" />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: c.abu, fontSize: 11 }}>terendah {lo.toFixed(1)}</Text>
        <Text style={{ color: c.abu, fontSize: 11 }}>tertinggi {hi.toFixed(1)}</Text>
      </View>
    </View>
  )
}
