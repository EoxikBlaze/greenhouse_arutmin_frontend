export default {
  no: '03', berkasMd: 'Pengoperasian_Website', judulPendek: 'Cara Mengoperasikan Website',
  judul: 'Cara Mengoperasikan Website GARAP',
  subjudul: 'Delapan langkah dari login sampai memeriksa riwayat aktivitas.',
  tujuan: 'Operator dan admin dapat memakai website untuk pemantauan harian tanpa membaca manual panjang.',
  pembaca: ['Operator', 'Administrator', 'Pengelola greenhouse'],
  sumber: '`react-web-app/src/layouts/AppShell.tsx` (menu), `react-web-app/src/router.tsx` (hak akses), Modul Juknas Bab III–IV. Screenshot login: 12 Nov 2026; screenshot dashboard/sensor/tanam: 28 Okt 2026.',
  layout: 'Header navy → baris 2 kolom: screenshot login (kiri) + kartu alamat akses (kanan) → 8 langkah bernomor dalam grid 2 kolom → 2 screenshot berdampingan (Dashboard, Kebun Saya) → tabel hak akses peran → footer.',
  ilustrasi: 'Pakai screenshot asli dari `04-ASSETS/screenshots/`. Jangan menggambar ulang UI. Screenshot dashboard/tanam bertanggal 28 Okt 2026: navigasi samping lama sudah diganti rail grup (PANTAU, KENDALI, DATA, SISTEM, SIKLUS TANAM, MASTER DATA) — potong bagian sidebar bila ingin aman, atau ambil ulang screenshot setelah login.',
  catatan: ['Nama menu ditulis persis seperti di layar: Dashboard, Sensor, Peringatan, Kebun Saya, Meja Tanaman, Catatan Aktivitas.', '"Notifikasi" di website bernama **Peringatan**; "riwayat aktivitas" bernama **Catatan Aktivitas**; "tandon" dikelola di **Meja Tanaman** dan **Target Nutrisi**.', 'Langkah 6 dan 8 hanya untuk Admin (Demo = baca-saja).'],
  keselamatan: '- Jangan membagikan kata sandi. Kata sandi minimal 8 karakter (Akun Saya).\n- Tombol merah **STOP pompa** (halaman Kalibrasi) hanya untuk keadaan darurat; E-STOP fisik tetap pemutus utama.',
  blok: [
    { tipe: 'dua', isi: [
      { tipe: 'gambar', src: '00-login.png', alt: 'Halaman login GARAP dengan kolom nama pengguna dan kata sandi', keterangan: 'Halaman login (diambil 12 Nov 2026). Isi nama pengguna & kata sandi, lalu tekan **Masuk ke Dashboard**.' },
      { tipe: 'kartu', kolom: 1, item: [
        { ikon: 'globe', judul: 'Alamat website', poin: ['Wi-Fi greenhouse: `http://vertonik.local` atau `http://<IP-Pi>`', 'Hotspot Pi `Vertoniksmartfarm`: `http://10.42.0.1`'] },
        { ikon: 'user-round', judul: 'Tiga jenis akun', poin: ['**Admin** — akses penuh', '**Petani** — pantau & Kebun Saya', '**Demo** — lihat saja, tidak bisa mengubah'] },
      ] },
    ] },
    { tipe: 'langkah', eyebrow: 'Langkah demi langkah', judul: 'Delapan langkah penggunaan harian', kolom: 2, item: [
      { ikon: 'log-in', judul: 'Login', teks: 'Buka alamat website, isi nama pengguna dan kata sandi.', aksi: 'Masuk ke Dashboard' },
      { ikon: 'layout-dashboard', judul: 'Buka Dashboard', teks: 'Lihat status alat (terhubung/terputus), kartu sensor dengan batas aman, dan ringkasan 4 tahap tanam.' },
      { ikon: 'menu', judul: 'Pilih grup menu PANTAU', teks: 'Rail kiri berisi grup; submenu muncul sebagai pil di bawah: Dashboard, Sensor, Peringatan, CCTV, Asisten AI.' },
      { ikon: 'chart-line', judul: 'Lihat data sensor', teks: 'Menu **Sensor**: grafik & tabel riwayat 6 Jam / 24 Jam / 7 Hari / Kustom, bisa diekspor CSV.' },
      { ikon: 'sprout', judul: 'Kelola data tanaman', teks: 'Menu **Kebun Saya**: kartu batch, estimasi panen, dan tombol **Mulai semai baru**.' },
      { ikon: 'container', judul: 'Kelola tandon (Admin)', teks: '**Meja Tanaman** untuk data meja/penampung; **Target Nutrisi** untuk target per penampung.' },
      { ikon: 'bell', judul: 'Periksa Peringatan', teks: 'Merah = kritis, kuning = waspada, info. Cek kondisi fisik tandon dulu sebelum **Tandai selesai**.' },
      { ikon: 'history', judul: 'Lihat riwayat aktivitas (Admin)', teks: 'Menu **Catatan Aktivitas**: siapa mengubah apa, kapan, dan dari rute mana.' },
    ] },
    { tipe: 'dua', isi: [
      { tipe: 'gambar', src: '01-dashboard.png', alt: 'Dashboard GARAP dengan kartu pH, suhu air, TDS, suhu udara, kelembapan', keterangan: 'Dashboard: kartu sensor + batas aman (28 Okt 2026; tata letak menu kini berbeda).' },
      { tipe: 'gambar', src: '05-tanam-saya.png', alt: 'Halaman Kebun Saya berisi kartu batch tanaman', keterangan: 'Kebun Saya: batch tanaman dan estimasi panen (28 Okt 2026).' },
    ] },
    { tipe: 'tabel', eyebrow: 'Hak akses', judul: 'Siapa boleh membuka apa', kolom: ['Grup menu', 'Admin', 'Petani', 'Demo'], baris: [
      ['PANTAU — Dashboard, Sensor, Peringatan, CCTV, Asisten AI', 'Ya', 'Ya', 'Ya'],
      ['KENDALI — Kebun Saya', 'Ya', 'Ya', 'Ya (baca)'],
      ['KENDALI — Saklar, Target Nutrisi', 'Ya', 'Tidak', 'Baca saja'],
      ['DATA — Kalibrasi, Data, Catatan Aktivitas, Laporan', 'Ya', 'Tidak', 'Baca saja'],
      ['SISTEM — Pengaturan Alat, Pemulihan Papan, Koneksi Alat, Manajemen User', 'Ya', 'Tidak', 'Baca saja'],
      ['SIKLUS TANAM & MASTER DATA', 'Ya', 'Tidak', 'Baca saja'],
      ['Akun Saya', 'Ya', 'Ya', 'Ya'],
    ] },
  ],
}
