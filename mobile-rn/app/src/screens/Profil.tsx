import React, { useState } from 'react'
import { useAuth } from '../auth'
import { kirim } from '../api'
import { useAksi } from '../hooks'
import { Baris, Info, Isian, Judul, Kartu, KotakGalat, Layar, Tombol } from '../ui'

export function ProfilLayar({ navigation }: { navigation: { goBack: () => void } }) {
  const { pengguna, keluar } = useAuth()
  const aksi = useAksi()
  const [lama, setLama] = useState('')
  const [baru, setBaru] = useState('')
  const [ulang, setUlang] = useState('')

  const ganti = () => aksi.jalan('sandi', async () => {
    if (baru.length < 8) throw new Error('Kata sandi baru minimal 8 karakter.')
    if (baru !== ulang) throw new Error('Konfirmasi kata sandi tidak cocok.')
    await kirim('profil/password', { password_lama: lama, password: baru, password_confirmation: ulang })
    setLama(''); setBaru(''); setUlang('')
    return 'Kata sandi diganti.'
  })

  return (
    <Layar judul="Profil" sub="Akun dan keamanan" kembali={navigation.goBack}>
      <Kartu>
        <Baris k="Nama pengguna" v={pengguna?.username ?? '—'} />
        <Baris k="Email" v={pengguna?.email ?? '—'} />
        <Baris k="Peran" v={pengguna?.level ?? '—'} />
      </Kartu>
      <Kartu style={{ gap: 12 }}>
        <Judul>Ganti kata sandi</Judul>
        {aksi.pesan && <Info teks={aksi.pesan} />}
        {aksi.galat && <KotakGalat pesan={aksi.galat} />}
        <Isian label="Kata sandi lama" value={lama} onChangeText={setLama} secureTextEntry />
        <Isian label="Kata sandi baru" value={baru} onChangeText={setBaru} secureTextEntry />
        <Isian label="Ulangi kata sandi baru" value={ulang} onChangeText={setUlang} secureTextEntry />
        <Tombol label="Simpan" onPress={ganti} sibuk={aksi.sibuk === 'sandi'} mati={!!pengguna?.is_demo} />
      </Kartu>
      <Tombol label="Keluar" ikon="log-out" variasi="bahaya" onPress={() => { void keluar() }} />
    </Layar>
  )
}
