import React from 'react'
import { Alert, Switch, Text, View } from 'react-native'
import { kirim, StateAlat } from '../api'
import { useAksi, useGet } from '../hooks'
import { Baris, fmt, Info, Judul, Kartu, KotakGalat, Layar, Lencana, Memuat, Tombol } from '../ui'
import { c } from '../theme'

function Saklar({ label, ket, nilai, onUbah, mati }: { label: string; ket: string; nilai: boolean; onUbah: (v: boolean) => void; mati?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: c.tinta }}>{label}</Text>
        <Text style={{ color: c.abu, fontSize: 12 }}>{ket}</Text>
      </View>
      <Switch value={nilai} onValueChange={onUbah} disabled={mati} trackColor={{ true: c.moss, false: '#C8D2DC' }} thumbColor="#fff" />
    </View>
  )
}

export function OtomatisLayar({ navigation }: { navigation: { goBack: () => void } }) {
  const st = useGet<StateAlat>('iot-v41/state', 8000)
  const aksi = useAksi()
  const p = st.data?.params
  const o = st.data?.otomasi_alat

  const simpan = (ubah: Partial<{ nutrisi: boolean; ph: boolean; encer: boolean; isi: boolean }>) => {
    if (!p) return
    const now = { nutrisi: !!p.saklar_ab, ph: !!(p.saklar_ph_up || p.saklar_ph_down), encer: !!p.saklar_pengenceran, isi: p.mode_isi === 'otomatis', ...ubah }
    aksi.jalan('saklar', async () => {
      await kirim('iot-v41/saklar', {
        saklar_ab: now.nutrisi ? 1 : 0, saklar_ph_up: now.ph ? 1 : 0, saklar_ph_down: now.ph ? 1 : 0,
        saklar_pengenceran: now.encer ? 1 : 0, mode_isi: now.isi ? 'otomatis' : 'manual',
      }, 'PUT')
      st.muat(); return 'Saklar disimpan.'
    })
  }

  const stop = () => Alert.alert('STOP semua pompa?', 'Semua pompa dihentikan sekarang.', [
    { text: 'Batal', style: 'cancel' },
    { text: 'STOP', style: 'destructive', onPress: () => aksi.jalan('stop', async () => { await kirim('iot-v41/stop', {}); st.muat(); return 'Perintah STOP dikirim ke alat.' }) },
  ])

  return (
    <Layar judul="Otomatis Alat" sub="Saklar otomasi & pemberhentian darurat" kembali={navigation.goBack} onRefresh={st.muat}>
      {aksi.pesan && <Info teks={aksi.pesan} />}
      {aksi.galat && <KotakGalat pesan={aksi.galat} />}
      {st.memuat ? <Memuat /> : st.galat && !st.data ? <KotakGalat pesan={st.galat} ulang={st.muat} /> : p && (
        <>
          <Kartu>
            <Judul>Kondisi larutan</Judul>
            <Baris k="Status" v={st.data!.kondisi.status} />
            <Baris k="EC" v={`${fmt(st.data!.kondisi.ec_ppm, 0)} ppm (target ${fmt(p.ec_setpoint, 0)})`} />
            <Baris k="pH" v={`${fmt(st.data!.kondisi.ph, 2)} (target ${fmt(p.ph_setpoint, 2)})`} />
            <Baris k="Suhu air" v={`${fmt(st.data!.kondisi.suhu_air)} °C`} />
            {p.tahan_dosing && <Lencana teks={`Dosing ditahan: ${p.tahan_alasan ?? 'tanpa alasan'}`} nada="waspada" />}
            {p.pemeliharaan && <Lencana teks="Mode pemeliharaan aktif" nada="waspada" />}
          </Kartu>

          <Kartu>
            <Judul>Otomasi</Judul>
            <Saklar label="Nutrisi A/B" ket={o?.nutrisi == null ? 'Alat belum melapor' : `Alat: ${o.nutrisi ? 'ON' : 'OFF'}`} nilai={!!p.saklar_ab} onUbah={(v) => simpan({ nutrisi: v })} mati={aksi.sibuk === 'saklar'} />
            <Saklar label="Koreksi pH" ket={o?.ph == null ? 'Alat belum melapor' : `Alat: ${o.ph ? 'ON' : 'OFF'}`} nilai={!!(p.saklar_ph_up || p.saklar_ph_down)} onUbah={(v) => simpan({ ph: v })} mati={aksi.sibuk === 'saklar'} />
            <Saklar label="Pengenceran" ket={o?.encer == null ? 'Alat belum melapor' : `Alat: ${o.encer ? 'ON' : 'OFF'}`} nilai={!!p.saklar_pengenceran} onUbah={(v) => simpan({ encer: v })} mati={aksi.sibuk === 'saklar'} />
            <Saklar label="Isi air otomatis" ket={p.mode_isi === 'otomatis' ? 'Mode otomatis' : 'Mode manual'} nilai={p.mode_isi === 'otomatis'} onUbah={(v) => simpan({ isi: v })} mati={aksi.sibuk === 'saklar'} />
          </Kartu>

          <Tombol label="STOP SEMUA POMPA" ikon="octagon" variasi="bahaya" onPress={stop} sibuk={aksi.sibuk === 'stop'} />
        </>
      )}
    </Layar>
  )
}
