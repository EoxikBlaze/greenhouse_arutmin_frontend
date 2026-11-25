# GARAP Petani — React Native + gateway PHP

App Android untuk petani GARAP. Data tetap dari backend garap.net; PHP hanya jadi gerbang.

```
HP (React Native)  →  php-api (gateway)  →  backend GARAP (Node.js)
```

## Gateway PHP (`php-api/`)

Butuh PHP 8.1+ dan ekstensi curl. Arahkan web server ke `php-api/public`.

```bash
GARAP_UPSTREAM=https://garap.net php -S 0.0.0.0:8080 -t php-api/public
bash php-api/tests/smoke.sh   # uji dengan backend tiruan
```

| Rute | Fungsi |
|---|---|
| `POST /v1/login` | masuk, teruskan ke `/login` |
| `GET /v1/beranda` | sensor + kebun + peringatan + status alat dalam satu panggilan |
| `ANY /v1/p/<path>` | teruskan ke backend, hanya awalan di daftar izin (`IZIN_AWALAN`) |

Token JWT hanya diteruskan, tidak disimpan atau dicatat. Izin akses per peran tetap diputuskan backend.

## App (`app/`)

```bash
cd app && npm install
EXPO_PUBLIC_API_URL=https://alamat-gateway npx expo start
cd android && ./gradlew assembleRelease   # APK: app/build/outputs/apk/release
```

Alamat gateway juga bisa diubah di layar login (Pengaturan server). Rilis wajib HTTPS.

Fitur: dashboard, sensor + grafik, kebun/siklus tanam, otomatis alat (saklar + STOP pompa),
kalibrasi pH/EC, uji lab, CCTV, peringatan, asisten AI, laporan, profil.
