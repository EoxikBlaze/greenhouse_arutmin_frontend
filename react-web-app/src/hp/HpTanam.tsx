import { useState } from 'react'
import { useAuth } from '../lib/authContext'
import { useApiList } from '../lib/crudApi'
import { progres, type TanamRow } from '../lib/kebun'
import { DialogMulaiSemai } from '../components/kebun/DialogMulaiSemai'
import { DialogPindahTahap } from '../components/kebun/DialogPindahTahap'
import { Banner, JudulBagian, Kartu, Kosong, Skeleton, Tombol } from './Komponen'

/** S20–S23 Tanam: pindah tahap/panen hanya menyimpan CATATAN, tidak menggerakkan alat. */
export function HpTanam() {
  const kelola = useAuth().role === 'admin'
  const { rows, loading, error, reload } = useApiList<TanamRow>('/tanam')
  const [semai, setSemai] = useState(false)
  const [pindah, setPindah] = useState<TanamRow | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const ok = (m: string) => { setSemai(false); setPindah(null); setPesan(m); reload() }

  return (
    <>
      <JudulBagian judul="Tanam" />
      <Banner judul="Catatan pencatatan" isi="Pindah tahap dan panen hanya menyimpan CATATAN. Pencatatan ini tidak menggerakkan alat apa pun." />
      {pesan && <Banner judul="Tersimpan" isi={pesan} />}
      {error && <Banner tone="peringatan" judul="Gagal memuat" isi={error} />}
      {kelola && <Tombol onClick={() => setSemai(true)}>Mulai semai</Tombol>}
      {loading && !rows?.length ? <Skeleton /> : (rows ?? []).length === 0
        ? <Kosong ikon="tanam" judul="Belum ada batch aktif" isi="Mulai semai dari menu Tanam untuk membuat batch baru." />
        : (rows ?? []).map((r) => {
            const p = progres(r)
            return (
              <Kartu key={`${r.tipe}-${r.id}`}>
                <strong>Batch {r.varietas ?? 'Tanam'}{r.meja ? ` · ${r.meja}` : ''}</strong>
                <span className="hp-meta">Tahap: {r.tipe}{r.mulai ? ` · mulai ${r.mulai.slice(0, 10)}` : ''}</span>
                <div className="hp-bar" aria-hidden><i style={{ width: `${p.persen}%` }} /></div>
                <span className="hp-meta">{p.label}</span>
                {kelola && r.tahap_berikut && <Tombol sek onClick={() => setPindah(r)}>{r.tahap_berikut === 'panen' ? 'Catat panen' : 'Pindah tahap'}</Tombol>}
              </Kartu>
            )
          })}
      {semai && <DialogMulaiSemai onClose={() => setSemai(false)} onSukses={ok} batchBerjalan={rows ?? []} />}
      {pindah && <DialogPindahTahap r={pindah} onClose={() => setPindah(null)} onSukses={ok} />}
    </>
  )
}
