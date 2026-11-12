// Helper SVG diagram — warna & radius dari GARAP_Design_Reference.md.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const W = { navy: '#0A1F38', forest: '#2D452F', moss: '#6B9D4A', mint: '#CFE2CE', page: '#F4F7F2', garis: '#E2E8DD', garis2: '#D7E0D2', tinta: '#0B1A2B', abu: '#4F6075', emas: '#E9CD53', galat: '#C0392B', galatLatar: '#FEF2F2', waspada: '#E0A42B', waspadaLatar: '#FFFBEB' }

/** Kotak berjudul + baris keterangan. gaya: 'putih' | 'navy' | 'mint' | 'bahaya' | 'waspada' | 'redup' */
export function kotak(x, y, w, h, judul, baris = [], gaya = 'putih') {
  const g = {
    putih: ['#FFFFFF',W.garis2, W.forest, W.abu],
    navy: [W.navy, W.navy, '#FFFFFF', 'rgba(255,255,255,.75)'],
    mint: ['#EEF5ED', W.moss, W.forest, W.abu],
    bahaya: [W.galatLatar, W.galat, '#B91C1C', '#B91C1C'],
    waspada: [W.waspadaLatar, W.waspada, '#92400E', '#92400E'],
    redup: [W.page, W.garis2, W.abu, W.abu],
  }[gaya]
  const garis = baris.map((b, i) => `<text x="${x + 16}" y="${y + 50 + i * 19}" font-size="14" fill="${g[3]}">${esc(b)}</text>`).join('')
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${g[0]}" stroke="${g[1]}" stroke-width="1.5"/>
<text class="h" x="${x + 16}" y="${y + 28}" font-size="17" fill="${g[2]}">${esc(judul)}</text>${garis}</g>`
}

/** Zona latar dengan eyebrow. */
export function zona(x, y, w, h, label, gelap = false) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="${gelap ? 'rgba(10,31,56,.06)' : W.page}" stroke="${gelap ? W.navy : W.garis}" stroke-width="1.5"/>
<text x="${x + 20}" y="${y + 30}" font-size="12.5" font-weight="700" letter-spacing="1.8" fill="${gelap ? W.navy : W.abu}">${esc(label.toUpperCase())}</text>`
}

/** Garis panah lewat titik-titik [[x,y],...]. dua = panah dua arah; putus = garis putus-putus. */
export function panah(titik, { dua = false, putus = false, warna = W.forest, label, lx, ly, anchor = 'start' } = {}) {
  const d = titik.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
  const id = warna === W.galat ? 'pm' : 'ph'
  return `<path d="${d}" fill="none" stroke="${warna}" stroke-width="2.2" ${putus ? 'stroke-dasharray="7 6"' : ''} marker-end="url(#${id})" ${dua ? `marker-start="url(#${id}s)"` : ''}/>
${label ? `<text x="${lx}" y="${ly}" font-size="13" font-weight="600" fill="${warna}" text-anchor="${anchor}">${esc(label)}</text>` : ''}`
}

export function svg(w, h, isi) {
  const m = (id, c, balik) => `<marker id="${id}" viewBox="0 0 10 10" refX="${balik ? 1 : 9}" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="${balik ? 'M10 0 L0 5 L10 10 z' : 'M0 0 L10 5 L0 10 z'}" fill="${c}"/></marker>`
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><defs>${m('ph', W.forest)}${m('phs', W.forest, true)}${m('pm', W.galat)}${m('pms', W.galat, true)}</defs>${isi}</svg>`
}
