export default {
  no: '01', berkasMd: 'Pengenalan_GARAP', judulPendek: 'Pengenalan GARAP',
  judul: 'Mengenal GARAP – Smart Hidroponik',
  subjudul: 'Satu sistem untuk memantau air nutrisi, mencatat siklus tanam, dan mengamankan pompa di greenhouse.',
  tujuan: 'Pembaca baru memahami apa itu GARAP, bagian-bagiannya, dan bagaimana website, aplikasi mobile, serta perangkat IoT saling terhubung.',
  pembaca: ['Operator', 'Pengelola greenhouse', 'Mitra'],
  sumber: '`docs/juknas-juknis/MODUL_JUKNAS_JUKNIS_VERTONIK_GARAP.md` (Bab I–II), `react-web-app/src/router.tsx`, `flutter_mobile_app/lib/config.dart`, `deploy-pi/firmware/gabungan/gabungan.ino`.',
  layout: 'Header navy → kartu "Apa itu GARAP" (2 kolom: definisi + tujuan) → alur 3 blok horizontal (Perangkat IoT → Server Lokal → Website & Mobile) → grid 4 kartu komponen → grid 3 kartu manfaat → kotak info status dosing → footer navy.',
  ilustrasi: 'Gunakan ikon lucide (cpu, server, monitor-smartphone, sprout, droplet, shield-check). Tidak memakai ilustrasi kartun. Alur 3 blok cukup berupa kartu putih dengan lingkar ikon mint dan panah moss.',
  catatan: ['Singkatan GARAP ditulis lengkap sekali: Green Autonomous Responsive Agriculture Platform.', 'Jangan menulis "dosing otomatis berjalan" — eksekusi dosing masih diblokir.', 'Lokasi mitra lapangan: Pokjar Permata (sesuai modul Juknas).'],
  keselamatan: '- Eksekusi dosing otomatis **belum diizinkan** (`EKSEKUSI_DIIZINKAN = false`). Tampilkan kotak info di bagian bawah.',
  blok: [
    { tipe: 'kartu', eyebrow: 'Apa itu GARAP?', judul: 'Platform hidroponik pintar untuk greenhouse', kolom: 2, item: [
      { ikon: 'sprout', judul: 'GARAP = Green Autonomous Responsive Agriculture Platform', teks: 'Sistem pemantauan, pencatatan budidaya, asisten agronomi lokal, dan pengendalian perangkat hidroponik berbasis IoT. Nama produk di layar: **Vertonik Smart Farm**.' },
      { ikon: 'target', judul: 'Tujuan sistem', poin: ['Kondisi air nutrisi terpantau setiap saat.', 'Siklus tanam 4 tahap tercatat rapi.', 'Pompa dilindungi pengaman berlapis.', 'Keputusan operator didukung data, bukan tebakan.'] },
    ] },
    { tipe: 'alur', eyebrow: 'Gambaran umum', judul: 'Dari tandon ke layar Anda', lead: 'Data sensor naik ke server lokal, lalu tampil di website dan aplikasi. Perintah dari pengelola turun melalui jalur yang sama.', item: [
      { ikon: 'cpu', judul: 'Perangkat IoT', teks: 'ESP32 di panel membaca sensor tiap 5 detik dan mengendalikan pompa.' },
      { ikon: 'server', judul: 'Server lokal', teks: 'Raspberry Pi menyimpan data, menjalankan backend, MQTT, dan Asisten AI.' },
      { ikon: 'monitor-smartphone', judul: 'Website & aplikasi mobile', teks: 'Operator memantau, mencatat tanam, dan menerima peringatan.' },
    ] },
    { tipe: 'kartu', eyebrow: 'Komponen utama', judul: 'Empat bagian yang bekerja bersama', kolom: 4, item: [
      { ikon: 'activity', judul: 'Sensor', teks: 'pH, EC/TDS, suhu air, suhu & kelembapan udara, pelampung tandon.' },
      { ikon: 'cpu', judul: 'Panel ESP32', teks: 'Firmware `gabungan-0.6`, LCD 20×4, lampu pilot, tombol E-STOP & RESET.' },
      { ikon: 'server', judul: 'Raspberry Pi', teks: 'Backend Node.js, PostgreSQL, broker Mosquitto, Nginx, Ollama.' },
      { ikon: 'monitor-smartphone', judul: 'Website & Flutter', teks: 'Website React di browser dan aplikasi Android/iOS GARAP.' },
    ] },
    { tipe: 'kartu', eyebrow: 'Manfaat', judul: 'Yang Anda dapatkan', kolom: 3, item: [
      { ikon: 'gauge', judul: 'Pantau tanpa menebak', teks: 'Angka sensor terbaru, batas aman, dan grafik riwayat di satu layar.' },
      { ikon: 'bell', judul: 'Peringatan dini', teks: 'Kondisi di luar ambang dan gangguan alat muncul di menu Peringatan.' },
      { ikon: 'shield-check', judul: 'Aman berlapis', teks: 'E-STOP fisik, pelampung, batas mL, dan detak server 30 detik di firmware.' },
    ] },
    { tipe: 'peringatan', nada: 'info', judulKotak: 'Status saat ini: dosing otomatis belum dijalankan', teks: 'Sistem sudah memantau dan mencatat. Eksekusi dosis otomatis masih **diblokir** sampai parameter, rumus, kalibrasi, dan firmware tervalidasi (`EKSEKUSI_DIIZINKAN = false`).', ikon: 'lock' },
  ],
}
