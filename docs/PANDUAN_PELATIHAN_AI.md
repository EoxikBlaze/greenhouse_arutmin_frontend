# Panduan Pelatihan & Penambahan Data AI Smart Farm GARAP (Raspberry Pi)

Dokumen ini menjelaskan arsitektur, dataset skenario, dan langkah-langkah melatih atau memperkaya kecerdasan asisten AI GARAP yang berjalan secara lokal (offline) di Raspberry Pi.

---

## 1. Arsitektur AI di Raspberry Pi: Sistem *Dual-Engine*

Karena Raspberry Pi menggunakan prosesor hemat daya (Quad-Core ARM Cortex-A76/A72) tanpa GPU terpisah, sistem GARAP menggunakan pendekatan **Dual-Engine** cerdas:

```
[Pengguna Bertanya di Web / HP Flutter]
                   │
                   ▼
       [API Guard & Normalisasi]
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
[1. Engine Deterministik]   [2. Engine Ollama LLM (garap-ai)]
  • Respons instan (<50ms)    • Penalaran pertanyaan terbuka
  • 100% fakta presisi        • Model: garap-ai (Qwen 0.5B/1.5B)
  • Berbasis modul aiPanduan  • Parameter: Temp 0.3, Top-P 0.8
  • Bebas halusinasi          • Diperkaya System Prompt Pertanian
```

1. **Engine Deterministik (Instant Knowledge Retrieval)**:
   - Digunakan untuk pertanyaan yang membutuhkan kepastian angka (target PPM melon, cara semai, aturan mencampur AB Mix, jadwal polinasi).
   - Jawaban kembali dalam waktu kurang dari 50 milidetik tanpa membebani CPU.
2. **Engine LLM Lokal (`garap-ai` via Ollama)**:
   - Menangani pertanyaan deskriptif bebas, diagnosa gabungan beberapa gejala, dan tanya-jawab interaktif.
   - Menggunakan model kustom `garap-ai` yang sudah disetel parameter dan pengetahuannya melalui `Modelfile`.

---

## 2. Dataset Pelatihan yang Disediakan

Dataset pelatihan tersimpan di:
📁 `data/training/dataset_agronomi_smartfarm.jsonl`

Dataset ini berisi **50 skenario realistis** budidaya greenhouse hidroponik dalam format standar ChatML/JSONL (`system`, `user`, `assistant`).

### Ringkasan Cakupan Skenario:

| Kategori | Jumlah Skenario | Contoh Kemungkinan Masalah / Pertanyaan |
| :--- | :---: | :--- |
| **A. Siklus & Fase Melon** | 10 | Hitungan panen (60–75 HST), cara semai di rockwool, etiolasi (kutilang), teknik pruning ruas 1–8 vs 9–12, waktu polinasi bunga betina, seleksi 1 buah per pohon, cara menaikkan kadar kemanisan (Brix 12–15+). |
| **B. Nutrisi AB Mix & Air** | 10 | Larangan mencampur pekatan A dan B langsung (reaksi Kalsium Sulfat), urutan pelarutan ke tandon, dampak pH asam (<5.5) dan pH basa (>6.8), penanganan suhu air tandon panas (>29°C), tip burn (defisiensi kalsium). |
| **C. Hama & Penyakit** | 12 | Daun keriting melengkung (Thrips & Tungau), serangga putih beterbangan (Kutu Kebul/Whitefly), bercak tepung putih (Powdery Mildew), busuk akar (Pythium), Layu Fusarium vs Layu Bakteri Ralstonia, buah retak (Fruit Cracking). |
| **D. Sayuran Daun** | 6 | Hari panen selada, pakcoy, kangkung, bayam; pencegahan rasa pahit dan bolting pada selada; PPM sayuran daun. |
| **E. IoT & Kondisi Darurat** | 12 | Tindakan saat listrik padam dan pompa mati, probe sensor pH analog ngaco (0.0 / 14.0), sensor TDS 0 PPM, prosedur kalibrasi buffer pH 4.01 & 6.86, flow rate pompa dosing, safety lock sistem. |

---

## 3. Cara Memasang / Memperbarui Model AI di Raspberry Pi

### Langkah 1: Modelfile Kustom (`Modelfile.garap`)
Konfigurasi model tersimpan di `deploy-pi/ollama/Modelfile.garap`. File ini menyatukan:
- Base model `qwen2.5:0.5b` (ringan dan cepat di ARM CPU).
- Pembatasan parameter `temperature 0.3` (mencegah jawaban mengarang).
- Prompt sistem pakar agronomi smartfarm.
- Contoh dialog terpandu (*few-shot learning*).

### Langkah 2: Eksekusi Pemasangan Otomatis
Jalankan skrip pemasangan otomatis di Raspberry Pi:

```bash
# Dari laptop/Mac:
ssh garap@garap.local "bash /tmp/ollama/pasang-model-ai.sh"
```

Skrip ini akan:
1. Membangun model baru di Ollama: `ollama create garap-ai -f Modelfile.garap`.
2. Menguji inferensi model secara lokal.
3. Memperbarui `AI_MODEL=garap-ai` di `/etc/vertonik/rahasia.env`.
4. Merestart layanan `vertonik-api` secara mulus.

---

## 4. Cara Menambah Kemungkinan / Kasus Baru

### Metode A: Menambah Kasus ke Dataset JSONL (Untuk Pembelajaran LLM)
1. Buka file `scripts/generate_training_data.py`.
2. Tambahkan pasangan pertanyaan dan jawaban baru pada list data.
3. Jalankan `python3 scripts/generate_training_data.py` untuk mengompilasi ulang `dataset_agronomi_smartfarm.jsonl`.
4. Jika ingin dijadikan *few-shot* di Ollama, tambahkan baris `MESSAGE user "..."` dan `MESSAGE assistant "..."` ke dalam `deploy-pi/ollama/Modelfile.garap`, lalu jalankan kembali skrip pemasangan.

### Metode B: Menambah ke Jawaban Instan (`aiPanduan.js`)
Jika Anda ingin jawaban langsung muncul dalam **<50 milidetik** tanpa menunggu kalkulasi model:
1. Buka `backend-nodejs/src/aiPanduan.js`.
2. Tambahkan teks jawaban di objek `TEKS` (gunakan huruf besar `PPM` dan kata `mililiter` untuk satuan).
3. Tambahkan regex deteksi kata kunci di array `PANDUAN_MAP`.
4. Jalankan pengujian unit: `npm test test/aiPanduan.test.js`.
5. Salin file ke Raspberry Pi:
   ```bash
   scp backend-nodejs/src/aiPanduan.js garap@garap.local:/tmp/
   ssh garap@garap.local "sudo cp /tmp/aiPanduan.js /opt/vertonik/backend/src/ && sudo systemctl restart vertonik-api"
   ```

---

## 5. Ringkasan Pengujian Hasil Pelatihan

Setelah model `garap-ai` aktif di Raspberry Pi, sistem telah diuji langsung dengan skenario nyata:

1. **Pertanyaan Siklus:** *"Kira-kira kalau saya bikin melon besok, berapa hari bisa siap makan?"*  
   &rarr; **Hasil:** Menjawab rinci 60–75 HST dengan 5 tahapan lengkap dan target nutrisi.
2. **Pertanyaan Pencegahan:** *"Pekatan A dan B bolehkah dicampur langsung di wadah kecil sebelum ke tandon?"*  
   &rarr; **Hasil:** Menolak keras dengan penjelasan ilmiah terbentuknya endapan Kalsium Sulfat.
3. **Pertanyaan Penyakit:** *"Daun melon keriting melengkung ke bawah dan kerdil, apa obatnya?"*  
   &rarr; **Hasil:** Mengidentifikasi hama Thrips/kutu daun, menyarankan perangkap kuning dan semprot minyak mimba sore hari.
4. **Pertanyaan Terbuka:** *"Bagaimana jika daun melon saya tampak kaku tebal melengkung ke atas?"*  
   &rarr; **Hasil:** Model LLM `garap-ai` langsung merespons penalaran agronomis dalam waktu ~18 detik di CPU Pi.

