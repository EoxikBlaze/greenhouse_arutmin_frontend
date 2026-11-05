/* Infografis 3 (gaya "ceria") — sistem alat (sensor & aktuator), cara kerja website, dan proker.
   Sensor/aktuator dari docs/PERANCANGAN_SISTEM_IOT_HIDROPONIK.md bab 3. Proker = 4 program kerja
   dari tim (26 Okt 2026); butir bertanda `contoh: true` tampil sebagai isian contoh (garis merah). */
window.DATA = {
  gaya: 'ceria',
  hero: {
    judulA: 'Vertonik', judulB: 'Smart Farm Hidroponik', judulC: 'Alat · Website · Proker',
    tanya: 'Apakah itu?',
    jawab: 'Vertonik Smart Farm adalah **sistem IoT greenhouse hidroponik** hasil KKN Arutmin Asik 2026. Satu alat kontrol menjaga **nutrisi dan pH tiap meja** secara bergiliran, lalu mengabarkan semua kejadian ke **website dan aplikasi HP** petani.',
  },
  bagian: [
    { jenis: 'tiga', isi: [
      { judul: 'Tahukah kamu?', ilus: 'tani', teks: 'Petani ==tidak perlu menakar nutrisi sendiri==. Satu ESP32 merawat 4 meja bergiliran, satu aksi satu waktu, dan aturannya ==tetap jalan walau WiFi mati==.' },
      { judul: 'Fun fact', ilus: 'botol', teks: 'Sensor membaca air di ==botol sampel saat air diam==. Sisa air ±10–20 mL sengaja ditinggal di dasar botol agar ==probe pH tidak pernah kering==.' },
      { judul: 'Sekali suntik', persen: 65, teks: 'Tiap ronde dosing hanya ==65% dari kekurangan== nutrisi (maks. 300 ppm ±214 mL), lalu dibaca ulang setelah diaduk 15 menit.' },
    ] },
    { jenis: 'sensorAktuator',
      kiri: { judul: 'Sensor', sub: 'mata sistem', isi: [
        { judul: 'Sensor EC (DFRobot)', teks: 'Kepekatan nutrisi, dibaca dari botol sampel' },
        { judul: 'Sensor pH', teks: 'Keasaman air di botol sampel yang sama' },
        { judul: 'Sensor suhu air', teks: 'Koreksi bacaan EC terhadap suhu' },
        { judul: 'Suhu & kelembapan ruang', teks: 'SHT31 memantau kondisi greenhouse' },
        { judul: 'Float switch', teks: '1 per penampung pemicu isi air + 1 di botol sampel' },
      ] },
      kanan: { judul: 'Aktuator', sub: 'tangan sistem', isi: [
        { ilus: 'peristaltik', judul: 'Pompa peristaltik ×4', teks: 'Nutrisi A, B, pH Up, dan pH Down — terukur per detik' },
        { ilus: 'celup', judul: 'Pompa celup mini', teks: 'Mengisi botol sampel tiap penampung dan membilas jalur dosing' },
        { ilus: 'solenoid', judul: 'Solenoid ×12', teks: '4 isi air · 4 cabang dosing · 4 buang sampel kembali ke penampung' },
        { ilus: 'esp32', judul: 'ESP32 + relay', teks: 'Otak di lapangan: menjalankan aturan & perintah, LCD dan lampu status' },
      ], catatan: '**Tombol E-STOP** memutus daya semua aktuator secara fisik. **RESET** menyalakan lagi dan membersihkan LOCK.' } },
    { jenis: 'web', judulA: 'Cara kerja', judulB: 'Website & aplikasi GARAP',
      alur: ['ESP32 (API key)', 'Server Raspberry Pi', 'Basis data', 'Web & HP (login)'], isi: [
        { ilus: 'login', judul: 'Masuk', teks: 'Login sesuai peran: **admin**, **petani**, atau **demo**. Tiap peran melihat menu yang berbeda.' },
        { ilus: 'pantau', judul: 'Pantau', teks: 'Dashboard, sensor real-time tiap meja, alert terbuka, dan **CCTV** greenhouse.' },
        { ilus: 'kelola', judul: 'Kelola', teks: 'Mulai tanam, isi jumlah berhasil tiap tahap. Admin mengatur target dosing, LOCK, dan E-STOP.' },
        { ilus: 'tanya', judul: 'Tanya & lapor', teks: '**Asisten AI** lokal menjawab kondisi kebun; laporan bulanan bisa diunduh sebagai CSV.' },
      ] },
    { jenis: 'proker', judulA: 'Proker', judulB: 'yang dijalankan', isi: [
      { judul: 'Otomatisasi Vertonik Smart Farm', teks: 'Sistem IoT hidroponik: sensor, dosing otomatis, server Raspberry Pi, serta website & aplikasi HP.', sasaran: 'Greenhouse PT Arutmin' },
      { judul: 'Publikasi kegiatan dan peliputan', teks: 'Publikasi dan peliputan kegiatan KKN, berkolaborasi dengan **3 media partner** dan **2 sponsor**.', waktu: '3 media partner', sasaran: '2 sponsor' },
      { judul: 'Seminar pelatihan petani berdasi', teks: 'Seminar dan pelatihan petani berdasi: bertani modern dengan memanfaatkan teknologi.' },
      { judul: 'Kolaborasi kerja dengan tim HMPT', teks: 'Kerja sama program kerja bersama tim HMPT.' },
    ] },
    { jenis: 'penutup', judul: 'Kunjungi kami!', url: 'https://instagram.com/kkn.arutminidn2026',
      teks: 'Scan QR untuk membuka Instagram **@kkn.arutminidn2026**: dokumentasi kegiatan dan progres proyek.' },
  ],
};
