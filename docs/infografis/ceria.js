/* Perender gaya "ceria" (lihat ceria.css). Data: window.DATA dari data/<nama>.js dengan DATA.gaya = 'ceria'.
   Teks mendukung **tebal** dan ==sorot==. Ilustrasi = SVG datar bergaris tepi cokelat (ILUS). */
(function () {
  'use strict';
  const D = window.DATA;
  const PUBLIK = '../../react-web-app/public';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const teks = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/==(.+?)==/g, '<mark>$1</mark>');
  const C = '#6B3410';
  const g = (vb, isi) => `<svg viewBox="${vb}" fill="none" stroke="${C}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${isi}</svg>`;
  const daun = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0c-14-2-20-14-16-24 8 2 14 8 16 16 2-10 10-18 20-18 2 12-6 24-20 26z" fill="#9DBB4A"/><path d="M0 0c-6-6-6-14 0-20 6 6 6 14 0 20z" fill="#C9DE7A"/></g>`;
  const ILUS = {
    rak: g('0 0 360 300', `
      <path d="M30 120 180 40 330 120" stroke-width="5" fill="none"/><path d="M50 112v170M310 112v170M180 48v234" stroke-width="4"/>
      <rect x="40" y="130" width="280" height="22" rx="11" fill="#FFFDF6"/><rect x="40" y="186" width="280" height="22" rx="11" fill="#FFFDF6"/>
      ${[70, 120, 170, 220, 270].map((x) => daun(x, 132, 1.1)).join('')}${[95, 145, 195, 245, 295].map((x) => daun(x, 188, 1.1)).join('')}
      <rect x="70" y="232" width="150" height="52" rx="10" fill="#5FA8D3"/><path d="M76 248h138" stroke="#FFFDF6" stroke-width="3"/>
      <rect x="236" y="236" width="60" height="48" rx="8" fill="#F09A2A"/><circle cx="266" cy="260" r="12" fill="#FFD24A"/>
      <path d="M220 258h16M296 250c20 0 20-50 14-62" stroke-width="4"/>
      <circle cx="324" cy="52" r="22" fill="#FFD24A"/>`),
    tani: g('0 0 120 120', `<circle cx="60" cy="40" r="18" fill="#F6C99A"/><path d="M30 28 60 10l30 18z" fill="#F5D36B"/><path d="M36 112c0-26 10-44 24-44s24 18 24 44z" fill="#F09A2A"/>
      <path d="M84 70c10-12 14-30 10-44" stroke-width="3"/>${daun(96, 30, .8)}${daun(92, 46, .7)}<circle cx="54" cy="40" r="2" fill="${C}"/><circle cx="66" cy="40" r="2" fill="${C}"/><path d="M54 48c4 3 8 3 12 0"/>`),
    botol: g('0 0 120 120', `<path d="M44 20h32v14l10 14v54a8 8 0 0 1-8 8H42a8 8 0 0 1-8-8V48l10-14z" fill="#FFFDF6"/><path d="M36 66h48v36a6 6 0 0 1-6 6H42a6 6 0 0 1-6-6z" fill="#5FA8D3"/>
      <path d="M52 8v74M68 8v66" stroke-width="4"/><circle cx="52" cy="84" r="5" fill="#F09A2A"/><circle cx="68" cy="76" r="5" fill="#9DBB4A"/><path d="M90 30l8-8M94 40h10" stroke="#F09A2A"/>`),
    esp32: g('0 0 120 100', `<rect x="22" y="18" width="76" height="64" rx="8" fill="#2D452F"/><rect x="42" y="34" width="36" height="32" rx="4" fill="#9DBB4A"/>
      ${[30, 42, 54, 66, 78, 90].map((x) => `<path d="M${x} 10v8M${x} 82v8"/>`).join('')}<path d="M10 40h12M10 60h12M98 40h12M98 60h12"/><circle cx="32" cy="72" r="3" fill="#FFD24A"/>`),
    peristaltik: g('0 0 120 100', `<rect x="20" y="30" width="80" height="56" rx="10" fill="#F09A2A"/><circle cx="60" cy="48" r="20" fill="#FFFDF6"/><circle cx="60" cy="48" r="5" fill="${C}"/>
      <path d="M60 48l12-10M60 48l-14 4" stroke-width="3"/><path d="M40 48c0-30 40-30 40 0" stroke="#C0392B" stroke-width="5"/><path d="M14 30c10-16 20-18 26-18M106 30c-10-16-20-18-26-18" stroke="#C0392B" stroke-width="4"/>
      <circle cx="34" cy="76" r="3" fill="#2D452F"/><circle cx="86" cy="76" r="3" fill="#C0392B"/>`),
    celup: g('0 0 120 100', `<path d="M8 50h104v38a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z" fill="#5FA8D3"/><path d="M8 50c10-6 18 6 28 0s18 6 28 0 18 6 28 0 14 4 20 0"/>
      <rect x="44" y="58" width="32" height="28" rx="6" fill="#2D452F"/><path d="M60 58V24h30" stroke-width="5"/><path d="M90 18v12" stroke-width="4"/><circle cx="96" cy="24" r="4" fill="#5FA8D3"/>`),
    solenoid: g('0 0 120 100', `<path d="M6 62h108" stroke-width="12" stroke="#9DBB4A"/><path d="M6 62h108" stroke-width="3"/><rect x="40" y="48" width="40" height="28" rx="5" fill="#FFFDF6"/>
      <rect x="44" y="18" width="32" height="30" rx="5" fill="#F09A2A"/><path d="M50 26h20M50 33h20M50 40h20"/><path d="M76 24h14M76 36h14" stroke="#C0392B"/>`),
    pelampung: g('0 0 120 100', `<path d="M8 48h104v40a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z" fill="#5FA8D3"/><path d="M60 10v80" stroke-width="5"/>
      <ellipse cx="60" cy="48" rx="16" ry="10" fill="#FFD24A"/><path d="M50 10h20" stroke-width="5"/><path d="M90 30l10-6M92 40h12" stroke="#F09A2A"/>`),
    estop: g('0 0 100 100', `<rect x="18" y="56" width="64" height="34" rx="6" fill="#FFD24A"/><path d="M28 56c0-26 44-26 44 0z" fill="#C0392B"/><path d="M36 46c4-8 12-10 18-8" stroke="#FFFDF6"/>`),
    login: g('0 0 120 100', `<rect x="14" y="10" width="92" height="64" rx="8" fill="#FFFDF6"/><path d="M4 82h112l-8 10H12z" fill="#9DBB4A"/>
      <rect x="44" y="34" width="32" height="26" rx="5" fill="#F09A2A"/><path d="M50 34v-6a10 10 0 0 1 20 0v6"/><circle cx="60" cy="46" r="3" fill="${C}"/>`),
    pantau: g('0 0 120 100', `<rect x="14" y="10" width="92" height="64" rx="8" fill="#FFFDF6"/><path d="M4 82h112l-8 10H12z" fill="#9DBB4A"/>
      <path d="M24 60l16-18 14 10 18-24 18 14" stroke="#5E7D2A" stroke-width="4"/><circle cx="90" cy="42" r="4" fill="#F09A2A"/><rect x="24" y="18" width="24" height="8" rx="3" fill="#F09A2A"/>`),
    kelola: g('0 0 120 100', `<rect x="34" y="6" width="52" height="88" rx="10" fill="#FFFDF6"/><path d="M54 84h12"/>
      ${daun(60, 44, 1.2)}<rect x="42" y="56" width="36" height="12" rx="6" fill="#5E7D2A"/><path d="M50 62h20" stroke="#FFFDF6"/><circle cx="96" cy="26" r="12" fill="#FFD24A"/><path d="M90 26l5 5 8-9"/>`),
    tanya: g('0 0 120 100', `<path d="M12 14h70a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8H40l-16 14V60H12a8 8 0 0 1-8-8V22a8 8 0 0 1 8-8z" fill="#FFFDF6"/>
      <path d="M20 30h50M20 42h36"/><rect x="66" y="50" width="48" height="40" rx="6" fill="#F09A2A"/><path d="M76 80V70M88 80V62M100 80V66" stroke="#FFFDF6" stroke-width="4"/>`),
  };
  const kolom = (n) => `grid-template-columns:repeat(${n},1fr)`;
  const cap = (x) => (x && x.contoh ? '<span class="contoh-cap">contoh</span>' : '');

  const BAGIAN = {
    tiga: (b) => `<section class="pita hijau"><div class="tiga">${b.isi.map((x) => `<div><h3 class="jdl kuning kecil">${esc(x.judul)}</h3>
      ${x.persen != null ? donat(x.persen) : `<span class="ilus">${ILUS[x.ilus] || ''}</span>`}<p>${teks(x.teks)}</p></div>`).join('')}</div></section>`,
    sensorAktuator: (b) => `<section class="pita oranye"><div class="dua">
      <div><h3 class="jdl krem">${esc(b.kiri.judul)}<small class="jdl hijau">${esc(b.kiri.sub)}</small></h3>
        <div class="daftar-nomor">${b.kiri.isi.map((x, i) => `<div><div class="t"><b>${esc(x.judul)}</b><span>${teks(x.teks)}</span></div><span class="bulat">${i + 1}</span></div>`).join('')}</div></div>
      <div><h3 class="jdl krem">${esc(b.kanan.judul)}<small class="jdl hijau">${esc(b.kanan.sub)}</small></h3>
        <div class="kartu-ilus">${b.kanan.isi.map((x) => `<div>${ILUS[x.ilus] || ''}<hr><b>${esc(x.judul)}</b><span>${teks(x.teks)}</span></div>`).join('')}</div>
        ${b.kanan.catatan ? `<div class="catatan-merah">${ILUS.estop}<div>${teks(b.kanan.catatan)}</div></div>` : ''}</div>
    </div></section>`,
    web: (b) => `<section class="pita hijau"><div class="web">
      <div class="kepala-web"><div><div class="jdl a">${esc(b.judulA)}</div><div class="jdl kuning b">${esc(b.judulB)}</div></div></div>
      <div class="alir">${b.alur.map((x) => `<span>${esc(x)}</span>`).join('<i>→</i>')}</div>
      <div class="kolom-web" style="${kolom(b.isi.length)}">${b.isi.map((x, i) => `<div><span class="lingkar"><span>${i + 1}</span></span>${ILUS[x.ilus] || ''}<h4>${esc(x.judul)}</h4><hr><p>${teks(x.teks)}</p></div>`).join('')}</div>
    </div></section>`,
    proker: (b) => `<section class="pita oranye"><div class="proker"><h3 class="jdl krem">${esc(b.judulA)}<small class="jdl hijau">${esc(b.judulB)}</small></h3>
      <div class="proker-grid">${b.isi.map((x, i) => `<div class="${x.contoh ? 'contoh' : ''}"><span class="bulat">${i + 1}</span><div><h4>${esc(x.judul)}${cap(x)}</h4><p>${teks(x.teks)}</p>
        ${(x.waktu || x.sasaran || x.status) ? `<div class="meta">${[x.waktu, x.sasaran, x.status].filter(Boolean).map((m) => `<span>${esc(m)}</span>`).join('')}</div>` : ''}</div></div>`).join('')}</div></div></section>`,
    penutup: (b) => {
      const q = qrcode(0, 'M');
      q.addData(b.url);
      q.make();
      return `<section class="pita hijau"><div class="penutup"><div class="ajak"><div class="jdl kuning">${esc(b.judul)}</div><p>${teks(b.teks)}</p></div>
        <div class="qr"><div class="kode">${q.createSvgTag({ cellSize: 4, margin: 0, scalable: true })}</div><div class="label">SCAN ME</div></div></div></section>`;
    },
  };
  function donat(persen) {
    const r = 15.9; const kel = 2 * Math.PI * r; const isi = (persen / 100) * kel;
    return `<div class="donat"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="${r}" fill="none" stroke="#FFF4DC" stroke-width="7"/>
      <circle cx="20" cy="20" r="${r}" fill="none" stroke="#F5B33A" stroke-width="7" stroke-dasharray="${isi} ${kel - isi}"/>
      <circle cx="20" cy="20" r="19.3" fill="none" stroke="${C}" stroke-width=".9"/><circle cx="20" cy="20" r="12.2" fill="none" stroke="${C}" stroke-width=".9"/></svg><b>${persen}%</b></div>`;
  }

  const qrSvg = (url) => { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); };
  const kotakQr = (url) => `<div class="qr"><div class="kode">${qrSvg(url)}</div><div class="label">SCAN ME</div></div>`;
  const LOGO = `<div class="logo-baris"><img class="kkn" src="${PUBLIK}/logo/kkn.png" alt=""><img src="${PUBLIK}/logo/arutmin.png" alt=""><img src="${PUBLIK}/logo/polytala.png" alt=""><img src="${PUBLIK}/logo/trkj.png" alt=""><b>KKN ARUTMIN ASIK 2026</b></div>`;
  const KAKI = `<footer class="kaki"><img src="${PUBLIK}/logo/kkn.png" alt=""><div><b>Vertonik Smart Farm</b> · KKN Industri Politeknik Negeri Tanah Laut di PT Arutmin Indonesia</div>
      <div class="kanan">Instagram &amp; TikTok <b>@kkn.arutminidn2026</b> · © 2026 PT Arutmin Indonesia</div></footer>`;
  const judulKolom = (a, b, warnaB) => `<div class="sp-judul"><div class="jdl krem">${esc(a)}</div>${b ? `<small class="jdl ${warnaB || 'hijau'}">${esc(b)}</small>` : ''}</div>`;

  /* ── tata spanduk 3 × 1 m: kolom-kolom berdampingan (lebar tiap kolom = DATA.kolom[].px) ── */
  const KOLOM = {
    kepala: (k) => `<section class="sp-kepala"><div class="latar"></div>${LOGO}
      <div class="judul-besar"><div class="jdl a">${esc(k.judulA)}</div><div class="jdl hijau b">${esc(k.judulB)}</div><div class="jdl krem c">${esc(k.judulC)}</div></div>
      ${k.ilus === false ? '' : `<div class="ilus-kepala">${ILUS.rak}</div>`}
      <div class="apa"><span class="pil">${esc(k.tanya)}</span><div class="kotak-putus">${teks(k.jawab)}</div></div></section>`,
    alat: (k) => `<section class="pita oranye"><div class="sp-alat">
      <div>${judulKolom(k.kiri.judul, k.kiri.sub)}<div class="daftar-nomor">${k.kiri.isi.map((x, i) => `<div><div class="t"><b>${esc(x.judul)}</b><span>${teks(x.teks)}</span></div><span class="bulat">${i + 1}</span></div>`).join('')}</div></div>
      <div>${judulKolom(k.kanan.judul, k.kanan.sub)}<div class="kartu-ilus">${k.kanan.isi.map((x) => `<div>${ILUS[x.ilus] || ''}<hr><b>${esc(x.judul)}</b><span>${teks(x.teks)}</span></div>`).join('')}</div>
        ${k.kanan.catatan ? `<div class="catatan-merah">${ILUS.estop}<div>${teks(k.kanan.catatan)}</div></div>` : ''}</div></div></section>`,
    web: (k) => `<section class="pita hijau sp-web"><div class="atas">${judulKolom(k.judulA, k.judulB, 'kuning')}${k.qr ? kotakQr(k.qr) : ''}</div>
      <div class="alir">${k.alur.map((x) => `<span>${esc(x)}</span>`).join('<i>→</i>')}</div>
      <div class="kolom-web" style="${kolom(k.isi.length)}">${k.isi.map((x, i) => `<div><span class="lingkar"><span>${i + 1}</span></span>${ILUS[x.ilus] || ''}<h4>${esc(x.judul)}</h4><hr><p>${teks(x.teks)}</p></div>`).join('')}</div></section>`,
    proker: (k) => `<section class="pita oranye sp-proker">${judulKolom(k.judulA, k.judulB)}
      <div class="proker-grid">${k.isi.map((x, i) => `<div class="${x.contoh ? 'contoh' : ''}"><span class="bulat">${i + 1}</span><div><h4>${esc(x.judul)}${cap(x)}</h4><p>${teks(x.teks)}</p>
        ${(x.waktu || x.sasaran || x.status) ? `<div class="meta">${[x.waktu, x.sasaran, x.status].filter(Boolean).map((m) => `<span>${esc(m)}</span>`).join('')}</div>` : ''}</div></div>`).join('')}</div></section>`,
    tim: (k) => {
      const orang = (window.ANGGOTA || []).map((p) => `<div class="orang">${p.foto ? `<img src="${PUBLIK}/tim/${esc(p.foto)}" alt="">` : ''}<div class="papan"><b>${esc(p.nama)}</b><span>${esc(p.jabatan)}</span></div></div>`);
      return `<section class="pita hijau sp-tim">${judulKolom(k.judulA, k.judulB, 'kuning')}
        <div class="tim-grid">${orang.slice(0, 4).join('')}</div><div class="tim-grid tiga">${orang.slice(4).join('')}</div>
        <div class="bawah"><div class="ajak"><div class="jdl kuning">${esc(k.ajakJudul)}</div><p>${teks(k.ajakTeks)}</p></div>${kotakQr(k.qr)}</div></section>`;
    },
  };
  if (D.tata === 'spanduk') {
    document.title = `Spanduk — ${D.kolom[0].judulC || D.kolom[0].judulA}`;
    document.body.className = 'spanduk';
    document.body.innerHTML = `<div class="sp-baris" style="grid-template-columns:${D.kolom.map((k) => k.px + 'px').join(' ')}">${D.kolom.map((k) => KOLOM[k.jenis](k)).join('')}</div>${KAKI}`;
    window.SIAP = true;
    return;
  }

  const h = D.hero;
  document.title = `Infografis — ${h.judulA}`;
  document.body.innerHTML = `
    <header class="kepala"><div class="latar"></div>
      <div class="logo-baris"><img class="kkn" src="${PUBLIK}/logo/kkn.png" alt=""><img src="${PUBLIK}/logo/arutmin.png" alt=""><img src="${PUBLIK}/logo/polytala.png" alt=""><img src="${PUBLIK}/logo/trkj.png" alt=""><b>KKN ARUTMIN ASIK 2026</b></div>
      <div class="judul-besar"><div class="jdl a">${esc(h.judulA)}</div><div class="jdl hijau b">${esc(h.judulB)}</div><div class="jdl krem c">${esc(h.judulC)}</div></div>
      <div class="ilus-kepala">${ILUS.rak}</div>
      <div class="apa"><span class="pil">${esc(h.tanya)}</span><div class="kotak-putus">${teks(h.jawab)}</div></div>
    </header>
    ${D.bagian.map((b) => BAGIAN[b.jenis](b)).join('')}
    <footer class="kaki"><img src="${PUBLIK}/logo/kkn.png" alt=""><div><b>Vertonik Smart Farm</b> · KKN Industri Politeknik Negeri Tanah Laut</div>
      <div class="kanan">Instagram &amp; TikTok <b>@kkn.arutminidn2026</b><br>© 2026 PT Arutmin Indonesia</div></footer>`;
  window.SIAP = true;
})();
