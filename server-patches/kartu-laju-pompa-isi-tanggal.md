# Kartu "Laju 4 pompa" belum pernah -> isi tanggal
DB vertonik_smartfarm, tabel kalibrasi_sensor, baris sensor='pulsa_peristaltik': terakhir_dikalibrasi NULL diisi dari max(kalibrasi_log.dilakukan_pada) untuk catatan '[KALIBRASI POMPA%' (hasil 2026-11-20 18:31:53).
Sebab: kalibrasi 20 Nov terjadi sebelum kode server mengisi kolom itu. Kalibrasi baru mengisi otomatis. Satu UPDATE, kembalikan dengan SET terakhir_dikalibrasi = NULL.
