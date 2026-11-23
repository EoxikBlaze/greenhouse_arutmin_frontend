# Server /opt/vertonik/backend/src/index.js — penilai peringatan dihidupkan lagi
Sebab: `src/peringatan.js` ada tetapi tidak ada yang memanggil `.mulai()`, jadi halaman Peringatan tidak diperbarui sejak restart.
Perubahan (setelah baris `startServers(); require('./presetDosing').mulai();`):

    // penilai peringatan (alat -> kejadian merah/kuning di alert_logs); PERINGATAN_OTOMATIS=0 mematikan
    require('./peringatan').mulai();

Cadangan di server: index.js.bak-sebelum-peringatan-<tanggal>.
