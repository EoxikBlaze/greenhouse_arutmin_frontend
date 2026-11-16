/*
 * GARAP — ESP32 GABUNGAN (sensor + aktuator dalam SATU papan)  v0.7  ⚠ UJI BERTAHAP SESUAI PANDUAN HARDWARE
 * Gabungan sensor + aktuator dalam SATU sambungan MQTT ke broker Pi: login & API key 'aktuator-01'.
 * Di backend perangkat ini berperan 'gabungan' (sensor + aktuator), jadi satu kunci cukup.
 *   garap/aktuator-01/data   : bacaan sensor tiap 5 dtk (otomatis cadangan HTTP port 80 jika port 1883 diblokir firewall)
 *   garap/aktuator-01/status : status tiap 30 dtk (retained, LWT)  ·  perintah/ack/hasil + detak server
 * v0.7 KESELAMATAN, JADWAL & SAMBUNGAN:
 *   - Jadwal operasi (perintah JADWAL: interval sensor, jeda A→B, batas isi air) disimpan di NVS "garap_jdw" →
 *     tetap ada setelah restart/mati listrik. Nilai hanya boleh DI DALAM batas keras kompilasi; tidak menyalakan pompa.
 *   - Laporan 'estop_fisik' (tombol GPIO36) di data & status, dan 'peristiwa":"reset"' saat tombol RESET ditekan
 *     → server mencatat peringatan yang tampil di web.
 *   - Antrean bacaan di RAM (maks 120, satu tiap 60 dtk) saat Pi tak terjangkau; dikirim ulang dengan 'umur_detik'
 *     setelah tersambung. HILANG bila ESP32 restart/mati listrik (sengaja tidak di flash: umur tulis NVS terbatas).
 *   - Server tak terjangkau > 2 menit padahal Wi-Fi tersambung → putus Wi-Fi & pindai ulang (mis. pindah ke hotspot Pi).
 * v0.6 SIAP MODEM & PAKAI:
 *   - Multi-Wi-Fi 2,4 GHz + preset Modem ('VertonikModem') + iPhone ('Siki') + Hotspot Pi ('Vertoniksmartfarm').
 *   - Tambah Wi-Fi modem / IP Pi lewat Serial Monitor (NVS persisten, tanpa compile ulang): wifi <SSID>|<SANDI>, server <IP>.
 *   - Pencarian server otomatis lintas subnet modem apa saja (192.168.8.x, 192.168.100.x, 192.168.1.x, 192.168.0.x, 172.20.10.x).
 *   - Cadangan HTTP POST (/api/device/v1/sensor & heartbeat) bila port MQTT 1883 belum dibuka di router/ufw baru
 *     (pompa tetap terkunci aman oleh fail-safe MQTT agar tidak jalan tanpa detak server real-time).
 *   - Tombol RESET (GPIO 19): tekan singkat tampilkan info Wi-Fi/IP di LCD + cetak status; lepas latch E-STOP lokal jika aman.
 *   - Menu Serial Monitor 115200 baud: ketik status, scan, cari, baca, wifi <SSID>|<SANDI>, server <IP>, help.
 * Library: ArduinoJson 7.x, PubSubClient 2.8, OneWire, DallasTemperature, Adafruit SHT31 (+ Adafruit BusIO).
 * Board: "ESP32 Dev Module". Konfigurasi ada di rahasia.h (satu API key: aktuator-01).
 *
 * PETA PIN = Wiring v2.0 / 1 Penampung Portable:
 *   I2C SDA 21 / SCL 22 : ADS1115 0x48 (A0 = pH, A1 = EC lewat pembagi 10k/10k) + SHT31 0x44 (suhu/RH udara) + LCD 0x27
 *   DS18B20 suhu air 4 · pompa A 25, B 26, pH Up 27, pH Down 18, pompa isi 16 (relay HIGH-trigger)
 *   float bawah 32, float atas 33 (HIGH = penuh, putus kabel = penuh) · lampu merah 13, hijau 17, biru 23
 *   tombol reset 19 (INPUT_PULLUP) · E-STOP: bus +12V lewat pembagi 33k/10k ke 36
 *
 * WAJIB sebelum dipakai di tanaman: kalibrasi pH/TDS & laju pompa, uji dengan AIR dulu, pompa 12 V lewat
 * relay/MOSFET + dioda flyback. Jangan beri daya pompa dari pin ESP32.
 */
#include <WiFi.h>
#include <WiFiMulti.h>
#include <ESPmDNS.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <Preferences.h>
#include <Adafruit_SHT31.h>
#include <esp_task_wdt.h>
#include <math.h>
#include "rahasia.h"

#define FIRMWARE "gabungan-0.7"
#define KODE_A   "aktuator-01"        // = user MQTT di Pi (deploy-pi/mosquitto/garap.acl)
#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif
#ifndef HTTP_PORT
#define HTTP_PORT 80
#endif
#ifndef ID_MEJA
#define ID_MEJA 0                     // atur di rahasia.h; 0 = bacaan umum, >= 1 = penampung tertentu
#endif

// ═══ JARINGAN ══════════════════════════════════════════════════════════════
struct Jaringan { const char* ssid; const char* pass; };
#ifndef WIFI_JARINGAN
#define WIFI_JARINGAN { { WIFI_SSID, WIFI_PASS } }   // format lama: satu jaringan
#endif
const Jaringan JARINGAN[] = WIFI_JARINGAN;
const char* NAMA_MDNS_SERVER   = "garap";           // → garap.local
const char* NAMA_MDNS_CADANGAN = "vertonik";        // → vertonik.local
const char* NAMA_MDNS_ALIAS    = "vertonic";        // → vertonic.local (alias Avahi di Pi)
const IPAddress IP_HOTSPOT_PI(10, 42, 0, 1);       // alamat tetap Pi saat memancarkan hotspot (Vertoniksmartfarm)
WiFiMulti wifiMulti;
IPAddress serverIp;                                 // 0.0.0.0 = belum ditemukan
uint8_t gagalMqtt = 0;
String nvsWifiSsid = "", nvsWifiPass = "", nvsServerIp = "";
Preferences prefNet;

// ═══ SENSOR ════════════════════════════════════════════════════════════════
#define PIN_SDA   21
#define PIN_SCL   22
#define ADS_ALAMAT 0x48
#define ADS_KANAL_PH 0                // A0
#define ADS_KANAL_EC 1                // A1 (sinyal sudah dibagi 2 oleh 10k/10k)
#define FAKTOR_PEMBAGI_EC 2.0f
#define SHT_ALAMAT 0x44
#define PIN_DS18  4
// Jadwal operasi: bawaan di bawah, ditimpa NVS "garap_jdw" (perintah JADWAL). Rentang = batas keras (sama dgn server).
uint32_t intervalSensorMs = 5000;
const uint32_t INTERVAL_SENSOR_MIN_MS = 5000, INTERVAL_SENSOR_MAKS_MS = 60000;
const int MEJA_AKTIF = ID_MEJA;
// Kalibrasi (disimpan otomatis di NVS / Preferences "garap_kal" saat dikalibrasi dari web, tanpa perlu flash ulang)
float PH_V7 = 2.50f, PH_V4 = 3.05f, TDS_FAKTOR_KOREKSI = 1.0f;
float PH_V7_LAMA = 2.50f, PH_V4_LAMA = 3.05f, TDS_FAKTOR_LAMA = 1.0f;

// ═══ AKTUATOR & PELAMPUNG (Mengikuti fw_hidro/Sensor.cpp & Config.h Wiring v2.0) ═══
const bool RELAY_AKTIF_LOW = false;   // hasil uji teman: modul relay HIGH-trigger (jumper COM+HIGH); HIGH = pompa nyala
enum Out { P_A, P_B, P_PH_UP, P_PH_DOWN, P_ISI_AIR, JUMLAH_OUT };
const int PIN_OUT[JUMLAH_OUT]       = { 25, 26, 27, 18, 16 };
const char* NAMA_OUT[JUMLAH_OUT]    = { "A", "B", "PH_UP", "PH_DOWN", "ISI_AIR" };
// Laju pompa HASIL KALIBRASI (mL/detik) disimpan di NVS. 0 = belum dikalibrasi → perintah berbasis mL ditolak.
float ML_PER_DETIK[JUMLAH_OUT] = { 0.0f, 0.0f, 0.0f, 0.0f, 0.0f };
// Batas durasi mutlak per output (ms) — lapis pengaman ketika perhitungan mL salah
const uint32_t MAKS_DURASI_MS[JUMLAH_OUT] = { 70000, 70000, 12000, 12000, 600000 };
uint32_t jedaAbMs = 60000;            // jeda antara pompa A dan B (60–600 dtk); ditimpa jadwal NVS
const uint32_t JEDA_AB_MIN_MS = 60000, JEDA_AB_MAKS_MS = 600000;
uint32_t isiAirMaksMs = 600000;       // batas waktu isi air (60 dtk – MAKS_DURASI_MS[P_ISI_AIR]); ditimpa jadwal NVS
Preferences prefJdw;
const int PIN_FLOAT_BAWAH = 32;       // pemicu isi air (fw_hidro: HIGH = terangkat/air cukup, LOW = turun/air kurang)
const int PIN_FLOAT_ATAS  = 33;       // batas penuh (fw_hidro: HIGH = penuh, INPUT_PULLUP: kabel putus = dianggap penuh)
const int PIN_LAMPU_MERAH = 13;       // lampu pilot merah via ULN2003 (HIGH = nyala)
const int PIN_LAMPU_HIJAU = 17;       // lampu pilot hijau via ULN2003 (HIGH = nyala)
const int PIN_LAMPU_BIRU  = 23;       // lampu pilot biru via ULN2003 (HIGH = nyala)
const int PIN_TOMBOL_RESET = 19;      // tombol reset ke GND (INPUT_PULLUP: ditekan = LOW)
const uint8_t LCD_ALAMAT  = 0x27;     // LCD 20x4 I2C PCF8574 (otomatis terdeteksi saat boot)
const int TINGKAT_FLOAT_TERANGKAT = HIGH;
const uint32_t DEBOUNCE_FLOAT_MS = 150;
struct StateFloat {
  int pin;
  bool stabil;   // true = terangkat (air tinggi)
  bool mentah;
  uint32_t tUbah;
};
StateFloat fBawah = { PIN_FLOAT_BAWAH, false, false, 0 };
StateFloat fAtas  = { PIN_FLOAT_ATAS,  false, false, 0 };
Preferences prefKal;
const int PIN_STATUS_ESTOP = 36;      // bus +12V aktuator lewat pembagi 33k/10k; bus mati (E-STOP ditekan) = LOW
// 1 = baca E-STOP dari GPIO36. Pin mengambang terbaca "ditekan" → aktuator terkunci sampai pembagi terpasang.
// Set 0 HANYA di meja uji tanpa pompa; wajib 1 di lapangan.
#ifndef AKTIFKAN_BACA_ESTOP            // meja uji: set 0 di rahasia.h (tidak ikut git), jangan ubah bawaan ini
#define AKTIFKAN_BACA_ESTOP 1
#endif
const float MAKS_ML_AB_SUNTIK = 214.0f, MAKS_ML_PH_SUNTIK = 10.0f;
const float MAKS_ML_AB_PER_JAM = 450.0f, MAKS_ML_PH_PER_JAM = 30.0f;
const uint32_t FAILSAFE_MS = 30000, HEARTBEAT_MS = 30000, COBA_MQTT_MS = 5000, ULANG_HASIL_MS = 3000;

// ── Status ──────────────────────────────────────────────────────────────────
OneWire oneWire(PIN_DS18);
DallasTemperature ds18(&oneWire);
Adafruit_SHT31 sht;
bool shtAda = false, adsAda = false, lcdAda = false;
float phTerakhir = NAN, tdsTerakhir = NAN, suhuAirTerakhir = NAN, suhuUdaraTerakhir = NAN, rhTerakhir = NAN;
char lcdCache[4][21];
uint32_t lcdTerakhir = 0, lcdInfoSampai = 0;
WiFiClient wifiA;
PubSubClient mqA(wifiA);
uint32_t sTerakhir = 0;
bool estopLokal = false, estopServer = false, httpFallbackOk = false;
bool estopFisikTerlapor = false, peristiwaReset = false;   // kirim status segera saat E-STOP fisik berubah; RESET → 1x di data
uint32_t serverTerakhirOk = 0;                             // MQTT/HTTP terakhir berhasil (pindai ulang Wi-Fi bila lama hilang)
const uint32_t PINDAI_ULANG_MS = 120000;
// Antrean bacaan saat Pi tak terjangkau (RAM saja). Satu sampel tiap ANTRE_JEDA_MS → 120 × 60 dtk = 2 jam.
struct BacaanAntre { uint32_t t; float air, udara, rh, ph, tds; };
const int ANTRE_MAKS = 120;
const uint32_t ANTRE_JEDA_MS = 60000;
BacaanAntre antreBacaan[ANTRE_MAKS];
int antreAwal = 0, antreJumlah = 0;
uint32_t antreTerakhir = 0;
uint32_t terakhirServerOk = 0, terakhirHB = 0, terakhirHBHttp = 0, jamMulai = 0, terakhirCoba = 0;
bool resetBtnTerakhir = HIGH, resetBtnSudahAksi = false;
uint32_t resetBtnWaktu = 0;
String serialBuf;
const char* T_DATA     = "garap/" KODE_A "/data";
const char* T_PERINTAH = "garap/" KODE_A "/perintah";
const char* T_ACK      = "garap/" KODE_A "/ack";
const char* T_HASIL    = "garap/" KODE_A "/hasil";
const char* T_STATUS_A = "garap/" KODE_A "/status";
const char* T_SERVER   = "garap/server/status";

// Laporan hasil yang belum di-ack server — dikirim ulang sampai ack (maks 8 antre).
struct Laporan { long id = 0; String isi; uint32_t terakhir = 0; };
Laporan antreLapor[8];
// id perintah yang sudah diterima (QoS 1 bisa mengirim duplikat) — jangan jalankan dua kali
long idTerakhir[16]; int idPos = 0;
float mlJamAB = 0, mlJamPH = 0;
// fase: 0 = pompa 'out' jalan, 1 = jeda A→B, 2 = pompa 'out2' jalan. out2 >= 0 hanya untuk perintah AB.
struct Kerja { bool aktif = false; long id = 0; int out = -1, out2 = -1; uint8_t fase = 0; bool nyala = false, ab = false;
               uint32_t mulai = 0, durasi = 0, durasi2 = 0; float ml = 0, mlSelesai = 0; } kerja;

// ═══ Fungsi pelampung (mengikuti fw_hidro/Sensor.cpp) & NVS Kalibrasi ═════
bool bacaFloatTerangkat(const StateFloat& f) { return digitalRead(f.pin) == TINGKAT_FLOAT_TERANGKAT; }
void mulaiFloat(StateFloat& f) {
  pinMode(f.pin, INPUT_PULLUP);
  f.mentah = f.stabil = bacaFloatTerangkat(f);
  f.tUbah = millis();
}
void perbaruiFloatSatu(StateFloat& f, uint32_t now) {
  bool m = bacaFloatTerangkat(f);
  if (m != f.mentah) { f.mentah = m; f.tUbah = now; }
  if (f.mentah != f.stabil && (uint32_t)(now - f.tUbah) >= DEBOUNCE_FLOAT_MS) f.stabil = f.mentah;
}
bool floatBawahRendah() { return !fBawah.stabil; }   // true = air kurang (pelampung bawah turun / LOW)
bool tandonPenuh()      { return fAtas.stabil; }     // true = penuh (pelampung atas terangkat / HIGH)

void muatJaringanNvs() {
  if (!prefNet.begin("garap_net", true)) return;
  nvsWifiSsid = prefNet.getString("ssid", "");
  nvsWifiPass = prefNet.getString("pass", "");
  nvsServerIp = prefNet.getString("srv", "");
  prefNet.end();
}
void simpanWifiNvs(const String& ssid, const String& pass) {
  if (!prefNet.begin("garap_net", false)) return;
  if (ssid.length() > 0) {
    prefNet.putString("ssid", ssid);
    prefNet.putString("pass", pass);
  } else {
    prefNet.remove("ssid");
    prefNet.remove("pass");
  }
  prefNet.end();
  nvsWifiSsid = ssid;
  nvsWifiPass = pass;
}
void simpanServerNvs(const String& ipStr) {
  if (!prefNet.begin("garap_net", false)) return;
  if (ipStr.length() > 0) prefNet.putString("srv", ipStr);
  else prefNet.remove("srv");
  prefNet.end();
  nvsServerIp = ipStr;
}

void muatKalibrasiNvs() {
  if (!prefKal.begin("garap_kal", true)) return;
  PH_V7 = prefKal.getFloat("ph_v7", PH_V7);
  PH_V4 = prefKal.getFloat("ph_v4", PH_V4);
  TDS_FAKTOR_KOREKSI = prefKal.getFloat("tds_fk", TDS_FAKTOR_KOREKSI);
  PH_V7_LAMA = prefKal.getFloat("ph_v7_old", PH_V7);
  PH_V4_LAMA = prefKal.getFloat("ph_v4_old", PH_V4);
  TDS_FAKTOR_LAMA = prefKal.getFloat("tds_fk_old", TDS_FAKTOR_KOREKSI);
  for (int i = 0; i < JUMLAH_OUT; i++) {
    char k[12]; snprintf(k, sizeof(k), "laju_%d", i);
    ML_PER_DETIK[i] = prefKal.getFloat(k, ML_PER_DETIK[i]);
  }
  prefKal.end();
}
void simpanKalibrasiNvs() {
  if (!prefKal.begin("garap_kal", false)) return;
  prefKal.putFloat("ph_v7", PH_V7);
  prefKal.putFloat("ph_v4", PH_V4);
  prefKal.putFloat("tds_fk", TDS_FAKTOR_KOREKSI);
  prefKal.putFloat("ph_v7_old", PH_V7_LAMA);
  prefKal.putFloat("ph_v4_old", PH_V4_LAMA);
  prefKal.putFloat("tds_fk_old", TDS_FAKTOR_LAMA);
  for (int i = 0; i < JUMLAH_OUT; i++) {
    char k[12]; snprintf(k, sizeof(k), "laju_%d", i);
    prefKal.putFloat(k, ML_PER_DETIK[i]);
  }
  prefKal.end();
}

uint32_t jepitU32(uint32_t v, uint32_t mn, uint32_t mx) { return v < mn ? mn : (v > mx ? mx : v); }
void muatJadwalNvs() {
  if (!prefJdw.begin("garap_jdw", true)) return;
  intervalSensorMs = jepitU32(prefJdw.getUInt("sensor_ms", intervalSensorMs), INTERVAL_SENSOR_MIN_MS, INTERVAL_SENSOR_MAKS_MS);
  jedaAbMs         = jepitU32(prefJdw.getUInt("jeda_ab_ms", jedaAbMs), JEDA_AB_MIN_MS, JEDA_AB_MAKS_MS);
  isiAirMaksMs     = jepitU32(prefJdw.getUInt("isi_ms", isiAirMaksMs), 60000, MAKS_DURASI_MS[P_ISI_AIR]);
  prefJdw.end();
}
bool simpanJadwalNvs() {
  if (!prefJdw.begin("garap_jdw", false)) return false;
  bool ok = prefJdw.putUInt("sensor_ms", intervalSensorMs) > 0 && prefJdw.putUInt("jeda_ab_ms", jedaAbMs) > 0
            && prefJdw.putUInt("isi_ms", isiAirMaksMs) > 0;
  prefJdw.end();
  return ok;
}

// ═══ Fungsi aktuator (sama dengan aktuator.ino; mqtt → mqA) ═════════════════
void tulis(int pin, bool hidup) { digitalWrite(pin, (hidup != RELAY_AKTIF_LOW) ? HIGH : LOW); }
void semuaMati() {
  for (int i = 0; i < JUMLAH_OUT; i++) tulis(PIN_OUT[i], false);
}
bool estopDitekan() { return AKTIFKAN_BACA_ESTOP && digitalRead(PIN_STATUS_ESTOP) == LOW; }

void lapor(long id, const char* status, const char* alasan, float mlNyata) {
  JsonDocument d; d["id"] = id; d["status"] = status;
  JsonObject h = d["hasil"].to<JsonObject>(); h["alasan"] = alasan; h["ml_nyata"] = mlNyata; h["firmware"] = FIRMWARE;
  String b; serializeJson(d, b);
  int slot = 0;                                   // slot kosong, atau timpa yang paling lama
  for (int i = 0; i < 8; i++) {
    if (antreLapor[i].id == 0) { slot = i; break; }
    if (antreLapor[i].terakhir < antreLapor[slot].terakhir) slot = i;
  }
  if (antreLapor[slot].id != 0) Serial.printf("Antrean laporan penuh, #%ld dibuang\n", antreLapor[slot].id);
  antreLapor[slot].id = id; antreLapor[slot].isi = b; antreLapor[slot].terakhir = millis();
  if (mqA.connected()) mqA.publish(T_HASIL, b.c_str());
}

void ulangLaporan() {
  if (!mqA.connected()) return;
  for (int i = 0; i < 8; i++) {
    if (antreLapor[i].id != 0 && millis() - antreLapor[i].terakhir >= ULANG_HASIL_MS) {
      antreLapor[i].terakhir = millis();
      mqA.publish(T_HASIL, antreLapor[i].isi.c_str());
    }
  }
}

bool sudahDiterima(long id) {
  for (int i = 0; i < 16; i++) if (idTerakhir[i] == id) return true;
  idTerakhir[idPos] = id; idPos = (idPos + 1) % 16;
  return false;
}

void berhentiKerja(const char* status, const char* alasan) {
  if (!kerja.aktif) return;
  tulis(PIN_OUT[kerja.out], false);
  float mlNyata = kerja.mlSelesai + (kerja.nyala ? ML_PER_DETIK[kerja.out] * (millis() - kerja.mulai) / 1000.0f : 0.0f);
  if (kerja.ab) mlJamAB += mlNyata; else if (kerja.out == P_PH_UP || kerja.out == P_PH_DOWN) mlJamPH += mlNyata;
  lapor(kerja.id, status, alasan, mlNyata);
  kerja = Kerja();
}

// Maju satu langkah bila fase berjalan sudah habis waktunya (dipanggil tiap loop).
void langkahKerja() {
  if (!kerja.aktif || millis() - kerja.mulai < kerja.durasi) return;
  if (kerja.out2 < 0) { semuaMati(); berhentiKerja("selesai", "ok"); return; }
  if (kerja.fase == 0) {                          // pompa A selesai → jeda
    tulis(PIN_OUT[kerja.out], false);
    kerja.mlSelesai += ML_PER_DETIK[kerja.out] * kerja.durasi / 1000.0f;
    kerja.nyala = false; kerja.fase = 1; kerja.mulai = millis(); kerja.durasi = jedaAbMs;
  } else if (kerja.fase == 1) {                   // jeda habis → pompa B
    kerja.out = kerja.out2; kerja.out2 = -1; kerja.fase = 2; kerja.mulai = millis(); kerja.durasi = kerja.durasi2;
    kerja.nyala = true; tulis(PIN_OUT[kerja.out], true);
  }
}

void daruratBerhenti(const char* alasan) { semuaMati(); berhentiKerja("gagal", alasan); }

// Mulai satu perintah. Mengembalikan false + alasan bila ditolak (dilaporkan 'gagal').
bool mulaiPerintah(long id, const char* tipe, JsonObjectConst p, const char*& alasan) {
  String t = tipe;
  bool hanyaKonfig = (t == "JADWAL" || t == "KALIBRASI" || t == "BALIK_KALIBRASI");   // tidak menyalakan output
  if (!hanyaKonfig && (estopLokal || estopServer)) { alasan = "estop"; return false; }
  if (kerja.aktif)                                 { alasan = "sibuk"; return false; }
  int out = -1, out2 = -1; float ml = 0; uint32_t durasi = 0, durasi2 = 0; bool ab = false;

  if (t == "DOSIS") {
    if (floatBawahRendah()) { alasan = "air_kurang_float_bawah"; return false; }
    String l = p["larutan"] | ""; ml = p["ml"] | 0.0f;
    ab = (l == "AB");
    out = ab ? P_A : (l == "PH_UP") ? P_PH_UP : (l == "PH_DOWN") ? P_PH_DOWN : -1;
    if (out < 0 || !(ml > 0)) { alasan = "parameter"; return false; }
    float batas = ab ? MAKS_ML_AB_SUNTIK : MAKS_ML_PH_SUNTIK;
    if (ml > batas) { alasan = "melebihi_batas_suntik"; return false; }
    if (ab && mlJamAB + ml > MAKS_ML_AB_PER_JAM) { alasan = "batas_jam_ab"; return false; }
    if (!ab && mlJamPH + ml > MAKS_ML_PH_PER_JAM) { alasan = "batas_jam_ph"; return false; }
    if (ab) {                                     // mL total dibagi dua: A dan B masing-masing separuh
      out2 = P_B;
      if (ML_PER_DETIK[P_A] <= 0.01f || ML_PER_DETIK[P_B] <= 0.01f) { alasan = "belum_dikalibrasi"; return false; }
      durasi  = (uint32_t)(ml / 2 / ML_PER_DETIK[P_A] * 1000.0f);
      durasi2 = (uint32_t)(ml / 2 / ML_PER_DETIK[P_B] * 1000.0f);
      if (durasi > MAKS_DURASI_MS[P_A] || durasi2 > MAKS_DURASI_MS[P_B]) { alasan = "melebihi_durasi_maks"; return false; }
    }
  } else if (t == "ISI_AIR") {
    String aksi = p["aksi"] | "MULAI";
    if (aksi == "STOP") { tulis(PIN_OUT[P_ISI_AIR], false); lapor(id, "selesai", "isi_air_stop", 0); alasan = ""; return true; }
    if (tandonPenuh()) { alasan = "tandon_penuh"; return false; }
    out = P_ISI_AIR; durasi = isiAirMaksMs;
  } else if (t == "UJI_POMPA") {
    String nama = p["pompa"] | ""; float dtk = p["detik"] | 0.0f;
    for (int i = 0; i < JUMLAH_OUT; i++) if (nama.equalsIgnoreCase(NAMA_OUT[i])) { out = i; break; }
    if (out < 0 || dtk <= 0 || dtk > 120.0f) { alasan = "parameter_uji_pompa"; return false; }
    durasi = (uint32_t)(dtk * 1000.0f);
  } else if (t == "KALIBRASI") {
    if (!p["ph_v7"].isNull() && !p["ph_v4"].isNull()) {
      float v7 = p["ph_v7"].as<float>(), v4 = p["ph_v4"].as<float>();
      if (!isfinite(v7) || !isfinite(v4) || fabsf(v4 - v7) < 0.05f) {
        alasan = "kalibrasi_ph_tak_sah"; return false;
      }
      PH_V7_LAMA = PH_V7; PH_V4_LAMA = PH_V4;
      PH_V7 = v7; PH_V4 = v4;
    }
    if (!p["tds_faktor"].isNull()) {
      float fk = p["tds_faktor"].as<float>();
      if (!isfinite(fk) || fk <= 0.01f || fk > 20.0f) { alasan = "kalibrasi_tds_tak_sah"; return false; }
      TDS_FAKTOR_LAMA = TDS_FAKTOR_KOREKSI;
      TDS_FAKTOR_KOREKSI = fk;
    }
    auto setLaju = [&](int idx, const char* kunci) -> bool {
      if (p[kunci].isNull()) return true;
      float v = p[kunci].as<float>();
      if (!isfinite(v) || v < 0.0f || v > 500.0f) return false;
      ML_PER_DETIK[idx] = v;
      return true;
    };
    if (!setLaju(P_A, "laju_a") || !setLaju(P_B, "laju_b") || !setLaju(P_PH_UP, "laju_ph_up")
        || !setLaju(P_PH_DOWN, "laju_ph_down") || !setLaju(P_ISI_AIR, "laju_isi")) {
      alasan = "laju_pompa_tak_sah"; return false;
    }
    simpanKalibrasiNvs();
    lapor(id, "selesai", "kalibrasi_disimpan_nvs", 0); alasan = ""; return true;
  } else if (t == "BALIK_KALIBRASI") {
    String sensor = p["sensor"] | "";
    if (sensor.equalsIgnoreCase("ph")) { PH_V7 = PH_V7_LAMA; PH_V4 = PH_V4_LAMA; }
    else if (sensor.equalsIgnoreCase("ec")) { TDS_FAKTOR_KOREKSI = TDS_FAKTOR_LAMA; }
    simpanKalibrasiNvs();
    lapor(id, "selesai", "kalibrasi_dikembalikan", 0); alasan = ""; return true;
  } else if (t == "JADWAL") {
    // Hanya waktu operasi; TIDAK menyalakan output dan tidak membuka dosing. Satu nilai di luar rentang → semua ditolak.
    auto ambilDtk = [&](const char* kunci, uint32_t mnMs, uint32_t mxMs, uint32_t& tujuan) -> bool {
      if (p[kunci].isNull()) return true;
      long d = p[kunci].as<long>();
      if (d * 1000L < (long)mnMs || d * 1000L > (long)mxMs) return false;
      tujuan = (uint32_t)d * 1000UL;
      return true;
    };
    uint32_t sMs = intervalSensorMs, aMs = jedaAbMs, iMs = isiAirMaksMs;
    if (!ambilDtk("interval_sensor_detik", INTERVAL_SENSOR_MIN_MS, INTERVAL_SENSOR_MAKS_MS, sMs)
        || !ambilDtk("jeda_ab_detik", JEDA_AB_MIN_MS, JEDA_AB_MAKS_MS, aMs)
        || !ambilDtk("isi_air_maks_detik", 60000, MAKS_DURASI_MS[P_ISI_AIR], iMs)) {
      alasan = "jadwal_di_luar_batas"; return false;
    }
    intervalSensorMs = sMs; jedaAbMs = aMs; isiAirMaksMs = iMs;
    if (!simpanJadwalNvs()) { alasan = "nvs_gagal"; return false; }
    lapor(id, "selesai", "jadwal_disimpan_nvs", 0); alasan = ""; return true;
  } else { alasan = "tipe_tak_dikenal"; return false; }   // BILAS & SAMPLING tidak ada di wiring satu tandon

  if (durasi == 0) {
    if (ML_PER_DETIK[out] <= 0.01f) { alasan = "belum_dikalibrasi"; return false; }
    durasi = (uint32_t)(ml / ML_PER_DETIK[out] * 1000.0f);
    if (durasi > MAKS_DURASI_MS[out]) { alasan = "melebihi_durasi_maks"; return false; }
  }

  tulis(PIN_OUT[out], true);
  kerja = Kerja();
  kerja.aktif = true; kerja.id = id; kerja.out = out; kerja.out2 = out2; kerja.nyala = true; kerja.ab = ab;
  kerja.mulai = millis(); kerja.durasi = durasi; kerja.durasi2 = durasi2; kerja.ml = ml;
  Serial.printf("MULAI #%ld %s %s %.1f mL (%lu ms)\n", id, tipe, ab ? "AB" : NAMA_OUT[out], ml, (unsigned long)durasi);
  alasan = ""; return true;
}

void jalankanPerintah(JsonObjectConst c) {
  long id = c["id"].as<long>(); const char* tipe = c["tipe"] | "";
  if (id <= 0 || sudahDiterima(id)) return;
  // tanpa detak server yang segar, jangan mulai apa pun (kecuali perintah berhenti)
  bool serverSegar = terakhirServerOk != 0 && millis() - terakhirServerOk < FAILSAFE_MS;
  if (String(tipe) == "STOP_DARURAT") { estopServer = true; daruratBerhenti("stop_darurat"); lapor(id, "selesai", "stop_darurat", 0); return; }
  if (String(tipe) == "STOP")         { semuaMati(); berhentiKerja("gagal", "dihentikan"); lapor(id, "selesai", "stop", 0); return; }
  if (!serverSegar) { lapor(id, "gagal", "server_hilang", 0); return; }
  const char* alasan = "";
  if (!mulaiPerintah(id, tipe, c["parameter"].as<JsonObjectConst>(), alasan)) lapor(id, "gagal", alasan, 0);
}

void pesanMasuk(char* topik, byte* isi, unsigned int panjang) {
  JsonDocument d;
  if (deserializeJson(d, isi, panjang)) return;            // JSON rusak → abaikan
  String t = topik;
  if (t == T_SERVER) {
    if (!(d["online"] | false)) {                          // server mengumumkan mati (LWT) → fail-safe sekarang
      terakhirServerOk = 0; daruratBerhenti("server_hilang"); return;
    }
    terakhirServerOk = millis();
    estopServer = d["estop"] | false;
    if (estopServer) daruratBerhenti("estop_server");
  } else if (t == T_ACK) {
    long id = d["id"] | 0L;
    for (int i = 0; i < 8; i++) if (antreLapor[i].id == id) { antreLapor[i].id = 0; antreLapor[i].isi = ""; }
  } else if (t == T_PERINTAH) {
    jalankanPerintah(d.as<JsonObjectConst>());
  }
}

void kirimStatusA() {
  JsonDocument d; d["online"] = true; d["firmware"] = FIRMWARE; d["rssi"] = WiFi.RSSI(); d["uptime"] = millis() / 1000;
  d["estop"] = (estopLokal || estopServer);
  d["estop_fisik"] = estopLokal;
  d["float_bawah_rendah"] = floatBawahRendah();
  d["float_atas_penuh"] = tandonPenuh();
  String b; serializeJson(d, b);
  mqA.publish(T_STATUS_A, b.c_str(), true);
  estopFisikTerlapor = estopLokal;
}

bool cekPortServer(const IPAddress& ip, uint16_t port, uint16_t timeoutMs = 350) {
  if ((uint32_t)ip == 0) return false;
  WiFiClient c;
  bool ok = c.connect(ip, port, timeoutMs);
  c.stop();
  esp_task_wdt_reset();
  return ok;
}

IPAddress probeKandidatServer() {
  IPAddress kand[24]; int n = 0;
  IPAddress lokal = WiFi.localIP(), gw = WiFi.gatewayIP();
  auto tambah = [&](const IPAddress& p) {
    if ((uint32_t)p == 0 || p == lokal || p == gw) return;
    for (int i = 0; i < n; i++) if (kand[i] == p) return;
    if (n < 24) kand[n++] = p;
  };
  IPAddress ipDef; bool adaDef = ipDef.fromString(SERVER_IP);
  if (adaDef && ipDef[0] == lokal[0] && ipDef[1] == lokal[1] && ipDef[2] == lokal[2]) tambah(ipDef);

  if (lokal[0] == 172 && lokal[1] == 20 && lokal[2] == 10) {
    for (uint8_t h = 2; h <= 14; h++) tambah(IPAddress(172, 20, 10, h));
  } else if ((lokal[0] == 192 && lokal[1] == 168) || lokal[0] == 10) {
    // Berlaku otomatis untuk subnet modem 4G apa pun (192.168.8.x, .100.x, .1.x, .0.x, .43.x, dst.)
    const uint8_t tetap[] = { 50, 100, 101, 172, 200 };
    for (uint8_t h : tetap) tambah(IPAddress(lokal[0], lokal[1], lokal[2], h));
    for (uint8_t h = 2; h <= 15; h++) tambah(IPAddress(lokal[0], lokal[1], lokal[2], h));
    for (uint8_t h = 102; h <= 105; h++) tambah(IPAddress(lokal[0], lokal[1], lokal[2], h));
  }
  if (adaDef) tambah(ipDef);

  for (int i = 0; i < n; i++) if (cekPortServer(kand[i], MQTT_PORT, 130)) return kand[i];
  for (int i = 0; i < n; i++) if (cekPortServer(kand[i], HTTP_PORT, 130)) return kand[i];
  return adaDef ? ipDef : ((n > 0) ? kand[0] : IPAddress());
}

// Urutan: gateway hotspot Pi (10.42.0.1) → override NVS → mDNS (garap/vertonik/vertonic) → probe IP subnet → SERVER_IP.
void cariServer() {
  static bool mdnsMulai = false;
  IPAddress ip;
  if (WiFi.gatewayIP() == IP_HOTSPOT_PI) {
    ip = IP_HOTSPOT_PI;
  } else if (nvsServerIp.length() > 0 && ip.fromString(nvsServerIp)) {
    // pakai IP statis Pi yang disimpan lewat Serial ('server <ip>')
  } else {
    if (!mdnsMulai) mdnsMulai = MDNS.begin("garap-esp32");
    const char* hosts[3] = { NAMA_MDNS_SERVER, NAMA_MDNS_CADANGAN, NAMA_MDNS_ALIAS };
    for (int i = 0; i < 3 && (uint32_t)ip == 0 && mdnsMulai; i++) {
      ip = MDNS.queryHost(hosts[i], 1200);
      esp_task_wdt_reset();
    }
    if ((uint32_t)ip == 0) ip = probeKandidatServer();
  }
  serverIp = ip;
  mqA.setServer(serverIp, MQTT_PORT);
  Serial.printf("Server Pi: %s\n", serverIp.toString().c_str());
}

void sambungMqttA() {
  if (mqA.connected() || WiFi.status() != WL_CONNECTED) return;
  if (terakhirCoba != 0 && millis() - terakhirCoba < COBA_MQTT_MS) return;
  terakhirCoba = millis();
  if ((uint32_t)serverIp == 0 || gagalMqtt >= 3) { cariServer(); gagalMqtt = 0; }
  if (mqA.connect(KODE_A, KODE_A, API_KEY_AKTUATOR, T_STATUS_A, 1, true, "{\"online\":false}")) {
    mqA.subscribe(T_PERINTAH, 1); mqA.subscribe(T_ACK, 1); mqA.subscribe(T_SERVER, 1);
    kirimStatusA(); terakhirHB = millis();
    gagalMqtt = 0; httpFallbackOk = false;
    Serial.printf("MQTT aktuator tersambung ke %s\n", serverIp.toString().c_str());
  } else {
    gagalMqtt++;
    int st = mqA.state();
    Serial.printf("MQTT gagal, kode=%d%s\n", st,
      st == 5 ? " (API_KEY_AKTUATOR ditolak broker)" :
      st == -2 ? " (port 1883 tak terjangkau/ufw → sensor dialihkan ke HTTP)" : "");
  }
}

// ═══ Fungsi sensor (sama dengan sensor.ino; data lewat mqA) ═════════════════
// ADS1115 single-shot, ±4,096 V (1 LSB = 0,125 mV), 128 SPS — sama dengan firmware teman. NAN bila gagal.
float bacaAdsSekali(uint8_t kanal) {
  uint16_t cfg = 0x8000 | ((uint16_t)(4 + kanal) << 12) | 0x0200 | 0x0100 | 0x0080 | 0x0003;
  Wire.beginTransmission(ADS_ALAMAT); Wire.write((uint8_t)0x01); Wire.write((uint8_t)(cfg >> 8)); Wire.write((uint8_t)(cfg & 0xFF));
  if (Wire.endTransmission() != 0) return NAN;
  uint32_t t0 = millis(); delay(8);
  for (;;) {                                      // tunggu bit OS = 1 (konversi selesai)
    Wire.beginTransmission(ADS_ALAMAT); Wire.write((uint8_t)0x01);
    if (Wire.endTransmission() != 0 || Wire.requestFrom((int)ADS_ALAMAT, 2) != 2) return NAN;
    uint8_t hi = Wire.read(); Wire.read();
    if (hi & 0x80) break;
    if (millis() - t0 > 40) return NAN;
    delay(1);
  }
  Wire.beginTransmission(ADS_ALAMAT); Wire.write((uint8_t)0x00);
  if (Wire.endTransmission() != 0 || Wire.requestFrom((int)ADS_ALAMAT, 2) != 2) return NAN;
  uint8_t h = Wire.read(), l = Wire.read();
  return (float)(int16_t)(((uint16_t)h << 8) | l) * 0.000125f;
}
float bacaVolt(uint8_t kanal) {                   // median 9 sampel; NAN bila ada yang gagal
  float s[9];
  for (int i = 0; i < 9; i++) { s[i] = bacaAdsSekali(kanal); if (isnan(s[i])) return NAN; esp_task_wdt_reset(); }
  for (int i = 1; i < 9; i++) for (int j = i; j > 0 && s[j] < s[j-1]; j--) { float t = s[j]; s[j] = s[j-1]; s[j-1] = t; }
  return s[4];
}
float hitungPH(float v) {
  float dv = PH_V4 - PH_V7;
  if (isnan(v) || fabsf(dv) < 0.01f) return NAN;
  return 7.0f + ((4.01f - 7.0f) / dv) * (v - PH_V7);
}
float hitungTDS(float v, float suhu) {   // rumus umum modul TDS analog (kompensasi suhu 25 °C)
  if (isnan(v) || v < 0.0f) return NAN;
  float k = 1.0f + 0.02f * (suhu - 25.0f), vk = v / k;
  float tds = (133.42f * vk*vk*vk - 255.86f * vk*vk + 857.39f * vk) * 0.5f;
  return tds * TDS_FAKTOR_KOREKSI;
}

bool kirimHttpPost(const char* path, const String& body) {
  if (WiFi.status() != WL_CONNECTED || (uint32_t)serverIp == 0) return false;
  WiFiClient c;
  c.setTimeout(1500);
  if (!c.connect(serverIp, HTTP_PORT, 1500)) { esp_task_wdt_reset(); return false; }
  c.printf("POST %s HTTP/1.1\r\nHost: %s\r\nContent-Type: application/json\r\nX-API-KEY: %s\r\nConnection: close\r\nContent-Length: %u\r\n\r\n%s",
           path, serverIp.toString().c_str(), API_KEY_AKTUATOR, (unsigned)body.length(), body.c_str());
  uint32_t t0 = millis();
  while (c.connected() && !c.available() && millis() - t0 < 1500) delay(5);
  String status = c.available() ? c.readStringUntil('\n') : "";
  c.stop();
  esp_task_wdt_reset();
  return status.indexOf(" 200") > 0 || status.indexOf(" 201") > 0;
}

void kirimHeartbeatHttp() {
  JsonDocument d;
  d["firmware"] = FIRMWARE;
  d["rssi"] = WiFi.RSSI();
  d["uptime"] = millis() / 1000;
  d["estop"] = (estopLokal || estopServer);
  d["estop_fisik"] = estopLokal;
  d["float_bawah_rendah"] = floatBawahRendah();
  d["float_atas_penuh"] = tandonPenuh();
  String body; serializeJson(d, body);
  httpFallbackOk = kirimHttpPost("/api/device/v1/heartbeat/aktuator", body);
  if (httpFallbackOk) { serverTerakhirOk = millis(); estopFisikTerlapor = estopLokal; }
}

// Kirim satu payload data: MQTT dulu, cadangan HTTP. true = diterima broker/server.
bool kirimData(const String& body, const char*& jalur) {
  bool ok = false;
  if (mqA.connected()) {
    ok = mqA.publish(T_DATA, body.c_str());
    jalur = ok ? "MQTT" : "MQTT_GAGAL";
    if (ok) httpFallbackOk = false;
  } else if (WiFi.status() == WL_CONNECTED && (uint32_t)serverIp != 0) {
    ok = kirimHttpPost("/api/device/v1/sensor", body);
    httpFallbackOk = ok;
    jalur = ok ? "HTTP" : "GAGAL";
  }
  if (ok) serverTerakhirOk = millis();
  return ok;
}

// Simpan bacaan gagal-kirim ke antrean RAM (maks satu per ANTRE_JEDA_MS; penuh → yang tertua ditimpa).
void simpanAntre(float air, float udara, float rh, float ph, float tds) {
  if (antreTerakhir != 0 && millis() - antreTerakhir < ANTRE_JEDA_MS) return;
  if (isnan(ph) && isnan(tds) && isnan(udara) && isnan(rh) && !(air > -50 && air < 80)) return;   // tak ada yang terbaca
  antreTerakhir = millis();
  int idx = (antreAwal + antreJumlah) % ANTRE_MAKS;
  if (antreJumlah == ANTRE_MAKS) antreAwal = (antreAwal + 1) % ANTRE_MAKS; else antreJumlah++;
  antreBacaan[idx] = { millis(), air, udara, rh, ph, tds };
}

// Kirim ulang antrean (maks 5 per putaran agar loop & watchdog tetap lancar). umur_detik = sudah berapa lama diambil.
void kirimUlangAntre() {
  for (int n = 0; n < 5 && antreJumlah > 0; n++) {
    const BacaanAntre& b = antreBacaan[antreAwal];
    uint32_t umur = (millis() - b.t) / 1000;
    if (umur > 86400) { antreAwal = (antreAwal + 1) % ANTRE_MAKS; antreJumlah--; continue; }   // terlalu tua: ditolak server
    JsonDocument d;
    if (b.air > -50 && b.air < 80)          d["waterTemp"] = round(b.air * 10) / 10.0;
    if (!isnan(b.udara))                    d["airTemp"]   = round(b.udara * 10) / 10.0;
    if (!isnan(b.rh))                       d["humidity"]  = round(b.rh * 10) / 10.0;
    if (!isnan(b.ph) && b.ph > 0 && b.ph < 14) d["ph"]     = round(b.ph * 100) / 100.0;
    if (!isnan(b.tds) && b.tds >= 0 && b.tds < 5000) d["tds"] = round(b.tds);
    if (MEJA_AKTIF > 0)                     d["id_meja"]   = MEJA_AKTIF;
    d["umur_detik"] = umur;
    d["firmware"] = FIRMWARE;
    String body; serializeJson(d, body);
    const char* jalur = "";
    if (!kirimData(body, jalur)) return;
    antreAwal = (antreAwal + 1) % ANTRE_MAKS; antreJumlah--;
    esp_task_wdt_reset();
  }
}

void bacaDanKirimSensor() {
  float suhuAir = ds18.getTempCByIndex(0);   // hasil konversi yang diminta putaran lalu (non-blok)
  ds18.requestTemperatures();                // minta konversi untuk putaran berikut
  float suhuUdara = shtAda ? sht.readTemperature() : NAN, lembap = shtAda ? sht.readHumidity() : NAN;
  float vPh = adsAda ? bacaVolt(ADS_KANAL_PH) : NAN, vEc = adsAda ? bacaVolt(ADS_KANAL_EC) * FAKTOR_PEMBAGI_EC : NAN;
  float ph = hitungPH(vPh);
  float tds = hitungTDS(vEc, (suhuAir > -50 && suhuAir < 80) ? suhuAir : 25.0f);
  phTerakhir = ph; tdsTerakhir = tds; suhuAirTerakhir = suhuAir; suhuUdaraTerakhir = suhuUdara; rhTerakhir = lembap;

  JsonDocument d;
  // Sensor yang gagal baca DIHILANGKAN (jangan kirim angka palsu)
  if (suhuAir > -50 && suhuAir < 80)        d["waterTemp"] = round(suhuAir * 10) / 10.0;
  if (!isnan(suhuUdara))                    d["airTemp"]   = round(suhuUdara * 10) / 10.0;
  if (!isnan(lembap))                       d["humidity"]  = round(lembap * 10) / 10.0;
  if (!isnan(ph) && ph > 0 && ph < 14)      d["ph"]        = round(ph * 100) / 100.0;
  // Tegangan mentah probe pH: dipakai server untuk kalibrasi dua titik (KALIBRASI ph_v7/ph_v4 = tegangan, bukan pH).
  if (!isnan(vPh) && vPh > 0 && vPh < 5)    d["ph_volt"]   = round(vPh * 10000) / 10000.0;
  if (!isnan(tds) && tds >= 0 && tds < 5000) d["tds"]      = round(tds);
  if (MEJA_AKTIF > 0)                       d["id_meja"]   = MEJA_AKTIF;
  d["float_bawah_rendah"] = floatBawahRendah();
  d["float_atas_penuh"]   = tandonPenuh();
  d["estop_fisik"]        = estopLokal;
  if (peristiwaReset) d["peristiwa"] = "reset";
  d["rssi"] = WiFi.RSSI();
  d["firmware"] = FIRMWARE;

  String body; serializeJson(d, body);
  const char* jalur = "GAGAL";
  bool ok = kirimData(body, jalur);
  if (ok) peristiwaReset = false;
  else simpanAntre(suhuAir, suhuUdara, lembap, ph, tds);
  Serial.printf("[%lu] kirim=%s ph=%.2f tds=%.0f air=%.1f rssi=%d antre=%d\n",
                millis() / 1000, jalur, ph, tds, suhuAir, WiFi.RSSI(), antreJumlah);
}

// ═══ LCD 20x4 I2C (0x27 PCF8574 tanpa library tambahan) & Lampu Pilot ═════
void lcdTulisNib(uint8_t nib, uint8_t rs) {
  uint8_t d = (nib & 0xF0) | 0x08 | (rs ? 0x01 : 0x00);
  Wire.beginTransmission(LCD_ALAMAT); Wire.write(d | 0x04); Wire.endTransmission();
  delayMicroseconds(1);
  Wire.beginTransmission(LCD_ALAMAT); Wire.write(d & ~0x04); Wire.endTransmission();
  delayMicroseconds(45);
}
void lcdKirim(uint8_t val, uint8_t rs) { lcdTulisNib(val & 0xF0, rs); lcdTulisNib((val << 4) & 0xF0, rs); }
void lcdInit() {
  Wire.beginTransmission(LCD_ALAMAT);
  lcdAda = (Wire.endTransmission() == 0);
  if (!lcdAda) return;
  delay(50);
  lcdTulisNib(0x30, 0); delay(5); lcdTulisNib(0x30, 0); delay(1); lcdTulisNib(0x30, 0); delay(1); lcdTulisNib(0x20, 0);
  lcdKirim(0x28, 0); lcdKirim(0x0C, 0); lcdKirim(0x06, 0); lcdKirim(0x01, 0); delay(2);
  for (int r = 0; r < 4; r++) { memset(lcdCache[r], ' ', 20); lcdCache[r][20] = 0; }
}
void lcdBaris(int r, const char* teks) {
  if (!lcdAda || r < 0 || r > 3) return;
  char buf[21]; size_t n = strlen(teks); if (n > 20) n = 20;
  memcpy(buf, teks, n); memset(buf + n, ' ', 20 - n); buf[20] = 0;
  if (strcmp(buf, lcdCache[r]) == 0) return;
  static const uint8_t off[4] = { 0x00, 0x40, 0x14, 0x54 };
  lcdKirim(0x80 | off[r], 0);
  for (int i = 0; i < 20; i++) lcdKirim((uint8_t)buf[i], 1);
  memcpy(lcdCache[r], buf, 21);
}
void perbaruiLampuDanLcd() {
  bool darurat = estopLokal || estopServer;
  bool kuning  = !darurat && (floatBawahRendah() || !mqA.connected() || terakhirServerOk == 0);
  bool hijau   = !darurat && !kuning;
  digitalWrite(PIN_LAMPU_MERAH, (darurat || kuning) ? HIGH : LOW);
  digitalWrite(PIN_LAMPU_HIJAU, (hijau || kuning) ? HIGH : LOW);
  digitalWrite(PIN_LAMPU_BIRU,  kerja.aktif ? HIGH : LOW);

  if (!lcdAda || millis() - lcdTerakhir < 500) return;
  lcdTerakhir = millis();
  char b[24];

  if ((int32_t)(lcdInfoSampai - millis()) > 0) {
    snprintf(b, sizeof(b), "WIFI:%s", WiFi.status() == WL_CONNECTED ? WiFi.SSID().c_str() : "(putus)");
    lcdBaris(0, b);
    snprintf(b, sizeof(b), "ESP :%s", WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString().c_str() : "0.0.0.0");
    lcdBaris(1, b);
    snprintf(b, sizeof(b), "SRV :%s", (uint32_t)serverIp ? serverIp.toString().c_str() : "0.0.0.0");
    lcdBaris(2, b);
    const char* mode = mqA.connected() ? "MODE: MQTT AKTIF" : (httpFallbackOk ? "MODE: HTTP (NO MQTT)" : "MODE: MENUNGGU...");
    lcdBaris(3, mode);
    return;
  }

  if (!isnan(tdsTerakhir) && tdsTerakhir >= 0 && tdsTerakhir < 5000)
    snprintf(b, sizeof(b), "EC %.2fmS  %.0fppm", tdsTerakhir / 500.0f, tdsTerakhir);
  else snprintf(b, sizeof(b), "EC ----    ----ppm");
  lcdBaris(0, b);

  char k1[12], k2[12];
  if (!isnan(phTerakhir) && phTerakhir > 0 && phTerakhir < 14) snprintf(k1, sizeof(k1), "pH %.2f", phTerakhir);
  else snprintf(k1, sizeof(k1), "pH --.--");
  if (suhuAirTerakhir > -50 && suhuAirTerakhir < 80) snprintf(k2, sizeof(k2), "Air %.1fC", suhuAirTerakhir);
  else snprintf(k2, sizeof(k2), "Air --.-C");
  snprintf(b, sizeof(b), "%-9s %s", k1, k2);
  lcdBaris(1, b);

  if (!isnan(suhuUdaraTerakhir) && !isnan(rhTerakhir))
    snprintf(b, sizeof(b), "Ruang %.0fC  RH %.0f%%", suhuUdaraTerakhir, rhTerakhir);
  else snprintf(b, sizeof(b), "Ruang --C   RH --%%");
  lcdBaris(2, b);

  const char* st = "PENAMPUNG CUKUP";
  if (darurat) st = "E-STOP AKTIF!";
  else if (WiFi.status() != WL_CONNECTED) st = "WIFI MATI";
  else if (!mqA.connected() && httpFallbackOk) st = "HTTP SENSOR ONLY";
  else if (!mqA.connected() || terakhirServerOk == 0) st = "TUNGGU SERVER...";
  else if (kerja.aktif && kerja.out == P_ISI_AIR) st = "MENGISI AIR...";
  else if (kerja.aktif && kerja.out == P_A) st = "DOSING A...";
  else if (kerja.aktif && kerja.out == P_B) st = "DOSING B...";
  else if (kerja.aktif && kerja.out == P_PH_UP) st = "pH UP...";
  else if (kerja.aktif && kerja.out == P_PH_DOWN) st = "pH DOWN...";
  else if (floatBawahRendah()) st = "PENAMPUNG KURANG";
  else if (tandonPenuh()) st = "PENAMPUNG PENUH";
  lcdBaris(3, st);
}

// ═══ Diagnostik Serial, Tombol Reset (GPIO 19), & Wi-Fi ═══════════════════
void cetakStatus() {
  Serial.println("\n=== STATUS ESP32 GARAP (" FIRMWARE ") ===");
  Serial.printf("Wi-Fi   : %s  IP=%s  GW=%s  RSSI=%d\n",
                WiFi.status() == WL_CONNECTED ? WiFi.SSID().c_str() : "(putus)",
                WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString().c_str() : "0.0.0.0",
                WiFi.status() == WL_CONNECTED ? WiFi.gatewayIP().toString().c_str() : "0.0.0.0",
                WiFi.RSSI());
  if (nvsWifiSsid.length() > 0 || nvsServerIp.length() > 0) {
    Serial.printf("NVS Net : wifi=%s  server=%s\n",
                  nvsWifiSsid.length() > 0 ? nvsWifiSsid.c_str() : "-",
                  nvsServerIp.length() > 0 ? nvsServerIp.c_str() : "-");
  }
  Serial.printf("Server  : %s  MQTT=%s(%d)  HTTP=%s  Meja=%d\n",
                serverIp.toString().c_str(),
                mqA.connected() ? "OK" : "PUTUS", mqA.state(),
                httpFallbackOk ? "OK" : "-", MEJA_AKTIF);
  Serial.printf("Pengaman: estopBaca=%d estopLokal=%d estopServer=%d floatBawahKurang=%d floatAtasPenuh=%d\n",
                AKTIFKAN_BACA_ESTOP, estopLokal, estopServer, floatBawahRendah(), tandonPenuh());
  Serial.printf("Kal NVS : pH_v7=%.3f pH_v4=%.3f tds_fk=%.3f | laju(A=%.2f B=%.2f Up=%.2f Dn=%.2f Isi=%.2f)\n",
                PH_V7, PH_V4, TDS_FAKTOR_KOREKSI,
                ML_PER_DETIK[P_A], ML_PER_DETIK[P_B], ML_PER_DETIK[P_PH_UP], ML_PER_DETIK[P_PH_DOWN], ML_PER_DETIK[P_ISI_AIR]);
  Serial.printf("Jadwal  : sensor=%lu dtk jedaAB=%lu dtk isiMaks=%lu dtk (NVS garap_jdw) | antrean bacaan=%d\n",
                (unsigned long)(intervalSensorMs / 1000), (unsigned long)(jedaAbMs / 1000), (unsigned long)(isiAirMaksMs / 1000), antreJumlah);
}

void pindaiWifi() {
  Serial.println("Memindai Wi-Fi 2,4 GHz sekitar...");
  esp_task_wdt_reset();
  int n = WiFi.scanNetworks();
  esp_task_wdt_reset();
  for (int i = 0; i < n; i++) Serial.printf("  [%d] %-24s %d dBm\n", i + 1, WiFi.SSID(i).c_str(), WiFi.RSSI(i));
  WiFi.scanDelete();
}

void cekTombolReset(uint32_t now) {
  bool baca = digitalRead(PIN_TOMBOL_RESET);
  if (baca != resetBtnTerakhir) {
    resetBtnTerakhir = baca;
    resetBtnWaktu = now;
    if (baca == HIGH) resetBtnSudahAksi = false;
  }
  if (baca == LOW && !resetBtnSudahAksi && (uint32_t)(now - resetBtnWaktu) >= 60) {
    resetBtnSudahAksi = true;
    peristiwaReset = true;                         // dilaporkan di kiriman data berikut → peringatan di web
    sTerakhir = 0;                                 // kirim secepatnya
    lcdInfoSampai = now + 4000;
    lcdTerakhir = 0;
    if (estopLokal && !estopDitekan() && !estopServer && terakhirServerOk != 0 && now - terakhirServerOk < FAILSAFE_MS) {
      estopLokal = false;
      Serial.println("Tombol RESET: E-STOP lokal dibersihkan");
    }
    cetakStatus();
  }
}

void prosesSerial() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\r') continue;
    if (c != '\n') { if (serialBuf.length() < 128) serialBuf += c; continue; }
    String raw = serialBuf; serialBuf = ""; raw.trim();
    if (!raw.length()) continue;
    String cmd = raw; cmd.toLowerCase();
    if (cmd == "status") cetakStatus();
    else if (cmd == "scan") pindaiWifi();
    else if (cmd == "cari") { serverIp = IPAddress(); gagalMqtt = 0; cariServer(); }
    else if (cmd == "baca") { bacaDanKirimSensor(); }
    else if (cmd == "wifi hapus") {
      simpanWifiNvs("", "");
      Serial.println("NVS Wi-Fi kustom dihapus (mulai ulang atau pakai jaringan bawaan).");
    } else if (cmd.startsWith("wifi ")) {
      String arg = raw.substring(5);
      int sep = arg.indexOf('|');
      if (sep <= 0) {
        Serial.println("Format: wifi NAMA_WIFI|SANDI_WIFI  (atau: wifi hapus)");
      } else {
        String ssid = arg.substring(0, sep); ssid.trim();
        String pass = arg.substring(sep + 1);
        if (ssid.length() == 0 || ssid.length() > 32 || (pass.length() > 0 && (pass.length() < 8 || pass.length() > 63))) {
          Serial.println("SSID (1-32) atau sandi (kosong / 8-63 karakter) tidak valid.");
        } else {
          simpanWifiNvs(ssid, pass);
          wifiMulti.addAP(nvsWifiSsid.c_str(), nvsWifiPass.c_str());
          WiFi.disconnect(false);
          serverIp = IPAddress(); gagalMqtt = 0;
          Serial.printf("Wi-Fi NVS disimpan: %s — menyambung ulang...\n", nvsWifiSsid.c_str());
        }
      }
    } else if (cmd == "server hapus") {
      simpanServerNvs("");
      serverIp = IPAddress(); gagalMqtt = 0;
      Serial.println("Server IP NVS dihapus — mencari otomatis...");
      cariServer();
    } else if (cmd.startsWith("server ")) {
      String ipStr = raw.substring(7); ipStr.trim();
      IPAddress uji;
      if (!uji.fromString(ipStr) || (uint32_t)uji == 0) {
        Serial.println("Format: server 192.168.8.50  (atau: server hapus)");
      } else {
        simpanServerNvs(uji.toString());
        gagalMqtt = 0;
        if (mqA.connected()) mqA.disconnect();
        cariServer();
      }
    } else {
      Serial.println("Perintah Serial: status | scan | cari | baca | wifi SSID|SANDI | wifi hapus | server IP | server hapus | help");
    }
  }
}

void sambungWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  static bool siap = false;
  if (!siap) {
    WiFi.mode(WIFI_STA); WiFi.setSleep(false); WiFi.setAutoReconnect(true);
    if (nvsWifiSsid.length() > 0) wifiMulti.addAP(nvsWifiSsid.c_str(), nvsWifiPass.c_str());
    for (const Jaringan& j : JARINGAN) wifiMulti.addAP(j.ssid, j.pass);
    siap = true;
  }
  esp_task_wdt_reset();
  if (wifiMulti.run(6000) == WL_CONNECTED) {      // memindai lalu menyambung ke jaringan terkuat yang dikenal
    Serial.printf("Wi-Fi: %s  rssi=%d  ip=%s\n", WiFi.SSID().c_str(), WiFi.RSSI(), WiFi.localIP().toString().c_str());
    serverIp = IPAddress(); gagalMqtt = 0;         // jaringan mungkin berganti → cari server lagi
    serverTerakhirOk = millis();                   // beri 2 menit untuk menemukan server sebelum pindai ulang
  }
  esp_task_wdt_reset();
}

void setup() {
  // Output OFF sebelum apa pun
  for (int i = 0; i < JUMLAH_OUT; i++) { tulis(PIN_OUT[i], false); pinMode(PIN_OUT[i], OUTPUT); tulis(PIN_OUT[i], false); }
  const int pinLampu[3] = { PIN_LAMPU_MERAH, PIN_LAMPU_HIJAU, PIN_LAMPU_BIRU };
  for (int i = 0; i < 3; i++) { digitalWrite(pinLampu[i], LOW); pinMode(pinLampu[i], OUTPUT); digitalWrite(pinLampu[i], LOW); }
  pinMode(PIN_STATUS_ESTOP, INPUT);               // GPIO36 input-only, tanpa pull-up internal
  pinMode(PIN_TOMBOL_RESET, INPUT_PULLUP);
  mulaiFloat(fBawah);
  mulaiFloat(fAtas);
  muatJaringanNvs();
  muatKalibrasiNvs();
  muatJadwalNvs();
  Serial.begin(115200);
  Serial.println("\nGARAP IoT " FIRMWARE " siap (ketik 'help' di Serial Monitor 115200 baud)");
  esp_task_wdt_config_t wdt = { .timeout_ms = 15000, .idle_core_mask = 0, .trigger_panic = true };
  esp_task_wdt_reconfigure(&wdt); esp_task_wdt_add(NULL);

  Wire.begin(PIN_SDA, PIN_SCL); Wire.setClock(100000);
  Wire.beginTransmission(ADS_ALAMAT); adsAda = (Wire.endTransmission() == 0);
  shtAda = sht.begin(SHT_ALAMAT);
  lcdInit();
  if (lcdAda) { lcdBaris(0, "    GARAP SYSTEM    "); lcdBaris(1, " Vertonik Smart Farm"); lcdBaris(2, "--------------------"); lcdBaris(3, "  Menyiapkan alat..."); }
  Serial.printf("ADS1115 %s, SHT31 %s, LCD %s\n", adsAda ? "ada" : "TIDAK TERBACA", shtAda ? "ada" : "TIDAK TERBACA", lcdAda ? "ada" : "TIDAK TERBACA");
  ds18.begin(); ds18.setWaitForConversion(false); ds18.requestTemperatures();

  mqA.setBufferSize(1024);
  mqA.setKeepAlive(15);
  mqA.setSocketTimeout(5);                          // connect() tak boleh menahan loop > watchdog
  mqA.setCallback(pesanMasuk);
  sambungWifi();
  terakhirServerOk = 0; jamMulai = millis();        // belum ada detak server = belum boleh menjalankan apa pun
}

void loop() {
  esp_task_wdt_reset();
  uint32_t skr = millis();
  perbaruiFloatSatu(fBawah, skr);
  perbaruiFloatSatu(fAtas, skr);
  cekTombolReset(skr);
  prosesSerial();
  if (estopDitekan()) { if (!estopLokal) Serial.println("E-STOP fisik"); estopLokal = true; daruratBerhenti("tombol_estop"); }
  // isi air berhenti sendiri saat float atas penuh, dan pompa nutrisi berhenti bila float bawah turun (air kurang)
  if (kerja.aktif && kerja.out == P_ISI_AIR && tandonPenuh()) { semuaMati(); berhentiKerja("selesai", "tandon_penuh"); }
  if (kerja.aktif && kerja.out != P_ISI_AIR && floatBawahRendah()) { semuaMati(); berhentiKerja("gagal", "air_kurang_float_bawah"); }
  // jendela per jam
  if (millis() - jamMulai > 3600000UL) { jamMulai = millis(); mlJamAB = mlJamPH = 0; }
  // fail-safe: detak server hilang (juga saat MQTT/WiFi putus)
  if (terakhirServerOk == 0 || millis() - terakhirServerOk > FAILSAFE_MS) daruratBerhenti("server_hilang");
  // batas durasi pekerjaan berjalan
  langkahKerja();

  sambungWifi();
  sambungMqttA();
  esp_task_wdt_reset();
  mqA.loop();
  ulangLaporan();
  // E-STOP fisik hanya lepas bila tombol dilepas DAN server sudah di-reset admin (estop=false)
  if (estopLokal && !estopDitekan() && !estopServer
      && terakhirServerOk != 0 && millis() - terakhirServerOk < FAILSAFE_MS) { estopLokal = false; Serial.println("E-STOP dilepas"); }
  // E-STOP fisik berubah → status segera (jangan tunggu detak 30 dtk) agar web langsung memperingatkan
  if (mqA.connected() && (millis() - terakhirHB >= HEARTBEAT_MS || estopFisikTerlapor != estopLokal)) { terakhirHB = millis(); kirimStatusA(); serverTerakhirOk = millis(); }
  else if (!mqA.connected() && millis() - terakhirHBHttp >= HEARTBEAT_MS) { terakhirHBHttp = millis(); kirimHeartbeatHttp(); }

  // sensor: hanya saat pompa diam (pembacaan memblokir ±0,5 dtk dan akan memperpanjang durasi pompa)
  if (!kerja.aktif && (sTerakhir == 0 || millis() - sTerakhir >= intervalSensorMs)) { sTerakhir = millis(); bacaDanKirimSensor(); }
  if (!kerja.aktif && antreJumlah > 0 && (mqA.connected() || httpFallbackOk)) kirimUlangAntre();
  // Wi-Fi tersambung tetapi server Pi hilang lama (mis. Pi pindah ke hotspot sendiri) → pindai ulang jaringan dikenal.
  if (WiFi.status() == WL_CONNECTED && !mqA.connected() && !kerja.aktif
      && millis() - serverTerakhirOk > PINDAI_ULANG_MS) {
    Serial.println("Server tak terjangkau > 2 menit: putus Wi-Fi & pindai ulang (mis. hotspot Pi)");
    serverTerakhirOk = millis();
    WiFi.disconnect(false);
    serverIp = IPAddress(); gagalMqtt = 0;
  }
  perbaruiLampuDanLcd();
  delay(20);
}
