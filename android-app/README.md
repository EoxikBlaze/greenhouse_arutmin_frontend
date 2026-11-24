# GARAP — aplikasi Android

Pembungkus (Capacitor) untuk situs **https://garap.net/login**. Tampilan, menu, dan hak akses sama dengan situs karena isinya
memang situs itu sendiri; saat situs diperbarui, aplikasi ikut berubah tanpa memasang APK baru.

- Nama paket: `id.co.vertonik.garap` · nama: GARAP · minSdk 24 · targetSdk 36
- Ikon dan layar pembuka dibuat dari logo GARAP Vertonik Smart Farm (`assets/`). Halaman cadangan tanpa internet: `www/offline.html`.
- Tanpa internet aplikasi menampilkan halaman cadangan, bukan data lama.

## Membangun APK debug

```bash
npm install
npx capacitor-assets generate --android   # ikon dan splash dari assets/
npx cap sync android
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug
# hasil: android/app/build/outputs/apk/debug/app-debug.apk
```

Catatan: JDK bawaan Android Studio adalah 25, jadi `android/` memakai Gradle 9.3.1 dan AGP 9.1.0 (bukan bawaan template Capacitor)
dan `proguard-android-optimize.txt`. APK ini bertanda tangan debug; untuk Play Store perlu keystore rilis (belum dibuat).
