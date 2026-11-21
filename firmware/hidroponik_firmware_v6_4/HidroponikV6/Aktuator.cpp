#include "Aktuator.h"
#include "Config.h"

static const int PIN_BEBAN[JUMLAH_BEBAN] = {
  PIN_RELAY_POMPA_A, PIN_RELAY_POMPA_B, PIN_RELAY_PH_UP, PIN_RELAY_PH_DOWN, PIN_RELAY_ISI
};

static bool     menyala[JUMLAH_BEBAN];
static uint32_t tNyala[JUMLAH_BEBAN];

static inline int NilaiPin(bool hidup)
{
  return hidup ? TINGKAT_RELAY_NYALA : (TINGKAT_RELAY_NYALA == HIGH ? LOW : HIGH);
}

/* E-STOP */
static bool     estopFisik = false, estopMentah = false;
static uint32_t estopUbah = 0;
static volatile bool estopServer = false;
static uint32_t mvEstop = 0;

/* RESET */
static bool     resetStabil = false, resetMentah = false;
static uint32_t resetUbah = 0, resetMulaiTekan = 0;
static bool     evSingkat = false, evLama = false, lamaSudah = false;

/* Batas waktu pompa */
static bool  evKelamaan = false;
static Beban kelamaanBeban = BEBAN_POMPA_A;

static PolaLampu pola = LAMPU_MATI;

void TetapkanEstopServer(bool aktif) { estopServer = aktif; }
bool EstopFisikDitekan(void) { return estopFisik; }
bool EstopAktif(void) { return estopFisik || estopServer; }
uint32_t TeganganEstopMv(void) { return mvEstop; }

static bool BacaEstopMentah(void)
{
#if BACA_ESTOP
  mvEstop = analogReadMilliVolts(PIN_STATUS_ESTOP);
  return mvEstop < AMBANG_ESTOP_MV;
#else
  mvEstop = 0;
  return false;
#endif
}

void MatikanDaruratRaw(void)
{
  for (int i = 0; i < JUMLAH_BEBAN; i++) {
    digitalWrite(PIN_BEBAN[i], NilaiPin(false));
  }
}

void InisialisasiAktuator(void)
{
  for (int i = 0; i < JUMLAH_BEBAN; i++) {
    digitalWrite(PIN_BEBAN[i], NilaiPin(false));   /* nilai MATI dulu, baru output */
    pinMode(PIN_BEBAN[i], OUTPUT);
    digitalWrite(PIN_BEBAN[i], NilaiPin(false));
    menyala[i] = false;
    tNyala[i] = 0;
  }
  const int lampu[3] = { PIN_LAMPU_BIRU, PIN_LAMPU_KUNING, PIN_LAMPU_MERAH };
  for (int i = 0; i < 3; i++) {
    digitalWrite(lampu[i], LOW);
    pinMode(lampu[i], OUTPUT);
    digitalWrite(lampu[i], LOW);
  }
  pinMode(PIN_STATUS_ESTOP, INPUT);
  analogSetPinAttenuation(PIN_STATUS_ESTOP, ADC_11db);
  pinMode(PIN_TOMBOL_RESET, INPUT_PULLUP);

  estopMentah = estopFisik = BacaEstopMentah();   /* E-STOP saat boot langsung berlaku */
  estopUbah = millis();
  resetMentah = resetStabil = (digitalRead(PIN_TOMBOL_RESET) == LOW);
  resetUbah = millis();
  lamaSudah = resetStabil;   /* tombol tertahan saat boot tidak dihitung */
}

static const char *CekInterlock(Beban b)
{
  if (EstopAktif()) {
    return "estop";
  }
  for (int i = 0; i < JUMLAH_BEBAN; i++) {
    if (i != (int)b && menyala[i]) {
      return "beban_lain_menyala";
    }
  }
  return NULL;
}

bool NyalakanBeban(Beban b, const char **alasan)
{
  if ((int)b >= JUMLAH_BEBAN) {
    if (alasan) { *alasan = "beban_tidak_dikenal"; }
    return false;
  }
  if (menyala[b]) {
    return true;
  }
  const char *a = CekInterlock(b);
  if (a != NULL) {
    if (alasan) { *alasan = a; }
    return false;
  }
  digitalWrite(PIN_BEBAN[b], NilaiPin(true));
  menyala[b] = true;
  tNyala[b] = millis();
  return true;
}

void MatikanBeban(Beban b)
{
  if ((int)b >= JUMLAH_BEBAN) {
    return;
  }
  digitalWrite(PIN_BEBAN[b], NilaiPin(false));
  menyala[b] = false;
}

void MatikanSemuaBeban(void)
{
  for (int i = 0; i < JUMLAH_BEBAN; i++) {
    MatikanBeban((Beban)i);
  }
}

bool BebanMenyala(Beban b) { return ((int)b < JUMLAH_BEBAN) && menyala[b]; }

bool AdaBebanMenyala(void)
{
  for (int i = 0; i < JUMLAH_BEBAN; i++) {
    if (menyala[i]) {
      return true;
    }
  }
  return false;
}

bool AmbilTekanSingkatReset(void) { bool v = evSingkat; evSingkat = false; return v; }
bool AmbilTahanLamaReset(void)    { bool v = evLama;    evLama = false;    return v; }
bool ResetSedangDitekan(void)     { return resetStabil; }

bool AmbilPompaKelamaan(Beban *b)
{
  if (!evKelamaan) {
    return false;
  }
  evKelamaan = false;
  if (b) { *b = kelamaanBeban; }
  return true;
}

void TetapkanLampu(PolaLampu p) { pola = p; }

static void TulisLampu(bool biru, bool kuning, bool merah)
{
  digitalWrite(PIN_LAMPU_BIRU,   biru   ? HIGH : LOW);
  digitalWrite(PIN_LAMPU_KUNING, kuning ? HIGH : LOW);
  digitalWrite(PIN_LAMPU_MERAH,  merah  ? HIGH : LOW);
}

static void PerbaruiLampu(uint32_t now)
{
  bool cepat  = ((now / 250UL) % 2UL) == 0;   /* 0,5 dtk sekali siklus */
  bool lambat = ((now / 750UL) % 2UL) == 0;   /* 1,5 dtk */
  bool sedang = ((now / 500UL) % 2UL) == 0;   /* 1 dtk */
  switch (pola) {
    case LAMPU_BIRU:              TulisLampu(true, false, false); break;
    case LAMPU_BIRU_KEDIP_CEPAT:  TulisLampu(cepat, false, false); break;
    case LAMPU_BIRU_KEDIP_LAMBAT: TulisLampu(lambat, false, false); break;
    case LAMPU_KUNING:            TulisLampu(false, true, false); break;
    case LAMPU_KUNING_KEDIP:      TulisLampu(false, sedang, false); break;
    case LAMPU_MERAH:             TulisLampu(false, false, true); break;
    case LAMPU_MERAH_KEDIP:       TulisLampu(false, false, sedang); break;
    default:                      TulisLampu(false, false, false); break;
  }
}

void PerbaruiAktuator(void)
{
  uint32_t now = millis();

  /* E-STOP fisik (debounce 30 ms) */
  bool e = BacaEstopMentah();
  if (e != estopMentah) {
    estopMentah = e;
    estopUbah = now;
  }
  if (estopMentah != estopFisik && (uint32_t)(now - estopUbah) >= DEBOUNCE_ESTOP_MS) {
    estopFisik = estopMentah;
  }
  if (EstopAktif() && AdaBebanMenyala()) {
    MatikanSemuaBeban();      /* lapis pertahanan: selama E-STOP tidak ada yang boleh menyala */
  }

  /* RESET: tekan singkat / tahan 5 dtk */
  bool r = (digitalRead(PIN_TOMBOL_RESET) == LOW);
  if (r != resetMentah) {
    resetMentah = r;
    resetUbah = now;
  }
  if (resetMentah != resetStabil && (uint32_t)(now - resetUbah) >= DEBOUNCE_TOMBOL_MS) {
    resetStabil = resetMentah;
    if (resetStabil) {
      resetMulaiTekan = now;
    } else {
      if (!lamaSudah) {
        evSingkat = true;
      }
      lamaSudah = false;
    }
  }
  if (resetStabil && !lamaSudah && (uint32_t)(now - resetMulaiTekan) >= TAHAN_RESET_PEMELIHARAAN_MS) {
    lamaSudah = true;
    evLama = true;
  }

  /* Batas waktu nyala tanpa putus */
  for (int i = 0; i < JUMLAH_BEBAN; i++) {
    if (!menyala[i]) {
      continue;
    }
    uint32_t batas = (i == (int)BEBAN_ISI) ? MAKS_POMPA_ISI_MS : MAKS_POMPA_DOSING_MS;
    if ((uint32_t)(now - tNyala[i]) > batas) {
      MatikanBeban((Beban)i);
      evKelamaan = true;
      kelamaanBeban = (Beban)i;
    }
  }

  PerbaruiLampu(now);
}
