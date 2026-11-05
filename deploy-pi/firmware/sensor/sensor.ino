/*
 * GARAP — ESP32 SENSOR (sensor-01)  v0.2  ⚠ BELUM DIUJI PADA PERANGKAT KERAS
 * Membaca pH, TDS/EC, suhu air (DS18B20), suhu & kelembapan udara (DHT22),
 * lalu terbit ke broker MQTT di Pi tiap 5 detik:  garap/sensor-01/data  (JSON)
 * Login MQTT: user = KODE ("sensor-01"), sandi = API_KEY perangkat. Status online/offline di
 * garap/sensor-01/status (retained; broker menerbitkan {"online":false} bila ESP32 mati — LWT).
 * Setiap bacaan ditandai ID_MEJA (penampung asal) — otomasi dosis di server HANYA memakai bacaan
 * yang bertanda penampungnya sendiri. Satu ESP32 = satu set probe = satu penampung (isi ID_MEJA di bawah).
 *
 * Library (Library Manager): ArduinoJson 7.x, PubSubClient 2.8 (Nick O'Leary), OneWire, DallasTemperature,
 * DHT sensor library (Adafruit)
 * Board: "ESP32 Dev Module". Salin rahasia.h.contoh → rahasia.h dan isi.
 *
 * KALIBRASI WAJIB sebelum dipercaya (nilai di bawah hanya tempat-pegang):
 *   pH  : celup larutan buffer pH 7,00 & 4,01 → isi PH_V7 dan PH_V4 (tegangan, volt)
 *   TDS : larutan standar 1413 µS/cm → sesuaikan TDS_FAKTOR_KOREKSI
 * Server MENOLAK nilai di luar rentang wajar (otomasi dosis tidak bertindak bila data basi/aneh),
 * tetapi sensor yang salah kalibrasi tetap bisa mengirim angka "masuk akal" yang salah.
 */
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>
#include "rahasia.h"

// ── Pin (ADC1 saja — ADC2 bentrok dengan WiFi) ──────────────────────────────
#define PIN_PH    34
#define PIN_TDS   35
#define PIN_DS18  4
#define PIN_DHT   16
#define DHT_TIPE  DHT22
#define FIRMWARE  "sensor-0.2"
#define KODE      "sensor-01"         // = user MQTT di Pi (deploy-pi/mosquitto/garap.acl)
#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif
const uint32_t INTERVAL_MS = 5000, STATUS_MS = 30000, COBA_MQTT_MS = 5000;
// id_meja penampung yang diukur probe ini (lihat menu Meja di web). 0 = tidak dikirim → bacaan
// tetap tersimpan tetapi TIDAK PERNAH dipakai otomasi dosis.
const int ID_MEJA = 0;

// ── Kalibrasi (GANTI setelah kalibrasi nyata) ───────────────────────────────
const float PH_V7 = 2.50f;            // tegangan saat pH 7,00
const float PH_V4 = 3.05f;            // tegangan saat pH 4,01
const float TDS_FAKTOR_KOREKSI = 1.0f;

OneWire oneWire(PIN_DS18);
DallasTemperature ds18(&oneWire);
DHT dht(PIN_DHT, DHT_TIPE);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
uint32_t terakhir = 0, terakhirStatus = 0, terakhirCoba = 0;
const char* T_DATA   = "garap/" KODE "/data";
const char* T_STATUS = "garap/" KODE "/status";

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

void sambungWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA); WiFi.setSleep(false); WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) delay(500);
}

void kirimStatus() {
  JsonDocument d;
  d["online"] = true; d["firmware"] = FIRMWARE; d["rssi"] = WiFi.RSSI(); d["uptime"] = millis() / 1000;
  String b; serializeJson(d, b);
  mqtt.publish(T_STATUS, b.c_str(), true);
}

// Sambung ke broker tanpa memblokir lama (dicoba ulang tiap 5 dtk). LWT: broker menandai offline bila putus.
void sambungMqtt() {
  if (mqtt.connected() || WiFi.status() != WL_CONNECTED) return;
  if (millis() - terakhirCoba < COBA_MQTT_MS && terakhirCoba != 0) return;
  terakhirCoba = millis();
  if (mqtt.connect(KODE, KODE, API_KEY, T_STATUS, 1, true, "{\"online\":false}")) {
    Serial.println("MQTT tersambung");
    kirimStatus(); terakhirStatus = millis();
  } else {
    // 5 = ditolak: sandi (API_KEY) salah/diputar, atau user belum dibuat di broker
    Serial.printf("MQTT gagal, kode=%d%s\n", mqtt.state(), mqtt.state() == 5 ? " (API_KEY ditolak broker)" : "");
  }
}

bool kirim(const JsonDocument& doc) {
  if (!mqtt.connected()) return false;
  String body; serializeJson(doc, body);
  return mqtt.publish(T_DATA, body.c_str());
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_PH, ADC_11db);
  analogSetPinAttenuation(PIN_TDS, ADC_11db);
  ds18.begin(); dht.begin();
  mqtt.setServer(SERVER_IP, MQTT_PORT);
  mqtt.setBufferSize(1024);
  mqtt.setKeepAlive(15);
  sambungWifi();
}

void loop() {
  sambungWifi();
  sambungMqtt();
  mqtt.loop();
  if (mqtt.connected() && millis() - terakhirStatus >= STATUS_MS) { terakhirStatus = millis(); kirimStatus(); }
  if (millis() - terakhir < INTERVAL_MS) { delay(50); return; }
  terakhir = millis();

  ds18.requestTemperatures();
  float suhuAir = ds18.getTempCByIndex(0);
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

  bool ok = kirim(d);
  Serial.printf("[%lu] kirim=%s ph=%.2f tds=%.0f air=%.1f rssi=%d\n", millis()/1000, ok ? "OK" : "GAGAL", ph, tds, suhuAir, WiFi.RSSI());
}
