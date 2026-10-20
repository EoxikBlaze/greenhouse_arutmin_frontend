/** Ilustrasi: gelembung percakapan + percikan ide (SVG murni, bukan emoji). */
function IlustrasiAsisten() {
  return (
    <svg viewBox="0 0 180 118" className="mx-auto h-[104px] w-[168px]" aria-hidden="true" focusable="false">
      <ellipse cx="90" cy="108" rx="62" ry="7" fill="#E2E8DD" />
      {/* gelembung utama */}
      <path
        d="M34 24h84a12 12 0 0 1 12 12v34a12 12 0 0 1-12 12H70l-20 16v-16H34a12 12 0 0 1-12-12V36a12 12 0 0 1 12-12z"
        fill="#fff"
        stroke="#6B9D4A"
        strokeWidth="2"
      />
      <path d="M44 44h64M44 56h48M44 68h34" stroke="#CFE2CE" strokeWidth="6" strokeLinecap="round" />
      {/* gelembung balasan (kosong) */}
      <path
        d="M120 66h34a10 10 0 0 1 10 10v18a10 10 0 0 1-10 10h-8v10l-14-10h-12a10 10 0 0 1-10-10V76a10 10 0 0 1 10-10z"
        fill="#CFE2CE"
        stroke="#6B9D4A"
        strokeWidth="2"
      />
      <circle cx="134" cy="85" r="3" fill="#4C6A4B" />
      <circle cx="144" cy="85" r="3" fill="#4C6A4B" />
      <circle cx="154" cy="85" r="3" fill="#4C6A4B" />
      {/* percikan */}
      <path d="M150 18l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#F59E0B" opacity=".85" />
      <path d="M22 12l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#6B9D4A" opacity=".7" />
    </svg>
  )
}

const RENCANA = [
  {
    judul: 'Ringkas kondisi kebun',
    teks: 'Padatkan nilai sensor, ambang, dan peringatan aktif menjadi jawaban singkat.',
  },
  {
    judul: 'Rekomendasi tindakan',
    teks: 'Saran penyiraman, penyesuaian nutrisi, dan jadwal berdasarkan tahap tanam berjalan.',
  },
  {
    judul: 'Tanya-jawab riwayat tanam',
    teks: 'Jawaban atas pertanyaan panen, produktivitas, dan riwayat batch per meja.',
  },
]

const KONTEKS = [
  'Data sensor & ambang (modul Sensor Real-Time)',
  'Daftar tanam aktif (GET /tanam)',
  'Riwayat laporan panen per bulan (GET /laporan)',
]

export default function AsistenAiPage() {
  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {/* Ringkas modul */}
      <section className="vsf-card p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Asisten AI</div>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
              Kolom tanya-jawab untuk kebun: tanyakan kondisi air, ambang, atau jadwal tanam, lalu dapatkan
              jawaban yang merujuk data sensor dan riwayat tanam.
            </p>
          </div>
          <span className="flex-1" />
          <span className="vsf-pill border-amber-500/60 bg-amber-50 text-amber-800">
            <span className="vsf-dot mr-1 h-[7px] w-[7px] rounded-full bg-amber-500" aria-hidden="true" />
            Menunggu integrasi
          </span>
        </div>
      </section>

      {/* Layar jujur */}
      <section className="vsf-card p-6">
        <div className="rounded-card border border-dashed border-arutmin-border px-4 py-8 text-center">
          <IlustrasiAsisten />
          <div className="mx-auto mt-4 max-w-[560px]">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Status modul</div>
            <h2 className="mt-1.5 text-[17px] font-bold text-slate-900">Asisten AI belum terhubung ke backend</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              Kontrak backend (<code className="rounded bg-arutmin-mint/60 px-1 py-0.5 text-[12px]">docs/openapi.yaml</code>)
              belum memuat endpoint percakapan AI. Karena itu kotak percakapan, tombol kirim, dan contoh
              jawaban tidak ditampilkan — agar tidak ada yang terlihat berfungsi padahal belum ada.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="vsf-pill border-arutmin-border bg-white text-slate-600">Status: menunggu integrasi</span>
              <span className="vsf-pill border-arutmin-moss/50 bg-arutmin-mint/25 text-arutmin-forest">
                Tersedia untuk semua peran
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Rencana kapabilitas */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Rencana kapabilitas</div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 vsf-stagger">
          {RENCANA.map((r) => (
            <article key={r.judul} className="rounded-card border border-arutmin-border bg-white p-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-hidden="true" focusable="false">
                  <circle cx="10" cy="10" r="8" fill="#CFE2CE" stroke="#6B9D4A" strokeWidth="1.6" />
                  <path d="M6.5 10.2l2.4 2.4 4.6-5" fill="none" stroke="#2D452F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[13px] font-bold text-slate-900">{r.judul}</span>
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">{r.teks}</p>
            </article>
          ))}
        </div>
        <div className="mt-2 text-[12px] text-slate-500">Di atas adalah rencana modul, bukan fitur yang sedang berjalan.</div>
      </section>

      {/* Konteks data saat integrasi berjalan */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Konteks data (saat integrasi aktif)</div>
        <ul className="mt-3 grid gap-2">
          {KONTEKS.map((k) => (
            <li
              key={k}
              className="flex items-start gap-2 rounded-input border border-arutmin-border bg-white px-3 py-2 text-[13px] text-slate-700"
            >
              <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" focusable="false">
                <path d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.3 4.2 13.3l.7-4.3-3.1-3 4.3-.6z" fill="#CFE2CE" stroke="#6B9D4A" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              <span>{k}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
