# Bacaan sensor dengan id_meja yang sudah dihapus tetap disimpan
Kejadian: 24 Nov 08:34 admin menghapus Meja Kangkung (id 5) dan Jenis Tanaman Kangkung di Master Data. Alat masih mengirim id_meja=5 (tersimpan di flash alat) -> server menolak SEMUA bacaan (galat id_meja, 173x), dashboard buta, peringatan sensor tertutup, muncul 'data_tidak_masuk'.
Perbaikan: routes/device.js simpanBacaan. Bila id_meja berformat benar tetapi tidak ada di mejas, bacaan dipakaikan meja yang terpasang di alat (perangkat.id_meja) atau tanpa meja (NULL); log peringatan maks 1x/10 menit/alat. Format id_meja salah (0, negatif, bukan angka) tetap ditolak.
Cadangan server: routes/device.js.bak-mejagaib-*. Salinan: device.js.salinan-20261124.
Tindak lanjut: alat baru memakai id_meja baru setelah menerima KONFIGURASI (Mulai Semai di meja baru).
