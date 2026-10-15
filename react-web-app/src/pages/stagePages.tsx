import { BtnEdit, BtnHapus, CrudScreen, Field } from '../components/CrudScreen'

const notesCRUD = [
  'Pola CRUD yang sama dipakai Peremajaan / Pendewasaan / Panen (file 07–09).',
  'State validasi: pesan inline di bawah field yang salah, nilai terisi tidak hilang.',
  "Konfirmasi hapus: modal 'Hapus batch B-2401?' + tombol merah.",
]

/* ================= 06 · SEMAI ================= */
type Semai = { batch: string; varietas: string; bibit: string; tanggal: string; status: string }

export function SemaiPage() {
  const rows: Semai[] = [
    { batch: 'B-2401', varietas: 'Selada', bibit: '120', tanggal: '02 Okt', status: 'Aktif' },
    { batch: 'B-2402', varietas: 'Bayam', bibit: '150', tanggal: '28 Sep', status: 'Selesai' },
  ]
  return (
    <CrudScreen<Semai>
      title="Tab + toolbar — Semai"
      addButton="+ Tambah Semai"
      columns={[
        { key: 'batch', header: 'Batch', render: (r) => <b className="text-slate-900">{r.batch}</b> },
        { key: 'varietas', header: 'Varietas', render: (r) => r.varietas },
        { key: 'bibit', header: 'Jumlah Bibit', render: (r) => r.bibit },
        { key: 'tanggal', header: 'Tanggal Semai', render: (r) => r.tanggal },
        { key: 'status', header: 'Status', render: (r) => r.status },
      ]}
      rows={rows}
      rowKey={(r) => r.batch}
      form={
        <>
          <Field label="Batch"><input className="vsf-input w-full" placeholder="B-2403" /></Field>
          <Field label="Varietas"><input className="vsf-input w-full" placeholder="Selada" /></Field>
          <Field label="Jumlah Bibit"><input className="vsf-input w-full" placeholder="120" /></Field>
          <Field label="Tanggal Semai"><input className="vsf-input w-full" placeholder="14 Okt" /></Field>
        </>
      }
      notes={notesCRUD}
      actions={(r, askHapus) => (
        <>
          <BtnEdit />
          <BtnHapus label={`batch ${r.batch}`} onPick={askHapus} />
        </>
      )}
    />
  )
}

/* ============== 07 · PEREMAJAAN ============== */
type Peremajaan = { batch: string; varietas: string; umur: string; tanggal: string }

export function PeremajaanPage() {
  const rows: Peremajaan[] = [
    { batch: 'B-2312', varietas: 'Kangkung', umur: '21', tanggal: '20 Sep' },
  ]
  return (
    <CrudScreen<Peremajaan>
      title="Tabel data peremajaan"
      addButton="+ Tambah Peremajaan"
      columns={[
        { key: 'batch', header: 'Batch', render: (r) => <b className="text-slate-900">{r.batch}</b> },
        { key: 'varietas', header: 'Varietas', render: (r) => r.varietas },
        { key: 'umur', header: 'Umur (hari)', render: (r) => r.umur },
        { key: 'tanggal', header: 'Tanggal', render: (r) => r.tanggal },
      ]}
      rows={rows}
      rowKey={(r) => r.batch}
      form={
        <>
          <Field label="Umur (hari)"><input className="vsf-input w-full" placeholder="21" /></Field>
          <Field label="Jumlah pindah"><input className="vsf-input w-full" placeholder="80" /></Field>
          <Field label="Kondisi"><input className="vsf-input w-full" placeholder="Baik" /></Field>
        </>
      }
      notes={[
        'Field khas modul ini: Umur (hari) • Jumlah pindah • Kondisi.',
        'Pola identik dengan halaman 06 — konsistensi komponen (tabel + form + modal hapus).',
        'Navigasi tahap: Penyemaian → Peremajaan → Pendewasaan → Panen (alur satu arah).',
      ]}
      actions={(r, askHapus) => (
        <>
          <BtnEdit />
          <BtnHapus label={`batch ${r.batch}`} onPick={askHapus} />
        </>
      )}
    />
  )
}

/* ============= 08 · PENDEWASAAN ============= */
type Pendewasaan = { batch: string; varietas: string; meja: string; tanggal: string }

export function PendewasaanPage() {
  const rows: Pendewasaan[] = [{ batch: 'B-2310', varietas: 'Selada', meja: 'Meja 2', tanggal: '18 Sep' }]
  return (
    <CrudScreen<Pendewasaan>
      title="Tabel data pendewasaan"
      addButton="+ Tambah Pendewasaan"
      columns={[
        { key: 'batch', header: 'Batch', render: (r) => <b className="text-slate-900">{r.batch}</b> },
        { key: 'varietas', header: 'Varietas', render: (r) => r.varietas },
        { key: 'meja', header: 'Meja', render: (r) => r.meja },
        { key: 'tanggal', header: 'Tanggal', render: (r) => r.tanggal },
      ]}
      rows={rows}
      rowKey={(r) => r.batch}
      form={
        <>
          <Field label="Meja tanam"><input className="vsf-input w-full" placeholder="Meja 2" /></Field>
          <Field label="Tanggal"><input className="vsf-input w-full" placeholder="18 Sep" /></Field>
        </>
      }
      notes={[
        'Pola identik dengan halaman 06 — konsistensi komponen (tabel + form + modal hapus).',
        'Navigasi tahap: Penyemaian → Peremajaan → Pendewasaan → Panen (alur satu arah).',
      ]}
      actions={(r, askHapus) => (
        <>
          <BtnEdit />
          <BtnHapus label={`batch ${r.batch}`} onPick={askHapus} />
        </>
      )}
    />
  )
}

/* ================= 09 · PANEN ================= */
type Panen = { batch: string; varietas: string; tglPanen: string; hasil: string }

export function PanenPage() {
  const rows: Panen[] = [{ batch: 'B-2304', varietas: 'Bayam', tglPanen: '10 Sep', hasil: '12.4 kg' }]
  return (
    <CrudScreen<Panen>
      title="Tabel data panen"
      addButton="+ Tambah Panen"
      columns={[
        { key: 'batch', header: 'Batch', render: (r) => <b className="text-slate-900">{r.batch}</b> },
        { key: 'varietas', header: 'Varietas', render: (r) => r.varietas },
        { key: 'tglPanen', header: 'Tanggal panen', render: (r) => r.tglPanen },
        { key: 'hasil', header: 'Hasil', render: (r) => r.hasil },
      ]}
      rows={rows}
      rowKey={(r) => r.batch}
      form={
        <>
          <Field label="Tanggal panen"><input className="vsf-input w-full" placeholder="14 Okt" /></Field>
          <Field label="Hasil (kg)"><input className="vsf-input w-full" placeholder="12.4" /></Field>
          <Field label="Kualitas (A/B/C)"><input className="vsf-input w-full" placeholder="A" /></Field>
        </>
      }
      notes={[
        'Field khas modul ini: Tanggal panen • Hasil (kg) • Kualitas (A/B/C).',
        'Pola identik dengan halaman 06 — konsistensi komponen (tabel + form + modal hapus).',
        'Navigasi tahap: Penyemaian → Peremajaan → Pendewasaan → Panen (alur satu arah).',
      ]}
      actions={(r, askHapus) => (
        <>
          <BtnEdit />
          <BtnHapus label={`batch ${r.batch}`} onPick={askHapus} />
        </>
      )}
    />
  )
}

/* ============= 10 · DURASI SIKLUS ============= */
type Siklus = { varietas: string; sr: string; rd: string; dp: string; total: string }

export function DurasiSiklusPage() {
  const rows: Siklus[] = [{ varietas: 'Selada', sr: '7', rd: '14', dp: '21', total: '42' }]
  return (
    <CrudScreen<Siklus>
      title="Toolbar — Durasi Siklus"
      addButton="+ Tambah Siklus"
      columns={[
        { key: 'varietas', header: 'Varietas', render: (r) => <b className="text-slate-900">{r.varietas}</b> },
        { key: 'sr', header: 'Semai→Remaja', render: (r) => r.sr },
        { key: 'rd', header: 'Remaja→Dewasa', render: (r) => r.rd },
        { key: 'dp', header: 'Dewasa→Panen', render: (r) => r.dp },
        { key: 'total', header: 'Total', render: (r) => r.total },
      ]}
      rows={rows}
      rowKey={(r) => r.varietas}
      form={
        <>
          <Field label="Varietas"><input className="vsf-input w-full" placeholder="Selada" /></Field>
          <Field label="Semai → Remaja (hari)"><input className="vsf-input w-full" placeholder="7" /></Field>
          <Field label="Remaja → Dewasa (hari)"><input className="vsf-input w-full" placeholder="14" /></Field>
          <Field label="Dewasa → Panen (hari)"><input className="vsf-input w-full" placeholder="21" /></Field>
        </>
      }
      notes={[
        'Dipakai perhitungan estimasi panen di dashboard & laporan.',
        'Export CSV mengikuti filter aktif (rentang/varietas).',
      ]}
      actions={(r, askHapus) => (
        <>
          <BtnEdit />
          <BtnHapus label={`siklus ${r.varietas}`} onPick={askHapus} />
        </>
      )}
    />
  )
}
