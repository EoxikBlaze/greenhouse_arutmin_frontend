/* Spanduk 2 (3 × 1 m, gaya halaman Tentang) — proker yang dijalankan + sponsor & media partner + anggota tim + QR.
   Proker berisi 4 program kerja dari tim (26 Okt 2026). Butir bertanda `contoh: true` = isian contoh (garis merah). */
window.DATA = {
  tata: 'spanduk', lebar: 3000, tinggi: 1000, skala: 4,
  kolom: [
    { jenis: 'kepala', px: 700, judulA: 'KKN Industri', judulB: 'Arutmin Asik 2026',
      pita: 'Politeknik Negeri Tanah Laut · PT Arutmin Indonesia', skrip: 'Our Team',
      lead: 'Mahasiswa **Politeknik Negeri Tanah Laut** menjalankan Kuliah Kerja Nyata Industri di **PT Arutmin Indonesia** tahun 2026. Salah satu hasilnya: **Vertonik Smart Farm**.' },
    { jenis: 'proker', px: 860, eyebrow: 'Program kerja', judul: 'Proker yang dijalankan', isi: [
      { judul: 'Otomatisasi Vertonik Smart Farm', teks: 'Sistem IoT hidroponik: sensor, dosing otomatis, server Raspberry Pi, serta website & aplikasi HP.', sasaran: 'Greenhouse PT Arutmin' },
      { judul: 'Publikasi kegiatan dan peliputan', teks: 'Publikasi dan peliputan kegiatan KKN, berkolaborasi dengan **3 media partner** dan **2 sponsor**.', waktu: '3 media partner', sasaran: '2 sponsor' },
      { judul: 'Seminar pelatihan petani berdasi', teks: 'Seminar dan pelatihan petani berdasi: bertani modern dengan memanfaatkan teknologi.' },
      { judul: 'Kolaborasi kerja dengan tim HMPT', teks: 'Kerja sama program kerja bersama tim HMPT.' },
    ] },
    { jenis: 'mitra', px: 720, eyebrow: 'Didukung oleh', judul: 'Sponsor & media partner',
      // logo di docs/infografis/aset/ (dikirim tim 27 Okt 2026)
      utama: [{ nama: 'PT Arutmin Indonesia', logo: 'aset/arutmin.png' }],
      sponsor: [{ nama: 'Harvest House', logo: 'aset/harvest-house.png' }, { nama: 'A-Rini Elektronik Store', logo: 'aset/a-rini-elektronik.png' }],
      media: [{ nama: 'TVRI Kalimantan Selatan', logo: 'aset/tvri-kalsel.png' }, { nama: 'kinikalsel.id', logo: 'aset/kinikalsel.png' }, { nama: 'Kaiwala', logo: 'aset/kaiwala.png' }],
      catatan: 'Terima kasih atas dukungan publikasi dan peliputan kegiatan KKN Arutmin Asik 2026.' },
    { jenis: 'tim', px: 720, eyebrow: 'Anggota', judul: 'Tujuh peran, satu tujuan',
      qr: 'https://instagram.com/kkn.arutminidn2026', qrJudul: 'Lihat kegiatan kami', qrTeks: 'Scan untuk membuka Instagram KKN Arutmin Asik 2026.' },
  ],
};
