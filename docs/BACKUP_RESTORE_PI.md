# BACKUP & RESTORE — Panduan Peresmian (Pi & Mac)

Panduan ini untuk orang awam: ikuti urutannya, salin-tempel perintahnya.
Tujuannya satu: **sebelum dan sesudah peresmian, data Vertonik harus bisa
dikembalikan dalam hitungan menit.**

Ringkasan satu baris:

```bash
# backup (Mac maupun Pi)
cd backend-nodejs && ./scripts/backup-pi.sh

# cek file backup valid
./scripts/backup-pi.sh --check database/backup/vertonik-20261021-0547.sql

# kembalikan data (tanya dulu; -y untuk non-interaktif/cron)
./scripts/backup-pi.sh --restore database/backup/vertonik-20261021-0547.sql
```

Skrip `backend-nodejs/scripts/backup-pi.sh` menyimpan:
- dump database → `backend-nodejs/database/backup/vertonik-YYYYMMDD-HHMM.sql`
- salinan `.env` → `backend-nodejs/database/backup/env-YYYYMMDD-HHMM.bak` (izin `600`)
- otomatis membuang file lama, hanya **7 terakhir** yang disimpan.

> Password database **tidak pernah** ditulis di skrip. Semua perintah di bawah
> membaca `DATABASE_URL` dari file `.env` — jadi jangan copy-paste password
> ke terminal atau ke chat.

---

## 1. Backup database — command siap salin

### A. Di Raspberry Pi (server jalan)

```bash
# 1) baca URL database dari .env (password tidak tampil di layar)
cd /opt/vertonik/backend
DBURL=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)

# 2) dump ke folder backup (buat foldernya dulu bila belum ada)
mkdir -p ~/backup-vertonik
pg_dump --no-owner --no-privileges "$DBURL" \
  > ~/backup-vertonik/vertonik-$(date +%Y%m%d-%H%M).sql

# 3) pastikan file tidak kosong dan benar-benar dump SQL
head -n 3 ~/backup-vertonik/vertonik-*.sql | tail -n 3
ls -lh ~/backup-vertonik/
```

Kalau `pg_dump: command not found` di Pi, pakai path ini:

```bash
sudo -u postgres pg_dump --no-owner --no-privileges vertonik_smartfarm \
  > ~/backup-vertonik/vertonik-$(date +%Y%m%d-%H%M).sql
```

Cara paling praktis di Pi (sudah termasuk salinan `.env` + rotasi 7 file):

```bash
cd /opt/vertonik/backend
./scripts/backup-pi.sh --dir ~/backup-vertonik
```

### B. Di Mac (development / cadangan lokal)

```bash
cd ~/Project/Vertoniksmartfarm/backend-nodejs
DBURL=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)

/opt/homebrew/opt/postgresql@17/bin/pg_dump --no-owner --no-privileges "$DBURL" \
  > database/backup/vertonik-$(date +%Y%m%d-%H%M).sql

./scripts/backup-pi.sh --check database/backup/vertonik-$(date +%Y%m%d-%H%M).sql
```

> Catatan: `database/backup/` sudah masuk `.gitignore` — file dump dan salinan
> `.env` tidak akan pernah ikut ter-commit.

---

## 2. Restore (mengembalikan data)

### A. Cara cepat — pakai skrip (disarankan)

```bash
cd backend-nodejs
./scripts/backup-pi.sh --check  /path/ke/vertonik-20261021-0547.sql   # 1) validasi
./scripts/backup-pi.sh --restore /path/ke/vertonik-20261021-0547.sql   # 2) konfirmasi 'ya'
./scripts/backup-pi.sh --restore /path/ke/vertonik-...sql -y           #    versi non-interaktif
```

Yang dilakukan skrip: cek header dump → (setelah konfirmasi) kosongkan schema
`public` → impor dump → jalankan `scripts/fix-sequences.sql` → verifikasi jumlah
tabel/pengguna. **Semua data saat ini akan diganti** oleh isi dump.

### B. Cara manual — createdb + psql (untuk database baru / pindah mesin)

Di **Pi** (database kosong/belum ada):

```bash
DBURL=$(grep -E '^DATABASE_URL=' /opt/vertonik/backend/.env | cut -d= -f2-)
DBUSER=$(echo "$DBURL" | sed -E 's#.*://([^:]+):.*#\1#')
DBPASS=$(echo "$DBURL" | sed -E 's#.*://[^:]+:([^@]+)@.*#\1#')
DBNAME=$(echo "$DBURL" | sed -E 's#.*/([^/?]+).*#\1#')

# buat role + database (sekali saja, bila belum ada)
sudo -u postgres psql -c "CREATE USER \"$DBUSER\" WITH PASSWORD '$DBPASS';"  # bila belum ada
sudo -u postgres createdb -O "$DBUSER" "$DBNAME"                             # bila belum ada

# import dump (password diambil dari variabel, tidak diketik manual)
PGPASSWORD="$DBPASS" psql -h 127.0.0.1 -U "$DBUSER" -d "$DBNAME" \
  -v ON_ERROR_STOP=1 -f /path/ke/vertonik-20261021-0547.sql

# WAJIB terakhir: samakan sequence dengan max(id)
PGPASSWORD="$DBPASS" psql -h 127.0.0.1 -U "$DBUSER" -d "$DBNAME" \
  -v ON_ERROR_STOP=1 -f /opt/vertonik/backend/scripts/fix-sequences.sql
```

Di **Mac**:

```bash
cd ~/Project/Vertoniksmartfarm/backend-nodejs
DBURL=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)

# kalau perlu database baru:
/opt/homebrew/opt/postgresql@17/bin/createdb vertonik_smartfarm_backup

# import
/opt/homebrew/opt/postgresql@17/bin/psql "$DBURL" -v ON_ERROR_STOP=1 \
  -f database/backup/vertonik-20261021-0547.sql

# WAJIB terakhir: samakan sequence dengan max(id)
/opt/homebrew/opt/postgresql@17/bin/psql "$DBURL" -v ON_ERROR_STOP=1 \
  -f scripts/fix-sequences.sql
```

Kalau ragu, pakai skrip restore bawaan repo yang sudah termigrasi +
fix-sequences otomatis:

```bash
cd backend-nodejs && scripts/restore.sh database/backup/vertonik-20261021-0547.sql
```

**Kenapa `fix-sequences.sql` wajib?** Tanpa itu, `id` berikutnya masih di angka
lama → setiap INSERT baru membalas error 500.

---

## 3. Backup file penting (bukan cuma database)

Simpan semua di **dua tempat** (folder backup + flashdisk/cloud):

| File | Lokasi (Mac) | Lokasi (Pi) | Catatan |
|---|---|---|---|
| `.env` | `backend-nodejs/.env` | `/opt/vertonik/backend/.env` | berisi password & API key — rahasia |
| Salinan `.env` | `backend-nodejs/database/backup/env-*.bak` | ikut `--dir` backup | otomatis, izin `600` |
| Paket deploy zip | `vertonik-pi-YYYYMMDD.zip` (root repo) | salinan di Pi `~/` | berisi backend + web + dump DB |
| Dump database | `backend-nodejs/database/backup/vertonik-*.sql` | `~/backup-vertonik/` | dump segar = dump saat packaging |
| Kredensial | `deploy-pi/KREDENSIAL-LOKAL.txt` | ikut paket | jangan dibagikan |
| Firmware ESP32 | file `.bin`/`.ino` firmware (di luar repo ini) | — | simpan + catat versinya |

Cara zip backup file penting sekaligus:

```bash
cd ~/Project/Vertoniksmartfarm
tar -czf ~/backup-penting-$(date +%Y%m%d).tar.gz \
  backend-nodejs/.env \
  backend-nodejs/database/backup \
  deploy-pi/KREDENSIAL-LOKAL.txt \
  vertonik-pi-*.zip 2>/dev/null || true
ls -lh ~/backup-penting-*.tar.gz
```

Cek isi zip paket terakhir (harus memuat dump TERBARU):

```bash
unzip -l vertonik-pi-$(date +%Y%m%d).zip | grep vertonik.sql
```

---

## 4. Jadwal backup otomatis (cron di Pi, 1× sehari)

```bash
crontab -e
```

Tambahkan satu baris (backup tiap pukul 02:30 dini hari):

```cron
30 2 * * * cd /opt/vertonik/backend && ./scripts/backup-pi.sh --dir ~/backup-vertonik >> ~/backup-vertonik/cron.log 2>&1
```

Kalau di Pi skrip belum ada, versi tanpa skrip:

```cron
30 2 * * * sh -c 'cd /opt/vertonik/backend && mkdir -p ~/backup-vertonik && pg_dump --no-owner --no-privileges "$(grep -E "^DATABASE_URL=" .env | cut -d= -f2-)" > ~/backup-vertonik/vertonik-$(date +\%Y\%m\%d-\%H\%M).sql'
```

> Tanda `%` di dalam crontab wajib di-escape `\%`.

Verifikasi cron sudah jalan:

```bash
crontab -l
tail -n 20 ~/backup-vertonik/cron.log
```

---

## 5. Checklist backup SEBELUM peresmian

- [ ] Backup database dijalankan **hari-H minus 1** dan **pagi hari-H**:
      `./scripts/backup-pi.sh` (atau cron Pi sudah aktif).
- [ ] Semua file hasil backup lolos cek:
      `./scripts/backup-pi.sh --check <file>` → `✅ header SQL valid`.
- [ ] Salinan `.env` ada (izin `600`) dan `wc -c`-nya tidak nol.
- [ ] Zip paket terakhir dibuat ulang **setelah** dump segar — cek:
      `unzip -l vertonik-pi-YYYYMMDD.zip | grep -E "database/vertonik.sql"`
      (dua entri `vertonik.sql` harus berisi isi yang sama / terbaru).
- [ ] File backup disalin ke **tempat kedua** (flashdisk / cloud / komputer lain).
- [ ] Uji restore **ke database sambilan** (jangan ke produksi):
      `createdb vertonik_uji` lalu `scripts/restore.sh` / `--url` ke DB uji,
      pastikan muncul `pengguna=…`.
- [ ] Firmware ESP32 + versinya tercatat dan ikut tersimpan.
- [ ] Setelah restore terbukti: hapus database uji (`dropdb vertonik_uji`).
- [ ] Cadangan terakhir diverifikasi bisa dibuka (`head -n 3 file.sql`).

### Uji cepat restore ke database sambilan (aman, tidak menyentuh data asli)

```bash
cd backend-nodejs
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
DBURL=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)
UJI=$(printf '%s' "$DBURL" | sed -E 's#(postgres://[^/]+)/.*#\1/vertonik_uji#')

createdb -h 127.0.0.1 -U vertonik vertonik_uji
./scripts/backup-pi.sh --restore database/backup/vertonik-YYYYMMDD-HHMM.sql --url "$UJI" -y
psql -h 127.0.0.1 -U vertonik -d vertonik_uji -tAc "SELECT count(*) FROM users"
dropdb -h 127.0.0.1 -U vertonik vertonik_uji
```

---

## 6. Troubleshooting singkat

| Gejala | Penyebab | Solusi |
|---|---|---|
| `pg_dump: command not found` | PATH Pi/Mac | pakai path lengkap (lihat §1) |
| File dump 0 byte / bukan SQL | koneksi DB gagal | cek `.env` & `pg_isready`, ulangi |
| Restore error `already exists` | belum dikosongkan | pakai `--restore` (otomatis drop) atau DROP SCHEMA dulu |
| INSERT balas 500 setelah restore | sequence belum difix | jalankan `scripts/fix-sequences.sql` |
| `password authentication failed` | password salah di URL | perbaiki `DATABASE_URL` di `.env` |
| Zip paket tidak ada `database/vertonik.sql` | packaging gagal | jalankan ulang `scripts/siapkan-paket-pi.sh` |
