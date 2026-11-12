// Pembangun infografis GARAP: satu sumber konten (tools/konten/NN.mjs) → Markdown Canva + HTML preview + ikon SVG.
// Jalankan dari akar repo:  node GARAP-INFOGRAPHICS/tools/bangun.mjs
// Ikon diambil dari paket lucide-react yang sudah terpasang di react-web-app (set ikon yang sama dengan website).
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const AKAR = join(dirname(fileURLToPath(import.meta.url)), '..')
const LUCIDE = join(AKAR, '../react-web-app/node_modules/lucide-react/dist/esm/icons')
const HTML_DIR = join(AKAR, '03-HTML-PREVIEW')
const MD_DIR = join(AKAR, '02-INFOGRAPHIC-MARKDOWN')
const IKON_DIR = join(AKAR, '04-ASSETS/icons')

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// Teks konten boleh memakai `kode` dan **tebal** (format mini, sama untuk HTML & Markdown).
const teks = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

const cacheIkon = new Map()
async function ikonSvg(nama) {
  if (cacheIkon.has(nama)) return cacheIkon.get(nama)
  const modul = await import(pathToFileURL(join(LUCIDE, `${nama}.mjs`)).href).catch(() => {
    throw new Error(`Ikon lucide "${nama}" tidak ditemukan`)
  })
  // Nama alias (mis. history → rotate-ccw-clock) hanya mengekspor ulang komponen; datanya ada di berkas asal.
  const asal = (await readFile(join(LUCIDE, `${nama}.mjs`), 'utf8')).match(/from '\.\/([a-z0-9-]+)\.mjs'/)
  const { __iconData } = modul.__iconData ? modul : await import(pathToFileURL(join(LUCIDE, `${asal[1]}.mjs`)).href)
  const isi = __iconData.node.map(([tag, at]) => `<${tag} ${Object.entries(at).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('')
  cacheIkon.set(nama, isi)
  await writeFile(join(IKON_DIR, `${nama}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D452F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${isi}</svg>\n`)
  return isi
}
const ikon = async (n) => (n ? `<svg class="ikon" viewBox="0 0 24 24" aria-hidden="true">${await ikonSvg(n)}</svg>` : '')

/* ── blok → HTML ── */
const kepalaSeksi = (b) => (b.judul ? `<div class="seksi-kepala">${b.eyebrow ? `<div class="eyebrow">${esc(b.eyebrow)}</div>` : ''}<h2>${teks(b.judul)}</h2>${b.lead ? `<p class="lead">${teks(b.lead)}</p>` : ''}</div>` : '')

const RENDER = {
  async kartu(b) {
    const item = await Promise.all(b.item.map(async (i) => `<div class="kartu butir${i.nada ? ` nada-${i.nada}` : ''}">
      ${i.ikon ? `<div class="lingkar">${await ikon(i.ikon)}</div>` : ''}
      ${i.lencana ? `<span class="lencana ${i.lencana[1] || ''}">${esc(i.lencana[0])}</span>` : ''}
      <h3>${teks(i.judul)}</h3>${i.teks ? `<p>${teks(i.teks)}</p>` : ''}
      ${i.poin ? `<ul>${i.poin.map((p) => `<li>${teks(p)}</li>`).join('')}</ul>` : ''}</div>`))
    return `<div class="grid k${b.kolom || 3}">${item.join('')}</div>`
  },
  async langkah(b) {
    const item = await Promise.all(b.item.map(async (i, n) => `<div class="kartu langkah-item"><div class="no">${i.no ?? n + 1}</div><div>
      <h3>${await ikon(i.ikon)}${teks(i.judul)}</h3><p>${teks(i.teks)}</p>${i.aksi ? `<span class="aksi${i.aksiBahaya ? ' bahaya' : ''}">${esc(i.aksi)}</span>` : ''}</div></div>`))
    return `<div class="langkah${b.kolom === 2 ? ' k2' : ''}">${item.join('')}</div>`
  },
  async alur(b) {
    const panah = await ikon('arrow-right')
    const item = await Promise.all(b.item.map(async (i) => `<div class="kartu alur-item"><div class="lingkar">${await ikon(i.ikon)}</div><h3>${teks(i.judul)}</h3><p>${teks(i.teks)}</p></div>`))
    return `<div class="alur">${item.join(`<div class="alur-panah">${panah}</div>`)}</div>`
  },
  async peringatan(b) {
    return `<div class="peringatan ${b.nada}" role="note"><div class="lingkar">${await ikon(b.ikon || (b.nada === 'info' ? 'info' : 'triangle-alert'))}</div><div>
      <h3>${teks(b.judulKotak)}</h3>${b.teks ? `<p>${teks(b.teks)}</p>` : ''}${b.poin ? `<ul>${b.poin.map((p) => `<li>${teks(p)}</li>`).join('')}</ul>` : ''}</div></div>`
  },
  async tabel(b) {
    const kepala = b.kolom.map((k) => `<th scope="col">${esc(k)}</th>`).join('')
    const baris = b.baris.map((r) => `<tr>${r.map((sel, i) => {
      const isi = Array.isArray(sel) ? sel.map((x) => (typeof x === 'object' ? `<span class="peran ${x.peran}">${esc(x.label)}</span>${teks(x.teks)}` : teks(x))).join('<br>') : teks(sel)
      return `<td data-label="${esc(b.kolom[i])}">${isi}</td>`
    }).join('')}</tr>`).join('')
    return `<table class="tabel"><thead><tr>${kepala}</tr></thead><tbody>${baris}</tbody></table>`
  },
  async gambar(b) {
    return `<figure class="gambar"><img src="../04-ASSETS/screenshots/${esc(b.src)}" alt="${esc(b.alt)}" loading="lazy"><figcaption>${teks(b.keterangan)}</figcaption></figure>`
  },
  async diagram(b) { return `<div class="diagram" role="img" aria-label="${esc(b.alt)}">${b.svg}</div>` },
  async dua(b) { return `<div class="grid k2" style="align-items:start">${(await Promise.all(b.isi.map(renderBlok))).join('')}</div>` },
}
async function renderBlok(b) {
  const isi = await RENDER[b.tipe](b)
  return b.judul ? `<section class="seksi">${kepalaSeksi(b)}${isi}</section>` : isi
}

async function halaman(k, sebelum, sesudah) {
  const blok = (await Promise.all(k.blok.map(renderBlok))).join('\n')
  const pembaca = k.pembaca.map((p) => `<span class="chip-gelap">${esc(p)}</span>`).join('')
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(k.judulPendek)} — Infografis GARAP</title>
<link rel="stylesheet" href="garap-infografis.css"></head>
<body>
<nav class="alat" aria-label="Navigasi preview"><a href="index.html">← Semua infografis</a>
<div class="alat-kanan">${sebelum ? `<a class="tombol tombol-kaca" href="${sebelum}">Sebelumnya</a>` : ''}${sesudah ? `<a class="tombol tombol-kaca" href="${sesudah}">Berikutnya</a>` : ''}
<button class="tombol tombol-primer" type="button" onclick="window.print()">Cetak / PDF</button></div></nav>
<main class="kanvas">
<header class="kepala"><div class="kepala-eyebrow"><span class="nomor">INFOGRAFIS ${k.no}</span><span>GARAP · Vertonik Smart Farm</span></div>
<h1>${teks(k.judul)}</h1><p class="sub">${teks(k.subjudul)}</p><div class="pembaca">${pembaca}</div></header>
<div class="isi">
${blok}
</div>
<footer class="kaki"><div class="sumber"><strong>Sumber data</strong> · ${teks(k.sumber)}</div><div>Versi 1.0 · 12 Nov 2026</div></footer>
</main></body></html>
`
}

/* ── blok → Markdown (teks siap salin ke Canva) ── */
const mdTeks = (s) => String(s)
function mdBlok(b, n) {
  const kepala = b.judul ? `### ${n}. ${b.eyebrow ? `[${b.eyebrow}] ` : ''}${mdTeks(b.judul)}\n${b.lead ? `\n${mdTeks(b.lead)}\n` : ''}\n` : ''
  const isi = {
    kartu: () => b.item.map((i) => `- **${i.judul}**${i.lencana ? ` _(${i.lencana[0]})_` : ''}${i.teks ? ` — ${i.teks}` : ''}${i.poin ? '\n' + i.poin.map((p) => `  - ${p}`).join('\n') : ''}${i.ikon ? `  \n  _ikon: ${i.ikon}.svg_` : ''}`).join('\n'),
    langkah: () => b.item.map((i, x) => `${i.no ?? x + 1}. **${i.judul}** — ${i.teks}${i.aksi ? ` [tombol: ${i.aksi}]` : ''}`).join('\n'),
    alur: () => b.item.map((i) => `**${i.judul}** (${i.teks})`).join(' → '),
    peringatan: () => `> **${b.nada === 'bahaya' ? '⛔' : b.nada === 'waspada' ? '⚠️' : 'ℹ️'} ${b.judulKotak}**\n${b.teks ? `> ${b.teks}\n` : ''}${(b.poin || []).map((p) => `> - ${p}`).join('\n')}`,
    tabel: () => `| ${b.kolom.join(' | ')} |\n|${b.kolom.map(() => '---').join('|')}|\n` + b.baris.map((r) => `| ${r.map((s) => (Array.isArray(s) ? s.map((x) => (typeof x === 'object' ? `**${x.label}:** ${x.teks}` : x)).join('<br>') : s)).join(' | ')} |`).join('\n'),
    gambar: () => `![${b.alt}](../04-ASSETS/screenshots/${b.src})\n\n_${b.keterangan}_`,
    diagram: () => b.md,
    dua: () => b.isi.map((x, i) => mdBlok(x, `${n}.${i + 1}`)).join('\n\n'),
  }[b.tipe]()
  return kepala + isi
}

function markdown(k) {
  const urut = k.blok.map((b, i) => `${i + 1}. ${b.judul || b.judulKotak || b.tipe}`).join('\n')
  return `# Infografis ${k.no} — ${k.judul}

| Item | Isi |
|---|---|
| **Judul** | ${k.judul} |
| **Subjudul** | ${k.subjudul} |
| **Tujuan komunikasi** | ${k.tujuan} |
| **Target pembaca** | ${k.pembaca.join(', ')} |
| **Ukuran desain** | Poster panjang lebar **1200 px**, tinggi mengikuti isi (±2.100–3.050 px). Cetak: **A3 potret, 2 halaman** (lebar kanvas = lebar A3). Alternatif media sosial: carousel 1080 × 1350 px, satu seksi per slide. |
| **Preview HTML** | \`03-HTML-PREVIEW/infographic-${k.no}.html\` |

## 1. Struktur layout

${k.layout}

## 2. Urutan informasi

${urut}

## 3. Konten final (siap salin ke Canva)

**Header (navy):** eyebrow \`INFOGRAFIS ${k.no} · GARAP · Vertonik Smart Farm\`
**Judul:** ${k.judul}
**Subjudul:** ${k.subjudul}
**Label pembaca:** ${k.pembaca.join(' · ')}

${k.blok.map((b, i) => mdBlok(b, i + 1)).join('\n\n')}

**Footer (navy):** Sumber data · ${k.sumber} — Versi 1.0 · 12 Nov 2026

## 4. Arahan ilustrasi

${k.ilustrasi}

## 5. Warna yang digunakan

${k.warna || `- Header & footer: navy \`#0A1F38\` → \`#071527\`; eyebrow emas \`#E9CD53\`.
- Latar isi: \`#F4F7F2\`; kartu putih \`#FFFFFF\`, border \`#E2E8DD\`, radius 20 px.
- Lingkar ikon: mint \`#CFE2CE\` + ikon forest \`#2D452F\`; nomor langkah forest \`#2D452F\`.
- Teks: tinta \`#0B1A2B\`, sekunder abu \`#4F6075\`.
- Status: sukses moss \`#6B9D4A\`, peringatan amber \`#E0A42B\`, bahaya merah \`#C0392B\`.`}

## 6. Tipografi

- Judul: Space Grotesk Bold 56 px (cetak A3 ±40 pt), putih.
- Subjudul: Inter Regular 22 px, putih 78%.
- Judul seksi: Space Grotesk Bold 28 px; eyebrow Inter Bold 13 px kapital, spasi huruf 14%.
- Judul kartu: Space Grotesk/Inter SemiBold 19 px; isi Inter 15–16 px abu \`#4F6075\`.
- Kode/topik: monospace 14 px dalam kotak \`#F4F7F2\`.

## 7. Catatan desain

${k.catatan.map((c) => `- ${c}`).join('\n')}
- Ikuti \`01-DESIGN-SYSTEM/GARAP_Design_Reference.md\`; ikon SVG ada di \`04-ASSETS/icons/\`.

## 8. Peringatan keselamatan

${k.keselamatan || '- Tidak ada peringatan khusus selain aturan umum: jangan menyentuh panel listrik dengan tangan basah.'}
`
}

/* ── index ── */
function indeks(semua) {
  const kartu = semua.map((k) => `<a href="infographic-${k.no}.html"><article class="kartu butir"><div class="nomor">${k.no}</div><h3>${esc(k.judulPendek)}</h3><p>${esc(k.subjudul)}</p><span class="lencana netral">${esc(k.pembaca.join(' · '))}</span></article></a>`).join('\n')
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Infografis GARAP</title><link rel="stylesheet" href="garap-infografis.css"></head>
<body style="background:var(--page)">
<header class="kepala"><div class="kepala-eyebrow"><span class="nomor">SERI INFOGRAFIS</span><span>GARAP · Vertonik Smart Farm</span></div>
<h1>Panduan Visual GARAP – Smart Hidroponik</h1><p class="sub">10 infografis untuk operator, teknisi, admin, pengelola greenhouse, dan mitra. Klik untuk membuka; setiap halaman punya tombol Cetak / PDF (A3 potret).</p></header>
<main class="galeri">${kartu}</main>
<footer class="kaki"><div class="sumber"><strong>Acuan desain</strong> · 01-DESIGN-SYSTEM/GARAP_Design_Reference.md · teks Canva di 02-INFOGRAPHIC-MARKDOWN/</div><div>Versi 1.0 · 12 Nov 2026</div></footer>
</body></html>
`
}

async function utama() {
  await Promise.all([HTML_DIR, MD_DIR, IKON_DIR].map((d) => mkdir(d, { recursive: true })))
  const berkas = (await readdir(join(AKAR, 'tools/konten'))).filter((f) => f.endsWith('.mjs')).sort()
  const semua = await Promise.all(berkas.map(async (f) => (await import(pathToFileURL(join(AKAR, 'tools/konten', f)).href)).default))
  for (const [i, k] of semua.entries()) {
    const seb = i > 0 ? `infographic-${semua[i - 1].no}.html` : null
    const ses = i < semua.length - 1 ? `infographic-${semua[i + 1].no}.html` : null
    await writeFile(join(HTML_DIR, `infographic-${k.no}.html`), await halaman(k, seb, ses))
    await writeFile(join(MD_DIR, `Infografis_${k.no}_${k.berkasMd}.md`), markdown(k))
    // Diagram juga disimpan sebagai SVG mandiri (font disematkan lewat <style>) untuk diimpor ke Canva.
    const gaya = `<style>text{font-family:Inter,system-ui,sans-serif}.h{font-family:'Space Grotesk',Inter,sans-serif;font-weight:700}</style>`
    await Promise.all(k.blok.filter((b) => b.tipe === 'diagram').map((b, i) =>
      writeFile(join(AKAR, '04-ASSETS/illustrations', `infografis-${k.no}-diagram-${i + 1}.svg`), b.svg.replace(/<defs>/, `${gaya}<defs>`))))
  }
  await writeFile(join(HTML_DIR, 'index.html'), indeks(semua))
  process.stdout.write(`OK: ${semua.length} infografis, ${cacheIkon.size} ikon\n`)
}

utama().catch((e) => { process.stderr.write(`Gagal membangun: ${e.message}\n`); process.exit(1) })
