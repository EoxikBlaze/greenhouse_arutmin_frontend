import { useState } from 'react'
import clsx from 'clsx'
import { useSearchParams } from 'react-router-dom'

type Mode = 'AUTO' | 'MANUAL'

export default function WaterControlPage() {
  const [mode, setMode] = useState<Mode>('AUTO')
  const [busy, setBusy] = useState<null | 'fill' | 'stop' | 'mode'>(null)
  // State variant via URL (QA/debug): ?state=offline
  const [searchParams] = useSearchParams()
  const isOffline = searchParams.get('state') === 'offline'

  // data statis sementara (meniru mockup) — nanti diganti polling /watercontrol/status
  const device = { online: true, lastSend: '12 dtk lalu', level: 74, valve: 'OFF' as 'ON' | 'OFF' }

  async function sendMode(next: Mode) {
    if (busy) return
    setBusy('mode')
    // TODO: api.post('/watercontrol/setMode', { mode: next })
    await new Promise((r) => setTimeout(r, 400))
    setMode(next)
    setBusy(null)
  }

  async function action(kind: 'fill' | 'stop') {
    if (busy || isOffline || mode !== 'MANUAL') return
    setBusy(kind)
    // TODO: api.post(kind === 'fill' ? '/watercontrol/fill' : '/watercontrol/stop')
    await new Promise((r) => setTimeout(r, 400))
    setBusy(null)
  }

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {/* Status perangkat & tandon */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Status perangkat &amp; tandon</div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 vsf-stagger">
          <div className="rounded-card border border-arutmin-border bg-white p-4">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500">Status Alat</div>
            <div className={clsx('text-[15px] font-bold mt-1', isOffline ? 'text-red-700' : 'text-arutmin-forest')}>
              {isOffline ? '● TERPUTUS' : '● TERHUBUNG'}
            </div>
            <div className="text-[12px] text-slate-600">terakhir kirim {device.lastSend}</div>
          </div>
          <div className="rounded-card border border-arutmin-border bg-white p-4">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500">Level Tandon</div>
            <div className="text-[22px] font-extrabold mt-1">{device.level} %</div>
            <div className="text-[12px] text-slate-600">batas min 20% / maks 95%</div>
          </div>
          <div className="rounded-card border border-arutmin-border bg-white p-4">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500">Katup</div>
            <div className="text-[15px] font-bold mt-1">{device.valve}</div>
            <div className="text-[12px] text-slate-600">perintah terakhir: manual stop</div>
          </div>
          <div className="rounded-card border border-arutmin-border bg-white p-4">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500">Mode</div>
            <div className="text-[15px] font-bold mt-1">{mode}</div>
            <div className="text-[12px] text-slate-600">berdasar ambang sensor</div>
          </div>
        </div>
      </section>

      {/* Pengaturan mode */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Pengaturan mode</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(['AUTO', 'MANUAL'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              disabled={busy === 'mode'}
              onClick={() => sendMode(m)}
              className={clsx(
                'inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold disabled:opacity-60',
                mode === m
                  ? 'border-arutmin-moss bg-activePill text-white'
                  : 'border-arutmin-border bg-white text-slate-700 hover:border-arutmin-moss/60',
              )}
            >
              {m === 'AUTO' ? 'AUTO (otomatis)' : 'MANUAL'}
            </button>
          ))}
          <span className="text-[12px] text-slate-500">
            balik ke AUTO = kontrol kembali ke sistem sesuai ambang
          </span>
        </div>
      </section>

      {/* Aksi manual */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Aksi manual (hanya mode MANUAL)</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy !== null || isOffline || mode !== 'MANUAL'}
            onClick={() => action('fill')}
            className="vsf-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy === 'fill' && <span className="vsf-spinner" />}
            {busy === 'fill' ? 'Mengirim…' : 'Isi Air (Fill)'}
          </button>
          <button
            type="button"
            disabled={busy !== null || isOffline || mode !== 'MANUAL'}
            onClick={() => action('stop')}
            className="vsf-input rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy === 'stop' && <span className="vsf-spinner vsf-spinner-dark" />}
            {busy === 'stop' ? 'Mengirim…' : 'Stop'}
          </button>
          <span className="text-[12px] text-slate-500">
            status polling tiap 3–5 dtk, tombol nonaktif saat perintah diproses
          </span>
        </div>
        {mode === 'MANUAL' && (
          <div className="mt-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-500/40 rounded-input px-3 py-2">
            ⚠ Mode MANUAL aktif — sistem tidak akan mengisi air otomatis.
          </div>
        )}
        {isOffline && (
          <div className="mt-2 text-[12px] text-red-700 bg-red-50 border border-red-600/40 rounded-input px-3 py-2">
            ✖ Perangkat offline — aksi dinonaktifkan sampai alat terhubung kembali.
          </div>
        )}
      </section>

      {/* Riwayat perintah */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Riwayat perintah</div>
        <div className="mt-3 overflow-auto rounded-card border border-arutmin-border bg-white vsf-table">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-arutmin-mint/25">
                {['Waktu', 'Perintah', 'Oleh', 'Hasil'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 text-[11px] uppercase tracking-[.12em] text-arutmin-forest border-b-2 border-arutmin-moss"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['12 Okt 08:02', 'STOP', 'admin', '✔ diterima'],
                ['12 Okt 07:58', 'FILL', 'admin', '✔ diterima'],
                ['11 Okt 21:14', 'AUTO', 'sistem', '✔ aktif'],
              ].map(([w, p, o, h]) => (
                <tr key={w} className="hover:bg-arutmin-mint/15">
                  <td className="px-3 py-2 font-semibold text-slate-900">{w}</td>
                  <td className="px-3 py-2 text-slate-700">{p}</td>
                  <td className="px-3 py-2 text-slate-700">{o}</td>
                  <td className="px-3 py-2 text-arutmin-forest">{h}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Catatan struktur & state</div>
        <ul className="mt-2 list-disc pl-5 text-[13px] text-slate-700 leading-relaxed">
          <li>State: perangkat offline → tombol aksi disabled + penjelasan.</li>
          <li>State: perintah terkirim → spinner di tombol sampai status terbaru masuk (polling).</li>
        </ul>
      </section>
    </div>
  )
}
