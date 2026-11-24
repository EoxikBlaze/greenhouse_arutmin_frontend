# CCTV: gerak PTZ lewat ONVIF (24 Nov 2026)

Kamera: EZVIZ CS-H8c (firmware V5.3.8). ONVIF aktif di `http://IP/onvif/PTZ`, login sama dengan RTSP.
Kemampuan: pan/tilt kontinu, 12 preset, tanpa Home.

- Server: `src/onvifPtz.js` (baru), rute `POST /cctv/:id/ptz` di `routes/cctv.js` ({arah: kiri|kanan|atas|bawah, durasi_ms 200-2000, bawaan 600}). Hanya admin sungguhan; demo diblokir. Server mengirim ContinuousMove (dengan Timeout sebagai jaring pengaman), menunggu, lalu Stop. Satu kamera hanya satu gerakan sekaligus (409 bila masih bergerak).
- Audit: aturan `Gerakkan kamera CCTV (PTZ)` di `audit.js` (body tidak disimpan).
- Web: panel panah di dialog Perbesar (halaman CCTV), tampil untuk admin dan kamera RTSP aktif. Aset di-rename ke `-v9.js`.
- Diuji: kanan 1,2 dtk menggeser pemandangan ke kiri (kamera menoleh ke kanan); tombol kiri di web menggeser balik.
- Belum ada: preset posisi, zoom (kamera tidak punya zoom optik), tahan-tombol.
