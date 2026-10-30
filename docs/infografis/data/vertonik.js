/* Infografis 1 — cara kerja sistem Vertonik Smart Farm (+ anggota + QR).
   Angka dari dokumen perancangan & tabel konfigurasi_dosis / timing_operasi. */
window.DATA = {
  hero: {
    judulA: 'Cara Kerja Sistem', judulB: 'Vertonik Smart Farm',
    pita: 'Greenhouse hidroponik · KKN Arutmin Asik 2026',
    skrip: 'Tanpa Takar Manual',
    strip: [
      { nilai: '4', label: 'meja hidroponik', ket: '3 NFT + 1 DFT' },
      { nilai: '1.220', label: 'lubang tanam', ket: 'total keempat meja' },
      { nilai: '±70 L', label: 'penampung per meja', ket: 'target & LOCK sendiri' },
      { nilai: '1', label: 'pengendali ESP32', ket: 'bergiliran tiap meja' },
    ],
  },
  bagian: [
    { jenis: 'alur', eyebrow: 'Alur data', judul: 'Dari air penampung sampai genggaman petani', isi: [
      { ikon: 'sensor', judul: 'Sensor', tag: 'Botol sampel', teks: 'Air tiap penampung diambil ke botol sampel. EC, pH, dan suhu dibaca saat air diam.' },
      { ikon: 'chip', judul: 'ESP32', tag: 'Pengendali', teks: 'Mengurus semua meja bergiliran, satu aksi satu waktu. Aturan tetap jalan walau WiFi mati.' },
      { ikon: 'server', judul: 'Server Pi', tag: 'Raspberry Pi', teks: 'Menyimpan data, menjaga pagar keselamatan, menjalankan asisten AI lokal dan CCTV.' },
      { ikon: 'hp', judul: 'Petani', tag: 'Web · HP', teks: 'Pantau sensor, terima alert, dan cukup isi jumlah tanaman yang berhasil tiap tahap.' },
    ] },
    { jenis: 'langkah', eyebrow: 'Cara kerja', judul: 'Satu siklus, bergiliran untuk tiap penampung', isi: [
      { judul: 'Baca', teks: 'EC, pH, dan suhu dibaca dari botol sampel. Air surut? Pelampung memicu **isi air otomatis**.' },
      { judul: 'Putuskan', teks: 'Sesuai target → **istirahat 60 menit**. Kurang → antre dosing. Di luar batas aman → **alert**.' },
      { judul: 'Bertindak', teks: 'Nutrisi disuntik per ronde, dibilas, lalu **dibaca ulang** sebelum memutuskan ronde berikutnya.' },
    ] },
    { jenis: 'rantai', eyebrow: 'Satu ronde dosing', judul: 'Terukur, dibilas, lalu diverifikasi', isi: [
      { teks: 'Suntik A', gaya: 'a' }, { teks: 'Bilas 300 mL' }, { teks: 'Jeda 2 mnt', gaya: 't' }, { teks: 'Suntik B', gaya: 'a' },
      { teks: 'Bilas' }, { teks: 'Aduk 15 mnt', gaya: 't' }, { teks: 'Baca ulang', gaya: 'v' },
    ], catatan: 'Tiap ronde hanya **65% dari kekurangan**, maksimal **300 ppm (±214 mL)** per suntikan. Kurang bisa ditambah ronde berikutnya; berlebih sulit ditarik kembali.' },
    { jenis: 'panel', eyebrow: 'Pagar keselamatan', judul: 'Batas yang tidak bisa dilewati siapa pun', angka: [
      { nilai: '214', satuan: 'mL', label: 'maksimal per suntikan' },
      { nilai: '5', label: 'suntikan per kejadian dosing' },
      { nilai: '8', label: 'kejadian dosing per hari' },
      { nilai: '500', satuan: 'mL', label: 'nutrisi AB per hari' },
      { nilai: '100', satuan: 'mL', label: 'pH Up/Down per hari' },
    ], butir: [
      { ikon: 'gembok', judul: 'LOCK otomatis', teks: 'Retry habis, jatah harian habis, atau 3× bacaan sensor mustahil → dosing meja itu berhenti.' },
      { ikon: 'stop', judul: 'Tombol E-STOP', teks: 'Tombol darurat di lapangan menghentikan semua pompa seketika.' },
      { ikon: 'lonceng', judul: 'Alert ke petani', teks: 'Petani diberi tahu; LOCK dibuka hanya setelah diperiksa.' },
    ] },
    { jenis: 'anggota', eyebrow: 'Tim pembuat', judul: 'Tujuh peran, satu tujuan' },
    { jenis: 'qr', url: 'https://instagram.com/kkn.arutminidn2026', label: '@kkn.arutminidn2026',
      judul: 'Ikuti kabar proyek ini', teks: 'Scan dengan kamera HP untuk membuka Instagram KKN Arutmin Asik 2026: dokumentasi, progres alat, dan cerita tim.' },
  ],
};
