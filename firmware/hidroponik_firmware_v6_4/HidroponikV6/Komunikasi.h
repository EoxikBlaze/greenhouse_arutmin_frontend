/* ============================================================================
 *  Komunikasi — WiFi + MQTT kontrak garap/ (sama dengan firmware tim
 *  "gabungan" v0.6 yang sudah masuk server), berjalan di TASK TERPISAH (core 0)
 *  sehingga sambung-ulang WiFi/MQTT yang lambat TIDAK PERNAH menahan pompa.
 *  Task ini tidak menyentuh I2C maupun relay (kecuali mematikan darurat).
 *
 *   garap/aktuator-01/data      alat -> server  tiap telemetri_dtk (bawaan 5 dtk)
 *   garap/aktuator-01/status    alat -> server  retained tiap 30 dtk + saat E-STOP berubah; LWT
 *   garap/aktuator-01/perintah  server -> alat  {id, tipe, parameter{...}}
 *   garap/aktuator-01/hasil     alat -> server  diulang tiap 3 dtk sampai ack
 *   garap/aktuator-01/ack       server -> alat  {id}
 *   garap/server/status         server -> alat  {online, estop, t, ts?} (detak)
 *  Cadangan HTTP (port 80) bila port MQTT diblokir: /api/device/v1/sensor & heartbeat.
 * ========================================================================== */
#pragma once
#include <Arduino.h>
#include "Tipe.h"

void InisialisasiKomunikasi(void);

void BagikanStatus(const StatusSistem &s);      /* loop utama -> task komunikasi */
bool AmbilPerintah(PerintahWeb *p);             /* loop utama mengambil perintah */
void KirimLaporan(const Laporan &l);            /* diulang sampai ack */
void MintaTelemetriSekarang(void);

bool WifiTerhubung(void);
bool MqttTerhubung(void);
bool ServerSegar(void);                          /* detak server <= 30 dtk lalu */
bool EstopDariServer(void);                      /* detak estop:true atau STOP_DARURAT belum dibuka */
int  RssiWifi(void);
void InfoJaringan(char *wifi, size_t nw, char *ipEsp, size_t ne, char *ipServer, size_t ns);
int  JumlahLaporanTertunda(void);

/* Serial (akses fisik) */
void AturWifiTambahan(const char *ssid, const char *pass);   /* kosong = hapus */
void AturServerTetap(const char *ip);                        /* kosong = cari otomatis */
void MintaCariServer(void);
void MintaPindaiWifi(void);
void CetakMqtt(bool aktif);

/* ---- v6.2: OTA (program lewat WiFi) ----
 *  Lokal  : Arduino IDE -> Port jaringan "aktuator-01" (password OTA_PASSWORD di rahasia.h).
 *  Jauh   : perintah web OTA {path, sha256} -> alat mengunduh http://<IP Pi><path> lalu mencocokkan SHA-256.
 *  Izin dihitung loop utama: lokal = pemeliharaan ATAU (bukan SEMAI dan tidak ada kegiatan);
 *  jauh = wajib pemeliharaan. Selama OTA semua pompa OFF; gagal = program lama tetap jalan. */
void TetapkanIzinOta(bool lokal, bool jauh);
bool OtaBerjalan(void);
uint8_t PersenOta(void);
bool SiapkanOtaJauh(uint64_t id);                /* false = tidak ada permintaan sah untuk id ini */

/* ---- v6.2: konsol jarak jauh ----
 *  Selama perintah KONSOL dijalankan, baris laporan "[hasil] ..." ikut ditulis ke p (selain Serial). */
void TetapkanTangkapKonsol(Print *p);
