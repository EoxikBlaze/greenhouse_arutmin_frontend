/* ============================================================================
 *  Aktuator — 5 relay, 3 lampu pilot, tombol RESET, sensor E-STOP.
 *  Pengaman (lapis di bawah logika Kontrol):
 *   - semua relay OFF sebelum pin dijadikan output
 *   - hanya SATU beban menyala sekaligus
 *   - E-STOP (fisik atau server) memaksa semua OFF dan menolak penyalaan
 *   - pompa dosing > 10 mnt / pompa isi > 45 mnt tanpa putus dipaksa mati
 * ========================================================================== */
#pragma once
#include <Arduino.h>
#include "Tipe.h"

void InisialisasiAktuator(void);   /* PANGGIL PALING AWAL di setup() */
void PerbaruiAktuator(void);       /* tiap loop */

bool NyalakanBeban(Beban b, const char **alasan);
void MatikanBeban(Beban b);
void MatikanSemuaBeban(void);
bool BebanMenyala(Beban b);
bool AdaBebanMenyala(void);
void MatikanDaruratRaw(void);      /* aman dari task lain: hanya tulis pin OFF */

bool EstopFisikDitekan(void);      /* status stabil tombol jamur (bus 12 V aktuator mati) */
bool EstopAktif(void);             /* fisik ATAU server */
void TetapkanEstopServer(bool aktif);
uint32_t TeganganEstopMv(void);

/* Kejadian tombol RESET (sekali baca = hilang) */
bool AmbilTekanSingkatReset(void); /* dilepas sebelum 5 dtk */
bool AmbilTahanLamaReset(void);    /* ditahan >= 5 dtk */
bool ResetSedangDitekan(void);

bool AmbilPompaKelamaan(Beban *b); /* beban dipaksa mati karena batas waktu */

void TetapkanLampu(PolaLampu pola);
