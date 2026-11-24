/** Metode dan keterbatasan: dokumentasi cara semua angka di halaman Analisis dihitung, agar dapat ditinjau dan diulang. */
export function PanelMetode() {
  return (
    <section className="vsf-card vsf-ilmiah-metode p-4 sm:p-5" aria-label="Metode dan keterbatasan">
      <div className="vsf-judul-bagian">Metode dan keterbatasan</div>
      <p className="mt-1">
        Semua angka dihitung server dari bacaan yang tersimpan, tanpa perangkat atau data tambahan. Halaman ini tidak mengirim perintah ke alat.
      </p>

      <h3>Data dasar</h3>
      <ul>
        <li>Bacaan sensor dirata-rata per <b>5 menit</b>; waktu = jam dinding lokal server. Nutrisi (ppm) = EC (mS/cm) × 500.</li>
        <li>Tiap titik 5 menit mewakili waktu yang sama, jadi persen &quot;dalam batas aman&quot; adalah persen <i>waktu</i>, bukan persen jumlah baris.</li>
        <li>Batas aman = tabel Ambang Sensor pada saat dihitung (satu rentang tetap untuk seluruh masa tanam).</li>
      </ul>

      <h3>Statistik deskriptif</h3>
      <ul>
        <li><b>Median dan kuartil</b> (interpolasi linear, tipe 7) dipakai di samping rata-rata ± simpangan baku karena data sensor jarang berdistribusi normal. <span className="vsf-ilmiah-rumus">IQR = Q3 − Q1</span>.</li>
        <li><b>Selang kepercayaan 95% rata-rata</b> memakai distribusi t Student pada <i>nilai harian</i> (satu nilai per hari). Titik 5 menit berautokorelasi, jadi memperlakukannya independen akan menyempitkan selang secara palsu.</li>
        <li><b>Selang kepercayaan median</b> tanpa asumsi sebaran, dari peringkat urutan: <span className="vsf-ilmiah-rumus">j = ⌊n/2 − 1,96√n/2⌋, k = ⌈1 + n/2 + 1,96√n/2⌉</span>; dihitung bila n ≥ 6.</li>
      </ul>

      <h3>Uji statistik</h3>
      <ul>
        <li><b>Korelasi Spearman</b> (ρ): korelasi Pearson atas peringkat; tahan terhadap pencilan dan hubungan tak lurus. Nilai p dari t Student dengan <b>n efektif</b> <span className="vsf-ilmiah-rumus">n·(1 − r₁ₓ·r₁ᵧ)/(1 + r₁ₓ·r₁ᵧ)</span> (r₁ = autokorelasi lag-1), supaya tidak berlebihan menyatakan signifikan.</li>
        <li><b>Koreksi Bonferroni</b>: bila m pasangan diuji, batas signifikan = 0,05 / m.</li>
        <li><b>Wilcoxon peringkat bertanda</b> (perbandingan batch, berpasangan menurut hari sejak semai): eksak bila n ≤ 25 tanpa nilai kembar, selain itu hampiran normal dengan koreksi kembar dan kontinuitas. Selisih nol dibuang; butuh n ≥ 5 (dianggap cukup bila n ≥ 6).</li>
        <li><b>Mann–Kendall + kemiringan Theil–Sen</b> (kecenderungan harian): uji monoton tanpa asumsi sebaran; Theil–Sen = median kemiringan semua pasangan titik, kokoh terhadap pencilan.</li>
      </ul>

      <h3>Ukuran dosing dan konsumsi</h3>
      <ul>
        <li><b>Respons dosing</b> = median ppm 10–40 menit sesudah suntikan A+B dikurangi median 15 menit sebelumnya. Dosing dengan kegiatan lain dalam ±55 menit dikeluarkan.</li>
        <li><b>Konsumsi nutrisi</b> = lereng regresi ppm pada selang ≥ 3 jam tanpa dosing, pengenceran, atau isi air (jeda 30 menit sesudah kejadian), dirata-ratakan berbobot lama selang. Massa = ppm × volume penampung / 1000 (g).</li>
        <li><b>VPD</b> (kPa) = <span className="vsf-ilmiah-rumus">0,6108·exp(17,27·T/(T + 237,3))·(1 − RH/100)</span> (rumus Tetens). Acuan: &lt; 0,4 terlalu lembap, 0,4–1,2 baik, &gt; 1,2 terlalu kering (umum untuk sayuran daun).</li>
      </ul>

      <h3>Keterbatasan yang perlu diketahui pembaca</h3>
      <ul>
        <li><b>Alat tidak melaporkan mL</b> dosing, hanya hitungan harian. Karena itu tidak ada kenaikan per mL, dan penanda dosing hanya menunjukkan waktu kejadian.</li>
        <li><b>Korelasi bukan sebab-akibat</b>; perbandingan batch menunjukkan hubungan, bukan pengaruh perlakuan (tanaman, musim, dan meja bisa berbeda).</li>
        <li><b>Penguapan</b> menaikkan ppm sementara tanaman menurunkannya; konsumsi nutrisi tidak memisahkan keduanya.</li>
        <li><b>Sampel kecil</b>: dengan beberapa hari data atau beberapa batch, uji bertenaga rendah; hasil &quot;tidak signifikan&quot; bukan bukti tidak ada perbedaan.</li>
        <li>Tidak ada ukuran pertumbuhan tanaman (tinggi, berat, jumlah daun); hubungan kondisi dengan hasil hanya lewat hasil panen akhir.</li>
        <li>Tingkat ketelitian sensor mengikuti kalibrasinya; paket data riset menyertakan riwayat kalibrasi dan versi firmware.</li>
        <li>Rentang aman yang tetap tidak mencerminkan kebutuhan yang berubah menurut umur tanaman.</li>
      </ul>
    </section>
  )
}
