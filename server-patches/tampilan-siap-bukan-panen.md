# Tampilan alat: "Siap" menggantikan "Panen" + pesan setelah panen
- Dashboard (DashboardPage -v8): mode firmware PANEN (tanpa batch) kini tampil "Alat siap — Menunggu Mulai Semai; dosing berhenti"; bila siap=false tetap "Belum siap". Kebun Saya: "alat Siap (dosing berhenti), belum menerima perintah SEMAI".
- Server routes/tanam.js (cadangan tanam.js.bak-pesanpanen-*): pesan setelah panen / semua gagal ditambah " Alat berhenti menjaga dan kembali Siap." bila batch punya meja. Perintah PANEN ke alat TIDAK berubah.
- Kategori Catatan Aktivitas tetap menulis perintah "Panen" (itu nama perintah). Semua aset di-rename -v8; -v7 tetap ada. Cadangan situs: /var/www/vertonik.bak-siap-*.
