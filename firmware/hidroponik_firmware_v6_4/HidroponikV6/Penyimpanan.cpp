#include "Penyimpanan.h"
#include <Preferences.h>
#include <string.h>
#include <math.h>

static const char *NS = "v6_status";

template <typename T>
static bool MuatBlob(const char *kunci, T *keluar)
{
  Preferences p;
  if (!p.begin(NS, true)) {
    return false;
  }
  bool ok = p.getBytesLength(kunci) == sizeof(T) && p.getBytes(kunci, keluar, sizeof(T)) == sizeof(T);
  p.end();
  return ok;
}

template <typename T>
static void SimpanBlob(const char *kunci, const T &isi)
{
  Preferences p;
  if (!p.begin(NS, false)) {
    return;
  }
  p.putBytes(kunci, &isi, sizeof(T));
  p.end();
}

void MuatSiklus(DataSiklus *d)
{
  memset(d, 0, sizeof(*d));
  if (!MuatBlob("siklus", d) || d->mode > MODE_PANEN || !isfinite(d->targetPpm) ||
      !isfinite(d->phMin) || !isfinite(d->phMax)) {
    memset(d, 0, sizeof(*d));
    d->mode = MODE_SIAP;
  }
}

void SimpanSiklus(const DataSiklus &d) { SimpanBlob("siklus", d); }

void MuatHarian(DataHarian *d)
{
  memset(d, 0, sizeof(*d));
  if (!MuatBlob("harian", d) || d->kunciIsi > KUNCI_ISI_TIMEOUT) {
    memset(d, 0, sizeof(*d));
  }
}

void SimpanHarian(const DataHarian &d) { SimpanBlob("harian", d); }

uint8_t MuatOtomasi(void)
{
  uint8_t m = OTO_SEMUA;
  if (!MuatBlob("otomasi", &m) || m > OTO_SEMUA) {
    return OTO_SEMUA;
  }
  return m;
}

void SimpanOtomasi(uint8_t m) { SimpanBlob("otomasi", m); }

bool MuatPpmPernahNaik(void)
{
  uint8_t v = 0;
  return MuatBlob("ppmnaik", &v) && v == 1;
}

void SimpanPpmPernahNaik(bool naik)
{
  uint8_t v = naik ? 1 : 0;
  SimpanBlob("ppmnaik", v);
}

bool MuatKunciNutrisi(void)
{
  uint8_t v = 0;
  return MuatBlob("kuncinut", &v) && v == 1;
}

void SimpanKunciNutrisi(bool kunci)
{
  uint8_t v = kunci ? 1 : 0;
  SimpanBlob("kuncinut", v);
}

uint64_t MuatOtaId(void)
{
  uint64_t id = 0;
  return MuatBlob("otaid", &id) ? id : 0;
}

void SimpanOtaId(uint64_t id) { SimpanBlob("otaid", id); }

void HapusOtaId(void)
{
  Preferences p;
  if (p.begin(NS, false)) {
    p.remove("otaid");
    p.end();
  }
}

void KosongkanSemuaFlash(void)
{
  /* semua data alat: parameter, status/siklus/harian/jurnal/id, kalibrasi, WiFi & server tambahan */
  static const char *const NAMA[] = { "v6_param", "v6_status", "kalibrasi_ph", "kalibrasi_ec", "garap_net" };
  for (const char *ns : NAMA) {
    Preferences p;
    if (p.begin(ns, false)) {
      p.clear();
      p.end();
    }
  }
}

bool MuatJurnal(DataJurnal *d)
{
  memset(d, 0, sizeof(*d));
  return MuatBlob("jurnal", d) && d->kegiatan != KEG_DIAM;
}

void SimpanJurnal(const DataJurnal &d) { SimpanBlob("jurnal", d); }

void HapusJurnal(void)
{
  Preferences p;
  if (p.begin(NS, false)) {
    p.remove("jurnal");
    p.end();
  }
}

/* ---- id perintah ---- */
struct CincinId {
  uint64_t id[16];
  uint8_t  pos;
};
static CincinId cincin;
static bool cincinDimuat = false;

static void PastikanCincin(void)
{
  if (cincinDimuat) {
    return;
  }
  memset(&cincin, 0, sizeof(cincin));
  if (!MuatBlob("idcincin", &cincin) || cincin.pos >= 16) {
    memset(&cincin, 0, sizeof(cincin));
  }
  cincinDimuat = true;
}

bool IdSudahDiterima(uint64_t id)
{
  PastikanCincin();
  for (int i = 0; i < 16; i++) {
    if (cincin.id[i] == id) {
      return true;
    }
  }
  return false;
}

void CatatIdDiterima(uint64_t id)
{
  PastikanCincin();
  cincin.id[cincin.pos] = id;
  cincin.pos = (uint8_t)((cincin.pos + 1) % 16);
  SimpanBlob("idcincin", cincin);
}
