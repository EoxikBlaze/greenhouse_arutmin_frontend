import React, { useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { kirim, obrolan } from '../api'
import { useAksi, useGet } from '../hooks'
import { Info, Isian, Judul, Kartu, KotakGalat, Layar, Segmen, Tombol } from '../ui'
import { c, r } from '../theme'

type Pesan = { peran: 'user' | 'ai'; teks: string }
type Langkah = { keputusan: string; alasan: string; prioritas: string; sumber: string }
type Laporan = { data: { tanggal?: string; ringkasan?: string; isi?: string } | null }

/** Jawaban NDJSON: baris {"tipe":"selesai","jawaban":...}; cadangan: satu objek JSON berisi `jawaban`. */
function bacaJawaban(teks: string): string | null {
  for (const b of teks.split('\n').reverse()) {
    try {
      const o = JSON.parse(b)
      if (o && typeof o.jawaban === 'string') return o.jawaban
    } catch { /* baris bukan JSON */ }
  }
  return null
}

export function AsistenLayar({ navigation }: { navigation: { goBack: () => void } }) {
  const [tab, setTab] = useState<'tanya' | 'langkah' | 'harian'>('tanya')
  const [pesan, setPesan] = useState<Pesan[]>([])
  const [t, setT] = useState('')
  const aksi = useAksi()
  const langkah = useAksi()
  const [hasil, setHasil] = useState<Langkah | null>(null)
  const harian = useGet<Laporan>(tab === 'harian' ? 'api/ai/analisis-harian/terbaru' : null)
  const kunci = useRef(0)

  const tanya = () => {
    const q = t.trim()
    if (!q) return
    const riwayat = pesan.slice(-8)
    setPesan((p) => [...p, { peran: 'user', teks: q }]); setT('')
    aksi.jalan(`t${++kunci.current}`, async () => {
      const jawab = bacaJawaban(await obrolan(q, riwayat))
      if (!jawab) throw new Error('Jawaban asisten tidak lengkap. Coba lagi.')
      setPesan((p) => [...p, { peran: 'ai', teks: jawab }])
    })
  }

  return (
    <Layar judul="Asisten AI" sub="Tanya kebun, minta saran langkah berikutnya" kembali={navigation.goBack}>
      <Segmen nilai={tab} onUbah={setTab} pilihan={[{ k: 'tanya', l: 'Tanya' }, { k: 'langkah', l: 'Langkah berikutnya' }, { k: 'harian', l: 'Analisis harian' }]} />
      {tab === 'tanya' && (
        <>
          {!pesan.length && <Info teks="Contoh: 'Kenapa pH naik?' atau 'Kapan Melon dipindah?'" />}
          {pesan.map((m, i) => (
            <View key={i} style={{ alignSelf: m.peran === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', backgroundColor: m.peran === 'user' ? c.forest : '#fff', padding: 12, borderRadius: r.kartu, borderWidth: m.peran === 'ai' ? 1 : 0, borderColor: c.garis }}>
              <Text style={{ color: m.peran === 'user' ? '#fff' : c.tinta }}>{m.teks}</Text>
            </View>
          ))}
          {aksi.sibuk && <Text style={{ color: c.abu }}>Asisten sedang menulis…</Text>}
          {aksi.galat && <KotakGalat pesan={aksi.galat} />}
          <Isian label="Pertanyaan" value={t} onChangeText={setT} multiline onSubmitEditing={tanya} />
          <Tombol label="Kirim" ikon="send" onPress={tanya} sibuk={!!aksi.sibuk} />
        </>
      )}
      {tab === 'langkah' && (
        <>
          <Tombol label="Minta saran sekarang" ikon="zap" sibuk={!!langkah.sibuk} onPress={() => langkah.jalan('l', async () => { setHasil(await kirim<Langkah>('api/ai/langkah-selanjutnya', {})) })} />
          {langkah.galat && <KotakGalat pesan={langkah.galat} />}
          {hasil && (
            <Kartu style={{ gap: 6 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: c.tinta }}>{hasil.keputusan}</Text>
              <Text style={{ color: c.tinta }}>{hasil.alasan}</Text>
              <Text style={{ color: c.abu, fontSize: 12 }}>Prioritas {hasil.prioritas} · sumber {hasil.sumber}</Text>
            </Kartu>
          )}
        </>
      )}
      {tab === 'harian' && (
        <Kartu>
          <Judul>Analisis terbaru</Judul>
          {harian.galat ? <Text style={{ color: c.merah }}>{harian.galat}</Text> :
            <Text style={{ color: c.tinta }}>{harian.data?.data?.ringkasan ?? harian.data?.data?.isi ?? (harian.memuat ? 'Memuat…' : 'Belum ada analisis.')}</Text>}
        </Kartu>
      )}
    </Layar>
  )
}
