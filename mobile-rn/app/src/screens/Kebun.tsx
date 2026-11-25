import React, { useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { Batch, kirim } from '../api'
import { useAksi, useGet } from '../hooks'
import { Info, Isian, Judul, Kartu, KotakGalat, Layar, Lencana, Memuat, Segmen, Tombol, KotakGalat as G, tgl } from '../ui'
import { c } from '../theme'

type Pilihan = { tanaman: { id: number | string; nama: string; id_meja?: number | string | null }[]; meja: { id: number | string; nama: string }[] }

const TAHAP: Record<string, string> = { semai: 'Semai', peremajaan: 'Peremajaan', pendewasaan: 'Pendewasaan' }

function KartuBatch({ b, aksi, onSelesai }: { b: Batch; aksi: ReturnType<typeof useAksi>; onSelesai: () => void }) {
  const [berhasil, setBerhasil] = useState(String(b.jumlah))
  const nama = `${b.tipe}${b.id}`
  const progres = b.durasi_hari ? Math.min(1, (b.hari_ke ?? 0) / b.durasi_hari) : 0
  function selesai() {
    const n = Number(berhasil)
    if (!Number.isInteger(n) || n < 0 || n > b.jumlah) { Alert.alert('Jumlah tidak valid', `Isi 0 sampai ${b.jumlah}.`); return }
    Alert.alert('Selesaikan tahap?', `${n} dari ${b.jumlah} tanaman lanjut ke tahap berikutnya.`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Selesaikan', onPress: () => aksi.jalan(nama, async () => {
        await kirim(`tanam/${b.tipe}/${b.id}/selesai`, { berhasil: n }); onSelesai(); return 'Tahap diselesaikan.'
      }) },
    ])
  }
  return (
    <Kartu style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: c.tinta }}>{b.varietas ?? 'Batch'}</Text>
        <Lencana teks={TAHAP[b.tipe] ?? b.tipe} nada={b.siap ? 'waspada' : 'baik'} />
      </View>
      <Text style={{ color: c.abu }}>{b.meja ?? '—'} · {b.jumlah} tanaman · mulai {tgl(b.mulai)}</Text>
      {b.durasi_hari ? (
        <View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.garis }}>
            <View style={{ height: 8, borderRadius: 4, width: `${progres * 100}%`, backgroundColor: b.siap ? c.kuning : c.moss }} />
          </View>
          <Text style={{ color: c.abu, fontSize: 12, marginTop: 4 }}>Hari ke-{b.hari_ke} dari {b.durasi_hari}{b.siap ? ' — siap ditutup' : ''}</Text>
        </View>
      ) : null}
      {b.siap && (
        <View style={{ gap: 8 }}>
          <Isian label={`Berhasil (maks ${b.jumlah})`} value={berhasil} onChangeText={setBerhasil} keyboardType="number-pad" />
          <Tombol label={b.tahap_berikut ? `Selesai → ${b.tahap_berikut}` : 'Selesai tahap'} onPress={selesai} sibuk={aksi.sibuk === nama} />
        </View>
      )}
    </Kartu>
  )
}

export function KebunLayar() {
  const kebun = useGet<{ list?: Batch[] }>('tanam', 30000)
  const aksi = useAksi()
  const [buka, setBuka] = useState(false)
  const pil = useGet<Pilihan>(buka ? 'tanam/pilihan' : null)
  const [idT, setIdT] = useState<string>('')
  const [idM, setIdM] = useState<string>('')
  const [jumlah, setJumlah] = useState('')

  const mulai = () => {
    const n = Number(jumlah)
    if (!idT || !idM || !Number.isInteger(n) || n <= 0) { Alert.alert('Lengkapi data', 'Pilih tanaman, meja, dan jumlah benih.'); return }
    aksi.jalan('mulai', async () => {
      await kirim('tanam/mulai', { id_tanaman: Number(idT), id_meja: Number(idM), jumlah_benih: n })
      setBuka(false); setJumlah(''); kebun.muat(); return 'Siklus tanam dimulai.'
    })
  }

  return (
    <Layar judul="Kebun Saya" sub="Siklus tanam: semai → peremajaan → pendewasaan → panen" onRefresh={kebun.muat}>
      {aksi.pesan && <Info teks={aksi.pesan} />}
      {aksi.galat && <G pesan={aksi.galat} />}
      <Tombol label={buka ? 'Tutup form' : 'Mulai tanam baru'} ikon={buka ? 'x' : 'plus'} variasi="tepi" onPress={() => setBuka(!buka)} />
      {buka && (
        <Kartu style={{ gap: 12 }}>
          <Judul>Mulai tanam</Judul>
          {pil.memuat ? <Memuat /> : pil.galat ? <Text style={{ color: c.merah }}>{pil.galat}</Text> : (
            <>
              <Text style={{ color: c.abu, fontWeight: '600' }}>Tanaman</Text>
              <Segmen nilai={idT} onUbah={setIdT} pilihan={(pil.data?.tanaman ?? []).map((t) => ({ k: String(t.id), l: t.nama }))} />
              <Text style={{ color: c.abu, fontWeight: '600' }}>Meja</Text>
              <Segmen nilai={idM} onUbah={setIdM} pilihan={(pil.data?.meja ?? []).map((m) => ({ k: String(m.id), l: m.nama }))} />
              <Isian label="Jumlah benih" value={jumlah} onChangeText={setJumlah} keyboardType="number-pad" />
              <Tombol label="Mulai" onPress={mulai} sibuk={aksi.sibuk === 'mulai'} />
            </>
          )}
        </Kartu>
      )}
      {kebun.memuat ? <Memuat /> : kebun.galat ? <KotakGalat pesan={kebun.galat} ulang={kebun.muat} /> :
        (kebun.data?.list ?? []).length === 0 ? <Kartu><Text style={{ color: c.abu }}>Belum ada batch yang berjalan.</Text></Kartu> :
          (kebun.data?.list ?? []).map((b) => <KartuBatch key={`${b.tipe}${b.id}`} b={b} aksi={aksi} onSelesai={kebun.muat} />)}
    </Layar>
  )
}
