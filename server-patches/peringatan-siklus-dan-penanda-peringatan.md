# Peringatan siklus + penanda meja di Peringatan
1) Server src/peringatan.js (cadangan peringatan.js.bak-siklus-*): kondisiSiklus() + query tahap 'proses' (semai/peremajaan/pendewasaan).
   Peringatan 'warning' saat hari ke-N >= durasi tahap: "Semai Kangkung (Meja Kangkung) hari ke-8/7: pindah ke Peremajaan" (pendewasaan: siap panen).
   Hilang sendiri saat tahap ditutup (Selesai). Tidak tergantung alat online. Butuh durasi tahap terisi (Master Data -> Siklus); durasi kosong = tidak dinilai.
   Salinan file: server-patches/peringatan.js.salinan-20261124.
2) Web: penanda "Sensor membaca: Meja X . alat Y" tidak muncul karena skrip memanggil /dashboard hanya dengan cookie, padahal aplikasi memakai token di localStorage 'vsf-auth' (Bearer) -> 401.
   meja-label-v2.js mengirim Bearer, dan aktif juga di /peringatan. index.html menunjuk ke -v2 (aset lama v1 tidak diubah, aman cache Cloudflare).
   Cadangan di server: /var/www/vertonik.bak-penanda-*.
