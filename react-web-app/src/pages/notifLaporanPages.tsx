import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/* ============= 14 · NOTIFIKASI WHATSAPP ============= */
export function NotifWaPage() {
  const [demo] = useState(false) // form disabled saat mode demo
  const [apiKey, setApiKey] = useState('')

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {/* Pengaturan koneksi */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">
          Pengaturan koneksi (tersimpan di tabel wa_settings, bukan .env)
        </div>

        {!apiKey && (
          <div className="mt-3 text-[12px] text-amber-800 bg-amber-50 border border-amber-500/40 rounded-input px-3 py-2">
            ⚠ API key kosong — isi Fonnte API key dulu sebelum kirim uji.
          </div>
        )}

        <div className="mt-3 grid gap-1 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12px] font-bold text-slate-700">Fonnte API Key</span>
            <input
              className="vsf-input w-full mt-1"
              disabled={demo}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="eyJhbGciOi..."
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-bold text-slate-700">Nomor tujuan</span>
            <input className="vsf-input w-full mt-1" disabled={demo} placeholder="62812xxxxxxx" />
          </label>
        </div>

        <div className="mt-3 flex gap-2">
          <button className="vsf-btn-primary" disabled={demo}>Simpan Pengaturan</button>
          <button className="vsf-input rounded-full font-semibold" disabled={demo}>Kirim Uji</button>
        </div>
      </section>

      {/* Jenis pesan otomatis */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Jenis pesan otomatis</div>
        <div className="mt-3 overflow-auto rounded-card border border-arutmin-border bg-white vsf-table">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-arutmin-mint/25">
                {['Tipe', 'Pemicu', 'Konten ringkas'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-[11px] uppercase tracking-[.12em] text-arutmin-forest border-b-2 border-arutmin-moss">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Solenoid', 'Katup ON/OFF', 'Solenoid ON (manual)'],
                ['Level Air', 'Tandon Penuh/Kosong', 'Tandon sudah penuh'],
                ['Jadwal', 'H-1 pemindahan meja', 'Besok pindah meja'],
              ].map(([t, p, k]) => (
                <tr key={t} className="hover:bg-arutmin-mint/15">
                  <td className="px-3 py-2 font-semibold text-slate-900">{t}</td>
                  <td className="px-3 py-2 text-slate-700">{p}</td>
                  <td className="px-3 py-2 text-slate-700">{k}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Log pengiriman */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Log pengiriman</div>
        <div className="mt-3 overflow-auto rounded-card border border-arutmin-border bg-white vsf-table">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-arutmin-mint/25">
                {['Waktu', 'Tipe', 'Nomor', 'Hasil'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-[11px] uppercase tracking-[.12em] text-arutmin-forest border-b-2 border-arutmin-moss">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['12 Okt 07:59', 'Solenoid', '62812…', '✔ terkirim'],
                ['11 Okt 21:14', 'Jadwal', '62812…', '✔ terkirim'],
              ].map(([w, t, n, r]) => (
                <tr key={w} className="hover:bg-arutmin-mint/15">
                  <td className="px-3 py-2 font-semibold text-slate-900">{w}</td>
                  <td className="px-3 py-2 text-slate-700">{t}</td>
                  <td className="px-3 py-2 text-slate-700">{n}</td>
                  <td className="px-3 py-2 text-arutmin-forest">{r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Catatan struktur & state</div>
        <ul className="mt-2 list-disc pl-5 text-[13px] text-slate-700 leading-relaxed">
          <li>State: API key kosong → kartu peringatan + fokus ke field.</li>
          <li>‘Kirim Uji’ → toast sukses/gagal + muncul di log pengiriman.</li>
          <li>Demo: form disabled (hanya membaca).</li>
        </ul>
      </section>
    </div>
  )
}

/* ============= 15 · LAPORAN (MATRIKS) ============= */
export function LaporanPage() {
  // State variant via URL (QA/debug): ?state=empty
  const [searchParams] = useSearchParams()
  const isEmpty = searchParams.get('state') === 'empty'

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Filter laporan</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input className="vsf-input w-[180px]" placeholder="Dari (tanggal)" />
          <input className="vsf-input w-[180px]" placeholder="Sampai (tanggal)" />
          <button className="vsf-btn-primary">Terapkan</button>
          <span className="flex-1" />
          <button className="vsf-input rounded-full font-semibold">Unduh CSV</button>
          <button className="vsf-input rounded-full font-semibold">Cetak / PDF</button>
        </div>
      </section>

      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Matriks laporan</div>
        {isEmpty ? (
          <div className="mt-3 rounded-card border border-dashed border-arutmin-border p-6 text-center text-[13px] text-slate-600">
            Tidak ada data pada rentang yang dipilih
            <div className="mt-2">
              <button className="vsf-input rounded-full">Reset filter</button>
            </div>
          </div>
        ) : (
          <div className="mt-3 overflow-auto rounded-card border border-arutmin-border bg-white vsf-table">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-arutmin-mint/25">
                  {['Periode', 'Semai', 'Remaja', 'Dewasa', 'Panen (kg)', 'Rata-rata pH'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-[11px] uppercase tracking-[.12em] text-arutmin-forest border-b-2 border-arutmin-moss">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Okt 2026', '2', '4', '3', '12.4', '6.41'],
                  ['Sep 2026', '3', '3', '2', '9.8', '6.38'],
                ].map((row) => (
                  <tr key={row[0]} className="hover:bg-arutmin-mint/15">
                    {row.map((cell, i) => (
                      <td key={i} className={i === 0 ? 'px-3 py-2 font-semibold text-slate-900' : 'px-3 py-2 text-slate-700'}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Catatan struktur & state</div>
        <ul className="mt-2 list-disc pl-5 text-[13px] text-slate-700 leading-relaxed">
          <li>State kosong: ‘Tidak ada data pada rentang yang dipilih’ + tombol reset filter.</li>
          <li>Export CSV mengikuti filter aktif, nama file berperiode.</li>
          <li>Print/PDF memakai aturan cetak global (chrome tersembunyi).</li>
        </ul>
      </section>
    </div>
  )
}
