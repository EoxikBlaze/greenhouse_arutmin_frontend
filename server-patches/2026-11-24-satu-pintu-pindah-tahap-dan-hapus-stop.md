# Web — dua penyederhanaan (aset -v5)
1. Halaman Otomasi Alat (/saklar): kartu "Hentikan semua pompa (STOP)" dihapus (komponen x di HidroV41Pages dilepas dari render).
   E-STOP + Reset E-STOP tetap. Teks E-STOP ditambah: E-STOP web hanya perintah program, 12 V tidak diputus.
2. Kebun Saya (/tanam): tombol "Pindah ke ..." / "Catat panen" diganti petunjuk "Lanjutkan di menu Siklus Tanam".
   Pindah tahap hanya lewat Siklus Tanam. Endpoint server tidak berubah (POST /tanam/:tipe/:id/selesai).
Seluruh aset JS diberi akhiran -v5 (cache-busting). Cadangan: /var/www/vertonik.bak-sebelum-v6-<tanggal>; tag snapshot-v7-satu-pintu.
Belum diuji dengan akun admin (kedua elemen hanya tampil untuk admin).
