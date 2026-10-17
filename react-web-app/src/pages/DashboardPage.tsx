export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Hero sambutan + aksi cepat</div>
        <div className="mt-3 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[260px]">
            <div className="text-[18px] font-bold">Selamat Datang di GARAP — PT Arutmin Indonesia</div>
            <div className="text-[13px] text-slate-600 mt-1">
              Pantau kondisi air nutrisi, suhu tanaman, dan jadwal panen hidroponik.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="vsf-input rounded-full">Lihat Grafik Sensor</button>
              <button className="vsf-input rounded-full">Mulai Semai Baru</button>
              <button className="vsf-input rounded-full">Water Control</button>
            </div>
          </div>
          <div className="w-[160px] h-[90px] rounded-card border border-dashed border-arutmin-border flex items-center justify-center text-slate-500">
            logo
          </div>
        </div>
      </section>

      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">
          Kondisi Air & Tanaman Terkini — 6 kartu metrik live
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            ['pH (Asam-Basa)', '6.43', 'target 5.5–6.5 • Mati'],
            ['Suhu Air Tandon', '26.2 °C', 'target 24–28 • Mati'],
            ['TDS Nutrisi', '1180 ppm', 'target 900–1400 • Mati'],
            ['Suhu Udara', '31.5 °C', 'target 25–33 • Mati'],
            ['Kelembapan', '68 %', 'target 60–80 • Mati'],
            ['Tandon Air', '74 %', 'Katup: OFF • AUTO'],
          ].map(([k, v, s]) => (
            <div key={k} className="rounded-card border border-arutmin-border bg-white p-4">
              <div className="text-[11px] uppercase tracking-[.14em] text-slate-500">{k}</div>
              <div className="text-[22px] font-extrabold mt-1">{v}</div>
              <div className="text-[12px] text-slate-600">{s}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[12px] text-slate-500">▶ link "Detail Grafik" per kartu → halaman Sensor Real-Time</div>
      </section>
    </div>
  )
}
