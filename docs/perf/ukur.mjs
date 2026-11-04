// Ukur halaman dengan CPU 20x: node ukur.mjs <baseUrl> <keluarDir> [rute,rute,...]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const base = process.argv[2] ?? 'http://127.0.0.1:4173'
const out = process.argv[3] ?? './trace'
const rute = (process.argv[4] ?? '/dashboard,/saklar,/peringatan,/tanam,/laporan,/ambang,/profil,/').split(',').map((r) => (r.startsWith('/') ? r : '/' + r))
const pass = process.env.ADMIN_PASSWORD
fs.mkdirSync(out, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-extensions', '--window-size=1366,768'],
  defaultViewport: { width: 1366, height: 768 },
})
const ctx = await browser.createBrowserContext() // seperti incognito: tanpa ekstensi/cache
const login = await ctx.newPage()
await login.goto(base + '/login', { waitUntil: 'domcontentloaded' })
const r = await login.evaluate(async (p) => {
  const res = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'garap', password: p, sesi: 'cookie' }) })
  const d = await res.json().catch(() => ({}))
  localStorage.setItem('vsf-auth', JSON.stringify({ isAuthenticated: true, username: 'garap', role: 'admin', demo: false }))
  return res.status
}, pass)
console.log('login', r)
await login.close()

const cats = '-*,devtools.timeline,disabled-by-default-devtools.timeline,v8.execute,blink.user_timing,loading,latencyInfo,disabled-by-default-v8.cpu_profiler,disabled-by-default-devtools.timeline.frame,toplevel'
for (const rt of rute) {
  const page = await ctx.newPage()
  const cdp = await page.createCDPSession()
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 })
  await page.tracing.start({ path: path.join(out, (rt === '/' ? 'root' : rt.slice(1)) + '.json'), categories: cats.split(',') })
  const t0 = Date.now()
  await page.goto(base + rt, { waitUntil: 'load', timeout: 180000 }).catch((e) => console.log('goto', rt, e.message))
  await new Promise((s) => setTimeout(s, Number(process.env.ESPERA ?? 4000)))
  await page.tracing.stop()
  console.log(rt, 'selesai', Date.now() - t0, 'ms')
  await page.close()
}
await browser.close()
