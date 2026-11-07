/*
 * GARAP — ESP32 GABUNGAN (sensor + aktuator dalam SATU papan)  v0.3  ⚠ BELUM DIUJI PADA PERANGKAT KERAS
 * Gabungan sensor/sensor.ino + aktuator/aktuator.ino dalam SATU sambungan MQTT ke broker Pi: login & API key
 * 'aktuator-01' saja. Di backend perangkat ini berperan 'gabungan' (sensor + aktuator), jadi satu kunci cukup.
 *   garap/aktuator-01/data   : bacaan sensor tiap 5 dtk
 *   garap/aktuator-01/status : status tiap 30 dtk (retained, LWT)  ·  perintah/ack/hasil + detak server (lihat aktuator.ino)
 * v0.3 JARINGAN: ESP32 mencoba beberapa Wi-Fi (WIFI_JARINGAN di rahasia.h; dipilih yang terkuat yang terjangkau,
 *   mis. hotspot Pi 'VERTONIK' dan Wi-Fi rumah). Alamat server dicari sendiri tiap sambung ulang:
 *   gateway = 10.42.0.1 (hotspot Pi) → itulah Pi; selain itu mDNS 'vertonik.local'; terakhir SERVER_IP dari rahasia.h.
 *   Jadi IP Pi yang berganti-ganti tidak perlu flash ulang. Tanpa WIFI_JARINGAN, WIFI_SSID/WIFI_PASS lama tetap jalan.
 * Library: ArduinoJson 7.x, PubSubClient 2.8, OneWire, DallasTemperature, Adafruit SHT31 (+ Adafruit BusIO).
 * Board: "ESP32 Dev Module". Salin rahasia.h.contoh → rahasia.h dan isi (satu API key: aktuator-01).
 *
 * PETA PIN = ikut firmware teman (Config.h "1 Penampung Portable", Wiring v2.0), satu tandon / satu meja:
 *   I2C SDA 21 / SCL 22 : ADS1115 0x48 (A0 = pH, A1 = EC lewat pembagi 10k/10k) + SHT31 0x44 (suhu/RH udara)
 *   DS18B20 suhu air 4 · pompa A 25, B 26, pH Up 27, pH Down 18, pompa isi 16 (relay HIGH-trigger)
 *   float bawah 32, float atas 33 (HIGH = penuh, putus kabel = penuh) · E-STOP: bus +12V lewat pembagi 33k/10k ke 36
 *   Terpasang di wiring tapi BELUM dipakai firmware ini: lampu 13/17/23, tombol reset 19, RTC 0x68, LCD 0x27.
 * Perintah 'AB' dari server = pompa A lalu (setelah jeda) pompa B, masing-masing separuh dari mL yang diminta.
 *
 * PERTAHANAN BERLAPIS aktuator (sama dengan aktuator.ino) + dua tambahan papan gabungan:
 *   - Sensor TIDAK dibaca selagi pompa jalan (pembacaan ADS1115/SHT31 memblokir ±0,5 dtk → durasi pompa molor).
 *   - ML_PER_DETIK = 0 → setiap DOSIS/BILAS ditolak "belum_dikalibrasi" sampai diisi hasil gelas ukur.
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
#include "rahasia.h"

#define FIRMWARE "gabungan-0.4"
#define KODE_A   "aktuator-01"        // = user MQTT di Pi (deploy-pi/mosquitto/garap.acl)
#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif

// ═══ JARINGAN ══════════════════════════════════════════════════════════════
struct Jaringan { const char* ssid; const char* pass; };
#ifndef WIFI_JARINGAN
#define WIFI_JARINGAN { { WIFI_SSID, WIFI_PASS } }   // format lama: satu jaringan
#endif
const Jaringan JARINGAN[] = WIFI_JARINGAN;
const char* NAMA_MDNS_SERVER = "garap";             // → garap.local (siapkan-sd.sh) dengan fallback vertonik.local
const char* NAMA_MDNS_CADANGAN = "vertonik";        // → vertonik.local (nama host lama)
const IPAddress IP_HOTSPOT_PI(10, 42, 0, 1);       // alamat tetap Pi saat memancarkan hotspot (vertonik-hotspot)
WiFiMulti wifiMulti;
IPAddress serverIp;                                 // 0.0.0.0 = belum ditemukan
uint8_t gagalMqtt = 0;

// ═══ SENSOR ════════════════════════════════════════════════════════════════
#define PIN_SDA   21
#define PIN_SCL   22
#define ADS_ALAMAT 0x48
#define ADS_KANAL_PH 0                // A0
#define ADS_KANAL_EC 1                // A1 (sinyal sudah dibagi 2 oleh 10k/10k)
#define FAKTOR_PEMBAGI_EC 2.0f
#define SHT_ALAMAT 0x44
#define PIN_DS18  4
const uint32_t INTERVAL_MS = 5000;
// id_meja penampung yang diukur probe ini (menu Meja di web). 0 = bacaan tersimpan tapi TIDAK dipakai otomasi dosis.
const int ID_MEJA = 0;
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
const uint32_t JEDA_AB_MS = 60000;    // jeda antara pompa A dan B (teman: jeda_ab_dtk 60–600 dtk, bawaan 300). Sesuaikan.
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
uint32_t lcdTerakhir = 0;
WiFiClient wifiA;
PubSubClient mqA(wifiA);
uint32_t sTerakhir = 0;
bool estopLokal = false, estopServer = false;
uint32_t terakhirServerOk = 0, terakhirHB = 0, jamMulai = 0, terakhirCoba = 0;
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
    kerja.nyala = false; kerja.fase = 1; kerja.mulai = millis(); kerja.durasi = JEDA_AB_MS;
  } else if (kerja.fase == 1) {                   // jeda habis → pompa B
    kerja.out = kerja.out2; kerja.out2 = -1; kerja.fase = 2; kerja.mulai = millis(); kerja.durasi = kerja.durasi2;
    kerja.nyala = true; tulis(PIN_OUT[kerja.out], true);
  }
}

void daruratBerhenti(const char* alasan) { semuaMati(); berhentiKerja("gagal", alasan); }

// Mulai satu perintah. Mengembalikan false + alasan bila ditolak (dilaporkan 'gagal').
bool mulaiPerintah(long id, const char* tipe, JsonObjectConst p, const char*& alasan) {
  String t = tipe;
  if (estopLokal || estopServer) { alasan = "estop"; return false; }
  if (kerja.aktif)               { alasan = "sibuk"; return false; }
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
    out = P_ISI_AIR; durasi = MAKS_DURASI_MS[P_ISI_AIR];
  } else if (t == "UJI_POMPA") {
    String nama = p["pompa"] | ""; float dtk = p["detik"] | 0.0f;
    for (int i = 0; i < JUMLAH_OUT; i++) if (nama.equalsIgnoreCase(NAMA_OUT[i])) { out = i; break; }
    if (out < 0 || dtk <= 0 || dtk > 120.0f) { alasan = "parameter_uji_pompa"; return false; }
    durasi = (uint32_t)(dtk * 1000.0f);
  } else if (t == "KALIBRASI") {
    if (! p["ph_v7"].isNull() && !p["ph_v4"].isNull()) {
      PH_V7_LAMA = PH_V7; PH_V4_LAMA = PH_V4;
      PH_V7 = p["ph_v7"].as<float>(); PH_V4 = p["ph_v4"].as<float>();
    }
    if (!p["tds_faktor"].isNull()) {
      TDS_FAKTOR_LAMA = TDS_FAKTOR_KOREKSI;
      TDS_FAKTOR_KOREKSI = p["tds_faktor"].as<float>();
    }
    if (!p["laju_a"].isNull())       ML_PER_DETIK[P_A]       = p["laju_a"].as<float>();
    if (!p["laju_b"].isNull())       ML_PER_DETIK[P_B]       = p["laju_b"].as<float>();
    if (!p["laju_ph_up"].isNull())   ML_PER_DETIK[P_PH_UP]   = p["laju_ph_up"].as<float>();
    if (!p["laju_ph_down"].isNull()) ML_PER_DETIK[P_PH_DOWN] = p["laju_ph_down"].as<float>();
    if (!p["laju_isi"].isNull())     ML_PER_DETIK[P_ISI_AIR] = p["laju_isi"].as<float>();
    simpanKalibrasiNvs();
    lapor(id, "selesai", "kalibrasi_disimpan_nvs", 0); alasan = ""; return true;
  } else if (t == "BALIK_KALIBRASI") {
    String sensor = p["sensor"] | "";
    if (sensor.equalsIgnoreCase("ph")) { PH_V7 = PH_V7_LAMA; PH_V4 = PH_V4_LAMA; }
    else if (sensor.equalsIgnoreCase("ec")) { TDS_FAKTOR_KOREKSI = TDS_FAKTOR_LAMA; }
    simpanKalibrasiNvs();
    lapor(id, "selesai", "kalibrasi_dikembalikan", 0); alasan = ""; return true;
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
  d["float_bawah_rendah"] = floatBawahRendah();
  d["float_atas_penuh"] = tandonPenuh();
  String b; serializeJson(d, b);
  mqA.publish(T_STATUS_A, b.c_str(), true);
}

// Urutan: gateway = hotspot Pi → mDNS → SERVER_IP (rahasia.h). Hasil dipasang ke klien MQTT.
void cariServer() {
  static bool mdnsMulai = false;
  IPAddress ip;
  if (WiFi.gatewayIP() == IP_HOTSPOT_PI) ip = IP_HOTSPOT_PI;
  else {
    if (!mdnsMulai) mdnsMulai = MDNS.begin("garap-esp32");
    if (mdnsMulai) {
      ip = MDNS.queryHost(NAMA_MDNS_SERVER, 2000);
      esp_task_wdt_reset();
      if ((uint32_t)ip == 0) ip = MDNS.queryHost(NAMA_MDNS_CADANGAN, 2000);
    }
    esp_task_wdt_reset();
    if ((uint32_t)ip == 0) ip.fromString(SERVER_IP);
  }
  serverIp = ip;
  mqA.setServer(serverIp, MQTT_PORT);
  Serial.printf("Server: %s\n", serverIp.toString().c_str());
}

void sambungMqttA() {
  if (mqA.connected() || WiFi.status() != WL_CONNECTED) return;
  if (terakhirCoba != 0 && millis() - terakhirCoba < COBA_MQTT_MS) return;
  terakhirCoba = millis();
  if ((uint32_t)serverIp == 0 || gagalMqtt >= 3) { cariServer(); gagalMqtt = 0; }
  if (mqA.connect(KODE_A, KODE_A, API_KEY_AKTUATOR, T_STATUS_A, 1, true, "{\"online\":false}")) {
    mqA.subscribe(T_PERINTAH, 1); mqA.subscribe(T_ACK, 1); mqA.subscribe(T_SERVER, 1);
    kirimStatusA(); terakhirHB = millis();
    gagalMqtt = 0;
    Serial.printf("MQTT aktuator tersambung ke %s\n", serverIp.toString().c_str());
  } else {
    gagalMqtt++;
    Serial.printf("MQTT aktuator gagal, kode=%d%s\n", mqA.state(), mqA.state() == 5 ? " (API_KEY_AKTUATOR ditolak broker)" : "");
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
float hitungPH(float v) { float slope = (4.01f - 7.0f) / (PH_V4 - PH_V7); return 7.0f + slope * (v - PH_V7); }
float hitungTDS(float v, float suhu) {   // rumus umum modul TDS analog (kompensasi suhu 25 °C)
  float k = 1.0f + 0.02f * (suhu - 25.0f), vk = v / k;
  float tds = (133.42f * vk*vk*vk - 255.86f * vk*vk + 857.39f * vk) * 0.5f;
  return tds * TDS_FAKTOR_KOREKSI;
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
  if (suhuAir > -50 && suhuAir < 80)       d["waterTemp"] = round(suhuAir * 10) / 10.0;
  if (!isnan(suhuUdara))                   d["airTemp"]   = round(suhuUdara * 10) / 10.0;
  if (!isnan(lembap))                      d["humidity"]  = round(lembap * 10) / 10.0;
  if (!isnan(ph) && ph > 0 && ph < 14)                 d["ph"]        = round(ph * 100) / 100.0;
  if (!isnan(tds) && tds >= 0 && tds < 5000)            d["tds"]       = round(tds);
  if (ID_MEJA > 0)                         d["id_meja"]   = ID_MEJA;
  d["float_bawah_rendah"] = floatBawahRendah();
  d["float_atas_penuh"]   = tandonPenuh();
  d["rssi"] = WiFi.RSSI();
  d["firmware"] = FIRMWARE;

  bool ok = false;
  if (mqA.connected()) { String body; serializeJson(d, body); ok = mqA.publish(T_DATA, body.c_str()); }
  Serial.printf("[%lu] kirim=%s ph=%.2f tds=%.0f air=%.1f rssi=%d\n", millis()/1000, ok ? "OK" : "GAGAL", ph, tds, suhuAir, WiFi.RSSI());
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

// ═══ Umum ══════════════════════════════════════════════════════════════════
void sambungWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  static bool siap = false;
  if (!siap) {
    WiFi.mode(WIFI_STA); WiFi.setSleep(false); WiFi.setAutoReconnect(true);
    for (const Jaringan& j : JARINGAN) wifiMulti.addAP(j.ssid, j.pass);
    siap = true;
  }
  esp_task_wdt_reset();
  if (wifiMulti.run(6000) == WL_CONNECTED) {      // memindai lalu menyambung ke jaringan terkuat yang dikenal
    Serial.printf("Wi-Fi: %s  rssi=%d  ip=%s\n", WiFi.SSID().c_str(), WiFi.RSSI(), WiFi.localIP().toString().c_str());
    serverIp = IPAddress(); gagalMqtt = 0;         // jaringan mungkin berganti → cari server lagi
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
  muatKalibrasiNvs();
  Serial.begin(115200);
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
  if (mqA.connected() && millis() - terakhirHB >= HEARTBEAT_MS) { terakhirHB = millis(); kirimStatusA(); }

  // sensor: hanya saat pompa diam (pembacaan memblokir ±0,5 dtk dan akan memperpanjang durasi pompa)
  if (!kerja.aktif && millis() - sTerakhir >= INTERVAL_MS) { sTerakhir = millis(); bacaDanKirimSensor(); }
  perbaruiLampuDanLcd();
  delay(20);
}
