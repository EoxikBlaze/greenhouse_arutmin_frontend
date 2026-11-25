import React from 'react'
import { Alert, Text, View } from 'react-native'
import { BarisAlert, kirim } from '../api'
import { useAksi, useGet } from '../hooks'
import { Info, Kartu, KotakGalat, Layar, Lencana, Memuat, Tombol, tgl } from '../ui'
import { c } from '../theme'

const BISA_DIBUKA = ['kunci_isi_sering', 'kunci_isi_timeout', 'kunci_pompa_kelamaan', 'kunci_ec_curiga']
const judul = (t: string) => t.startsWith('kunci_') ? `Kunci ${t.slice(6).replace(/_/g, ' ')}` : t.replace(/_/g, ' ')

export function PeringatanLayar({ navigation }: { navigation: { goBack: () => void } }) {
  const g = useGet<{ data?: BarisAlert[]; aktif?: number }>('alert-logs', 15000)
  const aksi = useAksi()
  const daftar = g.data?.data ?? []
  const aktif = daftar.filter((a) => a.sedang_terjadi)
  const riwayat = daftar.filter((a) => !a.sedang_terjadi).slice(0, 25)

  const ack = (id: BarisAlert['id']) => aksi.jalan(`a${id}`, async () => { await kirim(`alert-logs/${id}/ack`); g.muat(); return 'Ditandai sudah dibaca.' })
  const bukaKunci = () => Alert.alert('Buka kunci alat?', 'Pastikan penyebabnya sudah diperiksa.', [
    { text: 'Batal', style: 'cancel' },
    { text: 'Buka kunci', onPress: () => aksi.jalan('kunci', async () => { await kirim('api/aktuator/buka-kunci', { alasan: 'Buka kunci alat dari app petani' }); g.muat(); return 'Perintah buka kunci dikirim.' }) },
  ])

  const Baris = ({ a }: { a: BarisAlert }) => (
    <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.garis, gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontWeight: '700', color: c.tinta, flex: 1 }}>{judul(a.type)}</Text>
        <Lencana teks={a.severity === 'critical' ? 'merah' : a.severity === 'warning' ? 'kuning' : 'info'} nada={a.severity === 'critical' ? 'bahaya' : a.severity === 'warning' ? 'waspada' : 'netral'} />
      </View>
      <Text style={{ color: c.abu }}>{a.value}</Text>
      <Text style={{ color: c.abu, fontSize: 12 }}>{tgl(a.created_at)}</Text>
      {a.sedang_terjadi && !a.acknowledged && <Tombol label="Sudah dibaca" variasi="tepi" onPress={() => ack(a.id)} sibuk={aksi.sibuk === `a${a.id}`} />}
      {a.sedang_terjadi && BISA_DIBUKA.includes(a.type) && <Tombol label="Buka kunci alat" onPress={bukaKunci} sibuk={aksi.sibuk === 'kunci'} />}
    </View>
  )

  return (
    <Layar judul="Peringatan" sub={`${aktif.length} sedang terjadi`} kembali={navigation.goBack} onRefresh={g.muat}>
      {aksi.pesan && <Info teks={aksi.pesan} />}
      {aksi.galat && <KotakGalat pesan={aksi.galat} />}
      {g.memuat ? <Memuat /> : g.galat && !g.data ? <KotakGalat pesan={g.galat} ulang={g.muat} /> : (
        <>
          <Kartu>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.tinta }}>Sedang terjadi</Text>
            {aktif.length ? aktif.map((a) => <Baris key={a.id} a={a} />) : <Text style={{ color: c.abu, marginTop: 6 }}>Semua aman.</Text>}
          </Kartu>
          <Kartu>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.tinta }}>Riwayat</Text>
            {riwayat.map((a) => <Baris key={a.id} a={a} />)}
          </Kartu>
        </>
      )}
    </Layar>
  )
}
