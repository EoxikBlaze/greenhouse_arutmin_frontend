/*
 * GARAP — ESP32 GABUNGAN (sensor-01 + aktuator-01 dalam SATU papan)  v0.2  ⚠ BELUM DIUJI PADA PERANGKAT KERAS
 * Gabungan sensor/sensor.ino + aktuator/aktuator.ino. Papan ini membuka DUA sambungan MQTT ke broker Pi,
 * masing-masing dengan login & API key sendiri, supaya backend/ACL tetap memisahkan peran:
 *   sensor-01   : kirim garap/sensor-01/data (5 dtk) & status (30 dtk, retained, LWT)
 *   aktuator-01 : terima perintah/ack + detak server, kirim hasil & status (lihat aktuator.ino)
 * Library: ArduinoJson 7.x, PubSubClient 2.8, OneWire, DallasTemperature, DHT sensor library (Adafruit).
 * Board: "ESP32 Dev Module". Salin rahasia.h.contoh → rahasia.h dan isi (dua API key).
 *
 * Pin (tidak bentrok): sensor pH 34, TDS 35 (ADC1), DS18B20 4, DHT22 16 · pompa 25 26 27 32 33 23 ·
 * katup penampung 18 19 21 · tombol E-STOP 13.
 *
 * PERTAHANAN BERLAPIS aktuator (sama dengan aktuator.ino) + dua tambahan papan gabungan:
 *   - Sensor TIDAK dibaca selagi pompa jalan (pembacaan analog/DHT memblokir ±0,5 dtk → durasi pompa molor).
 *   - ML_PER_DETIK = 0 → setiap DOSIS/BILAS ditolak "belum_dikalibrasi" sampai diisi hasil gelas ukur.
 * WAJIB sebelum dipakai di tanaman: kalibrasi pH/TDS & laju pompa, uji dengan AIR dulu, pompa 12 V lewat
 * relay/MOSFET + dioda flyback. Jangan beri daya pompa dari pin ESP32.
 */
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>
#include <esp_task_wdt.h>
#include "rahasia.h"

#define FIRMWARE "gabungan-0.2"
#define KODE_S   "sensor-01"          // = user MQTT di Pi (deploy-pi/mosquitto/garap.acl)
#define KODE_A   "aktuator-01"
#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif

// ═══ SENSOR ════════════════════════════════════════════════════════════════
#define PIN_PH    34                  // ADC1 saja — ADC2 bentrok dengan WiFi
#define PIN_TDS   35
#define PIN_DS18  4
#define PIN_DHT   16
#define DHT_TIPE  DHT22
const uint32_t INTERVAL_MS = 5000;
// id_meja penampung yang diukur probe ini (menu Meja di web). 0 = bacaan tersimpan tapi TIDAK dipakai otomasi dosis.
const int ID_MEJA = 0;
// Kalibrasi (GANTI setelah kalibrasi nyata): tegangan saat buffer pH 7,00 & 4,01; faktor TDS dari larutan 1413 µS/cm
const float PH_V7 = 2.50f, PH_V4 = 3.05f, TDS_FAKTOR_KOREKSI = 1.0f;

// ═══ AKTUATOR ══════════════════════════════════════════════════════════════
const bool RELAY_AKTIF_LOW = true;    // true untuk modul relay aktif-rendah
enum Out { P_AB, P_PH_UP, P_PH_DOWN, P_BILAS, P_SAMPLING, P_ISI_AIR, JUMLAH_OUT };
const int PIN_OUT[JUMLAH_OUT]       = { 25, 26, 27, 32, 33, 23 };
const char* NAMA_OUT[JUMLAH_OUT]    = { "AB", "PH_UP", "PH_DOWN", "BILAS", "SAMPLING", "ISI_AIR" };
// Laju pompa HASIL KALIBRASI (mL/detik). 0 = belum dikalibrasi → perintah berbasis mL ditolak.
const float ML_PER_DETIK[JUMLAH_OUT] = { 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f };
// Batas durasi mutlak per output (ms) — lapis pengaman ketika perhitungan mL salah
const uint32_t MAKS_DURASI_MS[JUMLAH_OUT] = { 70000, 12000, 12000, 70000, 15000, 600000 };
// Penampung (id_meja di server) → pin katup solenoid. Penampung tak dikenal DITOLAK.
struct Katup { int idPenampung; int pin; };
const Katup KATUP[] = { { 1, 18 }, { 2, 19 }, { 3, 21 } };
const int N_KATUP = sizeof(KATUP) / sizeof(KATUP[0]);
const int PIN_TOMBOL_ESTOP = 13;      // tombol NC ke GND (putus = darurat). Pull-up internal.
const float MAKS_ML_AB_SUNTIK = 214.0f, MAKS_ML_PH_SUNTIK = 10.0f, MAKS_ML_BILAS = 500.0f;
const float MAKS_ML_AB_PER_JAM = 450.0f, MAKS_ML_PH_PER_JAM = 30.0f;
const uint32_t FAILSAFE_MS = 30000, HEARTBEAT_MS = 30000, COBA_MQTT_MS = 5000, ULANG_HASIL_MS = 3000;

// ── Status ──────────────────────────────────────────────────────────────────
OneWire oneWire(PIN_DS18);
DallasTemperature ds18(&oneWire);
DHT dht(PIN_DHT, DHT_TIPE);
WiFiClient wifiS, wifiA;
PubSubClient mqS(wifiS), mqA(wifiA);
uint32_t sTerakhir = 0, sTerakhirStatus = 0, sTerakhirCoba = 0;
bool estopLokal = false, estopServer = false;
uint32_t terakhirServerOk = 0, terakhirHB = 0, jamMulai = 0, terakhirCoba = 0;
const char* T_DATA     = "garap/" KODE_S "/data";
const char* T_STATUS_S = "garap/" KODE_S "/status";
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
struct Kerja { bool aktif = false; long id = 0; int out = -1; int pinKatup = -1; uint32_t mulai = 0, durasi = 0; float ml = 0; const char* tipe = ""; } kerja;

// ═══ Fungsi aktuator (sama dengan aktuator.ino; mqtt → mqA) ═════════════════
void tulis(int pin, bool hidup) { digitalWrite(pin, (hidup != RELAY_AKTIF_LOW) ? HIGH : LOW); }
void semuaMati() {
  for (int i = 0; i < JUMLAH_OUT; i++) tulis(PIN_OUT[i], false);
  for (int i = 0; i < N_KATUP; i++) tulis(KATUP[i].pin, false);
}
int cariKatup(int id) { for (int i = 0; i < N_KATUP; i++) if (KATUP[i].idPenampung == id) return KATUP[i].pin; return -1; }

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
  if (kerja.pinKatup >= 0) tulis(kerja.pinKatup, false);
  float dtk = (millis() - kerja.mulai) / 1000.0f;
  float mlNyata = ML_PER_DETIK[kerja.out] * dtk;
  if (kerja.out == P_AB) mlJamAB += mlNyata; else if (kerja.out == P_PH_UP || kerja.out == P_PH_DOWN) mlJamPH += mlNyata;
  lapor(kerja.id, status, alasan, mlNyata);
  kerja.aktif = false;
}

void daruratBerhenti(const char* alasan) { semuaMati(); berhentiKerja("gagal", alasan); }

// Mulai satu perintah. Mengembalikan false + alasan bila ditolak (dilaporkan 'gagal').
bool mulaiPerintah(long id, const char* tipe, JsonObjectConst p, const char*& alasan) {
  String t = tipe;
  if (estopLokal || estopServer) { alasan = "estop"; return false; }
  if (kerja.aktif)               { alasan = "sibuk"; return false; }
  int out = -1; float ml = 0; int penampung = p["penampung"] | 0; uint32_t durasi = 0; int pinKatup = -1;

  if (t == "DOSIS") {
    String l = p["larutan"] | ""; ml = p["ml"] | 0.0f;
    out = (l == "AB") ? P_AB : (l == "PH_UP") ? P_PH_UP : (l == "PH_DOWN") ? P_PH_DOWN : -1;
    if (out < 0 || !(ml > 0)) { alasan = "parameter"; return false; }
    float batas = (out == P_AB) ? MAKS_ML_AB_SUNTIK : MAKS_ML_PH_SUNTIK;
    if (ml > batas) { alasan = "melebihi_batas_suntik"; return false; }
    if (out == P_AB && mlJamAB + ml > MAKS_ML_AB_PER_JAM) { alasan = "batas_jam_ab"; return false; }
    if (out != P_AB && mlJamPH + ml > MAKS_ML_PH_PER_JAM) { alasan = "batas_jam_ph"; return false; }
  } else if (t == "BILAS") {
    out = P_BILAS; ml = p["ml"] | 100.0f;
    if (!(ml > 0) || ml > MAKS_ML_BILAS) { alasan = "melebihi_batas_bilas"; return false; }
  } else if (t == "SAMPLING") { out = P_SAMPLING; durasi = 10000; }
  else if (t == "ISI_AIR") {
    String aksi = p["aksi"] | "MULAI";
    if (aksi == "STOP") { tulis(PIN_OUT[P_ISI_AIR], false); lapor(id, "selesai", "isi_air_stop", 0); alasan = ""; return true; }
    out = P_ISI_AIR; durasi = MAKS_DURASI_MS[P_ISI_AIR];
  } else { alasan = "tipe_tak_dikenal"; return false; }

  pinKatup = cariKatup(penampung);
  if (t != "ISI_AIR" && pinKatup < 0) { alasan = "penampung_tak_dikenal"; return false; }
  if (durasi == 0) {
    if (ML_PER_DETIK[out] <= 0.01f) { alasan = "belum_dikalibrasi"; return false; }
    durasi = (uint32_t)(ml / ML_PER_DETIK[out] * 1000.0f);
  }
  if (durasi > MAKS_DURASI_MS[out]) { alasan = "melebihi_durasi_maks"; return false; }

  if (pinKatup >= 0) tulis(pinKatup, true);
  delay(150);                       // katup terbuka dulu, baru pompa
  tulis(PIN_OUT[out], true);
  kerja = { true, id, out, pinKatup, millis(), durasi, ml, "" };
  Serial.printf("MULAI #%ld %s %s %.1f mL (%lu ms)\n", id, tipe, NAMA_OUT[out], ml, (unsigned long)durasi);
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
  String b; serializeJson(d, b);
  mqA.publish(T_STATUS_A, b.c_str(), true);
}

void sambungMqttA() {
  if (mqA.connected() || WiFi.status() != WL_CONNECTED) return;
  if (terakhirCoba != 0 && millis() - terakhirCoba < COBA_MQTT_MS) return;
  terakhirCoba = millis();
  if (mqA.connect(KODE_A, KODE_A, API_KEY_AKTUATOR, T_STATUS_A, 1, true, "{\"online\":false}")) {
    mqA.subscribe(T_PERINTAH, 1); mqA.subscribe(T_ACK, 1); mqA.subscribe(T_SERVER, 1);
    kirimStatusA(); terakhirHB = millis();
    Serial.println("MQTT aktuator tersambung");
  } else {
    Serial.printf("MQTT aktuator gagal, kode=%d%s\n", mqA.state(), mqA.state() == 5 ? " (API_KEY_AKTUATOR ditolak broker)" : "");
  }
}

// ═══ Fungsi sensor (sama dengan sensor.ino; mqtt → mqS) ═════════════════════
float bacaVolt(int pin) {            // rata-rata 30 sampel, buang pencilan (median-ish)
  uint16_t s[30];
  for (int i = 0; i < 30; i++) { s[i] = analogRead(pin); delay(5); }
  for (int i = 1; i < 30; i++) for (int j = i; j > 0 && s[j] < s[j-1]; j--) { uint16_t t = s[j]; s[j] = s[j-1]; s[j-1] = t; }
  uint32_t sum = 0; for (int i = 8; i < 22; i++) sum += s[i];
  return (sum / 14.0f) * 3.3f / 4095.0f;
}
float hitungPH(float v) { float slope = (4.01f - 7.0f) / (PH_V4 - PH_V7); return 7.0f + slope * (v - PH_V7); }
float hitungTDS(float v, float suhu) {   // rumus umum modul TDS analog (kompensasi suhu 25 °C)
  float k = 1.0f + 0.02f * (suhu - 25.0f), vk = v / k;
  float tds = (133.42f * vk*vk*vk - 255.86f * vk*vk + 857.39f * vk) * 0.5f;
  return tds * TDS_FAKTOR_KOREKSI;
}

void kirimStatusS() {
  JsonDocument d;
  d["online"] = true; d["firmware"] = FIRMWARE; d["rssi"] = WiFi.RSSI(); d["uptime"] = millis() / 1000;
  String b; serializeJson(d, b);
  mqS.publish(T_STATUS_S, b.c_str(), true);
}

void sambungMqttS() {
  if (mqS.connected() || WiFi.status() != WL_CONNECTED) return;
  if (sTerakhirCoba != 0 && millis() - sTerakhirCoba < COBA_MQTT_MS) return;
  sTerakhirCoba = millis();
  if (mqS.connect(KODE_S, KODE_S, API_KEY_SENSOR, T_STATUS_S, 1, true, "{\"online\":false}")) {
    Serial.println("MQTT sensor tersambung");
    kirimStatusS(); sTerakhirStatus = millis();
  } else {
    Serial.printf("MQTT sensor gagal, kode=%d%s\n", mqS.state(), mqS.state() == 5 ? " (API_KEY_SENSOR ditolak broker)" : "");
  }
}

void bacaDanKirimSensor() {
  float suhuAir = ds18.getTempCByIndex(0);   // hasil konversi yang diminta putaran lalu (non-blok)
  ds18.requestTemperatures();                // minta konversi untuk putaran berikut
  float suhuUdara = dht.readTemperature(), lembap = dht.readHumidity();
  float ph = hitungPH(bacaVolt(PIN_PH));
  float tds = hitungTDS(bacaVolt(PIN_TDS), (suhuAir > -50 && suhuAir < 80) ? suhuAir : 25.0f);

  JsonDocument d;
  // Sensor yang gagal baca DIHILANGKAN (jangan kirim angka palsu)
  if (suhuAir > -50 && suhuAir < 80)       d["waterTemp"] = round(suhuAir * 10) / 10.0;
  if (!isnan(suhuUdara))                   d["airTemp"]   = round(suhuUdara * 10) / 10.0;
  if (!isnan(lembap))                      d["humidity"]  = round(lembap * 10) / 10.0;
  if (ph > 0 && ph < 14)                   d["ph"]        = round(ph * 100) / 100.0;
  if (tds >= 0 && tds < 5000)              d["tds"]       = round(tds);
  if (ID_MEJA > 0)                         d["id_meja"]   = ID_MEJA;
  d["rssi"] = WiFi.RSSI();
  d["firmware"] = FIRMWARE;

  bool ok = false;
  if (mqS.connected()) { String body; serializeJson(d, body); ok = mqS.publish(T_DATA, body.c_str()); }
  Serial.printf("[%lu] kirim=%s ph=%.2f tds=%.0f air=%.1f rssi=%d\n", millis()/1000, ok ? "OK" : "GAGAL", ph, tds, suhuAir, WiFi.RSSI());
}

// ═══ Umum ══════════════════════════════════════════════════════════════════
void sambungWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA); WiFi.setSleep(false); WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  for (int i = 0; i < 30 && WiFi.status() != WL_CONNECTED; i++) { delay(500); esp_task_wdt_reset(); }
}

void setup() {
  // Output OFF sebelum apa pun
  for (int i = 0; i < JUMLAH_OUT; i++) { tulis(PIN_OUT[i], false); pinMode(PIN_OUT[i], OUTPUT); tulis(PIN_OUT[i], false); }
  for (int i = 0; i < N_KATUP; i++)    { tulis(KATUP[i].pin, false); pinMode(KATUP[i].pin, OUTPUT); tulis(KATUP[i].pin, false); }
  pinMode(PIN_TOMBOL_ESTOP, INPUT_PULLUP);
  Serial.begin(115200);
  esp_task_wdt_config_t wdt = { .timeout_ms = 15000, .idle_core_mask = 0, .trigger_panic = true };
  esp_task_wdt_reconfigure(&wdt); esp_task_wdt_add(NULL);

  analogReadResolution(12);
  analogSetPinAttenuation(PIN_PH, ADC_11db);
  analogSetPinAttenuation(PIN_TDS, ADC_11db);
  ds18.begin(); ds18.setWaitForConversion(false); ds18.requestTemperatures();
  dht.begin();

  for (PubSubClient* m : { &mqS, &mqA }) {
    m->setServer(SERVER_IP, MQTT_PORT);
    m->setBufferSize(1024);
    m->setKeepAlive(15);
    m->setSocketTimeout(5);                         // connect() tak boleh menahan loop > watchdog
  }
  mqA.setCallback(pesanMasuk);
  sambungWifi();
  terakhirServerOk = 0; jamMulai = millis();        // belum ada detak server = belum boleh menjalankan apa pun
}

void loop() {
  esp_task_wdt_reset();
  if (digitalRead(PIN_TOMBOL_ESTOP) == HIGH) { if (!estopLokal) Serial.println("E-STOP fisik"); estopLokal = true; daruratBerhenti("tombol_estop"); }
  // jendela per jam
  if (millis() - jamMulai > 3600000UL) { jamMulai = millis(); mlJamAB = mlJamPH = 0; }
  // fail-safe: detak server hilang (juga saat MQTT/WiFi putus)
  if (terakhirServerOk == 0 || millis() - terakhirServerOk > FAILSAFE_MS) daruratBerhenti("server_hilang");
  // batas durasi pekerjaan berjalan
  if (kerja.aktif && millis() - kerja.mulai >= kerja.durasi) { semuaMati(); berhentiKerja("selesai", "ok"); }

  sambungWifi();
  sambungMqttA();
  esp_task_wdt_reset();
  sambungMqttS();
  mqA.loop();
  mqS.loop();
  ulangLaporan();
  // E-STOP fisik hanya lepas bila tombol dilepas DAN server sudah di-reset admin (estop=false)
  if (estopLokal && digitalRead(PIN_TOMBOL_ESTOP) == LOW && !estopServer
      && terakhirServerOk != 0 && millis() - terakhirServerOk < FAILSAFE_MS) { estopLokal = false; Serial.println("E-STOP dilepas"); }
  if (mqA.connected() && millis() - terakhirHB >= HEARTBEAT_MS) { terakhirHB = millis(); kirimStatusA(); }
  if (mqS.connected() && millis() - sTerakhirStatus >= HEARTBEAT_MS) { sTerakhirStatus = millis(); kirimStatusS(); }

  // sensor: hanya saat pompa diam (pembacaan memblokir ±0,5 dtk dan akan memperpanjang durasi pompa)
  if (!kerja.aktif && millis() - sTerakhir >= INTERVAL_MS) { sTerakhir = millis(); bacaDanKirimSensor(); }
  delay(20);
}
