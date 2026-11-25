import React, { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../auth'
import { GalatApi } from '../api'
import { Isian, Kartu, Tombol } from '../ui'
import { c } from '../theme'

export function Login() {
  const { masuk, server } = useAuth()
  const { top } = useSafeAreaInsets()
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [srv, setSrv] = useState(server)
  const [lanjut, setLanjut] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  async function kirim() {
    if (!u.trim() || !p) { setGalat('Isi nama pengguna dan kata sandi.'); return }
    setSibuk(true); setGalat(null)
    try {
      await masuk(u, p, srv.trim())
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : 'Gagal masuk.')
    } finally { setSibuk(false) }
  }

  return (
    <LinearGradient colors={[c.navy, c.navy2]} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 22, paddingTop: top + 22 }} keyboardShouldPersistTaps="handled">
          <View style={{ marginBottom: 28 }}>
            <Text style={{ color: c.emas, fontWeight: '700', letterSpacing: 3, fontSize: 13 }}>VERTONIK SMART FARM</Text>
            <Text style={{ color: '#fff', fontSize: 40, fontWeight: '800', marginTop: 6 }}>GARAP</Text>
            <Text style={{ color: '#9FB3C8', marginTop: 4, fontSize: 15 }}>Teman petani di greenhouse hidroponik</Text>
          </View>
          <Kartu style={{ gap: 14 }}>
            <Isian label="Nama pengguna" value={u} onChangeText={setU} autoComplete="username" />
            <Isian label="Kata sandi" value={p} onChangeText={setP} secureTextEntry autoComplete="password" onSubmitEditing={kirim} />
            {lanjut && <Isian label="Alamat gateway" value={srv} onChangeText={setSrv} keyboardType="url" />}
            {galat && <Text style={{ color: c.merah, fontWeight: '600' }}>{galat}</Text>}
            <Tombol label="Masuk" onPress={kirim} sibuk={sibuk} ikon="log-in" />
            <Text onPress={() => setLanjut(!lanjut)} style={{ color: c.abu, textAlign: 'center', fontSize: 13 }}>
              {lanjut ? 'Sembunyikan pengaturan server' : 'Pengaturan server'}
            </Text>
          </Kartu>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}
