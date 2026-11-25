import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Ikon, Kartu, Layar } from '../ui'
import { c } from '../theme'

const MENU: { l: string; ket: string; ikon: Ikon; ke: string }[] = [
  { l: 'Otomatis alat', ket: 'Saklar otomasi, STOP pompa', ikon: 'sliders', ke: 'Otomatis' },
  { l: 'Kalibrasi', ket: 'Jadwal & kalibrasi pH/EC', ikon: 'crosshair', ke: 'Kalibrasi' },
  { l: 'Uji Lab', ket: 'Uji kekuatan larutan', ikon: 'droplet', ke: 'UjiLab' },
  { l: 'CCTV', ket: 'Pantau kebun lewat kamera', ikon: 'video', ke: 'Cctv' },
  { l: 'Peringatan', ket: 'Kejadian & buka kunci', ikon: 'bell', ke: 'Peringatan' },
  { l: 'Asisten AI', ket: 'Tanya dan minta saran', ikon: 'message-circle', ke: 'Asisten' },
  { l: 'Laporan', ket: 'Rata-rata sensor', ikon: 'file-text', ke: 'Laporan' },
  { l: 'Profil', ket: 'Akun, sandi, keluar', ikon: 'user', ke: 'Profil' },
]

export function LainnyaLayar({ navigation }: { navigation: { navigate: (k: string) => void } }) {
  return (
    <Layar judul="Menu" sub="Semua fitur petani">
      <Kartu style={{ padding: 4 }}>
        {MENU.map((m, i) => (
          <Pressable key={m.ke} onPress={() => navigation.navigate(m.ke)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderTopWidth: i ? 1 : 0, borderColor: c.garis }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={m.ikon} size={19} color={c.forest} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: c.tinta, fontSize: 15 }}>{m.l}</Text>
              <Text style={{ color: c.abu, fontSize: 12 }}>{m.ket}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={c.abu} />
          </Pressable>
        ))}
      </Kartu>
    </Layar>
  )
}
