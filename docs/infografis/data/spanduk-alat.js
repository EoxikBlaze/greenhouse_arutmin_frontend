/* Spanduk 1 (3 × 1 m, gaya halaman Tentang) — Vertonik: sensor, aktuator, cara kerja website.
   Kanvas 3000×1000 px, dirender 4× = 12000×4000 px (±100 dpi pada 3 m). */
window.DATA = {
  tata: 'spanduk', lebar: 3000, tinggi: 1000, skala: 4,
  kolom: [
    { jenis: 'kepala', px: 920, judulA: 'Vertonik', judulB: 'Smart Farm Hidroponik',
      pita: 'Alat & cara kerja · KKN Arutmin Asik 2026', skrip: 'Tanpa Takar Manual',
      strip: [
        { nilai: '4', label: 'meja hidroponik', ket: '3 NFT + 1 DFT' },
        { nilai: '1.220', label: 'lubang tanam', ket: 'total keempat meja' },
        { nilai: '±70 L', label: 'penampung per meja', ket: 'target & LOCK sendiri' },
        { nilai: '1', label: 'pengendali ESP32', ket: 'bergiliran tiap meja' },
      ] },
    { jenis: 'alat', px: 1140, eyebrow: 'Sistem alat', judul: 'Sensor membaca, aktuator bertindak',
      kiri: { judul: 'Sensor', isi: [
        { ikon: 'sensor', judul: 'Sensor EC (DFRobot)', teks: 'Kepekatan nutrisi dari botol sampel' },
        { ikon: 'tetes', judul: 'Sensor pH', teks: 'Keasaman air di botol sampel' },
        { ikon: 'termometer', judul: 'Sensor suhu air', teks: 'Koreksi bacaan EC terhadap suhu' },
        { ikon: 'awan', judul: 'Suhu & kelembapan', teks: 'SHT31 memantau ruang greenhouse' },
        { ikon: 'pelampung', judul: 'Float switch', teks: 'Pemicu isi air tiap penampung' },
      ] },
      kanan: { judul: 'Aktuator', isi: [
        { ikon: 'pompa', judul: 'Pompa peristaltik ×4', teks: 'Nutrisi A, B, pH Up, pH Down — terukur per detik' },
        { ikon: 'tetes', judul: 'Pompa celup mini', teks: 'Mengisi botol sampel & membilas jalur dosing' },
        { ikon: 'katup', judul: 'Solenoid ×12', teks: '4 isi air · 4 cabang dosing · 4 buang sampel' },
        { ikon: 'chip', judul: 'ESP32 + relay', teks: 'Otak di lapangan, LCD & lampu status' },
      ], catatan: '**Tombol E-STOP** memutus daya semua aktuator secara fisik. **RESET** menyalakan lagi dan membersihkan LOCK.' } },
    { jenis: 'web', px: 940, eyebrow: 'Website & aplikasi GARAP', judul: 'Cara kerjanya',
      alur: ['ESP32', 'Server Raspberry Pi', 'Basis data', 'Web & HP'], isi: [
        { ikon: 'kunci', judul: 'Masuk', teks: 'Login sesuai peran: **admin**, **petani**, atau **demo**.' },
        { ikon: 'layar', judul: 'Pantau', teks: 'Sensor real-time tiap meja, alert, dan **CCTV**.' },
        { ikon: 'daun', judul: 'Kelola', teks: 'Mulai tanam, isi jumlah berhasil. Admin: target dosing, LOCK.' },
        { ikon: 'obrolan', judul: 'Tanya', teks: '**Asisten AI** lokal & laporan bulanan (CSV).' },
      ],
      qr: 'https://instagram.com/kkn.arutminidn2026', qrJudul: 'Ikuti kabar proyek ini', qrTeks: 'Scan dengan kamera HP untuk membuka Instagram KKN.' },
  ],
};
