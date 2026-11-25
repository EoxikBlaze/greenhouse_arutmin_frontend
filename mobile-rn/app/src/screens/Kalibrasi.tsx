import React, { useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { kirim, StateAlat } from '../api'
import { useAksi, useGet } from '../hooks'
import { Info, Judul, Kartu, KotakGalat, Layar, Lencana, Memuat, Segmen, Tombol, tgl } from '../ui'
import { c } from '../theme'

type Alat = { sensor: string; label: string; status: string; jatuh_tempo?: string | null; terakhir_dikalibrasi?: string | null; larutan_ref?: string | null }
const NADA: Record<string, 'baik' | 'waspada' | 'bahaya' | 'netral'> = { aman: 'baik', segera: 'waspada', terlambat: 'bahaya', belum: 'waspada' }

export function KalibrasiLayar({ navigation }: { navigation: { goBack: () => void } }) {
  const jadwal = useGet<Alat[] | { data: Alat[] }>('kalibrasi')
  const st = useGet<StateAlat>('iot-v41/state', 10000)
  const aksi = useAksi()
  const [sensor, setSensor] = useState<'ph' | 'ec'>('ph')
  const [titik, setTitik] = useState<'1' | '2'>('1')
  const daftar = Array.isArray(jadwal.data) ? jadwal.data : jadwal.data?.data ?? []

  const kirimKal = (a: 'UKUR' | 'SIMPAN' | 'BATAL') => {
    const jalan = () => aksi.jalan(a, async () => {
      await kirim('iot-v41/kal-sensor', { sensor, titik: Number(titik), aksi: a }); st.muat()
      return `Perintah ${a} titik ${titik} dikirim. Tunggu alat menjawab.`
    })
    if (a === 'SIMPAN') Alert.alert('Simpan kalibrasi?', 'Pastikan probe sudah stabil di larutan standar.', [{ text: 'Batal', style: 'cancel' }, { text: 'Simpan', onPress: jalan }])
    else jalan()
  }

  return (
    <Layar judul="Kalibrasi" sub="Jadwal dan kalibrasi sensor langsung" kembali={navigation.goBack} onRefresh={() => { jadwal.muat(); st.muat() }}>
      {aksi.pesan && <Info teks={aksi.pesan} />}
      {aksi.galat && <KotakGalat pesan={aksi.galat} />}

      <Kartu>
        <Judul>Kalibrasi pH / EC</Judul>
        <Text style={{ color: c.abu, marginBottom: 10 }}>
          Celup probe ke larutan standar, tekan UKUR sampai bacaan stabil, lalu SIMPAN. Ulangi untuk titik berikutnya. pH memakai buffer 4,01 dan 6,86.
        </Text>
        <Segmen nilai={sensor} onUbah={setSensor} pilihan={[{ k: 'ph', l: 'pH' }, { k: 'ec', l: 'EC' }]} />
        <View style={{ height: 8 }} />
        <Segmen nilai={titik} onUbah={setTitik} pilihan={[{ k: '1', l: 'Titik 1' }, { k: '2', l: 'Titik 2' }]} />
        <View style={{ gap: 8, marginTop: 14 }}>
          <Tombol label="UKUR" ikon="activity" onPress={() => kirimKal('UKUR')} sibuk={aksi.sibuk === 'UKUR'} />
          <Tombol label="SIMPAN" ikon="check" variasi="tepi" onPress={() => kirimKal('SIMPAN')} sibuk={aksi.sibuk === 'SIMPAN'} />
          <Tombol label="BATAL" ikon="x" variasi="tepi" onPress={() => kirimKal('BATAL')} sibuk={aksi.sibuk === 'BATAL'} />
        </View>
      </Kartu>

      <Kartu>
        <Judul>Jadwal alat</Judul>
        {jadwal.memuat ? <Memuat /> : jadwal.galat ? <Text style={{ color: c.abu }}>{jadwal.galat}</Text> :
          daftar.map((a) => (
            <View key={a.sensor} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: c.garis, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '700', color: c.tinta }}>{a.label ?? a.sensor}</Text>
                <Lencana teks={a.status} nada={NADA[a.status] ?? 'netral'} />
              </View>
              <Text style={{ color: c.abu, fontSize: 12 }}>Terakhir {tgl(a.terakhir_dikalibrasi)} · jatuh tempo {tgl(a.jatuh_tempo)}</Text>
            </View>
          ))}
      </Kartu>

      <Kartu>
        <Judul>Arsip kalibrasi</Judul>
        {(st.data?.arsip_kalibrasi ?? []).slice(0, 8).map((x) => (
          <Text key={x.id} style={{ color: c.tinta, paddingVertical: 3 }}>{tgl(x.dilakukan_pada)} · {x.sensor}{x.lulus === false ? ' · tidak lulus' : ''}</Text>
        ))}
        {!(st.data?.arsip_kalibrasi ?? []).length && <Text style={{ color: c.abu }}>Belum ada arsip.</Text>}
      </Kartu>
    </Layar>
  )
}
