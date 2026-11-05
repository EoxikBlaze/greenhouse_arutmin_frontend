/* Perender template infografis. Data dari data/<nama>.js (window.DATA) + data/anggota.js (window.ANGGOTA).
   Teks mendukung **tebal**. Bagian yang didukung: alur · langkah · rantai · panel · anggota · proker · qr. */
(function () {
  'use strict';
  const D = window.DATA;
  const PUBLIK = '../../react-web-app/public';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const teks = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const garis = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const IKON = {
    sensor: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 15h9"/>',
    chip: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
    server: '<rect x="3.5" y="4" width="17" height="7" rx="2"/><rect x="3.5" y="13" width="17" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01M11 7.5h6M11 16.5h6"/>',
    hp: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    tetes: '<path d="M12 3c3 4 5 6.6 5 9.5a5 5 0 0 1-10 0C7 9.6 9 7 12 3z"/>',
    gembok: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><path d="M12 14.5v2.5"/>',
    stop: '<path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2z"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
    lonceng: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
    daun: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l8-8"/>',
    gedung: '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M4 21h16"/>',
    toga: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>',
    orang: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-4 3.2-6 6.5-6s6 2 6.5 6"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14c2.6.2 4.5 2 5 5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
    kalender: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    termometer: '<path d="M10 4a2 2 0 0 1 4 0v10.3a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
    awan: '<path d="M7 18a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.5A3.3 3.3 0 0 1 17 18z"/><path d="M9 21h.01M13 21h.01"/>',
    pelampung: '<path d="M3 15c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0"/><path d="M12 3v9"/><ellipse cx="12" cy="11" rx="4" ry="2.5"/>',
    pompa: '<rect x="4" y="7" width="12" height="11" rx="2"/><circle cx="10" cy="12.5" r="3"/><path d="M16 10h3a1 1 0 0 1 1 1v6M10 7V4h5"/>',
    katup: '<path d="M2 15h20"/><path d="M2 12v6M22 12v6"/><rect x="8" y="5" width="8" height="7" rx="1.5"/><path d="M12 12v3"/>',
    layar: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="M7 12l3-3 2 2 4-4"/>',
    kunci: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
    obrolan: '<path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  };
  const ikon = (n) => `<span class="ikon">${garis(IKON[n] || IKON.daun)}</span>`;
  const PERCIKAN = '<svg viewBox="0 0 40 40"><g stroke="#F5A81C" stroke-width="4" stroke-linecap="round"><path d="M6 20h14"/><path d="M10 9l11 6"/><path d="M10 31l11-6"/></g></svg>';
  const SPLASH = `<g fill="#14295E">                     <path d="M729.7 112.0 C731.1 114.7 738.8 117.5 739.0 120.2 C739.2 122.9 732.3 125.4 730.7 128.1 C729.1 130.9 723.5 132.8 729.6 136.6 C735.7 140.4 771.9 148.5 767.2 151.0 C762.6 153.5 716.6 150.7 701.7 151.8 C686.9 152.9 685.7 155.7 678.2 157.7 C670.7 159.6 662.7 161.2 656.7 163.7 C650.8 166.3 650.8 171.0 642.6 172.8 C634.4 174.5 617.5 173.0 607.7 174.4 C597.9 175.7 592.2 178.7 583.9 180.9 C575.7 183.1 565.3 183.5 558.2 187.8 C551.1 192.1 552.1 205.6 541.4 206.7 C530.7 207.9 507.8 196.8 494.0 194.9 C480.3 193.0 470.7 195.1 459.1 195.3 C447.5 195.5 436.2 196.1 424.6 196.2 C413.1 196.2 401.4 196.3 390.0 195.8 C378.6 195.2 367.4 193.5 356.1 192.9 C344.8 192.4 334.0 192.1 322.3 192.5 C310.5 192.9 296.3 196.3 285.7 195.3 C275.1 194.2 274.7 183.3 258.9 186.1 C243.1 189.0 201.6 213.3 191.1 212.5 C180.5 211.7 200.7 186.6 195.6 181.1 C190.6 175.7 169.8 181.3 160.6 179.7 C151.5 178.1 146.6 174.3 140.7 171.5 C134.9 168.8 133.2 165.1 125.6 163.1 C118.0 161.0 104.4 160.8 95.1 159.2 C85.7 157.6 74.0 155.9 69.6 153.3 C65.2 150.7 73.7 146.3 68.9 143.6 C64.1 141.0 58.0 139.3 40.7 137.5 C23.5 135.7 -31.1 135.6 -34.4 132.8 C-37.8 130.0 7.3 124.2 20.7 120.7 C34.2 117.2 44.3 114.9 46.2 112.0 C48.1 109.1 34.4 106.4 32.3 103.6 C30.3 100.8 31.4 97.8 33.9 95.0 C36.5 92.3 45.0 90.0 47.7 87.1 C50.4 84.3 52.6 81.8 50.2 78.0 C47.7 74.1 26.5 66.5 32.9 64.0 C39.2 61.6 75.5 64.6 88.3 63.3 C101.0 62.0 101.5 58.3 109.3 56.2 C117.1 54.1 125.4 51.8 135.3 50.5 C145.3 49.1 160.0 50.0 169.0 48.1 C178.0 46.2 179.2 40.2 189.3 39.2 C199.5 38.2 219.1 43.2 229.9 42.2 C240.6 41.1 246.3 37.9 253.7 32.9 C261.1 27.9 264.0 14.9 274.2 12.2 C284.5 9.5 301.8 14.3 315.2 16.4 C328.6 18.5 342.2 22.7 354.6 24.8 C367.1 26.8 378.2 28.8 390.0 28.7 C401.8 28.6 413.7 24.7 425.5 24.0 C437.4 23.3 450.0 23.2 461.1 24.6 C472.1 25.9 480.4 31.4 491.6 32.3 C502.9 33.3 514.8 31.9 528.8 30.3 C542.8 28.7 566.1 20.7 575.6 22.6 C585.2 24.5 580.8 37.3 586.1 41.8 C591.4 46.4 598.8 47.9 607.2 49.8 C615.6 51.8 627.0 52.1 636.3 53.5 C645.6 55.0 655.8 56.4 663.1 58.4 C670.4 60.5 673.7 63.6 680.2 65.9 C686.6 68.2 688.5 70.8 701.5 72.2 C714.4 73.6 751.3 71.9 757.8 74.3 C764.3 76.6 742.4 83.0 740.4 86.4 C738.3 89.9 747.2 92.1 745.5 95.1 C743.9 98.0 733.1 101.2 730.5 104.0 C727.8 106.8 728.3 109.3 729.7 112.0 Z" />                                          <path d="M214 184 C212 196 210 206 213 213 C216 220 226 220 228 212 C230 204 226 194 224 184 Z" />                     <path d="M508 186 C507 194 506 200 508 204 C510 208 516 208 517 203 C518 198 516 192 515 186 Z" />                     <path d="M618 178 C616 192 614 200 617 206 C620 212 628 211 629 205 C630 199 627 190 626 178 Z" />                   </g>
    <g fill="#14295E"><circle cx="22" cy="58" r="7"/><circle cx="8" cy="84" r="3.5"/><circle cx="44" cy="30" r="4"/><circle cx="760" cy="62" r="6"/><circle cx="774" cy="96" r="3"/><circle cx="736" cy="196" r="5"/><circle cx="300" cy="8" r="4.5"/><circle cx="470" cy="12" r="3"/><circle cx="96" cy="200" r="4"/></g>
    <g fill="#F5B833"><circle cx="58" cy="182" r="5"/><circle cx="742" cy="30" r="4.5"/><circle cx="404" cy="214" r="3.5"/><circle cx="168" cy="14" r="3"/></g>`;
  // palet kolase kartu tim — sama dengan PALET di TentangPage.tsx
  const PALET = [
    { a: '#FFD45E', b: '#F5A81C', x: '#0A1F38', y: '#8F1D2C' }, { a: '#7FE0C2', b: '#1FA37F', x: '#0A1F38', y: '#E9CD53' },
    { a: '#9CC4FF', b: '#3F7BEA', x: '#8F1D2C', y: '#0A1F38' }, { a: '#FF9E8A', b: '#E5533D', x: '#0A1F38', y: '#E9CD53' },
    { a: '#C9B6FF', b: '#7A5CFF', x: '#0A1F38', y: '#FFD45E' }, { a: '#D8EE8A', b: '#8FBF2F', x: '#8F1D2C', y: '#0A1F38' },
    { a: '#FFC4DF', b: '#E8589B', x: '#0A1F38', y: '#E9CD53' },
  ];
  const kolom = (n) => `grid-template-columns:repeat(${n},1fr)`;
  const cap = (x) => (x && x.contoh ? '<span class="contoh-cap">contoh</span>' : '');
  const kelasContoh = (x) => (x && x.contoh ? ' contoh' : '');

  function judulBagian(b, gelap) {
    return `${b.eyebrow ? `<div class="eyebrow">${teks(b.eyebrow)}</div>` : ''}${b.judul ? `<h2>${teks(b.judul)}</h2>` : ''}`;
  }

  const BAGIAN = {
    alur: (b) => `<section class="bagian">${judulBagian(b)}<div class="alur" style="${kolom(b.isi.length)}">${b.isi.map((x) =>
      `<div class="simpul kartu">${ikon(x.ikon)}<h3>${teks(x.judul)}</h3><span class="tag">${teks(x.tag)}</span><p>${teks(x.teks)}</p></div>`).join('')}</div></section>`,
    langkah: (b) => `<section class="bagian">${judulBagian(b)}<div class="langkah-grid" style="${kolom(b.kolom || b.isi.length)}">${b.isi.map((x, i) =>
      `<div class="langkah kartu${kelasContoh(x)}"><span class="no">${String(i + 1).padStart(2, '0')}</span><h3>${teks(x.judul)}${cap(x)}</h3><p>${teks(x.teks)}</p></div>`).join('')}</div></section>`,
    rantai: (b) => `<section class="bagian">${judulBagian(b)}<div class="resep kartu"><div class="rantai">${b.isi.map((x) =>
      `<span class="chip ${x.gaya || 'b'}">${teks(x.teks)}</span>`).join('<span class="panah">→</span>')}</div>${b.catatan ? `<p class="catatan">${teks(b.catatan)}</p>` : ''}</div></section>`,
    panel: (b) => `<section class="gelap">${judulBagian(b)}${b.angka ? `<div class="angka-grid" style="${kolom(b.angka.length)}">${b.angka.map((x) =>
      `<div><strong>${esc(x.nilai)}${x.satuan ? `<small>${esc(x.satuan)}</small>` : ''}</strong><span>${teks(x.label)}</span></div>`).join('')}</div>` : ''}${b.butir ? `<div class="butir-grid" style="${kolom(b.butir.length)}">${b.butir.map((x) =>
      `<div>${ikon(x.ikon)}<div><h4>${teks(x.judul)}</h4><p>${teks(x.teks)}</p></div></div>`).join('')}</div>` : ''}</section>`,
    anggota: (b) => {
      const orang = window.ANGGOTA || [];
      const baris = b.baris || [3, 4];
      let i = 0;
      return `<section class="bagian">${judulBagian(b)}${baris.map((n) => `<div class="anggota-baris" style="${kolom(n)}">${orang.slice(i, i + n).map((p) => {
        const pal = PALET[i++ % PALET.length];
        return `<div class="anggota kaca"><div class="panggung"><i class="utama" style="background:linear-gradient(135deg,${pal.a},${pal.b})"></i><i class="kiri" style="background:${pal.x}"></i><i class="kanan" style="background:${pal.y}"></i></div>
          ${p.foto ? `<img src="${PUBLIK}/tim/${esc(p.foto)}" alt="">` : ''}<div class="teks"><div class="nama">${esc(p.nama)}</div><div class="jabatan">${esc(p.jabatan)}</div></div></div>`;
      }).join('')}</div>`).join('')}</section>`;
    },
    proker: (b) => `<section class="bagian">${judulBagian(b)}<div class="proker" style="${kolom(b.kolom || 2)}">${b.isi.map((x, i) =>
      `<div class="kartu${kelasContoh(x)}"><span class="no">${i + 1}</span><div><h3>${teks(x.judul)}${cap(x)}</h3><p>${teks(x.teks)}</p>${(x.waktu || x.status || x.sasaran) ? `<div class="meta">${x.waktu ? `<span>${esc(x.waktu)}</span>` : ''}${x.sasaran ? `<span>${esc(x.sasaran)}</span>` : ''}${x.status ? `<span class="status">${esc(x.status)}</span>` : ''}</div>` : ''}</div></div>`).join('')}</div></section>`,
    qr: (b) => {
      const q = qrcode(0, 'M');
      q.addData(b.url);
      q.make();
      return `<section class="qr kaca"><div class="kode">${q.createSvgTag({ cellSize: 4, margin: 0, scalable: true })}</div><div><div class="eyebrow">${teks(b.eyebrow || 'Scan di sini')}</div><h3>${teks(b.judul)}</h3><p>${teks(b.teks)}</p><span class="url">${esc(b.label || b.url)}</span></div></section>`;
    },
  };

  /* ── tata spanduk 3 × 1 m (gaya Tentang): kolom berdampingan, lebar = DATA.kolom[].px ── */
  const LOGO = `<div class="pil-logo kaca"><img class="kkn" src="${PUBLIK}/logo/kkn.png" alt="KKN Arutmin Asik 2026"><b>PT Arutmin Indonesia</b><span class="garis"></span>
    <img src="${PUBLIK}/logo/arutmin.png" alt=""><img src="${PUBLIK}/logo/polytala.png" alt=""><img src="${PUBLIK}/logo/trkj.png" alt=""></div>`;
  const qrSvg = (url) => { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); };
  const kartuQr = (k) => `<div class="qr kaca"><div class="kode">${qrSvg(k.qr)}</div><div><div class="eyebrow">Scan di sini</div><h3>${teks(k.qrJudul)}</h3><p>${teks(k.qrTeks)}</p><span class="url">@kkn.arutminidn2026</span></div></div>`;
  const KOLOM = {
    kepala: (k) => `<section class="sp-kepala">${LOGO}
      <div class="plakat"><svg viewBox="0 0 780 224" preserveAspectRatio="none" aria-hidden="true">${SPLASH}</svg>
        <h1><span class="a">${esc(k.judulA)}</span><span class="b">${esc(k.judulB)}</span></h1></div>
      <div class="pil-gelap">${esc(k.pita)}</div>
      <div class="skrip">${PERCIKAN}<span>${esc(k.skrip)}</span><span style="display:contents">${PERCIKAN.replace('<svg', '<svg style="transform:scaleX(-1)"')}</span></div>
      ${k.lead ? `<p class="lead kaca">${teks(k.lead)}</p>` : ''}
      ${k.strip ? `<div class="strip kaca">${k.strip.map((x) => `<div><strong>${esc(x.nilai)}</strong><span>${esc(x.label)}<br><small>${esc(x.ket)}</small></span></div>`).join('')}</div>` : ''}</section>`,
    alat: (k) => `<section class="sp-kolom">${judulBagian(k)}<div class="sp-alat">
      <div><h3 class="sub">${esc(k.kiri.judul)}</h3><div class="sp-daftar">${k.kiri.isi.map((x) => `<div class="kartu">${ikon(x.ikon)}<div><h4>${esc(x.judul)}</h4><p>${teks(x.teks)}</p></div></div>`).join('')}</div></div>
      <div><h3 class="sub">${esc(k.kanan.judul)}</h3><div class="sp-aktuator">${k.kanan.isi.map((x) => `<div class="kartu">${ikon(x.ikon)}<h4>${esc(x.judul)}</h4><p>${teks(x.teks)}</p></div>`).join('')}</div>
        <div class="sp-estop">${ikon('stop')}<p>${teks(k.kanan.catatan)}</p></div></div></div></section>`,
    web: (k) => `<section class="sp-kolom">${judulBagian(k)}<div class="sp-alir">${k.alur.map((x) => `<span>${esc(x)}</span>`).join('<i>→</i>')}</div>
      <div class="sp-langkah">${k.isi.map((x, i) => `<div class="langkah kartu"><span class="no">${String(i + 1).padStart(2, '0')}</span>${ikon(x.ikon)}<h3>${esc(x.judul)}</h3><p>${teks(x.teks)}</p></div>`).join('')}</div>
      ${kartuQr(k)}</section>`,
    proker: (k) => `<section class="sp-kolom">${judulBagian(k)}<div class="sp-proker">${k.isi.map((x, i) => `<div class="langkah kartu${kelasContoh(x)}"><span class="no">${String(i + 1).padStart(2, '0')}</span>
      <h3>${teks(x.judul)}${cap(x)}</h3><p>${teks(x.teks)}</p>${(x.waktu || x.sasaran || x.status) ? `<div class="meta">${[x.waktu, x.sasaran].filter(Boolean).map((m) => `<span>${esc(m)}</span>`).join('')}${x.status ? `<span class="status">${esc(x.status)}</span>` : ''}</div>` : ''}</div>`).join('')}</div></section>`,
    // sponsor & media partner: logo dari folder aset/ (DATA ... logo: 'aset/x.png'); tanpa logo → kotak isian contoh
    mitra: (k) => {
      const kotak = (x, jenis) => `<div class="sp-logo kartu${x.logo ? '' : ' contoh'}">${x.logo
        ? `<img src="${esc(x.logo)}" alt="${esc(x.nama)}">`
        : `<span class="kosong">Logo ${esc(jenis)}</span>`}<b>${esc(x.nama)}</b>${x.logo ? '' : '<span class="contoh-cap">contoh</span>'}</div>`;
      const grup = (judul, isi, jenis) => `<div class="sp-grup"><h3 class="sub">${esc(judul)}</h3><div class="sp-logo-grid" style="${kolom(isi.length)}">${isi.map((x) => kotak(x, jenis)).join('')}</div></div>`;
      const utama = (k.utama || []).map((x) => `<div class="sp-utama kartu">${x.logo ? `<img src="${esc(x.logo)}" alt="${esc(x.nama)}">` : ''}<div><span class="tag">Sponsor utama</span><b>${esc(x.nama)}</b></div></div>`).join('');
      return `<section class="sp-kolom sp-mitra">${judulBagian(k)}${utama}${grup(`${k.sponsor.length} Sponsor`, k.sponsor, 'sponsor')}${grup(`${k.media.length} Media partner`, k.media, 'media partner')}
        ${k.catatan ? `<p class="sp-catatan">${teks(k.catatan)}</p>` : ''}</section>`;
    },
    tim: (k) => `<section class="sp-kolom sp-tim">${judulBagian(k)}${BAGIAN.anggota({ baris: [4, 3] }).replace(/^<section class="bagian">|<\/section>$/g, '')}${kartuQr(k)}</section>`,
  };
  if (D.tata === 'spanduk') {
    document.title = `Spanduk — ${D.kolom[0].judulA} ${D.kolom[0].judulB}`;
    document.body.className = 'spanduk';
    // ukuran kanvas dari data (3 × 1 m = 3000 × 1000, 4 × 1 m = 4000 × 1000)
    for (const el of [document.documentElement, document.body]) { el.style.width = `${D.lebar}px`; el.style.height = `${D.tinggi}px`; }
    document.body.innerHTML = `<div class="latar"></div><div class="sp-baris" style="grid-template-columns:${D.kolom.map((k) => k.px + 'px').join(' ')}">${D.kolom.map((k) => KOLOM[k.jenis](k)).join('')}</div>
      <footer class="kaki"><img class="logo" src="${PUBLIK}/logo/kkn.png" alt=""><div class="nama"><b>Vertonik Smart Farm</b><span>KKN Industri · Politeknik Negeri Tanah Laut di PT Arutmin Indonesia</span></div>
      <div class="sosial">Instagram &amp; TikTok <b>@kkn.arutminidn2026</b><small>© 2026 PT Arutmin Indonesia · Vertonik Smart Farm</small></div></footer>`;
    window.SIAP = true;
    return;
  }

  const h = D.hero;
  document.title = `Infografis — ${h.judulA} ${h.judulB}`;
  document.body.innerHTML = `
    <div class="latar"></div>
    <main class="isi">
      <div class="pil-logo kaca">
        <img class="kkn" src="${PUBLIK}/logo/kkn.png" alt="KKN Arutmin Asik 2026"><b>PT Arutmin Indonesia</b><span class="garis"></span>
        <img src="${PUBLIK}/logo/arutmin.png" alt="PT Arutmin Indonesia"><img src="${PUBLIK}/logo/polytala.png" alt="Politeknik Negeri Tanah Laut"><img src="${PUBLIK}/logo/trkj.png" alt="TRKJ">
      </div>
      <div class="plakat"><svg viewBox="0 0 780 224" preserveAspectRatio="none" aria-hidden="true">${SPLASH}</svg>
        <h1><span class="a" style="${h.ukuranA ? `font-size:${h.ukuranA}px` : ''}">${esc(h.judulA)}</span><span class="b">${esc(h.judulB)}</span></h1></div>
      ${h.pita ? `<div class="pil-gelap">${esc(h.pita)}</div>` : ''}
      ${h.skrip ? `<div class="skrip">${PERCIKAN}<span>${esc(h.skrip)}</span><span style="display:contents">${PERCIKAN.replace('<svg', '<svg style="transform:scaleX(-1)"')}</span></div>` : ''}
      ${h.lead ? `<p class="lead">${teks(h.lead)}</p>` : ''}
      ${h.strip ? `<div class="strip kaca" style="${kolom(h.strip.length)}">${h.strip.map((x) => `<div><strong>${esc(x.nilai)}</strong><span>${esc(x.label)}<br><small>${esc(x.ket)}</small></span></div>`).join('')}</div>` : ''}
      ${D.bagian.map((b) => BAGIAN[b.jenis](b)).join('')}
    </main>
    <footer class="kaki">
      <img class="logo" src="${PUBLIK}/logo/kkn.png" alt="">
      <div class="nama"><b>${esc(D.kaki?.nama || 'Vertonik Smart Farm')}</b><span>${esc(D.kaki?.sub || 'KKN Industri · Politeknik Negeri Tanah Laut')}</span></div>
      <div class="sosial">Instagram &amp; TikTok <b>@kkn.arutminidn2026</b><small>© 2026 PT Arutmin Indonesia · Vertonik Smart Farm</small></div>
    </footer>`;
  if (D.tinggi) document.body.style.minHeight = D.tinggi + 'px';
  window.SIAP = true;
})();
