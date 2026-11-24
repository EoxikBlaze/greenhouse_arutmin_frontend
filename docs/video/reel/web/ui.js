// ---------- screen-space UI: labels, titles, device screens, diagrams ----------
const SG = 'Space Grotesk', IN = 'Inter';
const appear = (lt, a, b = a + .3) => easeOut(inv(a, b, lt));

// short on-screen label (max 6-8 words), kept above the subtitle band (y < 860)
function chip(ctx, str, x, y, a = 1, o = {}) {
  if (a <= 0) return; screen(ctx); ctx.save(); ctx.globalAlpha = a;
  const size = o.size || 34; ctx.font = `700 ${size}px ${SG}`; const w = ctx.measureText(str).width + size * (o.dot ? 1.9 : 1.1), h = size * 1.75;
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  ctx.translate(0, (1 - a) * 14);
  ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
  rrect(ctx, x0, y - h / 2, w, h, h / 2); ctx.fillStyle = o.bg || COL.navy; ctx.fill(); ctx.shadowColor = 'transparent';
  if (o.dot) { circle(ctx, x0 + size * .75, y, size * .28); ctx.fillStyle = o.dot; ctx.fill(); }
  text(ctx, str, x0 + w / 2 + (o.dot ? size * .4 : 0), y + 1, size, o.fg || '#fff', INK, 0, SG, 700);
  ctx.restore();
}
function illu(ctx, str, x, y, a = 1) { chip(ctx, str, x, y, a, { size: 22, bg: 'rgba(11,26,43,.72)', fg: '#fff' }); }
function chapter(ctx, str, lt, x = 110, y = 110) {
  const a = appear(lt, .1, .5); if (a <= 0) return; screen(ctx); ctx.save(); ctx.globalAlpha = a;
  ctx.font = `700 46px ${SG}`; const w = ctx.measureText(str).width + 70;
  rrect(ctx, x - 10, y - 40, w + 20, 80, 16); ctx.fillStyle = COL.navy; ctx.fill();
  ctx.fillStyle = COL.gold; ctx.fillRect(x + 8, y - 22, 8, 44);
  text(ctx, str, x + 36, y + 2, 46, '#fff', INK, 0, SG, 700, 'left'); ctx.restore();
}
function checkRow(ctx, items, x, y, k, o = {}) {
  screen(ctx);
  items.forEach((s, i) => {
    const a = clamp(k * items.length - i); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; const yy = y + i * 70;
    rrect(ctx, x, yy - 28, o.w || 430, 56, 14); ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = COL.mint; ctx.stroke();
    circle(ctx, x + 32, yy, 16); fillStroke(ctx, a > .9 ? COL.forest : '#ccc', 0);
    ctx.beginPath(); ctx.moveTo(x + 24, yy); ctx.lineTo(x + 30, yy + 7); ctx.lineTo(x + 41, yy - 7); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
    text(ctx, s, x + 62, yy + 1, 28, COL.ink, INK, 0, SG, 700, 'left'); ctx.restore();
  });
}

// ---------- device frame + screens ----------
function device(ctx, x, y, w, h, drawScreen, lt, o = {}) {
  screen(ctx); ctx.save(); ctx.translate(x, y);
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
  rrect(ctx, -w / 2, -h / 2, w, h, o.r || 46); ctx.fillStyle = '#12161c'; ctx.fill(); ctx.shadowColor = 'transparent';
  const p = o.pad || 18; rrect(ctx, -w / 2 + p, -h / 2 + p, w - 2 * p, h - 2 * p, (o.r || 46) - 14); ctx.save(); ctx.clip();
  ctx.fillStyle = COL.page; ctx.fillRect(-w / 2, -h / 2, w, h);
  drawScreen(ctx, -w / 2 + p, -h / 2 + p, w - 2 * p, h - 2 * p, lt);
  ctx.restore(); ctx.restore();
}
function topbar(ctx, x, y, w, title) {
  const g = ctx.createLinearGradient(0, y, 0, y + 70); g.addColorStop(0, COL.navy); g.addColorStop(1, COL.navy2);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, 70); text(ctx, title, x + 24, y + 36, 26, '#fff', INK, 0, SG, 700, 'left');
  text(ctx, 'GARAP', x + w - 24, y + 36, 20, COL.gold, INK, 0, SG, 700, 'right');
}
function card(ctx, x, y, w, h, fill = '#fff') { rrect(ctx, x, y, w, h, 20); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#E2E8DD'; ctx.stroke(); }
function btn(ctx, x, y, w, h, label, hl, primary = true) {
  rrect(ctx, x, y, w, h, h / 2); ctx.fillStyle = primary ? COL.forest : '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = COL.forest; ctx.stroke();
  if (hl > 0) { ctx.save(); ctx.globalAlpha = hl; rrect(ctx, x - 8, y - 8, w + 16, h + 16, h / 2 + 8); ctx.lineWidth = 6; ctx.strokeStyle = COL.gold; ctx.stroke(); ctx.restore(); }
  text(ctx, label, x + w / 2, y + h / 2 + 1, Math.min(26, h * .45), primary ? '#fff' : COL.forest, INK, 0, IN, 700);
}
// Kalibrasi screen (tombol nyata di garap.net: Aktifkan pemeliharaan, Ukur, Simpan). No result values shown.
function scrKalibrasi(o) {
  return (ctx, x, y, w, h, lt) => {
    topbar(ctx, x, y, w, 'Kalibrasi');
    card(ctx, x + 24, y + 92, w - 48, 92);
    text(ctx, 'Mode pemeliharaan', x + 48, y + 124, 22, COL.ink, INK, 0, SG, 700, 'left');
    text(ctx, o.maint ? 'Aktif' : 'Mode normal', x + 48, y + 156, 18, COL.abu, INK, 0, IN, 600, 'left');
    if (o.maint) { rrect(ctx, x + w - 320, y + 112, 270, 52, 26); ctx.fillStyle = COL.mint; ctx.fill(); text(ctx, 'Pemeliharaan aktif', x + w - 185, y + 139, 22, COL.forest, INK, 0, IN, 700); }
    else btn(ctx, x + w - 320, y + 112, 270, 52, 'Aktifkan pemeliharaan', o.hlMaint ? o.hlMaint(lt) : 0, true);
    card(ctx, x + 24, y + 204, w - 48, h - 228);
    text(ctx, o.title || '2. Kalibrasi pH', x + 48, y + 240, 24, COL.ink, INK, 0, SG, 700, 'left');
    text(ctx, o.step || 'Celup probe ke Buffer pH 4,01', x + 48, y + 278, 19, COL.abu, INK, 0, IN, 500, 'left');
    // reading wobble -> calm; no numbers
    const calm = o.calm ? o.calm(lt) : 0, bx = x + 48, by = y + 320, bw = w - 96;
    rrect(ctx, bx, by, bw, 90, 14); ctx.fillStyle = '#eef3ea'; ctx.fill();
    ctx.beginPath(); for (let i = 0; i <= 60; i++) { const xx = bx + 16 + i * (bw - 32) / 60; const yy = by + 45 + Math.sin(i * .7 + lt * 9) * 22 * (1 - calm) * (1 - i / 80); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.lineWidth = 4; ctx.strokeStyle = COL.forest; ctx.stroke();
    if (calm > .9) { rrect(ctx, bx + bw - 140, by + 12, 124, 36, 18); ctx.fillStyle = COL.mint; ctx.fill(); text(ctx, 'tenang', bx + bw - 78, by + 31, 18, COL.forest, INK, 0, IN, 700); }
    btn(ctx, x + 48, y + h - 92, 180, 56, 'Ukur', o.hlUkur ? o.hlUkur(lt) : 0);
    btn(ctx, x + 248, y + h - 92, 180, 56, 'Simpan', o.hlSimpan ? o.hlSimpan(lt) : 0);
  };
}
function scrDashboard(o = {}) {
  return (ctx, x, y, w, h, lt) => {
    topbar(ctx, x, y, w, 'Dashboard');
    card(ctx, x + 20, y + 90, w - 40, 80);
    circle(ctx, x + 50, y + 130, 9); ctx.fillStyle = COL.moss; ctx.fill();
    text(ctx, 'Alat terhubung', x + 70, y + 131, 22, COL.ink, INK, 0, SG, 700, 'left');
    text(ctx, o.update || 'Bacaan terakhir: baru saja', x + 70, y + 158, 15, COL.abu, INK, 0, IN, 500, 'left');
    const tiles = ['pH', 'ppm', 'Suhu air', 'Kelembapan'];
    tiles.forEach((s, i) => { const tx = x + 20 + (i % 2) * ((w - 50) / 2 + 10), ty = y + 190 + Math.floor(i / 2) * 120; card(ctx, tx, ty, (w - 50) / 2, 105); text(ctx, s, tx + 18, ty + 30, 18, COL.abu, INK, 0, IN, 600, 'left'); rrect(ctx, tx + 18, ty + 56, 90, 26, 8); ctx.fillStyle = '#e3eadf'; ctx.fill(); });
    if (o.alert) { const a = o.alert(lt); if (a > 0) { ctx.save(); ctx.globalAlpha = a; card(ctx, x + 20, y + h - 150, w - 40, 120, '#fff8e6'); ctx.lineWidth = 4; ctx.strokeStyle = COL.warn; rrect(ctx, x + 20, y + h - 150, w - 40, 120, 20); ctx.stroke(); warnTri(ctx, x + 66, y + h - 90, 26); text(ctx, 'Peringatan', x + 106, y + h - 112, 22, COL.ink, INK, 0, SG, 700, 'left'); text(ctx, 'Bacaan tidak tersedia', x + 106, y + h - 78, 18, COL.abu, INK, 0, IN, 600, 'left'); text(ctx, 'Periksa penyebabnya dulu', x + 106, y + h - 52, 18, COL.abu, INK, 0, IN, 600, 'left'); ctx.restore(); } }
  };
}
function warnTri(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 1.05, y + r * .8); ctx.lineTo(x - r * 1.05, y + r * .8); ctx.closePath(); fillStroke(ctx, COL.warn, 4); text(ctx, '!', x, y + r * .2, r, '#fff', INK, 0, SG, 700); }
function scrKebun(o = {}) {
  return (ctx, x, y, w, h, lt) => {
    topbar(ctx, x, y, w, 'Kebun Saya');
    card(ctx, x + 20, y + 90, w - 40, 210);
    text(ctx, 'Batch baru: Melon', x + 44, y + 128, 22, COL.ink, INK, 0, SG, 700, 'left');
    ['Jenis tanaman', 'Meja', 'Jumlah benih'].forEach((s, i) => { text(ctx, s, x + 44, y + 168 + i * 40, 17, COL.abu, INK, 0, IN, 500, 'left'); rrect(ctx, x + 220, y + 152 + i * 40, w - 280, 30, 8); ctx.fillStyle = '#eef3ea'; ctx.fill(); });
    btn(ctx, x + 40, y + h - 100, w - 80, 64, 'Mulai Semai', o.hl ? o.hl(lt) : 0);
  };
}
// Sensor -> tab Nutrisi: ppm nyata vs rencana target (no numbers)
function scrNutrisi(o = {}) {
  return (ctx, x, y, w, h, lt) => {
    topbar(ctx, x, y, w, 'Sensor');
    ['Semua', 'pH', 'Nutrisi', 'Suhu air'].forEach((s, i) => { const tx = x + 20 + i * ((w - 40) / 4); rrect(ctx, tx + 4, y + 86, (w - 40) / 4 - 8, 44, 22); ctx.fillStyle = s === 'Nutrisi' ? '#4E7733' : '#fff'; ctx.fill(); text(ctx, s, tx + (w - 40) / 8, y + 108, 17, s === 'Nutrisi' ? '#fff' : COL.abu, INK, 0, IN, 700); });
    card(ctx, x + 20, y + 150, w - 40, h - 175);
    const gx = x + 50, gy = y + 190, gw = w - 100, gh = h - 260, k = o.draw ? o.draw(lt) : 1;
    line(ctx, gx, gy + gh, gx + gw, gy + gh, 2, '#c8d2c4'); line(ctx, gx, gy, gx, gy + gh, 2, '#c8d2c4');
    ctx.save(); ctx.setLineDash([12, 10]); ctx.beginPath(); for (let i = 0; i <= 40 * k; i++) { const xx = gx + i * gw / 40, yy = gy + gh * (.75 - i / 40 * .45); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.lineWidth = 4; ctx.strokeStyle = COL.warn; ctx.stroke(); ctx.restore();
    ctx.beginPath(); for (let i = 0; i <= 40 * k; i++) { const xx = gx + i * gw / 40, yy = gy + gh * (.82 - i / 40 * .45) + Math.sin(i * 1.3) * 8; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.lineWidth = 5; ctx.strokeStyle = COL.forest; ctx.stroke();
    line(ctx, gx + 10, gy + 18, gx + 50, gy + 18, 5, COL.forest); text(ctx, 'ppm nyata', gx + 60, gy + 19, 17, COL.ink, INK, 0, IN, 600, 'left');
    ctx.save(); ctx.setLineDash([10, 8]); line(ctx, gx + 200, gy + 18, gx + 240, gy + 18, 4, COL.warn); ctx.restore(); text(ctx, 'rencana target', gx + 250, gy + 19, 17, COL.ink, INK, 0, IN, 600, 'left');
  };
}

// ---------- diagrams ----------
function flowBoxes(ctx, labels, x, y, bw, bh, gap, k, o = {}) {
  screen(ctx);
  labels.forEach((s, i) => {
    const a = clamp(k * labels.length - i); if (a <= 0) return;
    const bx = x + i * (bw + gap); ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 20);
    const act = o.active === i;
    ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
    rrect(ctx, bx, y, bw, bh, 22); ctx.fillStyle = act ? COL.forest : '#fff'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = 4; ctx.strokeStyle = act ? COL.gold : COL.forest; ctx.stroke();
    const lines = s.split('\n'); lines.forEach((ln, j) => text(ctx, ln, bx + bw / 2, y + bh / 2 + (j - (lines.length - 1) / 2) * 34, o.size || 28, act ? '#fff' : COL.ink, INK, 0, SG, 700));
    if (i < labels.length - 1) { const ax = bx + bw + 8, ay = y + bh / 2; line(ctx, ax, ay, ax + gap - 16, ay, 6, COL.olive); ctx.beginPath(); ctx.moveTo(ax + gap - 10, ay); ctx.lineTo(ax + gap - 26, ay - 12); ctx.lineTo(ax + gap - 26, ay + 12); ctx.closePath(); ctx.fillStyle = COL.olive; ctx.fill(); }
    ctx.restore();
  });
}
function backdrop(ctx, col = COL.page) { screen(ctx); ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.globalAlpha = .5; ctx.strokeStyle = '#e2e8dd'; ctx.lineWidth = 2; for (let x = 0; x < W; x += 60) line(ctx, x, 0, x, H, 1, '#e7ece3'); for (let y = 0; y < H; y += 60) line(ctx, 0, y, W, y, 1, '#e7ece3'); ctx.restore(); }
function calendar(ctx, x, y, label, flip, a = 1) {
  screen(ctx); if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  rrect(ctx, -90, -80, 180, 170, 18); fillStroke(ctx, '#fff', 5); ctx.save(); rrect(ctx, -90, -80, 180, 50, [18, 18, 0, 0]); ctx.fillStyle = COL.red; ctx.fill(); ctx.restore();
  for (const rx of [-45, 45]) { rrect(ctx, rx - 6, -96, 12, 30, 5); fillStroke(ctx, '#888', 3); }
  text(ctx, 'KALENDER', 0, -54, 20, '#fff', INK, 0, SG, 700);
  text(ctx, label, 0, 20, 40, COL.ink, INK, 0, SG, 700);
  if (flip > 0 && flip < 1) { ctx.save(); ctx.translate(0, -30); ctx.scale(1, 1 - flip); rrect(ctx, -86, 0, 172, 116, 12); fillStroke(ctx, '#f3f0e6', 3); ctx.restore(); }
  ctx.restore();
}
function logos(ctx, x, y, a, s = 120) {
  if (a <= 0 || !window.LOGO) return; screen(ctx); ctx.save(); ctx.globalAlpha = a;
  const L = window.LOGO; [L.vertonik, L.arutmin, L.politala].forEach((im, i) => { if (!im || !im.complete) return; const xx = x + (i - 1) * (s + 50); rrect(ctx, xx - s / 2 - 10, y - s / 2 - 10, s + 20, s + 20, 22); ctx.fillStyle = '#fff'; ctx.fill(); ctx.drawImage(im, xx - s / 2, y - s / 2, s, s); });
  ctx.restore();
}
