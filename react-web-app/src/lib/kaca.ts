/** Material kaca: preferensi transparansi pengguna, penghemat blur, dan lensa refraksi (Liquid Glass). */

export type Kaca = 'jernih' | 'standar' | 'pekat'

export const PILIHAN_KACA: { nilai: Kaca; label: string; ket: string }[] = [
  { nilai: 'jernih', label: 'Jernih', ket: 'Lebih tembus pandang' },
  { nilai: 'standar', label: 'Standar', ket: 'Seimbang' },
  { nilai: 'pekat', label: 'Pekat', ket: 'Lebih mudah dibaca' },
]

const KUNCI = 'vsf-kaca'

export function bacaKaca(): Kaca {
  try {
    const v = localStorage.getItem(KUNCI)
    if (v === 'jernih' || v === 'standar' || v === 'pekat') return v
  } catch {
    /* penyimpanan diblokir: pakai bawaan */
  }
  return 'standar'
}

export function setKaca(k: Kaca): void {
  document.documentElement.dataset.kaca = k
  try {
    localStorage.setItem(KUNCI, k)
  } catch {
    /* tidak tersimpan, tetap berlaku di sesi ini */
  }
}

/**
 * Dipanggil sekali saat shell dimuat: terapkan pilihan tersimpan dan nyalakan lensa refraksi.
 * backdrop-filter: url(#svg) hanya jalan di Chromium (Chrome, Edge); browser lain memakai kaca buram biasa.
 */
export function mulaiKaca(): void {
  const html = document.documentElement
  html.dataset.kaca = bacaKaca()
  const bisa = /Chrome\//.test(navigator.userAgent) && CSS.supports('backdrop-filter', 'url(#a)')
  html.classList.toggle('lg-lensa', bisa)
}

const KACA_SEL = '.vsf-card, .vsf-kpi-kaca, .vsf-kpi-hijau, .vsf-kpi-emas, .glass-card, .glass-hero, .glass-chrome'
// Lensa refraksi (filter SVG) mahal: dihitung per piksel di area kaca. Hanya untuk permukaan besar yang paling "liquid":
// rail, topbar, hero. Kartu, KPI, dan kartu sapaan memakai blur biasa (lihat blok v6 di index.css). Dispersi warna (3 lapis) hanya di chrome.
const LENSA_SEL = '.glass-chrome, .glass-hero'
const KROMATIK_SEL = '.glass-chrome'

const NS = 'http://www.w3.org/2000/svg'
let defs: SVGDefsElement | null = null
let urut = 0

function wadahFilter(): SVGDefsElement {
  if (defs?.isConnected) return defs
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.cssText = 'position:absolute;pointer-events:none'
  defs = document.createElementNS(NS, 'defs')
  svg.appendChild(defs)
  document.body.appendChild(svg)
  return defs
}

/**
 * Peta displacement tepi: merah = geser-x, biru = geser-y, abu 50% = tidak bergeser.
 * Dasar abu netral + empat pita di tepi (kiri/atas terang, kanan/bawah gelap) yang memudar ke dalam:
 * piksel di tepi diambil dari bagian dalam elemen, jadi isi di belakang tampak melengkung di pinggir kaca.
 */
function petaTepi(w: number, h: number, _r: number, bevel: number): string {
  const b = Math.min(bevel, w / 2 - 1, h / 2 - 1)
  const pita = (id: string, x1: number, y1: number, x2: number, y2: number, warna: string) =>
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    `<stop offset="0" stop-color="${warna}"/><stop offset=".35" stop-color="${warna}" stop-opacity=".42"/>` +
    `<stop offset="1" stop-color="${warna}" stop-opacity="0"/></linearGradient>`
  const svg =
    `<svg xmlns="${NS}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>` +
    pita('l', 0, 0, b, 0, 'rgb(255,128,128)') +
    pita('r', w, 0, w - b, 0, 'rgb(0,128,128)') +
    pita('t', 0, 0, 0, b, 'rgb(128,128,255)') +
    pita('d', 0, h, 0, h - b, 'rgb(128,128,0)') +
    `</defs><rect width="${w}" height="${h}" fill="rgb(128,128,128)"/>` +
    `<rect width="${w}" height="${h}" fill="url(#l)"/><rect width="${w}" height="${h}" fill="url(#r)"/>` +
    `<rect width="${w}" height="${h}" fill="url(#t)"/><rect width="${w}" height="${h}" fill="url(#d)"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function isiFilter(f: SVGFilterElement, w: number, h: number, r: number, kromatik: boolean): void {
  const kecil = Math.min(w, h)
  const bevel = Math.max(10, Math.min(26, kecil / 3))
  const s = Math.min(64, kecil * 0.5)
  const peta = petaTepi(w, h, r, bevel)
  const geser = (skala: number, hasil: string) =>
    `<feDisplacementMap in="SourceGraphic" in2="peta" scale="${skala.toFixed(1)}" xChannelSelector="R" yChannelSelector="B"${hasil}/>`
  let isi = `<feImage href="${peta}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="peta"/>`
  if (kromatik) {
    // tiap kanal warna dibiaskan sedikit berbeda → tepi berpendar merah/biru seperti kaca asli
    const kanal = (m: string, hasil: string) => `<feColorMatrix type="matrix" values="${m}" result="${hasil}"/>`
    isi +=
      geser(s, ' result="a"') + kanal('1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', 'r') +
      `<feDisplacementMap in="SourceGraphic" in2="peta" scale="${(s * 0.93).toFixed(1)}" xChannelSelector="R" yChannelSelector="B" result="b2"/>` +
      kanal('0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', 'g') +
      `<feDisplacementMap in="SourceGraphic" in2="peta" scale="${(s * 0.86).toFixed(1)}" xChannelSelector="R" yChannelSelector="B" result="c"/>` +
      kanal('0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0', 'b') +
      `<feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/>`
  } else {
    isi += geser(s, '')
  }
  f.setAttribute('x', '0')
  f.setAttribute('y', '0')
  f.setAttribute('width', String(w))
  f.setAttribute('height', String(h))
  f.setAttribute('filterUnits', 'userSpaceOnUse')
  f.setAttribute('primitiveUnits', 'userSpaceOnUse')
  f.setAttribute('color-interpolation-filters', 'sRGB')
  f.innerHTML = isi
}

/**
 * Pantau kartu kaca di bawah root:
 *  • kartu jauh di luar layar kehilangan backdrop-filter (kelas .vsf-di-luar); margin 300px agar tidak "pop";
 *  • bila lensa aktif (html.lg-lensa), tiap elemen kaca utama diberi filter refraksi sesuai ukurannya.
 * Elemen yang dirender belakangan ditangkap lewat MutationObserver.
 */
export function pantauKaca(root: HTMLElement): () => void {
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => e.target.classList.toggle('vsf-di-luar', !e.isIntersecting)),
    { rootMargin: '300px 0px' },
  )
  const terpantau = new WeakSet<Element>()
  const lensa = new Map<Element, { filter: SVGFilterElement; w: number; h: number }>()

  // Hitung ulang peta lensa 120ms setelah ukuran berhenti berubah (menyeret jendela = puluhan event/detik; peta SVG mahal dibuat).
  const tertunda = new Set<Element>()
  let tUkuran = 0
  const terapkanUkuran = () => {
    tertunda.forEach((el) => {
      const ada = lensa.get(el)
      if (!ada) return
      const w = Math.round((el as HTMLElement).offsetWidth)
      const h = Math.round((el as HTMLElement).offsetHeight)
      if (w < 8 || h < 8 || (w === ada.w && h === ada.h)) return
      ada.w = w
      ada.h = h
      const r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
      isiFilter(ada.filter, w, h, r, el.matches(KROMATIK_SEL))
    })
    tertunda.clear()
  }
  const ro = new ResizeObserver((es) => {
    es.forEach((e) => tertunda.add(e.target))
    window.clearTimeout(tUkuran)
    // pemasangan awal (w=0) langsung; perubahan berikutnya ditunda
    const pertama = es.some((e) => (lensa.get(e.target)?.w ?? 1) === 0)
    if (pertama) terapkanUkuran()
    else tUkuran = window.setTimeout(terapkanUkuran, 120)
  })

  const pasangLensa = (el: Element) => {
    if (lensa.has(el) || !document.documentElement.classList.contains('lg-lensa') || !el.matches(LENSA_SEL) || el.closest('footer')) return
    const h = el as HTMLElement
    const filter = document.createElementNS(NS, 'filter')
    const id = `lg-${++urut}`
    filter.id = id
    wadahFilter().appendChild(filter)
    lensa.set(el, { filter, w: 0, h: 0 })
    h.style.setProperty('--lg-url', `url(#${id})`)
    h.setAttribute('data-lg', '')
    ro.observe(el)
  }

  const pindai = () => {
    root.querySelectorAll(KACA_SEL).forEach((el) => {
      if (terpantau.has(el)) return
      terpantau.add(el)
      io.observe(el)
      pasangLensa(el)
    })
    // buang filter milik elemen yang sudah dihapus dari DOM
    lensa.forEach((v, el) => {
      if (el.isConnected) return
      v.filter.remove()
      ro.unobserve(el)
      lensa.delete(el)
    })
  }
  pindai()
  let t = 0
  const mo = new MutationObserver(() => {
    window.clearTimeout(t)
    t = window.setTimeout(pindai, 120)
  })
  mo.observe(root, { childList: true, subtree: true })
  return () => {
    io.disconnect()
    ro.disconnect()
    mo.disconnect()
    window.clearTimeout(t)
    window.clearTimeout(tUkuran)
    lensa.forEach((v) => v.filter.remove())
    lensa.clear()
  }
}
