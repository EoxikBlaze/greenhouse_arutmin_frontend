/* ============================================================================
 *  Parameter — nilai yang diatur dari web (perintah KONFIGURASI / KALIBRASI)
 *  atau serial ("set <nama> <nilai>"), disimpan permanen di flash (NVS).
 *  Nilai WAJIB bawaannya 0 = "belum diisi": dosing tidak akan jalan sebelum diisi.
 * ========================================================================== */
#pragma once
#include <Arduino.h>

struct ParameterAlat {
  /* --- wajib (dari web) --- */
  float volumeL;            /* volume tandon/penampung (L) */
  float monitoringMenit;    /* jeda antar tindakan (menit) */
  float jedaAbDtk;          /* jeda pompa A -> B (detik) */
  float ppmPerMlAb;         /* uji lab: kenaikan ppm per (1 mL A + 1 mL B) per liter */
  float lajuA, lajuB, lajuPhUp, lajuPhDown;   /* hasil kalibrasi pompa (mL/detik) */
  /* --- aturan dosing (bawaan disepakati, boleh diubah) --- */
  float toleransiBawahPpm;  /* dosing AB bila ppm < target - ini */
  float toleransiAtasPpm;   /* encerkan bila ppm > target + ini */
  float persenDosis;        /* % dari kekurangan yang diberikan sekali dosing */
  float maksPpmSekali;      /* kenaikan maksimal per dosing */
  float ppmMinDosing;       /* ppm di bawah ini = curiga probe terangkat -> tidak dosing (0 = matikan cek) */
  float phToleransi;        /* pH dosing bila di luar rentang +/- ini */
  float phJedaMenit;        /* jeda minimal antar dosing pH */
  float phMlPer100L;        /* takaran pH up/down per 100 L sekali dosing */
  float phMlMaks;           /* batas mL pH sekali dosing */
  float maksAbHari, maksPhHari, maksEncerHari, maksIsiHari;
  float timeoutIsiMenit;    /* pompa isi lebih lama dari ini = dikunci (curiga sumber habis/float rusak) */
  float pemeliharaanMaksMenit;
  float telemetriDtk;
  float tzMenit;            /* zona waktu (WITA = 480) */
  float idMeja;             /* id penampung di web (0 = pakai ID_MEJA rahasia.h) */
  float ecFaktor;           /* koreksi EC (tds_faktor dari web), bawaan 1 */
};

int         JumlahParameter(void);
const char *NamaParameter(int i);
int         CariIndeksParameter(const char *nama);
bool        ParameterWajib(int i);
float       AmbilNilaiParameter(const ParameterAlat &p, int i);
/* false + alasan bila di luar rentang */
bool        AturNilaiParameter(ParameterAlat &p, int i, float nilai, char *alasan, size_t n);
void        ParameterBawaan(ParameterAlat &p);
void        MuatParameter(ParameterAlat &p);
bool        SimpanParameter(const ParameterAlat &p);
