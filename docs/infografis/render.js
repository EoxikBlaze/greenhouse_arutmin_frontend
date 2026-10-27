// Render template.html → hasil/<nama>.png (2×) dan hasil/<nama>.pdf (1 halaman, isi gambar PNG).
// Butuh Playwright:  npm i playwright && npx playwright install chromium-headless-shell
// Pakai (dari folder ini):  node render.js            → semua data di data/ (kecuali anggota.js)
//                           node render.js vertonik   → satu poster
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const semua = fs.readdirSync(path.join(__dirname, 'data')).filter((f) => f.endsWith('.js') && f !== 'anggota.js').map((f) => f.slice(0, -3));
const daftar = process.argv.slice(2).length ? process.argv.slice(2) : semua;

(async () => {
  const b = await chromium.launch();
  fs.mkdirSync(path.join(__dirname, 'hasil'), { recursive: true });
  for (const nama of daftar) {
    // ukuran & skala dari file data: DATA.lebar / DATA.tinggi (px CSS), DATA.skala (bawaan 2×)
    const isi = fs.readFileSync(path.join(__dirname, 'data', nama + '.js'), 'utf8');
    const angka = (k, bawaan) => Number((isi.match(new RegExp(`\\b${k}:\\s*(\\d+)`)) || [])[1]) || bawaan;
    const lebar = angka('lebar', 1080); const skala = angka('skala', 2);
    const p = await b.newPage({ viewport: { width: lebar, height: angka('tinggi', 1920) }, deviceScaleFactor: skala });
    await p.goto('file://' + path.join(__dirname, 'template.html') + '?data=' + encodeURIComponent(nama), { waitUntil: 'networkidle' });
    await p.waitForFunction(() => window.SIAP === true);
    await p.evaluate(() => document.fonts.ready);
    const tinggi = await p.evaluate(() => Math.ceil(document.body.scrollHeight));
    await p.setViewportSize({ width: lebar, height: tinggi });
    const png = path.join(__dirname, 'hasil', nama + '.png');
    await p.screenshot({ path: png });
    // PDF dari PNG: cetak vektor Chrome merusak efek kaca/bayangan (kotak gelap)
    const q = await b.newPage();
    await q.setContent(`<style>@page{size:${lebar}px ${tinggi}px;margin:0}html,body{margin:0}img{display:block;width:${lebar}px;height:${tinggi}px}</style><img src="data:image/png;base64,${fs.readFileSync(png).toString('base64')}">`);
    await q.pdf({ path: path.join(__dirname, 'hasil', nama + '.pdf'), width: lebar + 'px', height: tinggi + 'px', printBackground: true, pageRanges: '1' });
    console.log(`${nama}: ${lebar}×${tinggi} (PNG ${lebar * skala}×${tinggi * skala})`);
    await p.close(); await q.close();
  }
  await b.close();
})();
