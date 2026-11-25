import React, { ReactNode } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { bayang, c, r } from './theme'

export type Ikon = React.ComponentProps<typeof Feather>['name']

export function Layar({ judul, sub, children, onRefresh, menyegarkan, kembali }: {
  judul: string; sub?: string; children: ReactNode; onRefresh?: () => void; menyegarkan?: boolean; kembali?: () => void
}) {
  const { top } = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: c.page }}>
      <LinearGradient colors={[c.navy, c.navy2]} style={[s.kepala, { paddingTop: top + 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {kembali && (
            <Pressable onPress={kembali} hitSlop={12} accessibilityLabel="Kembali">
              <Feather name="chevron-left" size={26} color="#fff" />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.judul}>{judul}</Text>
            {sub ? <Text style={s.sub}>{sub}</Text> : null}
          </View>
        </View>
      </LinearGradient>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!menyegarkan} onRefresh={onRefresh} tintColor={c.forest} /> : undefined}
      >
        {children}
      </ScrollView>
    </View>
  )
}

export const Kartu = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => <View style={[s.kartu, style]}>{children}</View>

export const Judul = ({ children }: { children: ReactNode }) => <Text style={s.h2}>{children}</Text>

export function Tombol({ label, onPress, ikon, variasi = 'utama', sibuk, mati }: {
  label: string; onPress: () => void; ikon?: Ikon; variasi?: 'utama' | 'tepi' | 'bahaya'; sibuk?: boolean; mati?: boolean
}) {
  const bahaya = variasi === 'bahaya'
  const tepi = variasi === 'tepi'
  const warna = tepi ? c.forest : '#fff'
  return (
    <Pressable
      onPress={onPress}
      disabled={sibuk || mati}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.tombol,
        { backgroundColor: bahaya ? c.merah : tepi ? 'transparent' : c.forest, borderWidth: tepi ? 1.5 : 0, borderColor: c.forest },
        (mati || sibuk) && { opacity: 0.5 }, pressed && { opacity: 0.8 },
      ]}
    >
      {sibuk ? <ActivityIndicator color={warna} /> : ikon ? <Feather name={ikon} size={18} color={warna} /> : null}
      <Text style={[s.tombolTeks, { color: warna }]}>{label}</Text>
    </Pressable>
  )
}

export function Isian({ label, ...p }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#8A97A8" autoCapitalize="none" {...p} style={[s.isian, p.style]} />
    </View>
  )
}

export function Lencana({ teks, nada }: { teks: string; nada: 'baik' | 'waspada' | 'bahaya' | 'netral' }) {
  const w = { baik: [c.mint, c.forest], waspada: ['#FBEFCB', '#7A5A0A'], bahaya: ['#F6D5D0', c.merah], netral: ['#E6EBF0', c.abu] }[nada]
  return (
    <View style={{ backgroundColor: w[0], paddingHorizontal: 10, paddingVertical: 4, borderRadius: r.pil, alignSelf: 'flex-start' }}>
      <Text style={{ color: w[1], fontSize: 12, fontWeight: '700' }}>{teks}</Text>
    </View>
  )
}

export function Segmen<T extends string>({ nilai, pilihan, onUbah }: { nilai: T; pilihan: { k: T; l: string }[]; onUbah: (k: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {pilihan.map((p) => (
        <Pressable key={p.k} onPress={() => onUbah(p.k)} style={[s.segmen, nilai === p.k && { backgroundColor: c.forest, borderColor: c.forest }]}>
          <Text style={{ color: nilai === p.k ? '#fff' : c.tinta, fontWeight: '600', fontSize: 13 }}>{p.l}</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

export const Memuat = () => <ActivityIndicator color={c.forest} style={{ marginVertical: 24 }} />

export function KotakGalat({ pesan, ulang }: { pesan: string; ulang?: () => void }) {
  return (
    <Kartu style={{ borderColor: '#F0C4BE', borderWidth: 1 }}>
      <Text style={{ color: c.merah, fontWeight: '700' }}>Gagal memuat</Text>
      <Text style={{ color: c.abu, marginTop: 4 }}>{pesan}</Text>
      {ulang ? <View style={{ marginTop: 10 }}><Tombol label="Coba lagi" variasi="tepi" onPress={ulang} /></View> : null}
    </Kartu>
  )
}

export const Info = ({ teks }: { teks: string }) => (
  <View style={{ backgroundColor: c.mint, padding: 12, borderRadius: r.input }}>
    <Text style={{ color: c.forest, fontWeight: '600' }}>{teks}</Text>
  </View>
)

export const Baris = ({ k, v }: { k: string; v: ReactNode }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 }}>
    <Text style={{ color: c.abu }}>{k}</Text>
    <Text style={{ color: c.tinta, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{v}</Text>
  </View>
)

export const fmt = (n: number | null | undefined, d = 1) => (n == null || Number.isNaN(n) ? '—' : n.toFixed(d).replace('.', ','))

export function relatif(detik: number): string {
  if (detik < 90) return `${Math.round(detik)} dtk lalu`
  if (detik < 5400) return `${Math.round(detik / 60)} mnt lalu`
  if (detik < 172800) return `${Math.round(detik / 3600)} jam lalu`
  return `${Math.round(detik / 86400)} hari lalu`
}

export const tgl = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

const s = StyleSheet.create({
  kepala: { paddingHorizontal: 18, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  judul: { color: '#fff', fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  sub: { color: '#9FB3C8', marginTop: 2, fontSize: 13 },
  kartu: { backgroundColor: c.kartu, borderRadius: r.kartu, padding: 16, borderWidth: 1, borderColor: c.garis, ...bayang },
  h2: { fontSize: 17, fontWeight: '700', color: c.tinta, marginBottom: 8 },
  tombol: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 18, borderRadius: r.pil },
  tombolTeks: { fontWeight: '700', fontSize: 15 },
  label: { color: c.abu, fontSize: 13, fontWeight: '600' },
  isian: { borderWidth: 1, borderColor: '#D7E0D2', backgroundColor: '#fff', borderRadius: r.input, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.tinta },
  segmen: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: r.pil, borderWidth: 1, borderColor: c.garis, backgroundColor: '#fff' },
})
