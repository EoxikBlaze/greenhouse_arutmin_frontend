# Audit Skill — Proyek Dokumentasi GARAP Smart Hidroponik

Tanggal audit: 12 November 2026
Lingkup: memilih skill untuk Juknas, Juknis (website & IoT), SOP (operasi & pemeliharaan), 5 poster, preview HTML/CSS, dan Markdown siap pindah ke Canva.
Status: **audit saja**. Tidak ada skill dipasang, diubah, atau dihapus. Tidak ada source code, database, firmware, atau konfigurasi MQTT yang disentuh. Eksekusi dosing tetap **DIBLOKIR**.

---

## 1. Ringkasan hasil audit

- Tidak ada satu pun skill yang khusus untuk "Juknas/Juknis/SOP pemerintah". Penulisan dokumen inti harus dikerjakan langsung, dengan skill sebagai pendukung struktur, diagram, dan desain.
- Paket inti yang direkomendasikan cukup **7 skill + 1 konektor**:
  1. `superpowers:brainstorming` — kunci struktur & isi tiap dokumen sebelum menulis.
  2. `understand-anything:understand-domain` — ekstrak alur bisnis nyata (monitoring, persetujuan dosing) dari kode.
  3. `mermaid-diagrams` — semua diagram alur & arsitektur dalam Markdown.
  4. `artifact-design` + `artifact-diagramming` — preview poster/HTML yang konsisten, tema terang/gelap, aman di ponsel.
  5. `design:ux-copy` — kalimat instruksi di poster & SOP yang singkat dan jelas.
  6. `design:accessibility-review` / `web-interface-guidelines` — QA kontras & keterbacaan poster.
  7. `superpowers:verification-before-completion` — QA akhir berbasis bukti (fakta di dokumen cocok dengan kode).
  - Konektor: **Canva MCP** (terhubung di sesi ini) untuk tahap pemindahan ke Canva.
- Skill gaya UI web (taste-skill, minimalist-ui, brutalist, gpt-taste, dst.) **tidak dipakai**: semuanya untuk landing page/app screen, bukan poster cetak/dokumen resmi, dan saling bertabrakan gaya.
- Proyek sudah punya hasil awal di `docs/juknas-juknis/` (modul Juknas/Juknis, poster 1 IoT & K3, poster 2 website, versi HTML/PDF/PNG). Workflow di bawah memperlakukannya sebagai **bahan revisi**, bukan dibuat ulang dari nol.

## 2. Total skill yang ditemukan

| Sumber | Jumlah | Cara diperiksa |
|---|---:|---|
| Proyek `.agents/skills/` | 68 | SKILL.md dibaca (frontmatter + struktur) |
| Proyek `.claude/skills/` | 25 | Symlink ke `.agents/skills/` — duplikat, bukan skill baru |
| Personal `~/.claude/skills/` | 25 (+ folder `learned/` kosong) | SKILL.md dibaca; 9 tumpang tindih dengan `.agents` |
| Plugin lokal `~/.claude/plugins/cache/` (caveman, ponytail, addy agent-skills, understand-anything, taste-skill, everything-claude-code) | 6 plugin | SKILL.md dibaca |
| **Total SKILL.md unik di disk** | **144** | |
| Skill plugin jarak jauh (superpowers, research-superpowers, design, anthropic-skills, product-management, customer-support, data, enterprise-search, productivity, artifact-*, dataviz, dll.) | ±110 | **Hanya deskripsi katalog** — lihat keterbatasan |
| Konektor MCP terkait desain | 3 | Canva, Adobe Express, Figma (daftar tool) |

**Keterbatasan:**
- Skill plugin jarak jauh tidak punya SKILL.md di disk. Isinya hanya terbaca saat skill dipanggil lewat tool `Skill`, dan memanggilnya berarti mulai memakai skill — dilarang sebelum persetujuan. Penilaian kelompok ini berdasarkan deskripsi katalog resmi, ditandai `(katalog)` di tabel. Pengecualian: salinan cache untuk 8 skill kunci ditemukan di `~/Library/Application Support/Claude/local-agent-mode-sessions/` dan SKILL.md-nya dicocokkan — brainstorming (285 baris), canvas-design (129), kb-article (351), design-critique (118), ux-copy (107), accessibility-review (128), verification-before-completion (120), pdf (314). Isinya sesuai katalog; penilaian tidak berubah. `artifact-design` dan `artifact-diagramming` tidak punya salinan lokal.
- Folder skill agen lain (`~/.codex/skills`, `~/.gemini/*/skills`, `~/.hermes/skills`, `~/.pencil/skills`, `~/.agents/skills`, proyek lain di `~/Documents`) ada di disk, tetapi **tidak dimuat oleh Claude Code** di sesi ini, jadi tidak dinilai.
- `everything-claude-code` hanya menyediakan command/agent (tanpa SKILL.md lokal); skill ECC yang tampil (`ecc:*`, `coding-standards`, dll.) adalah alur kerja kode.

## 3. Daftar skill yang diperiksa (dikelompokkan)

- **Desain/gaya web (`.agents`)**: design-taste-frontend (v2), design-taste-frontend-v1, design-taste-frontend-v2-experimental, taste-skill (plugin, = v2), minimalist-ui, industrial-brutalist-ui, high-end-visual-design, gpt-taste, stitch-design-taste, awesome-design-md, ui-ux-pro-max, tailwind-patterns, web-interface-guidelines, frontend-patterns.
- **Stub "dipindahkan/pensiun"**: brandkit, imagegen-frontend-web, imagegen-frontend-mobile, image-to-code, redesign-existing-projects (15 baris, isinya hanya pemberitahuan pindah).
- **Diagram**: mermaid-diagrams, artifact-diagramming (katalog), dataviz (katalog).
- **Dokumentasi/penulisan**: documentation-and-adrs, spec-driven-development, source-driven-development, doubt-driven-development, interview-me, context-engineering, planning-and-task-breakdown (addy), dart-write-documentation, ecc:update-docs, customer-support:kb-article (katalog), product-management:write-spec (katalog), anthropic-skills:docx/pdf/docs/canvas-design (katalog).
- **Pemahaman sistem**: understand, understand-domain, understand-explain, understand-onboard, understand-knowledge (understand-anything), caveman-explore, investigate-first.
- **QA**: verification-loop, superpowers:verification-before-completion (katalog), caveman-evidence-review, design:design-critique, design:accessibility-review (katalog), a11y-debugging, web-interface-guidelines.
- **Proses**: superpowers:brainstorming, superpowers:writing-plans (katalog), ecc:plan.
- **Tidak relevan (kode/infra)**: 14 skill dart-*, 10 skill flutter-*, backend-patterns, clickhouse-io, postgres*, docker-expert, senior-backend, nodejs-best-practices, react-*, zod-validation-expert, api-security-best-practices, chrome-devtools*, cookie-debugging, debug-optimize-lcp, memory-leak-debugging, playwright-e2e-builder, test-detect, tdd-workflow, security-review, security-threat-model, mobile-design, liquid-glass, mobile-ios-design, ponytail-*, caveman-* (gaya/kode), research-superpowers:* (riset akademik), data:*, product-management:*, customer-support:*, productivity:*.

## 4. Kategori skill

| Kode | Kategori | Skill utama | Pendukung |
|---|---|---|---|
| A | Technical Documentation | (langsung oleh Claude) | documentation-and-adrs |
| B | Technical Writing | design:ux-copy (katalog) | — |
| C | SOP & Operational Manual | customer-support:kb-article (katalog, struktur langkah) | — |
| D | System Architecture Doc | understand-domain | understand, mermaid-diagrams |
| E | IoT & Hardware Doc | (tidak ada skill khusus) — sumber: firmware, `docs/PANDUAN_UJI_ALAT_HARDWARE.md` | understand-explain |
| F | Graphic Design & Poster | artifact-design (katalog) | anthropic-skills:canvas-design, Canva MCP |
| G | Infographic & Visual | artifact-diagramming (katalog) | dataviz |
| H | UI/UX & Web Design | ui-ux-pro-max (palet/tipografi) | awesome-design-md |
| I | HTML/CSS & Frontend | artifact-design | tailwind-patterns |
| J | Diagram & Flowchart | mermaid-diagrams | artifact-diagramming |
| K | QA & Technical Review | superpowers:verification-before-completion | design:accessibility-review, web-interface-guidelines, design:design-critique |

## 5. Penilaian setiap skill

Skor 1–10 menggabungkan: relevansi, kualitas instruksi, kelengkapan, cocok Markdown, cocok HTML/CSS, kualitas desain, risiko konflik (makin rendah makin baik), dan efisiensi token.

| Skill | Kategori | Skor | Status | Alasan |
|---|---|---:|---|---|
| superpowers:brainstorming (katalog) | Proses | 9 | WAJIB DIGUNAKAN | Mengunci sasaran pembaca, struktur, dan batasan tiap dokumen sebelum menulis; mencegah tulis-ulang. |
| mermaid-diagrams | J | 9 | WAJIB DIGUNAKAN | 216 baris, instruksi jelas: flowchart, sequence, ERD, C4. Native Markdown, terbaca di GitHub/VS Code, bisa diekspor SVG/PNG untuk Canva. |
| understand-anything:understand-domain | D | 8 | WAJIB DIGUNAKAN | Mengekstrak alur bisnis nyata dari kode (monitoring, persetujuan dosing). Mode ringan tanpa graph penuh. Hanya menulis ke folder graph-nya sendiri, tidak menyentuh source. |
| artifact-design (katalog) | F/I | 9 | WAJIB DIGUNAKAN | Kontrak halaman HTML: token warna, mode gelap, lebar ponsel, ukuran. Dasar preview poster yang rapi. |
| superpowers:verification-before-completion (katalog) | K | 8 | WAJIB DIGUNAKAN | QA berbasis bukti: setiap klaim (topik MQTT, ambang sensor, status dosing) dicek ke kode sebelum dinyatakan selesai. |
| artifact-diagramming (katalog) | G/J | 8 | SANGAT DIREKOMENDASIKAN | Diagram SVG inline yang terbaca di dua tema; cocok untuk poster alur monitoring & alur persetujuan dosing. |
| design:ux-copy (katalog) | B | 8 | SANGAT DIREKOMENDASIKAN | Microcopy instruksi, peringatan, label tombol — inti poster & SOP. |
| design:accessibility-review (katalog) | K | 7 | SANGAT DIREKOMENDASIKAN | Cek kontras & keterbacaan poster K3 (WCAG). |
| web-interface-guidelines | K | 7 | SANGAT DIREKOMENDASIKAN | 191 baris, aturan konkret tipografi/kontras/dark mode; review HTML preview. Tumpang tindih dengan accessibility-review — pilih salah satu per putaran. |
| Canva MCP (konektor) | F | 8 | SANGAT DIREKOMENDASIKAN | Tahap akhir: impor/generate desain di Canva. Butuh persetujuan per aksi (publikasi ke layanan luar). |
| understand-anything:understand-explain | E | 7 | PENDUKUNG | Penjelasan mendalam per file (mis. `gabungan.ino`) untuk Juknis IoT. Baca-saja. |
| documentation-and-adrs | A | 6 | PENDUKUNG | Template ADR & prinsip "dokumentasikan alasan". Berguna untuk bab arsitektur Juknas; bukan untuk SOP. |
| customer-support:kb-article (katalog) | C | 6 | PENDUKUNG | Pola artikel langkah-demi-langkah & troubleshooting; cocok untuk SOP pemeliharaan. |
| design:design-critique (katalog) | K | 6 | PENDUKUNG | Kritik hierarki visual poster sebelum final. |
| ui-ux-pro-max | H | 6 | PENDUKUNG | Basis data palet & font pairing via skrip Python (`search.py`). Berguna memilih palet poster; sisanya untuk app UI. Prasyarat Python 3 (tersedia). |
| anthropic-skills:canvas-design (katalog) | F | 6 | PENDUKUNG | Poster statis PNG/PDF. Alternatif bila preview HTML tidak cukup; tumpang tindih dengan artifact-design. |
| anthropic-skills:pdf (katalog) | F | 5 | PENDUKUNG | Hanya bila perlu PDF cetak dari Markdown/HTML. |
| dataviz (katalog) | G | 5 | PENDUKUNG | Hanya jika poster memuat grafik data (rentang pH/EC). |
| awesome-design-md | H | 4 | PENDUKUNG | Referensi gaya merek terkenal; GARAP punya identitas sendiri, jadi minim manfaat. |
| interview-me | Proses | 5 | TIDAK DIPERLUKAN | Fungsi sama dengan brainstorming; pilih satu. |
| spec-driven-development | A | 4 | TIDAK DIPERLUKAN | Untuk PRD sebelum koding, bukan dokumen operasional. |
| source-driven-development | A | 4 | TIDAK DIPERLUKAN | Fokus dokumentasi resmi framework, bukan fakta sistem GARAP. |
| doubt-driven-development | K | 4 | TIDAK DIPERLUKAN | Butuh CLI Codex/Gemini untuk review silang; berat token. verification-before-completion cukup. |
| understand-anything:understand | D | 5 | TIDAK DIPERLUKAN | 931 baris, membangun knowledge graph penuh multi-agen — mahal token. understand-domain sudah cukup. |
| understand-onboard / understand-knowledge | D | 3 | TIDAK DIPERLUKAN | Butuh graph penuh / wiki Karpathy. |
| design-taste-frontend (v2) / taste-skill | H | 4 | TIDAK DIPERLUKAN | Kualitas tinggi tapi untuk landing page/app screen; butuh browser inspector & loop screenshot. Bukan poster cetak. |
| design-taste-frontend-v1 / v2-experimental | H | 2 | TIDAK DIPERLUKAN | Versi lama, opt-in; duplikat v2. |
| minimalist-ui, industrial-brutalist-ui, high-end-visual-design, gpt-taste, stitch-design-taste | H | 2 | TIDAK DIPERLUKAN | Gaya web opt-in yang saling bertentangan; gpt-taste memakai GSAP & randomisasi — tidak cocok dokumen resmi. |
| brandkit, imagegen-frontend-*, image-to-code, redesign-existing-projects | — | 1 | TIDAK DIPERLUKAN | Stub kosong: sudah dipindah/pensiun. |
| tailwind-patterns, frontend-patterns | I | 3 | TIDAK DIPERLUKAN | Preview cukup CSS murni; Tailwind menambah ketergantungan. |
| a11y-debugging | K | 3 | TIDAK DIPERLUKAN | Butuh Chrome DevTools MCP; accessibility-review cukup untuk poster statis. |
| anthropic-skills:docx | A | 3 | TIDAK DIPERLUKAN | Target Markdown → Canva, bukan Word. Pakai hanya jika diminta .docx. |
| dart-write-documentation | A | 2 | TIDAK DIPERLUKAN | Doc comment kode Dart, bukan dokumen pengguna. |
| research-superpowers:* | — | 2 | TIDAK DIPERLUKAN | Alur riset akademik (literatur, BibTeX). Juknas tidak butuh. |
| Adobe Express MCP | F | 4 | TIDAK DIPERLUKAN | Fungsi sama dengan Canva; target Anda Canva. |
| Figma MCP | F | 3 | TIDAK DIPERLUKAN | Tidak ada file Figma GARAP; tumpang tindih dengan Canva. |
| Skill kode (dart-*, flutter-*, postgres*, react-*, backend, security, testing, ponytail-*, caveman-*, ecc:*) | — | 1 | TIDAK DIPERLUKAN | Untuk menulis/mengubah kode; bertentangan dengan batasan "jangan ubah source". |

## 6. Skill yang direkomendasikan

**WAJIB:** superpowers:brainstorming, mermaid-diagrams, understand-anything:understand-domain, artifact-design, superpowers:verification-before-completion.
**SANGAT DIREKOMENDASIKAN:** artifact-diagramming, design:ux-copy, design:accessibility-review **atau** web-interface-guidelines, Canva MCP.
**PENDUKUNG (panggil bila perlu):** understand-explain, documentation-and-adrs, customer-support:kb-article, design:design-critique, ui-ux-pro-max (palet saja), canvas-design, pdf, dataviz.

## 7. Skill yang tidak digunakan & alasannya

- **Gaya UI web (8 skill taste/minimalist/brutalist/gpt/stitch/high-end)** — dibuat untuk situs & app screen, bukan poster atau dokumen resmi; aturan gaya saling bertentangan.
- **Stub (5 skill)** — isinya hanya pemberitahuan "dipindahkan/pensiun".
- **Skill kode & testing** — melanggar batasan tidak mengubah source code/firmware/DB.
- **understand (penuh), doubt-driven, research-superpowers** — boros token, kebutuhannya sudah ditutup skill yang lebih ringan.
- **Adobe Express, Figma** — duplikat fungsi Canva.

## 8. Konflik antar-skill

| Konflik | Jenis | Keputusan |
|---|---|---|
| design-taste-frontend v2 vs v1 vs v2-experimental vs taste-skill (plugin) | Duplikat versi | Tidak satupun dipakai. Jika suatu saat perlu, pakai v2 saja. |
| minimalist-ui vs industrial-brutalist-ui vs high-end-visual-design vs gpt-taste | Gaya bertentangan | Tidak dipakai; gaya poster mengikuti identitas GARAP + artifact-design. |
| artifact-design vs canvas-design vs Canva MCP vs Adobe Express | Fungsi sama (poster) | artifact-design = preview HTML; Canva MCP = desain final. canvas-design cadangan; Adobe dibuang. |
| brainstorming vs interview-me vs ecc:plan | Fungsi sama | Pilih **brainstorming**. |
| accessibility-review vs web-interface-guidelines vs a11y-debugging | Fungsi sama (QA visual) | accessibility-review untuk poster; web-interface-guidelines untuk HTML preview; a11y-debugging tidak (butuh DevTools MCP). |
| understand vs understand-domain | Lingkup | Pakai understand-domain (ringan). |
| mermaid-diagrams vs artifact-diagramming | Format berbeda | Mermaid untuk Markdown; artifact-diagramming untuk SVG di poster/HTML. Bukan konflik, pembagian tugas. |
| Skill yang menulis file otomatis | Risiko | understand-* menulis ke `.understand-anything/` (bukan source) — aman, tetapi folder itu perlu diabaikan git. Skill kode (ecc:*, tdd-workflow, ponytail-*, caveman-surgical-patch, refactor) bisa mengubah source — **tidak dipakai**. |
| Skill yang butuh tool tak tersedia | Ketergantungan | doubt-driven (Codex/Gemini CLI), a11y-debugging & chrome-devtools (DevTools MCP), Notion/Figma (belum login). Tidak dipakai. |
| Mode sesi caveman/ponytail | Gaya respons | Hanya memengaruhi gaya chat. Dokumen yang ditulis ke file tetap prosa lengkap (aturan caveman sendiri mengecualikan dokumen). |

## 9. Kombinasi skill terbaik

- **Dokumen (Juknas/Juknis/SOP):** brainstorming → understand-domain (+ understand-explain untuk firmware) → tulis Markdown + mermaid-diagrams → ux-copy → verification-before-completion.
- **Poster & preview:** brainstorming (pesan inti per poster) → ux-copy → artifact-design + artifact-diagramming → accessibility-review / design-critique → Canva MCP.

## 10. Urutan penggunaan skill

1. superpowers:brainstorming
2. understand-anything:understand-domain
3. understand-anything:understand-explain (bila perlu, per file firmware/MQTT)
4. mermaid-diagrams
5. documentation-and-adrs / customer-support:kb-article (struktur bab)
6. design:ux-copy
7. artifact-design + artifact-diagramming
8. design:accessibility-review, web-interface-guidelines, design:design-critique
9. superpowers:verification-before-completion
10. Canva MCP (hanya setelah persetujuan, karena mengirim konten ke layanan luar)

## 11. Rekomendasi workflow

| Tahap | Tujuan | Skill | Keluaran |
|---|---|---|---|
| 1. Audit sistem GARAP | Petakan modul, alur, status dosing, aturan keselamatan | understand-domain; baca `docs/LAPORAN_AUDIT_2026-11-11.md`, `docs/PANDUAN_UJI_ALAT_HARDWARE.md`, `docs/juknas-juknis/*` yang sudah ada | Peta domain + daftar celah dokumen lama |
| 2. Pengumpulan info teknis | Fakta: sensor, topik MQTT, ambang, halaman web, peran pengguna, fail-safe | understand-explain (firmware, web), baca-saja | Lembar fakta bersumber (file:baris) |
| 3. Juknas & Juknis | Struktur bab, diagram arsitektur & alur | brainstorming, mermaid-diagrams, documentation-and-adrs | `JUKNAS_*.md`, `JUKNIS_WEBSITE.md`, `JUKNIS_IOT.md` |
| 4. SOP | Langkah operasi, pemeliharaan, troubleshooting | kb-article (pola), ux-copy, mermaid-diagrams | `SOP_OPERASI.md`, `SOP_PEMELIHARAAN.md` |
| 5. Poster | 5 poster: website, IoT, monitoring, persetujuan dosing, keselamatan | brainstorming (pesan inti), ux-copy, artifact-diagramming | Naskah & tata letak per poster |
| 6. Preview HTML | Preview poster & dokumen yang rapi, siap ke Canva | artifact-design (+ ui-ux-pro-max untuk palet) | `poster-*.html` / artifact privat |
| 7. QA | Akurasi fakta, kontras, konsistensi istilah, status dosing tertulis "diblokir" | verification-before-completion, accessibility-review, web-interface-guidelines, design-critique | Laporan QA + perbaikan |

**Aturan keselamatan sepanjang workflow:** setiap dokumen dan poster yang menyinggung dosing wajib menyatakan bahwa eksekusi dosing **diblokir sampai validasi keselamatan selesai**; alur persetujuan dosing digambarkan sebagai prosedur masa depan, bukan fitur aktif.

---

*Menunggu persetujuan sebelum skill apa pun dipakai untuk membuat dokumentasi.*
