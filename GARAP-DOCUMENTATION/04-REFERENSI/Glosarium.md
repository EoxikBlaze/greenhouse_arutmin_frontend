# Glosarium GARAP

| Atribut | Isi |
|---|---|
| Nomor dokumen | GARAP-REF-03 |
| Versi | 1.0 |

| Istilah | Penjelasan |
|---|---|
| ACL (Access Control List) | Daftar hak: perangkat mana boleh membaca/menulis topik MQTT mana |
| ADS1115 | Chip pengubah tegangan analog (dari probe pH/EC) menjadi angka digital |
| Admin | Peran pengguna dengan hak penuh mengubah data dan pengaturan |
| Ambang sensor | Batas aman nilai sensor; di luar batas muncul peringatan |
| API | Pintu layanan server yang dipakai website, aplikasi, dan perangkat |
| Basi (bacaan basi) | Bacaan terakhir yang umurnya lebih dari 120 detik; tidak mewakili kondisi sekarang |
| Batas fisik | Rentang yang mustahil dilewati (mis. pH 0–14); di luar ini bacaan ditolak |
| Batas kewajaran | Rentang wajar (mis. pH 3–9); di luar ini bacaan dicurigai probe bermasalah |
| Batas operasi | Rentang TDS/pH pada preset; di luar ini dosing tidak boleh dipertimbangkan |
| Batch | Satu kelompok tanaman yang ditanam bersamaan |
| Broker MQTT | Program di Pi (Mosquitto) yang meneruskan pesan antara perangkat dan server |
| Buffer pH | Larutan acuan dengan pH tertentu (4,0; 7,0) untuk kalibrasi |
| Demo | Peran pengguna baca-saja; setiap perubahan ditolak |
| DFT (Deep Flow Technique) | Sistem hidroponik dengan genangan larutan dangkal di talang/meja |
| Dosing | Penambahan larutan nutrisi atau pengatur pH ke tandon |
| DS18B20 | Sensor suhu digital tahan air untuk suhu air tandon |
| EC (Electrical Conductivity) | Daya hantar listrik larutan; menunjukkan kepekatan nutrisi (mS/cm atau µS/cm) |
| Eksekusi dosing | Pompa benar-benar menyuntik larutan. **Saat ini BELUM DIIZINKAN** |
| E-STOP | Tombol penghentian darurat; memutus daya pompa dan mengunci output |
| ESP32 | Papan mikrokontroler dengan Wi-Fi yang menjadi otak panel |
| Fail-safe | Pengaman otomatis: bila detak server hilang > 30 detik, semua pompa dimatikan |
| Firmware | Program yang tertanam di ESP32 |
| Gerbang dosis | Pemeriksaan server sebelum dosing boleh dipertimbangkan; kini selalu menolak eksekusi |
| H+4 | Hari keempat (96 jam) setelah semai dimulai; saat konfirmasi peremajaan diminta |
| Heartbeat / detak | Pesan berkala "saya masih hidup" antara server dan perangkat |
| I2C | Jalur komunikasi dua kabel (SDA, SCL) untuk ADS1115, SHT31, LCD |
| Kalibrasi | Menyesuaikan sensor/pompa terhadap nilai acuan |
| Kedaluwarsa (konfirmasi) | Permintaan konfirmasi yang tidak dijawab sampai batas waktu (24 jam) |
| Laju pompa | mL per detik hasil kalibrasi gelas ukur |
| LWT (Last Will and Testament) | Pesan otomatis broker bila perangkat terputus mendadak ("offline") |
| Meja | Unit meja hidroponik; juga dipakai sebagai identitas penampung (`ID_MEJA`) |
| Mode pemeliharaan | Mode saat semua tindakan OFF dan hitungan dibekukan; syarat kalibrasi |
| MQTT | Protokol pesan ringan antara ESP32 dan server |
| NFT (Nutrient Film Technique) | Sistem hidroponik dengan lapisan tipis larutan yang terus mengalir |
| NVS | Memori permanen ESP32 untuk menyimpan Wi-Fi tambahan dan kalibrasi |
| Parameter SIAP | Parameter yang nilainya sah dan sudah divalidasi; hanya ini yang boleh dipakai |
| Pelampung (float) | Saklar level air; bawah = air kurang, atas = penuh |
| Penampung / tandon | Wadah larutan nutrisi yang dialirkan ke meja |
| Peremajaan | Tahap setelah semai, bibit dipindah dan dibesarkan |
| Pendewasaan | Tahap pertumbuhan sampai siap panen |
| Persetujuan dosing | Izin operator atas cakupan dosis; **berbeda dari eksekusi** |
| Petani | Peran operator lapangan |
| pH | Ukuran keasaman larutan (0–14) |
| pH Up / pH Down | Larutan penaik / penurun pH |
| ppm | Bagian per sejuta; satuan TDS |
| Preset | Templat target nutrisi per tanaman, tahap, dan umur |
| Raspberry Pi | Komputer kecil yang menjadi server lokal |
| Relay | Saklar listrik yang dikendalikan ESP32 untuk menyalakan pompa 12 V |
| Retained | Pesan MQTT terakhir yang disimpan broker untuk pelanggan baru |
| Saklar (izin aktuator) | Pengaturan admin apakah otomasi boleh menyalakan jenis aktuator tertentu |
| Semai | Tahap awal menumbuhkan benih |
| SHT31 | Sensor suhu dan kelembapan udara |
| Siklus budidaya | Rangkaian tahap dari persiapan tandon sampai panen |
| SOP | Standar Operasional Prosedur |
| TDS (Total Dissolved Solids) | Jumlah padatan terlarut (ppm); diturunkan dari EC |
| Target naik harian | Target ppm yang naik bertahap tiap hari dari ppm awal ke ppm akhir |
| Watchdog | Pengawas yang me-reset ESP32 bila programnya macet |
