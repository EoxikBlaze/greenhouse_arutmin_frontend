# Web — penanda asal bacaan sensor (Dashboard dan Sensor)
File baru (tanpa mengubah bundle aplikasi): assets/meja-label-v1.js dan assets/meja-label-v1.css, dimuat dari index.html.
Skrip membaca /dashboard (latest_sensor.id_meja, iotStatus.perangkat) dan /meja, lalu menampilkan
"Sensor membaca: <Meja> · alat <kode>" di awal isi halaman /dashboard dan /sensor-realtime.
Batasan: hanya penanda asal bacaan terbaru. Pemilih meja dan penyaringan per meja belum ada (butuh perubahan backend + bundle).
Cadangan situs: /var/www/vertonik.bak-sebelum-v4-<tanggal> (sebelum v4); snapshot ini = tag snapshot-v6-penanda-meja.
