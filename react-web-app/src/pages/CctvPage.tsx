/** Ilustrasi: kamera CCTV + pancaran sinyal (SVG murni, bukan emoji). */
function IlustrasiCctv() {
  return (
    <svg viewBox="0 0 180 118" className="mx-auto h-[104px] w-[168px]" aria-hidden="true" focusable="false">
      <ellipse cx="90" cy="108" rx="60" ry="7" fill="#E2E8DD" />
      {/* tiang + dudukan */}
      <path d="M86 74h8v30h-8z" fill="#4C6A4B" />
      <rect x="72" y="98" width="36" height="8" rx="4" fill="#CFE2CE" stroke="#6B9D4A" strokeWidth="2" />
      {/* badan kamera */}
      <g transform="rotate(-12 90 52)">
        <rect x="52" y="38" width="66" height="30" rx="10" fill="#fff" stroke="#6B9D4A" strokeWidth="2" />
        <rect x="114" y="44" width="14" height="18" rx="5" fill="#CFE2CE" stroke="#6B9D4A" strokeWidth="2" />
        <circle cx="64" cy="53" r="7" fill="#2D452F" />
        <circle cx="64" cy="53" r="3" fill="#CFE2CE" />
        <path d="M78 46h30M78 60h22" stroke="#E2E8DD" strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* pancaran sinyal */}
      <path d="M132 34a16 16 0 0 1 0 22" fill="none" stroke="#6B9D4A" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M140 26a26 26 0 0 1 0 38" fill="none" stroke="#6B9D4A" strokeWidth="2.4" strokeLinecap="round" opacity=".65" />
      <path d="M148 18a36 36 0 0 1 0 54" fill="none" stroke="#6B9D4A" strokeWidth="2.4" strokeLinecap="round" opacity=".35" />
      {/* status merekam */}
      <circle cx="40" cy="26" r="6" fill="#F59E0B" opacity=".85" />
      <path d="M56 22h20M56 30h14" stroke="#E2E8DD" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

const RENCANA = [
  {
    judul: 'Papan kamera per lokasi',
    teks: 'Daftar kamera greenhouse, nursery, tandon, dan pintu lengkap dengan status feed.',
  },
  {
    judul: 'Pemutar & rekaman',
    teks: 'Tonton aliran langsung, ambil snapshot, dan putar rekaman dari satu pemutar.',
  },
  {
    judul: 'Peristiwa & notifikasi',
    teks: 'Deteksi gerak dan feed terputus dikirim sebagai notifikasi (mengikuti Pengaturan Notifikasi WA).',
  },
]

const KONTEKS = [
  'Daftar perangkat & status feed dari backend',
  'Rekaman tersimpan per kamera dengan waktu',
  'Ambang peristiwa yang dipantau modul Sensor Real-Time',
]

export default function CctvPage() {
  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {/* Ringkas modul */}
      <section className="vsf-card p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">CCTV greenhouse</div>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
              Pantau kondisi greenhouse, nursery, dan area tandon lewat kamera — termasuk rekaman
              dan pemberitahuan bila ada gerakan atau feed yang terputus.
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
          <IlustrasiCctv />
          <div className="mx-auto mt-4 max-w-[560px]">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Status modul</div>
            <h2 className="mt-1.5 text-[17px] font-bold text-slate-900">Modul CCTV belum punya endpoint API</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              Kontrak backend (<code className="rounded bg-arutmin-mint/60 px-1 py-0.5 text-[12px]">docs/openapi.yaml</code>)
              tidak memuat rute untuk daftar kamera, aliran video, maupun rekaman. Papan kamera contoh,
              log peristiwa, dan tombol rekam/snapshot sengaja tidak ditampilkan agar tidak terlihat aktif.
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

      {/* Konteks integrasi */}
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
