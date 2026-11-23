# Server nginx /etc/nginx/sites-available/vertonik — batas unggah firmware
Sebab: `client_max_body_size 256k` menolak unggah berkas program ESP32 (±1,25 MB) dengan 413 sebelum sampai ke aplikasi.
Ditambahkan sebelum `location / {...}`:

    location = /api/firmware/unggah {
        client_max_body_size 2200k;
        proxy_pass http://127.0.0.1:8000;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

Hanya jalur ini; jalur lain tetap 256k. Backend tetap membatasi 2100 KB dan hanya admin. Tanpa add_header (pewarisan header keamanan terjaga).
Cadangan: /etc/nginx/sites-available/vertonik.bak-sebelum-unggah-fw-<tanggal>. Diuji: 1,3 MB -> sampai ke aplikasi (401 tanpa login), 2,4 MB -> 413, jalur lain 300 KB -> 413.
Pulihkan: salin cadangan, `sudo nginx -t && sudo systemctl reload nginx`.
