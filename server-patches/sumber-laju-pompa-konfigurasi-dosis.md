# konfigurasi_dosis.sumber laju pompa -> 'Aplikasi Web v4.1'
4 baris laju_pompa_{a,b,ph_up,ph_down}_mls (nilai 12, disimpan web 20 Nov) berlabel sumber 'Perancangan v4.1...', sehingga konfigurasiAlat.js (nyata()) tidak mengirimnya dan Mulai Semai menandainya kurang.
Diubah hanya kolom sumber. Nilai 12 sama dengan yang sudah ada di alat, jadi KONFIGURASI berikutnya tidak mengubah perilaku alat.
SENGAJA TIDAK diubah: ppm_per_ml (96, dikali 2 saat dikirim -> 192 per pasang, bisa menggandakan dosis), ph_up/down_ml_per_ph_l (3 -> 90 mL/100 L, di luar rentang 0.1-50).
Cadangan: tabel konfigurasi_dosis_bak_sumber_20261124. Kembalikan: UPDATE konfigurasi_dosis k SET sumber=b.sumber FROM konfigurasi_dosis_bak_sumber_20261124 b WHERE k.param=b.param;
