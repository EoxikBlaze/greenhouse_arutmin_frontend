# Login gagal tercatat + teks "STOP" di Akun Saya
1) Server routes/auth.js: login yang gagal (422, "Username / Password salah.") kini ditulis ke audit_logs dengan aksi 'login_failed' (actor anonymous, label = nama yang dicoba, maks 60 karakter; kata sandi TIDAK disimpan; IP dari audit). Middleware auditTrail hanya merekam 2xx, maka dicatat langsung lewat tulisAudit setelah balasan terkirim.
   aktivitas.js: 'login_failed' dihitung jenis Login dengan status 'gagal'.
   Cadangan: routes/auth.js.bak-logingagal-*, aktivitas.js.bak-logingagal-*. Salinan file: auth.js.salinan-20261124, aktivitas.js.salinan-20261124.
   Uji: login salah -> 422 -> baris login_failed muncul; Catatan Aktivitas Login 169 -> 170.
2) Web: Akun Saya masih menyebut "STOP dan E-STOP" padahal STOP pompa sudah dihapus. Diganti "dan E-STOP" (KolomSandi chunk). Semua aset di-rename -v7 (aturan cache Cloudflare); aset -v6 tetap ada. index.html menunjuk ke -v7. Cadangan server: /var/www/vertonik.bak-teksstop-*.
