// Captures real garap.net screens with the read-only demo account (no password) for the video's device screens.
// The yellow "Mode Demo" banner is hidden so the screen looks like the normal app; nothing else is changed.
const { chromium } = require('playwright');
const OUT = 'web/img/web/';
const hideBanner = () => {
  const els = [...document.querySelectorAll('body *')].filter(e => (e.innerText || '').includes('Mode Demo (Hanya Terima Data)'));
  const box = els.sort((a, b) => a.innerText.length - b.innerText.length).find(e => (e.innerText || '').trim().startsWith('DEMO') || e.querySelector('*') && e.getBoundingClientRect().top < 5);
  if (box) box.style.display = 'none';
};
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' });
  const p = await ctx.newPage();
  await p.goto('https://garap.net/login', { waitUntil: 'networkidle' });
  await p.getByText('Coba Akun Demo').click();
  await p.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const go = async (path, vp) => { if (vp) await p.setViewportSize(vp); await p.goto('https://garap.net' + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500); await p.evaluate(hideBanner); await p.waitForTimeout(300); };
  const save = async name => { await p.screenshot({ path: OUT + name + '.png' }); console.log('saved', name); };
  const scrollTo = async (txt, off = 120) => { await p.evaluate(([t, o]) => { const el = [...document.querySelectorAll('h1,h2,h3,h4,p,span,div,button')].find(e => e.childElementCount === 0 && e.textContent.trim().startsWith(t)); if (el) window.scrollBy(0, el.getBoundingClientRect().top - o); }, [txt, off]); await p.waitForTimeout(800); };
  await go('/dashboard'); await save('dashboard');
  await go('/peringatan'); await save('peringatan');
  await go('/tanam'); await save('kebun');
  await go('/sensor-realtime');
  const tabs = await p.evaluate(() => [...document.querySelectorAll('button,[role=tab],a')].map(e => e.textContent.trim()).filter(t => t && t.length < 20));
  console.log('tabs', JSON.stringify(tabs));
  const tab = p.locator('button,[role=tab]').filter({ hasText: /^\s*Nutrisi\s*$/ }).first();
  if (await tab.count()) { await tab.scrollIntoViewIfNeeded(); await tab.click(); await p.waitForTimeout(2500); await scrollTo('Nutrisi', 200); }
  await save('sensor-nutrisi');
  await go('/kalibrasi', { width: 820, height: 1000 });
  await save('kalibrasi-atas');
  await scrollTo('1. Kalibrasi EC', 40); await save('kalibrasi-ph');
  await b.close();
})();
