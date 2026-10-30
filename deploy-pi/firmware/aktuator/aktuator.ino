/*
 * GARAP — ESP32 AKTUATOR (aktuator-01)  v0.2  ⚠ BELUM DIUJI PADA PERANGKAT KERAS
 * Lewat broker MQTT di Pi (user "aktuator-01", sandi = API_KEY):
 *   terima  garap/aktuator-01/perintah  {id,tipe,parameter}  → jalankan pompa/solenoid
 *   kirim   garap/aktuator-01/hasil     {id,status,hasil}    → DIULANG tiap 3 dtk sampai server membalas
 *   terima  garap/aktuator-01/ack       {id}                    (laporan hilang ≠ dosis "tak terjadi")
 *   terima  garap/server/status         {online,estop}          detak server tiap 5 dtk → fail-safe & e-stop
 *   kirim   garap/aktuator-01/status    heartbeat 30 dtk, retained; LWT {"online":false}
 * Library: ArduinoJson 7.x, PubSubClient 2.8.
 *
 * PERTAHANAN BERLAPIS — server sudah membatasi, tetapi firmware TIDAK percaya server begitu saja:
 *   1. Batas mL per suntikan (AB / pH) dan batas durasi mutlak per output  → hardcode di bawah
 *   2. Batas total mL per jam (dihitung lokal, bertahan sampai reboot)
 *   3. Satu pekerjaan pada satu waktu; perintah baru ditolak selagi pompa jalan
 *   4. Detak server tak datang > FAILSAFE_MS, atau server mengumumkan offline → SEMUA output mati (fail-safe)
 *   5. E-STOP: dari server (flag estop), perintah STOP_DARURAT, atau tombol fisik → output mati & terkunci
 *   6. Watchdog perangkat keras: bila loop macet, ESP32 reset dan output kembali OFF
 *   7. Saat boot semua output OFF lebih dulu sebelum WiFi dinyalakan
 *
 * WAJIB sebelum dipakai di tanaman: kalibrasi ML_PER_DETIK tiap pompa dengan gelas ukur, uji dengan AIR dulu,
 * dan pasang relay/driver yang aman (pompa 12 V lewat MOSFET/relay + dioda flyback). Jangan beri daya pompa dari pin ESP32.
 */
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>
#include "rahasia.h"

#define FIRMWARE "aktuator-0.2"
#define KODE     "aktuator-01"        // = user MQTT di Pi (deploy-pi/mosquitto/garap.acl)
#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif

// ── Output (ganti sesuai wiring). RELAY_AKTIF_LOW=true untuk modul relay aktif-rendah ──
const bool RELAY_AKTIF_LOW = true;
enum Out { P_AB, P_PH_UP, P_PH_DOWN, P_BILAS, P_SAMPLING, P_ISI_AIR, JUMLAH_OUT };
const int PIN_OUT[JUMLAH_OUT]       = { 25, 26, 27, 32, 33, 23 };
const char* NAMA_OUT[JUMLAH_OUT]    = { "AB", "PH_UP", "PH_DOWN", "BILAS", "SAMPLING", "ISI_AIR" };
// Laju pompa HASIL KALIBRASI (mL/detik) — isi nyata! (nilai di bawah hanya tempat-pegang)
const float ML_PER_DETIK[JUMLAH_OUT] = { 3.5f, 1.0f, 1.0f, 8.0f, 0.0f, 0.0f };
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
bool estopLokal = false, estopServer = false;
uint32_t terakhirServerOk = 0, terakhirHB = 0, jamMulai = 0, terakhirCoba = 0;
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
const char* T_PERINTAH = "garap/" KODE "/perintah";
const char* T_ACK      = "garap/" KODE "/ack";
const char* T_HASIL    = "garap/" KODE "/hasil";
const char* T_STATUS   = "garap/" KODE "/status";
const char* T_SERVER   = "garap/server/status";

// Laporan hasil yang belum di-ack server — dikirim ulang sampai ack (maks 8 antre).
struct Laporan { long id = 0; String isi; uint32_t terakhir = 0; };
Laporan antreLapor[8];
// id perintah yang sudah diterima (QoS 1 bisa mengirim duplikat) — jangan jalankan dua kali
long idTerakhir[16]; int idPos = 0;
float mlJamAB = 0, mlJamPH = 0;

struct Kerja { bool aktif = false; long id = 0; int out = -1; int pinKatup = -1; uint32_t mulai = 0, durasi = 0; float ml = 0; const char* tipe = ""; } kerja;

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
  if (mqtt.connected()) mqtt.publish(T_HASIL, b.c_str());
}

void ulangLaporan() {
  if (!mqtt.connected()) return;
  for (int i = 0; i < 8; i++) {
    if (antreLapor[i].id != 0 && millis() - antreLapor[i].terakhir >= ULANG_HASIL_MS) {
      antreLapor[i].terakhir = millis();
      mqtt.publish(T_HASIL, antreLapor[i].isi.c_str());
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

void kirimStatus() {
  JsonDocument d; d["online"] = true; d["firmware"] = FIRMWARE; d["rssi"] = WiFi.RSSI(); d["uptime"] = millis() / 1000;
  d["estop"] = (estopLokal || estopServer);
  String b; serializeJson(d, b);
  mqtt.publish(T_STATUS, b.c_str(), true);
}

void sambungMqtt() {
  if (mqtt.connected() || WiFi.status() != WL_CONNECTED) return;
  if (terakhirCoba != 0 && millis() - terakhirCoba < COBA_MQTT_MS) return;
  terakhirCoba = millis();
  if (mqtt.connect(KODE, KODE, API_KEY, T_STATUS, 1, true, "{\"online\":false}")) {
    mqtt.subscribe(T_PERINTAH, 1); mqtt.subscribe(T_ACK, 1); mqtt.subscribe(T_SERVER, 1);
    kirimStatus(); terakhirHB = millis();
    Serial.println("MQTT tersambung");
  } else {
    Serial.printf("MQTT gagal, kode=%d%s\n", mqtt.state(), mqtt.state() == 5 ? " (API_KEY ditolak broker)" : "");
  }
}

void sambungWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA); WiFi.setSleep(false); WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  for (int i = 0; i < 30 && WiFi.status() != WL_CONNECTED; i++) { delay(500); esp_task_wdt_reset(); }
}


void setup() {
  // 7. Output OFF sebelum apa pun
  for (int i = 0; i < JUMLAH_OUT; i++) { tulis(PIN_OUT[i], false); pinMode(PIN_OUT[i], OUTPUT); tulis(PIN_OUT[i], false); }
  for (int i = 0; i < N_KATUP; i++)    { tulis(KATUP[i].pin, false); pinMode(KATUP[i].pin, OUTPUT); tulis(KATUP[i].pin, false); }
  pinMode(PIN_TOMBOL_ESTOP, INPUT_PULLUP);
  Serial.begin(115200);
  esp_task_wdt_config_t wdt = { .timeout_ms = 15000, .idle_core_mask = 0, .trigger_panic = true };
  esp_task_wdt_reconfigure(&wdt); esp_task_wdt_add(NULL);
  mqtt.setServer(SERVER_IP, MQTT_PORT);
  mqtt.setCallback(pesanMasuk);
  mqtt.setBufferSize(1024);
  mqtt.setKeepAlive(15);
  mqtt.setSocketTimeout(5);                         // connect() tak boleh menahan loop > watchdog
  sambungWifi();
  terakhirServerOk = 0; jamMulai = millis();        // belum ada detak server = belum boleh menjalankan apa pun
}

void loop() {
  esp_task_wdt_reset();
  if (digitalRead(PIN_TOMBOL_ESTOP) == HIGH) { if (!estopLokal) Serial.println("E-STOP fisik"); estopLokal = true; daruratBerhenti("tombol_estop"); }
  // 2. jendela per jam
  if (millis() - jamMulai > 3600000UL) { jamMulai = millis(); mlJamAB = mlJamPH = 0; }
  // 4. fail-safe: detak server hilang (juga saat MQTT/WiFi putus)
  if (terakhirServerOk == 0 || millis() - terakhirServerOk > FAILSAFE_MS) daruratBerhenti("server_hilang");
  // batas durasi pekerjaan berjalan
  if (kerja.aktif && millis() - kerja.mulai >= kerja.durasi) { semuaMati(); berhentiKerja("selesai", "ok"); }

  sambungWifi();
  sambungMqtt();
  mqtt.loop();
  ulangLaporan();
  // E-STOP fisik hanya lepas bila tombol dilepas DAN server sudah di-reset admin (estop=false)
  if (estopLokal && digitalRead(PIN_TOMBOL_ESTOP) == LOW && !estopServer
      && terakhirServerOk != 0 && millis() - terakhirServerOk < FAILSAFE_MS) { estopLokal = false; Serial.println("E-STOP dilepas"); }
  if (mqtt.connected() && millis() - terakhirHB >= HEARTBEAT_MS) { terakhirHB = millis(); kirimStatus(); }
  delay(20);
}
