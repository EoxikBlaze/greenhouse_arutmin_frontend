# Server /opt/vertonik/backend/src — Saran nutrisi (tab Sensor)
1. `routes/analitik.js` GET /saran-dosis: batas pH/ppm sekarang `ambangEfektif(...)` (saat SEMAI mengikuti target batch),
   sama dengan Dashboard dan Peringatan. Dulu memakai tabel sensor_thresholds statis (pH 5-7, ppm 50-2600).
2. `analitik.js` saranSensor: teks tidak lagi menyebut "alur persetujuan dosing" (sudah tidak ada); alat memutuskan dosing sendiri.
3. `catatan` API: "Web tidak mengirim dosis; alat memutuskan dosing sendiri".
Cadangan di server: analitik.js.bak-saran-<tanggal>, routes/analitik.js.bak-saran-<tanggal>.
