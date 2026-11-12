import { svg, W } from '../svg.mjs'

const lampu = (cx, warna, label) => `<circle cx="${cx}" cy="300" r="26" fill="${warna}" stroke="${W.navy}" stroke-width="3"/><text x="${cx}" y="350" font-size="14" font-weight="600" text-anchor="middle" fill="${W.tinta}">${label}</text>`
const panel = svg(1000, 420, [
  `<rect x="20" y="20" width="960" height="380" rx="20" fill="${W.page}" stroke="${W.garis2}" stroke-width="2"/>`,
  `<text x="44" y="56" font-size="12.5" font-weight="700" letter-spacing="1.8" fill="${W.abu}">ELEMEN PANEL YANG DILIHAT OPERATOR (SKEMA, BUKAN TATA LETAK FISIK)</text>`,
  `<rect x="44" y="80" width="520" height="160" rx="12" fill="${W.navy}"/><rect x="62" y="96" width="484" height="128" rx="6" fill="#1E3A2A"/>`,
  `<text x="78" y="128" font-family="ui-monospace,Menlo,monospace" font-size="17" fill="#9FD38A">baris 1–3: bacaan sensor</text>`,
  `<text x="78" y="160" font-family="ui-monospace,Menlo,monospace" font-size="17" fill="#9FD38A">(pH, EC, suhu, status)</text>`,
  `<text x="78" y="206" font-family="ui-monospace,Menlo,monospace" font-size="19" font-weight="700" fill="#D9F2C8">PENAMPUNG CUKUP</text>`,
  `<text x="304" y="262" font-size="14" font-weight="600" text-anchor="middle" fill="${W.tinta}">LCD 20×4 — baris ke-4 = pesan status</text>`,
  lampu(80, W.galat, 'Merah'), lampu(170, W.moss, 'Hijau'), lampu(260, '#2F6FB5', 'Biru'),
  `<text x="170" y="380" font-size="13" text-anchor="middle" fill="${W.abu}">Lampu pilot (via ULN2003)</text>`,
  `<circle cx="700" cy="170" r="70" fill="${W.galat}" stroke="#7F1D1D" stroke-width="4"/><circle cx="700" cy="170" r="48" fill="#D9473A"/><text x="700" y="176" font-size="18" font-weight="700" text-anchor="middle" fill="#fff">E-STOP</text>`,
  `<text x="700" y="268" font-size="14" font-weight="600" text-anchor="middle" fill="${W.tinta}">Tombol darurat merah</text><text x="700" y="288" font-size="13" text-anchor="middle" fill="${W.abu}">memutus bus +12 V pompa</text>`,
  `<rect x="850" y="140" width="80" height="60" rx="12" fill="#FFFFFF" stroke="${W.navy}" stroke-width="3"/><circle cx="890" cy="170" r="16" fill="${W.navy}"/>`,
  `<text x="890" y="232" font-size="14" font-weight="600" text-anchor="middle" fill="${W.tinta}">RESET</text><text x="890" y="252" font-size="13" text-anchor="middle" fill="${W.abu}">tekan singkat:</text><text x="890" y="270" font-size="13" text-anchor="middle" fill="${W.abu}">info Wi-Fi/IP 4 dtk</text>`,
].join('\n'))

export default {
  no: '04', berkasMd: 'Pengoperasian_IoT', judulPendek: 'Pengoperasian Perangkat IoT',
  judul: 'Pengoperasian Perangkat IoT',
  subjudul: 'Memeriksa panel ESP32 dan memastikan data sampai ke sistem — langkah demi langkah.',
  tujuan: 'Operator dapat memeriksa panel, menyalakan, dan memastikan perangkat terhubung tanpa membuka panel listrik.',
  pembaca: ['Operator', 'Teknisi'],
  sumber: '`deploy-pi/firmware/gabungan/gabungan.ino` (`gabungan-0.6`: pin, interval 5 dtk, E-STOP GPIO 36), Modul Juknas Bab V (lampu pilot, pesan LCD) & Bab VI (uji 8 tahap).',
  layout: 'Header → skema panel lebar penuh (LCD, 3 lampu pilot, E-STOP, RESET) → 8 langkah bernomor 2 kolom → tabel arti lampu pilot → tabel pesan LCD baris ke-4 → peringatan bahaya → footer.',
  ilustrasi: 'Skema panel memakai bentuk sederhana: persegi navy untuk LCD, lingkaran warna untuk lampu, tombol jamur merah untuk E-STOP. Beri label "skema, bukan tata letak fisik" — posisi aktual di panel belum didokumentasikan dengan foto. Bila foto panel tersedia, ganti skema dengan foto berlabel.',
  catatan: ['Langkah 4 sengaja tidak memberi urutan menyalakan daya rinci: urutan daya belum ditetapkan di SOP tervalidasi. Ikuti teknisi.', 'Kode warna lampu dari Modul Juknas tabel 5.2.', 'Biru `#2F6FB5` hanya dipakai untuk menggambar lampu pilot biru (warna benda), bukan warna UI.'],
  keselamatan: '- Operator **tidak membuka** panel listrik. Pemeriksaan kabel, sekring, dan relay = tugas teknisi.\n- Lampu **merah saja** = E-STOP aktif: semua pompa terkunci. Jangan memaksa pompa menyala.\n- Jangan menyentuh panel dengan tangan basah.',
  blok: [
    { tipe: 'diagram', eyebrow: 'Kenali panel', judul: 'Empat hal yang Anda lihat di panel', alt: 'Skema panel: LCD 20x4, lampu pilot merah hijau biru, tombol E-STOP merah, tombol RESET.', svg: panel,
      md: '**Skema panel (gambar sederhana):** LCD 20×4 (baris ke-4 = pesan status) · 3 lampu pilot Merah/Hijau/Biru · tombol jamur merah **E-STOP** (memutus bus +12 V pompa) · tombol **RESET** (tekan singkat = info Wi-Fi/IP/Server 4 detik di LCD). Label: "skema, bukan tata letak fisik".' },
    { tipe: 'langkah', eyebrow: 'Prosedur', judul: 'Delapan langkah pemeriksaan', kolom: 2, item: [
      { ikon: 'cpu', judul: 'Kenali perangkat', teks: 'Panel berisi ESP32 `gabungan-0.6`, sensor pH/EC/suhu/kelembapan, pelampung, dan 5 pompa 12 V.' },
      { ikon: 'scan-eye', judul: 'Periksa panel dari luar', teks: 'Tutup panel rapat, tidak ada bau hangus, selang pompa tidak bocor, lantai sekitar kering.' },
      { ikon: 'plug-zap', judul: 'Periksa sumber listrik', teks: 'Lihat dari luar: steker terpasang dan stopkontak tidak basah. Jangan membuka panel.' },
      { ikon: 'power', judul: 'Nyalakan sesuai SOP', teks: 'Nyalakan Raspberry Pi dan panel sesuai arahan teknisi. Urutan daya rinci belum ditetapkan di SOP tervalidasi.' },
      { ikon: 'wifi', judul: 'Pastikan koneksi', teks: 'LCD baris ke-4 berubah dari `WIFI MATI` / `TUNGGU SERVER...` ke `PENAMPUNG CUKUP`. Lampu **hijau saja**.' },
      { ikon: 'activity', judul: 'Periksa sensor', teks: 'Angka tampil di LCD. Bila tampil `pH --.--` atau `EC ----`, probe tidak terbaca — lapor teknisi.' },
      { ikon: 'monitor-check', judul: 'Pastikan data diterima sistem', teks: 'Di Dashboard status **Alat terhubung** dan "bacaan terakhir" baru (data dikirim tiap 5 detik).' },
      { ikon: 'lightbulb', judul: 'Periksa indikator', teks: 'Cocokkan warna lampu pilot dengan tabel di bawah. Tekan **RESET** singkat untuk melihat IP server.' },
    ] },
    { tipe: 'tabel', eyebrow: 'Lampu pilot', judul: 'Arti warna lampu', kolom: ['Lampu', 'Arti', 'Yang dilakukan operator'], baris: [
      ['Hijau saja', 'Normal: Wi-Fi & MQTT terhubung, air penampung cukup.', 'Lanjutkan pemantauan.'],
      ['Merah + Hijau', 'Peringatan: air penampung kurang, atau detak server/MQTT terputus.', 'Cek level tandon & Dashboard. Lapor teknisi bila tidak pulih.'],
      ['Merah saja', 'DARURAT: E-STOP aktif. Semua pompa dimatikan & dikunci.', 'Cari penyebab (bocor, selang lepas). Panggil teknisi/admin.'],
      ['Biru menyala', 'Salah satu pompa sedang bekerja (isi air, uji pompa).', 'Jangan cabut selang. Tunggu sampai padam.'],
    ] },
    { tipe: 'tabel', eyebrow: 'Layar LCD', judul: 'Pesan baris ke-4', kolom: ['Pesan', 'Arti'], baris: [
      ['`PENAMPUNG CUKUP` / `PENUH` / `KURANG`', 'Level air tandon dari pelampung bawah & atas.'],
      ['`E-STOP AKTIF!`', 'Prioritas tertinggi — pompa terkunci.'],
      ['`WIFI MATI`', 'ESP32 gagal tersambung ke Wi-Fi 2,4 GHz.'],
      ['`TUNGGU SERVER...`', 'Wi-Fi tersambung, menunggu broker MQTT / detak server.'],
      ['`HTTP SENSOR ONLY`', 'Port MQTT 1883 terblokir; data sensor lewat HTTP, **pompa terkunci aman**.'],
      ['`MENGISI AIR...`, `DOSING A...`, `pH UP...`', 'Pompa terkait sedang aktif.'],
    ] },
    { tipe: 'peringatan', nada: 'bahaya', judulKotak: 'Dalam keadaan darurat, tekan E-STOP fisik dulu', poin: ['Kebocoran, selang lepas, korsleting, atau pompa berjalan tidak wajar → tekan tombol merah **E-STOP**.', 'Tidak perlu menunggu website.', 'Operator tidak membuka panel; hubungi teknisi.'], ikon: 'octagon-x' },
  ],
}
