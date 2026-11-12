import { svg, panah, W } from '../svg.mjs'

const st = [
  ['Rencana dibuat', 'DRAFT', 'user'], ['Siapkan tandon', 'TANK_PREPARATION', 'system'],
  ['Konfirmasi tandon', 'WAITING_TANK_CONFIRMATION', 'user'], ['Semai', 'SEEDING', 'user / system'],
  ['Konfirmasi bibit siap', 'WAITING_REJUVENATION_CONFIRMATION', 'user'], ['Konfirmasi jumlah bibit', 'WAITING_SEED_COUNT_CONFIRMATION', 'user'],
  ['Tumbuh', 'GROWTH', 'user / system'], ['Selesai', 'COMPLETED', null],
]
const kotakStatus = ([judul, kode, pemaju], i) => {
  const x = 10 + (i % 4) * 288, y = i < 4 ? 60 : 230
  const akhir = i === 7
  return `<rect x="${x}" y="${y}" width="262" height="96" rx="12" fill="${akhir ? '#EEF5ED' : '#FFFFFF'}" stroke="${akhir ? W.moss : W.garis2}" stroke-width="1.5"/>
<text class="h" x="${x + 16}" y="${y + 32}" font-size="18" fill="${W.forest}">${i + 1}. ${judul}</text>
<text x="${x + 16}" y="${y + 56}" font-family="ui-monospace,Menlo,monospace" font-size="11.5" fill="${W.abu}">${kode}</text>
${pemaju ? `<text x="${x + 16}" y="${y + 80}" font-size="13" font-weight="600" fill="#4E7733">maju oleh: ${pemaju}</text>` : ''}`
}
const diagram = svg(1160, 400, [
  `<text x="10" y="36" font-size="12.5" font-weight="700" letter-spacing="1.8" fill="${W.abu}">STATUS SIKLUS BUDIDAYA DI BACKEND</text>`,
  ...st.map(kotakStatus),
  ...[0, 1, 2, 4, 5, 6].map((i) => { const x = 10 + (i % 4) * 288 + 262, y = i < 4 ? 108 : 278; return panah([[x + 2, y], [x + 24, y]]) }),
  panah([[1005, 158], [1005, 194], [141, 194], [141, 228]]),
  `<rect x="10" y="340" width="1136" height="52" rx="10" fill="${W.waspadaLatar}" stroke="${W.waspada}"/>`,
  `<text x="26" y="362" font-size="14" fill="#92400E">Dari status mana pun sebelum Selesai, pengguna dapat membatalkan → CANCELLED (alasan minimal 5 karakter).</text>`,
  `<text x="26" y="381" font-size="14" fill="#92400E">Bibit tidak pernah dianggap siap tanpa jawaban pengguna.</text>`,
].join('\n'))

export default {
  no: '06', berkasMd: 'Pengelolaan_Tanaman', judulPendek: 'Alur Pengelolaan Tanaman',
  judul: 'Alur Pengelolaan Tanaman',
  subjudul: 'Dari memilih tanaman sampai konfirmasi tahap — di website hari ini dan di siklus budidaya backend.',
  tujuan: 'Pengelola memahami urutan mencatat tanaman dan titik-titik di mana sistem menunggu konfirmasi manusia.',
  pembaca: ['Pengelola greenhouse', 'Administrator', 'Operator'],
  sumber: '`react-web-app/src/components/kebun/DialogMulaiSemai.tsx`, `backend-nodejs/src/siklusBudidaya.js` (status & mode PRESET/MANUAL), `backend-nodejs/src/kestabilan.js`, Modul Juknas Bab IV.4.',
  layout: 'Header → 7 langkah bernomor 2 kolom → diagram status siklus budidaya (8 kotak berurutan) → 2 kartu "Di website sekarang" vs "Di backend (API)" → info → footer.',
  ilustrasi: 'Ikon lucide: sprout, list-checks, flask-conical, hash, gauge, clipboard-check, circle-check. Diagram status berupa kotak berurutan dengan panah; nama status ditulis persis seperti di kode (huruf kapital).',
  catatan: ['Alur 7 langkah mengikuti siklus budidaya di backend (Fase 3). **Layar web/mobile untuk alur ini belum tersedia**; di website saat ini dipakai dialog **Mulai semai baru** + 4 tahap (Semai → Peremajaan → Pendewasaan → Panen).', 'Masa tunggu konfirmasi dan jadwal pengingat bergantung parameter yang wajib diisi admin; tanpa parameter, fitur tidak berjalan (tidak ada angka bawaan).', 'Tidak ada langkah di alur ini yang menyalakan pompa.'],
  keselamatan: '- Siklus budidaya **tidak menyentuh pompa** sama sekali (komentar kode `siklusBudidaya.js`).',
  blok: [
    { tipe: 'langkah', eyebrow: 'Tujuh langkah', judul: 'Urutan pengelolaan satu siklus tanam', kolom: 2, item: [
      { ikon: 'sprout', judul: 'Pilih jenis tanaman', teks: 'Dari katalog **Jenis Tanaman**, lalu pilih meja tanam.' },
      { ikon: 'list-checks', judul: 'Pilih preset atau manual', teks: 'Mode target **PRESET** (versi preset tervalidasi) atau **MANUAL** (isi target sendiri).' },
      { ikon: 'flask-conical', judul: 'Atur target nutrisi awal', teks: 'Target pH/TDS awal mengikuti preset atau isian manual. Tandon disiapkan sampai stabil.' },
      { ikon: 'hash', judul: 'Masukkan jumlah bibit', teks: 'Bilangan bulat ≥ 1. Jumlah dikonfirmasi lagi setelah peremajaan.' },
      { ikon: 'gauge', judul: 'Lakukan monitoring', teks: 'Sistem menilai kestabilan tandon dari data sensor segar; operator memantau Dashboard.' },
      { ikon: 'clipboard-check', judul: 'Evaluasi pertumbuhan', teks: 'Operator menjawab apakah bibit **SIAP** atau **BELUM SIAP**. Belum siap → dijadwalkan ulang.' },
      { ikon: 'circle-check', judul: 'Konfirmasi tahapan', teks: 'Setiap perpindahan tahap dicatat (siapa, kapan, alasan) di Catatan Aktivitas.' },
    ] },
    { tipe: 'diagram', eyebrow: 'Status siklus', judul: 'Bagaimana sistem mencatat kemajuan', alt: 'Diagram status: DRAFT, TANK_PREPARATION, WAITING_TANK_CONFIRMATION, SEEDING, WAITING_REJUVENATION_CONFIRMATION, WAITING_SEED_COUNT_CONFIRMATION, GROWTH, COMPLETED.', svg: diagram,
      md: '**Diagram status (kotak berurutan):** DRAFT → TANK_PREPARATION → WAITING_TANK_CONFIRMATION → SEEDING → WAITING_REJUVENATION_CONFIRMATION → WAITING_SEED_COUNT_CONFIRMATION → GROWTH → COMPLETED.\nPemaju: user · system · user · user/system · user · user · user/system.\nCatatan bawah: dari status mana pun (kecuali COMPLETED) pengguna dapat membatalkan → CANCELLED (alasan ≥ 5 karakter).' },
    { tipe: 'kartu', eyebrow: 'Di mana dilakukan', judul: 'Website sekarang vs backend', kolom: 2, item: [
      { ikon: 'monitor', lencana: ['Tersedia di website'], judul: 'Kebun Saya → Mulai semai baru', poin: ['Isi: tanaman, meja tanam, tanggal mulai semai, jumlah benih, keterangan.', 'Tahap: Semai → Peremajaan → Pendewasaan → Panen.', 'Admin menekan **Tandai Selesai** untuk memajukan batch.'] },
      { ikon: 'server', lencana: ['Backend / API saja', 'netral'], judul: 'Siklus budidaya Fase 3', poin: ['Mode target PRESET / MANUAL.', 'Persiapan & konfirmasi tandon, konfirmasi bibit, konfirmasi jumlah bibit.', 'Belum ada layar web/mobile.'] },
    ] },
    { tipe: 'peringatan', nada: 'info', judulKotak: 'Sistem selalu menunggu jawaban manusia', teks: 'Bibit tidak pernah dianggap siap tanpa jawaban pengguna, dan parameter yang belum diisi admin membuat langkah terkait ditolak — bukan diisi angka tebakan.' },
  ],
}
