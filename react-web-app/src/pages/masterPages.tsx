import { BtnEdit, BtnHapus, CrudScreen, Field } from '../components/CrudScreen'

const notesMaster = [
  'Master data dipakai sebagai pilihan dropdown di modul lain.',
  'Hapus = modal konfirmasi; data yang sudah dipakai tidak bisa dihapus.',
]

/* ============= 11 · JENIS TANAMAN ============= */
type Jenis = { nama: string; kategori: string; hari: string }

export function JenisTanamanPage() {
  const rows: Jenis[] = [
    { nama: 'Selada', kategori: 'Daun', hari: '42' },
    { nama: 'Bayam', kategori: 'Daun', hari: '30' },
  ]
  return (
    <CrudScreen<Jenis>
      title="Toolbar — Jenis Tanaman"
      addButton="+ Tambah"
      columns={[
        { key: 'nama', header: 'Nama', render: (r) => <b className="text-slate-900">{r.nama}</b> },
        { key: 'kategori', header: 'Kategori', render: (r) => r.kategori },
        { key: 'hari', header: 'Hari Panen', render: (r) => r.hari },
      ]}
      rows={rows}
      rowKey={(r) => r.nama}
      form={
        <>
          <Field label="Nama jenis"><input className="vsf-input w-full" placeholder="Selada" /></Field>
          <Field label="Kategori"><input className="vsf-input w-full" placeholder="Daun" /></Field>
          <Field label="Hari panen"><input className="vsf-input w-full" placeholder="42" /></Field>
        </>
      }
      notes={notesMaster}
      actions={(r, ask) => (
        <>
          <BtnEdit />
          <BtnHapus label={r.nama} onPick={ask} />
        </>
      )}
    />
  )
}

/* ============== 12 · MEJA TANAMAN ============== */
type Meja = { kode: string; lokasi: string; kapasitas: string; status: string }

export function MejaTanamanPage() {
  const rows: Meja[] = [{ kode: 'M-01', lokasi: 'Barat', kapasitas: '40', status: 'Terisi' }]
  return (
    <CrudScreen<Meja>
      title="Toolbar — Meja Tanam"
      addButton="+ Tambah"
      columns={[
        { key: 'kode', header: 'Kode', render: (r) => <b className="text-slate-900">{r.kode}</b> },
        { key: 'lokasi', header: 'Lokasi', render: (r) => r.lokasi },
        { key: 'kapasitas', header: 'Kapasitas', render: (r) => r.kapasitas },
        { key: 'status', header: 'Status', render: (r) => r.status },
      ]}
      rows={rows}
      rowKey={(r) => r.kode}
      form={
        <>
          <Field label="Kode meja"><input className="vsf-input w-full" placeholder="M-02" /></Field>
          <Field label="Lokasi"><input className="vsf-input w-full" placeholder="Timur" /></Field>
          <Field label="Kapasitas"><input className="vsf-input w-full" placeholder="40" /></Field>
        </>
      }
      notes={notesMaster}
      actions={(r, ask) => (
        <>
          <BtnEdit />
          <BtnHapus label={r.kode} onPick={ask} />
        </>
      )}
    />
  )
}

/* ============= 13 · AMBANG SENSOR ============= */
type Ambang = { param: string; min: string; max: string }

export function AmbangSensorPage() {
  const rows: Ambang[] = [
    { param: 'pH', min: '5.5', max: '6.5' },
    { param: 'Suhu Air', min: '24', max: '28' },
    { param: 'TDS', min: '900', max: '1400' },
  ]
  return (
    <CrudScreen<Ambang>
      title="Toolbar — Ambang Sensor"
      addButton="+ Tambah"
      columns={[
        { key: 'param', header: 'Parameter', render: (r) => <b className="text-slate-900">{r.param}</b> },
        { key: 'min', header: 'Minimum', render: (r) => r.min },
        { key: 'max', header: 'Maksimum', render: (r) => r.max },
      ]}
      rows={rows}
      rowKey={(r) => r.param}
      form={
        <>
          <Field label="Parameter"><input className="vsf-input w-full" placeholder="pH" /></Field>
          <Field label="Minimum"><input className="vsf-input w-full" placeholder="5.5" /></Field>
          <Field label="Maksimum"><input className="vsf-input w-full" placeholder="6.5" /></Field>
        </>
      }
      notes={[
        ...notesMaster,
        'Nilai ambang = sumber deteksi anomali + dikirim ke ESP32 (GET /api/get-thresholds).',
      ]}
      actions={(r, ask) => (
        <>
          <BtnEdit />
          <BtnHapus label={r.param} onPick={ask} />
        </>
      )}
    />
  )
}
