import { svg, kotak, panah, W } from '../svg.mjs'

const tahap = svg(1160, 330, [
  kotak(10, 40, 250, 120, '1 · Monitoring', ['Sensor dibaca tiap 5 detik', 'dan disimpan'], 'mint'),
  kotak(300, 40, 250, 120, '2 · Rekomendasi', ['Kartu "Saran nutrisi"', 'teks saja, tanpa tombol'], 'mint'),
  kotak(590, 40, 250, 120, '3 · Persetujuan', ['Operator setujui / tolak', 'via API backend'], 'mint'),
  kotak(880, 40, 270, 120, '4 · Eksekusi pompa', ['DIBLOKIR', 'EKSEKUSI_DIIZINKAN = false'], 'bahaya'),
  panah([[262, 100], [298, 100]]), panah([[552, 100], [588, 100]]),
  panah([[842, 100], [878, 100]], { warna: W.galat }),
  `<line x1="845" y1="80" x2="875" y2="120" stroke="${W.galat}" stroke-width="4"/><line x1="875" y1="80" x2="845" y2="120" stroke="${W.galat}" stroke-width="4"/>`,
  `<text x="10" y="24" font-size="12.5" font-weight="700" letter-spacing="1.8" fill="${W.abu}">EMPAT HAL BERBEDA — JANGAN DICAMPUR</text>`,
  `<text x="10" y="200" font-size="12.5" font-weight="700" letter-spacing="1.8" fill="${W.abu}">STATUS SIKLUS DOSING (BACKEND)</text>`,
  kotak(10, 215, 200, 70, 'WAITING_APPROVAL', ['menunggu operator']).replace('font-size="17"', 'font-size="14"'),
  kotak(250, 215, 160, 70, 'APPROVED', ['disetujui']).replace('font-size="17"', 'font-size="14"'),
  kotak(450, 215, 220, 70, 'GERBANG DOSIS', ['menolak: 423 diblokir'], 'bahaya').replace('font-size="17"', 'font-size="14"'),
  kotak(710, 215, 440, 70, 'RUNNING → MIXING → VERIFYING', ['belum pernah dijalankan (jalur nonaktif)'], 'redup').replace('font-size="17"', 'font-size="14"'),
  panah([[212, 250], [248, 250]]), panah([[412, 250], [448, 250]]),
  panah([[672, 250], [708, 250]], { warna: W.galat, putus: true }),
  `<text x="10" y="315" font-size="13.5" fill="${W.abu}">Akhir lain: REJECTED (ditolak) · EXPIRED (lewat masa persetujuan) · CANCELLED (dicabut) · FAULT (gangguan → penampung dikunci)</text>`,
].join('\n'))

export default {
  no: '07', berkasMd: 'Persetujuan_Dosing', judulPendek: 'Alur Persetujuan Dosing',
  judul: 'Alur Persetujuan Dosing',
  subjudul: 'Persetujuan operator BUKAN tombol menyalakan pompa. Eksekusi dosing masih diblokir.',
  tujuan: 'Semua pihak memahami perbedaan monitoring, rekomendasi, persetujuan, dan eksekusi — serta bahwa eksekusi belum diizinkan.',
  pembaca: ['Operator', 'Administrator', 'Pengelola greenhouse', 'Mitra'],
  sumber: '`backend-nodejs/src/gerbangDosis.js:21` (`EKSEKUSI_DIIZINKAN = false`), `backend-nodejs/src/dosingSiklus.js` (status & jalur), `backend-nodejs/src/siklusBudidaya.js` (konfirmasi bibit), `react-web-app/src/components/analitik/KartuSaranDosis.tsx`, `docs/STATUS_PROYEK_REVIEW.md`.',
  layout: 'Header → peringatan merah lebar penuh di atas → diagram 4 tahap + status siklus dosing → 6 langkah bernomor → kartu prasyarat pembukaan blokir → footer.',
  ilustrasi: 'Kotak tahap 1–3 mint (berjalan), tahap 4 merah dengan tanda silang (diblokir). Status RUNNING–VERIFYING abu-abu redup dan panah putus-putus merah: jalur ada di desain tetapi tidak aktif. Ikon gembok untuk gerbang.',
  catatan: ['**Jangan** menggambar panah utuh dari "Persetujuan" ke "Pompa menyala".', 'Masa tunggu persetujuan = parameter `maks_masa_persetujuan_menit`. Nilainya wajib diisi admin; jika kosong, operasi ditolak. **Tidak ada angka bawaan** — jangan menulis angka menit.', 'Layar web/mobile untuk mengajukan/menyetujui siklus dosing belum ada; alur ini berjalan lewat API backend.', 'Satu-satunya perintah aktuator di modul persetujuan adalah STOP saat siklus berjalan dicabut.'],
  keselamatan: '- **Eksekusi dosing GARAP diblokir:** `EKSEKUSI_DIIZINKAN = false`. Persetujuan tidak menjalankan pompa.\n- Membuka blokir memerlukan perubahan kode + review setelah parameter, rumus, kalibrasi, dan firmware tervalidasi.\n- Uji pompa hanya dengan air bersih ke gelas ukur, oleh teknisi, dalam mode pemeliharaan.',
  blok: [
    { tipe: 'peringatan', nada: 'bahaya', ikon: 'lock', judulKotak: 'EKSEKUSI DOSING BELUM DIIZINKAN', teks: 'Status kode: `EKSEKUSI_DIIZINKAN = false`. Walaupun operator menyetujui, gerbang dosis selalu menolak eksekusi (balasan `423 eksekusi_diblokir`). Tidak ada perintah DOSIS yang dikirim ke pompa.' },
    { tipe: 'diagram', eyebrow: 'Empat tahap', judul: 'Monitoring ≠ Rekomendasi ≠ Persetujuan ≠ Eksekusi', alt: 'Diagram: Monitoring, Rekomendasi, dan Persetujuan berjalan; Eksekusi pompa diblokir oleh gerbang dosis.', svg: tahap,
      md: '**Baris atas (4 kotak):** 1 Monitoring (mint) → 2 Rekomendasi (mint) → 3 Persetujuan (mint) ✕→ 4 Eksekusi pompa **DIBLOKIR** (merah, `EKSEKUSI_DIIZINKAN = false`).\n**Baris bawah (status backend):** WAITING_APPROVAL → APPROVED → GERBANG DOSIS (menolak: 423 diblokir) ⇢ RUNNING → MIXING → VERIFYING (abu-abu, nonaktif).\nAkhir lain: REJECTED · EXPIRED · CANCELLED · FAULT.' },
    { tipe: 'langkah', eyebrow: 'Urutan persetujuan', judul: 'Apa yang terjadi, langkah demi langkah', kolom: 2, item: [
      { ikon: 'target', judul: 'Pengaturan target nutrisi', teks: 'Target berasal dari preset tervalidasi atau target manual pada siklus budidaya. Batas operasi wajib diisi admin.' },
      { ikon: 'database', judul: 'Pengumpulan data', teks: 'Sensor harus segar (≤ 120 detik) dan wajar. 3 bacaan mustahil berturut → penampung wajib dikunci.' },
      { ikon: 'scale', judul: 'Evaluasi sistem', teks: 'Gerbang dosis memeriksa: preset tervalidasi, batas operasi terisi, sensor segar & lengkap & wajar, nilai di dalam batas operasi.' },
      { ikon: 'clipboard-check', judul: 'Konfirmasi kondisi bibit', teks: 'Dosing hanya bisa diajukan saat siklus budidaya aktif (persiapan tandon s.d. tumbuh). Kondisi bibit SIAP / BELUM SIAP selalu dijawab pengguna, tidak pernah diasumsikan sistem.' },
      { ikon: 'user-check', judul: 'Permintaan konfirmasi operator', teks: 'Siklus dosing berstatus **WAITING_APPROVAL**. Operator yang ditugaskan di meja itu menyetujui atau menolak.' },
      { ikon: 'hourglass', judul: 'Masa tunggu konfirmasi', teks: 'Tidak dijawab sebelum batas waktu → **EXPIRED**. Batas waktu diisi admin; tanpa nilai, operasi ditolak.' },
    ] },
    { tipe: 'kartu', eyebrow: 'Status persetujuan', judul: 'Arti setiap hasil', kolom: 4, item: [
      { lencana: ['APPROVED'], judul: 'Disetujui', teks: 'Cakupan dibekukan. **Pompa tetap tidak berjalan** karena gerbang menolak.' },
      { lencana: ['REJECTED', 'netral'], judul: 'Ditolak', teks: 'Siklus dosing berakhir. Tidak ada tindakan.' },
      { lencana: ['EXPIRED', 'waspada'], judul: 'Kedaluwarsa', teks: 'Tidak dijawab sebelum batas masa persetujuan.' },
      { lencana: ['FAULT', 'bahaya'], judul: 'Gangguan', teks: 'Mis. 4 percobaan gagal berturut → penampung dikunci.' },
    ] },
    { tipe: 'kartu', eyebrow: 'Syarat membuka blokir', judul: 'Yang harus tervalidasi lebih dulu', kolom: 4, item: [
      { ikon: 'sliders-horizontal', judul: 'Parameter', teks: 'Batas operasi & konfigurasi dosis berstatus SIAP.' },
      { ikon: 'sigma', judul: 'Rumus', teks: 'Perhitungan dosis tervalidasi.' },
      { ikon: 'gauge', judul: 'Kalibrasi', teks: 'Sensor & laju pompa terkalibrasi.' },
      { ikon: 'cpu', judul: 'Firmware', teks: 'Firmware tervalidasi di lapangan.' },
    ] },
  ],
}
