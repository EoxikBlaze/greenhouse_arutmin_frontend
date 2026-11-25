import React, { useState } from 'react'
import { Text } from 'react-native'
import { kirim, StateAlat } from '../api'
import { useAksi, useGet } from '../hooks'
import { Info, Isian, Judul, Kartu, KotakGalat, Layar, Segmen, Tombol, tgl } from '../ui'
import { c } from '../theme'

const angka = (t: string) => Number(t.replace(',', '.'))

export function UjiLabLayar({ navigation }: { navigation: { goBack: () => void } }) {
  const st = useGet<StateAlat>('iot-v41/state')
  const aksi = useAksi()
  const [jenis, setJenis] = useState<'ec' | 'ph'>('ec')
  const [f, setF] = useState<Record<string, string>>({})
  const [arah, setArah] = useState<'up' | 'down'>('up')
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }))

  const simpan = () => {
    const body = jenis === 'ec'
      ? { aksi: 'ec', awal: angka(f.awal ?? ''), akhir: angka(f.akhir ?? ''), volume: angka(f.volume ?? ''), ml_a: angka(f.ml_a ?? ''), ml_b: angka(f.ml_b ?? '') }
      : { aksi: 'ph', arah, volume: angka(f.volume ?? ''), delta_ph: angka(f.delta_ph ?? ''), ml: angka(f.ml ?? '') }
    if (Object.values(body).some((v) => typeof v === 'number' && !(v > 0))) { aksi.jalan('x', async () => { throw new Error('Semua angka harus diisi dan lebih dari nol.') }); return }
    if (jenis === 'ec' && (body as { akhir: number; awal: number }).akhir <= (body as { awal: number }).awal) { aksi.jalan('x', async () => { throw new Error('ppm akhir harus lebih tinggi dari ppm awal.') }); return }
    aksi.jalan('simpan', async () => { await kirim('iot-v41/ujilab', body); st.muat(); return 'Hasil uji tersimpan.' })
  }

  return (
    <Layar judul="Uji Lab" sub="Ukur seberapa kuat larutan A/B dan pH" kembali={navigation.goBack} onRefresh={st.muat}>
      {aksi.pesan && <Info teks={aksi.pesan} />}
      {aksi.galat && <KotakGalat pesan={aksi.galat} />}
      <Kartu style={{ gap: 12 }}>
        <Segmen nilai={jenis} onUbah={setJenis} pilihan={[{ k: 'ec', l: 'Nutrisi (EC)' }, { k: 'ph', l: 'pH' }]} />
        {jenis === 'ec' ? (
          <>
            <Isian label="ppm awal" value={f.awal} onChangeText={set('awal')} keyboardType="decimal-pad" />
            <Isian label="ppm akhir" value={f.akhir} onChangeText={set('akhir')} keyboardType="decimal-pad" />
            <Isian label="Volume air (L)" value={f.volume} onChangeText={set('volume')} keyboardType="decimal-pad" />
            <Isian label="Larutan A dituang (mL)" value={f.ml_a} onChangeText={set('ml_a')} keyboardType="decimal-pad" />
            <Isian label="Larutan B dituang (mL)" value={f.ml_b} onChangeText={set('ml_b')} keyboardType="decimal-pad" />
          </>
        ) : (
          <>
            <Segmen nilai={arah} onUbah={setArah} pilihan={[{ k: 'up', l: 'pH naik' }, { k: 'down', l: 'pH turun' }]} />
            <Isian label="Volume air (L)" value={f.volume} onChangeText={set('volume')} keyboardType="decimal-pad" />
            <Isian label="Perubahan pH" value={f.delta_ph} onChangeText={set('delta_ph')} keyboardType="decimal-pad" />
            <Isian label="Larutan dituang (mL)" value={f.ml} onChangeText={set('ml')} keyboardType="decimal-pad" />
          </>
        )}
        <Tombol label="Simpan hasil uji" onPress={simpan} sibuk={aksi.sibuk === 'simpan'} />
      </Kartu>
      <Kartu>
        <Judul>Arsip uji lab</Judul>
        {(st.data?.arsip_ujilab ?? []).slice(0, 10).map((x) => (
          <Text key={x.id} style={{ color: c.tinta, paddingVertical: 3 }}>{tgl(x.dilakukan_pada)} · {x.sensor}{x.catatan ? ` · ${x.catatan}` : ''}</Text>
        ))}
        {!(st.data?.arsip_ujilab ?? []).length && <Text style={{ color: c.abu }}>Belum ada hasil uji.</Text>}
      </Kartu>
    </Layar>
  )
}
