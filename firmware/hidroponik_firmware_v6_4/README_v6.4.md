# Firmware Hidroponik v6.4.0 (perubahan dari v6.3)

Tanggal: 21 November 2026
Semua fitur v6.3 tetap ada (lihat `README_v6.3.md`, `README_v6.2.md`, `Kontrak_MQTT_Tambahan_v6.2.md`).

> **Status jujur:** belum diunggah ke alat dan belum diuji di alat.

## Perubahan
- `FIRMWARE_VERSI` menjadi `6.4.0`.
- Data `garap/aktuator-01/data` menambah status tiap relay pompa, untuk panel "Status pompa" di web:
  `pompa_a`, `pompa_b`, `pompa_ph_up`, `pompa_ph_down` (boolean, `true` = relay menyala). `pompa_isi` sudah ada sejak v6.0.
- Tidak ada perubahan perintah, topik, atau parameter.

## Yang tetap berlaku dari v6.3
- Float bawah masih dipaksa naik (`PAKSA_FLOAT_BAWAH_NAIK = true`): isi air otomatis saat RENDAH tidak jalan, cek air manual.

## Dokumen terkait
- `Kontrak_MQTT_Hidro_Control_v2.1.docx` (kontrak lengkap sampai v6.4 + keadaan sisi web)
- `Penjelasan_Program_Firmware_Hidroponik_v6.4.docx` (bab 21 merangkum v6.1 sampai v6.4)
