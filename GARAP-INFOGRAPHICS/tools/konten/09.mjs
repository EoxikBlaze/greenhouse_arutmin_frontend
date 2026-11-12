const op = (teks) => ({ peran: 'op', label: 'Operator', teks })
const tk = (teks) => ({ peran: 'tk', label: 'Teknisi', teks })

export default {
  no: '09', berkasMd: 'Troubleshooting', judulPendek: 'Troubleshooting',
  judul: 'Troubleshooting GARAP',
  subjudul: 'Gejala → kemungkinan penyebab → langkah pemeriksaan → tindakan. Operator dan teknisi punya bagian masing-masing.',
  tujuan: 'Gangguan umum dapat dikenali dan ditangani cepat tanpa operator melampaui kewenangannya.',
  pembaca: ['Operator', 'Teknisi'],
  sumber: 'Modul Juknas Bab V.2 (pesan LCD), Bab VII.2 (perintah Serial), Bab VIII (matriks gangguan); `gabungan.ino` (fail-safe 30 dtk, `belum_dikalibrasi`); `sanitySensor.js`.',
  layout: 'Header → legenda peran (2 lencana) → tabel 4 kolom, 7 baris gejala → kartu "kapan berhenti dan memanggil teknisi" → footer. Di Canva, tabel dapat dipecah menjadi 7 kartu gejala.',
  ilustrasi: 'Tanpa ilustrasi besar. Header tabel navy, baris berselang. Label peran di dalam sel tindakan: hijau "OPERATOR", merah gelap "TEKNISI".',
  catatan: ['Urutan kolom wajib: GEJALA → KEMUNGKINAN PENYEBAB → LANGKAH PEMERIKSAAN → TINDAKAN.', 'Tindakan teknisi yang melibatkan Serial Monitor atau perintah Pi tidak boleh dilakukan operator.'],
  keselamatan: '- Operator **tidak** membuka panel, mencabut kabel di dalam panel, atau mengganti sekring.\n- Gangguan daya / bau hangus / percikan: tekan E-STOP, menjauh, panggil teknisi.',
  blok: [
    { tipe: 'kartu', kolom: 2, item: [
      { ikon: 'user-round', lencana: ['Operator'], judul: 'Tindakan operator', teks: 'Pemeriksaan visual, website, tombol RESET singkat, E-STOP, dan melapor.' },
      { ikon: 'wrench', lencana: ['Teknisi', 'bahaya'], nada: 'bahaya', judul: 'Tindakan teknisi', teks: 'Membuka panel, kabel/sekring, Serial Monitor ESP32, perintah di Raspberry Pi, kalibrasi.' },
    ] },
    { tipe: 'tabel', eyebrow: 'Matriks gangguan', judul: 'Tujuh gangguan yang paling mungkin', kolom: ['Gejala', 'Kemungkinan penyebab', 'Langkah pemeriksaan', 'Tindakan'], baris: [
      ['Sensor tidak terbaca', 'Probe lepas/kotor, kabel sensor putus.', 'LCD tampil `pH --.--` / `EC ----`; nilai di Dashboard kosong.', [op('Catat waktu, lapor teknisi.'), tk('Periksa probe & kabel; cek `status` di Serial Monitor (115200).')]],
      ['Data tidak masuk website', 'HP beda jaringan, IP Pi berubah, layanan web/API berhenti.', 'Pastikan Wi-Fi sama dengan Pi. Tekan **RESET** singkat → baca IP server di LCD 4 detik.', [op('Buka `http://vertonik.local` atau IP dari LCD.'), tk('Periksa layanan `nginx` & `vertonik-api` di Pi.')]],
      ['MQTT terputus', 'Port 1883 diblokir router, *client isolation* aktif.', 'LCD `HTTP SENSOR ONLY` atau `TUNGGU SERVER...`; lampu merah + hijau.', [op('Pompa terkunci aman. Lapor.'), tk('Matikan AP/client isolation; cek `sudo ufw status` / `siapkan-modem.sh`.')]],
      ['ESP32 tidak terkoneksi', 'Wi-Fi 5 GHz / sandi berubah / sinyal lemah.', 'LCD `WIFI MATI`. Dashboard: alat terputus.', [op('Pastikan router menyala; lapor.'), tk('Serial: `scan`, lalu `wifi NAMA|SANDI`; `cari` untuk IP Pi.')]],
      ['Pompa tidak merespons', 'E-STOP aktif, detak server hilang > 30 dtk, laju `belum_dikalibrasi`, mode pemeliharaan.', 'Lihat lampu merah saja / LCD `E-STOP AKTIF!`. Cek Peringatan. *Eksekusi dosing memang diblokir.*', [op('Jangan memaksa. Lapor penyebab yang terlihat.'), tk('Cari sebab E-STOP; kalibrasi laju pompa di halaman Kalibrasi.')]],
      ['Pembacaan tidak normal', 'Probe perlu kalibrasi, probe di luar air, gelembung udara.', 'Bandingkan dengan alat ukur manual; nilai di luar rentang wajar (pH 3–9, TDS 50–2.500 ppm, suhu air 5–45 °C).', [op('Periksa fisik tandon; jangan menambah nutrisi/pH manual.'), tk('Kalibrasi 2 titik EC & pH.')]],
      ['Gangguan daya', 'Listrik padam, adaptor rusak, korsleting.', 'Panel/LCD mati, Dashboard data usang. Ada bau hangus atau percikan?', [op('Bau/percikan: tekan E-STOP, menjauh, panggil teknisi.'), tk('Matikan sumber daya, periksa sekring & catu 12 V.')]],
    ] },
    { tipe: 'peringatan', nada: 'bahaya', ikon: 'phone-call', judulKotak: 'Berhenti dan panggil teknisi bila', poin: ['Ada air di dekat panel atau kabel.', 'Tercium bau hangus, terlihat asap/percikan.', 'Lampu merah saja tidak padam setelah penyebab dibereskan.', 'Gangguan berulang setelah RESET.'] },
  ],
}
