#!/usr/bin/env node
/**
 * Pembuat override MODE GELAP dari src/index.css → src/tema-gelap.otomatis.css.
 * Menurunkan, untuk deklarasi dengan warna LITERAL tunggal:
 *   - color gelap (teks di atas kaca terang)         → versi lebih terang (hue sama)
 *   - background putih/terang (chip, input, hover)   → permukaan gelap bernada sama
 * Gradasi, bayangan, border, dan token var() sengaja TIDAK disentuh: ditangani manual di src/tema-gelap.css.
 * Jalankan ulang bila src/index.css berubah:  npm run tema:buat
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import postcss from 'postcss'

const akar = join(dirname(fileURLToPath(import.meta.url)), '..')
const sumber = join(akar, 'src/index.css')
const tujuan = join(akar, 'src/tema-gelap.otomatis.css')
const T = "html[data-tema='gelap']"

/* ── warna ─────────────────────────────────────────────────────────── */
function urai(v) {
  const t = v.trim().toLowerCase()
  let m = t.match(/^#([0-9a-f]{3,8})$/)
  if (m) {
    let h = m[1]
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('')
    if (h.length !== 6 && h.length !== 8) return null
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 }
  }
  m = t.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/)
  if (m) {
    let a = 1
    if (m[4] !== undefined) a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
    return { r: +m[1], g: +m[2], b: +m[3], a }
  }
  return null
}
function hsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  if (mx === mn) return { h: 0, s: 0, l }
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s, l }
}
function rgb({ h, s, l }) {
  const f = (n) => {
    const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l)
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
  }
  return { r: f(0), g: f(8), b: f(4) }
}
const keCss = ({ r, g, b }, a) => `rgb(${r} ${g} ${b}${a < 0.999 ? ` / ${+a.toFixed(3)}` : ''})`

/** teks gelap → terang (hue sama). null = biarkan. */
function petaTeks(c) {
  const x = hsl(c)
  if (x.l >= 0.55) return null
  return keCss(rgb({ h: x.h, s: Math.min(x.s, 0.55), l: 0.9 - 0.4 * x.l }), c.a)
}
/** latar terang → gelap. null = biarkan. */
function petaLatar(c) {
  if (c.r >= 235 && c.g >= 235 && c.b >= 235) {
    if (c.a < 0.3) return null // sorotan tipis di atas permukaan yang memang gelap: biarkan
    return c.a >= 0.95 ? 'rgb(var(--ar-card))' : `rgb(255 255 255 / ${+Math.max(0.05, Math.min(c.a * 0.16, 0.2)).toFixed(3)})`
  }
  const x = hsl(c)
  if (x.l < 0.72) return null
  return keCss(rgb({ h: x.h, s: Math.min(x.s, 0.5), l: 0.2 + (1 - x.l) * 0.45 }), c.a)
}

/** gradasi: lapisan putih tebal (alpha ≥ 0.3) → tint tipis; warna lain dibiarkan. null = tak ada perubahan. */
function petaGradasi(v) {
  let berubah = false
  const hasil = v.replace(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}\b/g, (m) => {
    const c = urai(m)
    if (!c || c.r < 235 || c.g < 235 || c.b < 235 || c.a < 0.3) return m
    berubah = true
    return `rgb(255 255 255 / ${+Math.max(0.05, Math.min(c.a * 0.16, 0.2)).toFixed(3)})`
  })
  return berubah ? hasil : null
}

/* ── selektor ──────────────────────────────────────────────────────── */
function awali(sel) {
  return sel.split(',').map((s) => {
    const t = s.trim()
    if (/^(html|:root)\b/.test(t)) return t.replace(/^(html|:root)/, `html[data-tema='gelap']`)
    if (/^body\b/.test(t)) return `${T} ${t}`
    return `${T} ${t}`
  }).join(',\n')
}
const lewati = (rule) => {
  for (let p = rule.parent; p; p = p.parent) if (p.type === 'atrule' && /keyframes/i.test(p.name)) return true
  return false
}

const css = postcss.parse(readFileSync(sumber, 'utf8'))
const keluar = postcss.root()
let jumlah = 0
css.walkRules((rule) => {
  if (lewati(rule)) return
  const baru = []
  // latar gradasi/gambar tidak dipetakan → teks gelap di atasnya TIDAK dibalik (kalau dibalik, kontras rusak)
  let latarGradasi = false
  rule.walkDecls((d) => {
    if (d.parent === rule && /^background(-image)?$/i.test(d.prop) && /gradient|url\(/i.test(d.value) && !petaGradasi(d.value)) latarGradasi = true
  })
  rule.walkDecls((d) => {
    if (d.parent !== rule) return
    const prop = d.prop.toLowerCase()
    const penting = d.important ? ' !important' : ''
    if ((prop === 'background' || prop === 'background-image') && /gradient\(/i.test(d.value)) {
      const g = petaGradasi(d.value)
      if (g) baru.push(postcss.decl({ prop: d.prop, value: g + penting }))
      return
    }
    const c = urai(d.value)
    if (!c) return
    let nilai = null
    if (prop === 'color') nilai = latarGradasi ? null : petaTeks(c)
    else if (prop === 'background-color' || prop === 'background') nilai = petaLatar(c)
    if (nilai) baru.push(postcss.decl({ prop: d.prop, value: nilai + penting }))
  })
  if (!baru.length) return
  const salinan = postcss.rule({ selector: awali(rule.selector) })
  baru.forEach((d) => salinan.append(d))
  // bungkus ulang @media/@supports (lapisan @layer dibuang: aturan ini tanpa layer → menang atas layer)
  let node = salinan
  for (let p = rule.parent; p && p.type !== 'root'; p = p.parent) {
    if (p.type === 'atrule' && p.name !== 'layer') {
      const w = postcss.atRule({ name: p.name, params: p.params })
      w.append(node)
      node = w
    }
  }
  keluar.append(node)
  jumlah += 1
})

const kepala = `/* DIHASILKAN OTOMATIS oleh tools/buat-tema-gelap.mjs dari src/index.css — JANGAN edit tangan.\n * Perbaikan manual ada di src/tema-gelap.css (diimpor sesudah berkas ini, jadi menang).\n * Jalankan ulang bila index.css berubah:  npm run tema:buat   (${jumlah} aturan) */\n`
writeFileSync(tujuan, kepala + keluar.toString() + '\n')
console.log(`tema-gelap.otomatis.css: ${jumlah} aturan`)
