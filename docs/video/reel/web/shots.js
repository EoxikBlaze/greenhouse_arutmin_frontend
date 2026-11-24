// ---------- shot list: 120 s, follows docs/video/naskah-storyboard-stickman-garap.md ----------
const OP = { cols: ['#2D452F', '#2D452F'], hat: 'caping', belt: false, towel: true };          // operator
const PM = { cols: ['#0A1F38', '#0A1F38'], vest: '#E9CD53', hat: 'none', belt: false };         // pemandu
const C = (base, extra) => Object.assign({}, base, extra);
const walkLegs = (t, sp = 9, amp = .5) => ({ L: [Math.sin(t * sp) * amp + .05, -Math.max(0, Math.sin(t * sp + 1)) * .7], R: [-Math.sin(t * sp) * amp + .05, -Math.max(0, -Math.sin(t * sp + 1)) * .7] });
const walkArms = (t, sp = 9, amp = .45) => ({ L: [.3 - Math.sin(t * sp) * amp, -.3], R: [.3 + Math.sin(t * sp) * amp, -.3] });
const IDLE_ARMS = { L: [.3, -.1], R: [.3, -.1] };
const blinkAt = (t, seed = 0) => ((t + seed) % 3.1) < .11 ? 1 : 0;
const drift = (t, a = 3) => shake(t * .3, a, 1, 4);
// walking speed that matches the leg cycle (feet do not slide): ~0.5 * s px per second at sp = 5
const WALK_V = (s, sp) => s * .32 / (Math.PI / sp);

function pt(o, wx, wy) { return { ik: [(wx - o.x) / o.s * (o.flip || 1), (wy - o.y) / o.s] }; }
function person(ctx, base, o) {
  const f = Object.assign({ s: 400, y: FLOOR, flip: 1 }, o);
  const arms = Object.assign({}, IDLE_ARMS, f.arms || {});
  if (f.point) arms.R = pt(f, f.point[0], f.point[1]);
  if (f.pointL) arms.L = pt(f, f.pointL[0], f.pointL[1]);
  f.arms = arms;
  if (f.hold) f.prop = holding(f.hold);
  drawStick(ctx, C(base, f));
}
function cam(x, y, z, t, a = 3) { const d = drift(t, a); return { x: x + d[0], y: y + d[1], z }; }
const ST = (o = {}) => Object.assign({ panel: { lamp: 'blue' } }, o);
function blurWorld(ctx, t, c, st, px = 6) { ctx.save(); ctx.filter = `blur(${px}px)`; drawWorld(ctx, t, c, st); ctx.restore(); ctx.filter = 'none'; }

const SHOTS = [];
const S = (start, end, draw, tr = 'cut') => SHOTS.push({ start, end, tr, draw });

// ===== ADEGAN 1 — masalah pembuka (0–8) =====
S(0, 3, (ctx, lt, t) => {                                     // 1a OP checks water at penampung
  const c = cam(1500, 540, 1.25 + lt * .05, t); drawWorld(ctx, t, c, ST());
  const raise = kf(lt, [[0, 0], [.8, 1], [2.6, 1]]);
  const o = { x: 1560, s: 400, flip: -1, lean: .04 };
  person(ctx, OP, C(o, { point: [lerp(1470, 1538, raise), lerp(610, 470, raise)], hold: { R: 'cup' }, face: { look: [.6, -.2 * raise], mouth: 'flat', browUp: raise, blink: blinkAt(t) } }));
}, 'cut');
S(3, 5.5, (ctx, lt, t) => {                                   // 1b OP walks to talang, lifts a leaf
  const v = WALK_V(400, 5), dur = .95, walking = lt < dur;
  const x = 1900 + Math.min(lt, dur) * v;
  const c = cam(lerp(1960, 2080, inv(0, 1.2, lt)), 520, 1.35, t); drawWorld(ctx, t, c, ST());
  const o = { x, s: 400, flip: 1 };
  if (walking) person(ctx, OP, C(o, { legs: walkLegs(lt, 5), arms: walkArms(lt, 5), face: { look: [.7, 0] } }));
  else person(ctx, OP, C(o, { point: [2104, 492 - kf(lt, [[dur, 0], [1.6, 22]])], face: { look: [.7, -.3], mouth: 'flat', blink: blinkAt(t, 1) } }));
});
S(5.5, 8, (ctx, lt, t) => {                                   // 1c notebook, confused
  const c = cam(2090, 560, 2.1, t, 2); drawWorld(ctx, t, c, ST());
  const o = { x: 2090, s: 400, flip: 1 };
  const scratch = Math.sin(lt * 14) * .015;
  person(ctx, OP, C(o, { arms: { L: pt(o, 2050, 610), R: { ik: [.06 + scratch, -.92] } }, hold: { L: 'notebook' }, headTilt: -.08, face: { look: [-.3, .4], mouth: 'frown', browAng: -.2, blink: blinkAt(t, 2) } }));
  const a = appear(lt, .6, 1); if (a > 0) { screen(ctx); ctx.save(); ctx.globalAlpha = a; text(ctx, '?', 1150, 190 - Math.sin(lt * 3) * 6, 120, COL.gold, INK, 10, SG, 700); ctx.restore(); }
});

// ===== ADEGAN 2 — perkenalan GARAP (8–18) =====
S(8, 11, (ctx, lt, t) => {                                    // 2a pan to installation
  const k = ease(inv(0, 2.6, lt)); const c = cam(lerp(1950, 1280, k), 500, lerp(1.3, .9, k), t, 2);
  drawWorld(ctx, t, c, ST());
  person(ctx, OP, { x: 2050, s: 400, flip: -1, face: { look: [.6, -.1], mouth: 'o', browUp: .6, blink: blinkAt(t) } });
});
S(11, 15, (ctx, lt, t) => {                                   // 2b PM walks in, points at panel; title
  const c = cam(1280, 480, .9, t, 2); drawWorld(ctx, t, c, ST());
  person(ctx, OP, { x: 2050, s: 400, flip: -1, face: { look: [.6, 0], mouth: 'smile', blink: blinkAt(t) } });
  const sp = 5, v = WALK_V(400, sp), dur = 1.3, x = 1700 - Math.min(lt, dur) * v;
  const o = { x, s: 400, flip: -1 };
  if (lt < dur) person(ctx, PM, C(o, { legs: walkLegs(lt, sp), arms: walkArms(lt, sp), hold: { L: 'tablet' }, face: { look: [.6, 0], mouth: 'smile' } }));
  else person(ctx, PM, C(o, { point: [1140, 430], arms: { L: [.5, -1.2] }, hold: { L: 'tablet' }, face: { look: [.7, -.2], mouth: 'grin', blink: blinkAt(t, 1) } }));
  const a = appear(lt, 1, 1.6), out2 = 1 - appear(lt, 3.75, 3.95);
  if (a > 0) {
    screen(ctx); ctx.save(); ctx.globalAlpha = a * out2; const sc = .9 + .1 * backOut(a);
    ctx.translate(960, 175); ctx.scale(sc, sc);
    rrect(ctx, -560, -105, 1120, 210, 34); ctx.fillStyle = 'rgba(10,31,56,.92)'; ctx.fill();
    circle(ctx, -450, 0, 88); ctx.fillStyle = '#fff'; ctx.fill(); if (window.LOGO && LOGO.vertonik.complete) ctx.drawImage(LOGO.vertonik, -520, -70, 140, 140);
    text(ctx, 'GARAP', 110, -25, 104, '#fff', INK, 0, SG, 700);
    text(ctx, 'Greenhouse Automation & Research Arutmin–Politala', 110, 58, 30, COL.gold, INK, 0, SG, 600);
    ctx.restore();
  }
});
S(15, 18, (ctx, lt, t) => {                                   // 2c two-shot, gear + switch icons
  const c = cam(1230, 560, 1.35, t, 2); drawWorld(ctx, t, c, ST());
  person(ctx, OP, { x: 1420, s: 400, flip: -1, headTilt: Math.sin(lt * 6) * .05 * (lt < 1.5 ? 1 : 0), face: { look: [.6, 0], mouth: 'smile', eyes: lt > 1.5 ? 'happy' : 'normal' } });
  person(ctx, PM, { x: 1300, s: 400, flip: -1, point: [1150, 470], hold: { L: 'tablet' }, face: { look: [.5, -.1], mouth: 'smile', blink: blinkAt(t, 2) } });
  chip(ctx, 'Pengaturan', 560, 300, appear(lt, .2), { size: 30, bg: COL.forest });
  chip(ctx, 'Izin sistem', 560, 380, appear(lt, .6), { size: 30, bg: COL.forest });
  chip(ctx, 'Pantau • Kelola sesuai izin', 960, 110, appear(lt, 1.0));
});

// ===== ADEGAN 3 — kenali bagiannya (18–30) =====
S(18, 22, (ctx, lt, t) => {                                   // 3a sensor line: EC then pH
  const c = cam(1760, 600, 2.5, t, 1.5);
  const ec = lt < 2 ? appear(lt, .2) : 1 - appear(lt, 2, 2.2), ph = appear(lt, 2.1);
  drawWorld(ctx, t, c, ST({ tank: { hlEC: ec, hlPH: ph } }));
  person(ctx, PM, { x: 1990, s: 400, flip: -1, point: lt < 2 ? [1820, 590] : [1750, 590], hold: { L: 'tablet' }, face: { look: [.6, .2], mouth: 'smile' } });
  chip(ctx, 'EC = kepekatan nutrisi', 960, 100, appear(lt, .3));
  chip(ctx, 'pH = keasaman', 960, 190, appear(lt, 2.1));
});
S(22, 24, (ctx, lt, t) => {                                   // 3b other sensors
  const c = cam(lerp(1700, 1640, lt / 2), 620, 2.2, t, 1.5); drawWorld(ctx, t, c, ST());
  screen(ctx);
  chip(ctx, 'Suhu air', 520, 150, appear(lt, .1), { size: 30, bg: COL.forest });
  chip(ctx, 'Suhu & kelembapan udara', 960, 150, appear(lt, .4), { size: 30, bg: COL.forest });
  chip(ctx, 'Pelampung tinggi air', 1440, 150, appear(lt, .7), { size: 30, bg: COL.forest });
  // pelampung marker highlight (world)
  applyCam(ctx, c, 1); const a = appear(lt, .7); if (a > 0) { ctx.save(); ctx.globalAlpha = a; circle(ctx, TANK.x1 - 40, TANK.top + 40, 50); ctx.lineWidth = 6; ctx.strokeStyle = COL.gold; ctx.stroke(); ctx.restore(); }
});
S(24, 27, (ctx, lt, t) => {                                   // 3c data flow diagram
  backdrop(ctx);
  flowBoxes(ctx, ['Alat\nmembaca', 'Server\nmemeriksa', 'Website\nmenampilkan'], 240, 330, 400, 200, 120, appear(lt, 0, 1.2), { size: 40 });
  screen(ctx); if (lt > 1.2) for (let i = 0; i < 2; i++) { const p = ((lt * .9) + i * .5) % 1; circle(ctx, 240 + 400 + 8 + p * 104 + i * 520, 430, 10); ctx.fillStyle = COL.gold; ctx.fill(); }
});
S(27, 30, (ctx, lt, t) => {                                   // 3d pumps GARAP controls
  const c = cam(1290, 570, 1.75, t, 1.5); drawWorld(ctx, t, c, ST());
  person(ctx, PM, { x: 1520, s: 400, flip: -1, point: lt < 1.5 ? [1380, 460] : [1315, 720], hold: { L: 'tablet' }, face: { look: [.6, .3], mouth: 'smile', blink: blinkAt(t) } });
  chip(ctx, 'Pompa dosing: A • B • pH up • pH down', 960, 100, appear(lt, .2));
  chip(ctx, 'Pompa isi air', 960, 190, appear(lt, 1.5));
});

// ===== ADEGAN 4 — kalibrasi (30–45) =====
S(30, 34, (ctx, lt, t) => {                                   // 4a maintenance mode on, bottles
  const c = cam(-330, 560, 1.7, t, 2); drawWorld(ctx, t, c, ST({ panel: { lamp: 'yellow', blink: 'slow' } }));
  person(ctx, OP, { x: -640, s: 400, flip: 1, arms: { R: { ik: [.18, -.62] }, L: { ik: [.08, -.6] } }, hold: { R: 'tablet' }, face: { look: [.3, .5], mouth: 'flat', blink: blinkAt(t) } });
  device(ctx, 1380, 440, TAB_W, 800, webScreen('kalibrasi-atas'), lt, { r: 34 });
  chapter(ctx, 'Kalibrasi', lt);
  if (lt > 1.6) { chip(ctx, 'Lampu panel: kuning berkedip', 1330, 790, appear(lt, 1.6), { size: 26, dot: Math.floor(t * 1.2) % 2 ? '#665' : COL.warn }); }
});
S(34, 38, (ctx, lt, t) => {                                   // 4b dip probe into pH 4,01
  const c = cam(-360, 560, 2.3, t, 1.5); drawWorld(ctx, t, c, ST({ panel: { lamp: 'yellow', blink: 'slow' } }));
  const dip = kf(lt, [[0, 0], [1.2, 1]]);
  person(ctx, OP, { x: -300, s: 400, flip: -1, point: [-425, lerp(470, 520, dip)], hold: { R: 'probe' }, face: { look: [.4, .6], mouth: 'flat', blink: blinkAt(t) } });
  person(ctx, PM, { x: -40, s: 400, flip: -1, hold: { L: 'tablet' }, arms: { L: [.5, -1.2], R: [.9, -.8] }, face: { look: [.6, 0], mouth: 'smile', blink: blinkAt(t, 1) } });
  chip(ctx, 'Titik 1: pH 4,01', 960, 100, appear(lt, .4));
});
S(38, 42, (ctx, lt, t) => {                                   // 4c wait calm -> Ukur -> Simpan (no values)
  const c = cam(-120, 560, 2.3, t, 1); drawWorld(ctx, t, c, ST({ panel: { lamp: 'yellow', blink: 'slow' } }));
  person(ctx, OP, { x: -300, s: 400, flip: -1, point: [-425, 520], hold: { R: 'probe' }, face: { look: [.2, .5], mouth: 'flat', browUp: .4, blink: blinkAt(t, 2) } });
  device(ctx, 1380, 440, TAB_W, 800, webScreen('kalibrasi-ph', { hl: l => l > .6 ? [.02, .47, .96, .29] : null }), lt, { r: 34 });
  chip(ctx, 'Celup → tunggu tenang', 520, 100, appear(lt, .2));
  chip(ctx, 'Ukur → Simpan', 520, 190, appear(lt, 2.2));
});
S(42, 45, (ctx, lt, t) => {                                   // 4d rinse, next bottle
  const rinse = lt < 1.4, lifted = lt > 1.8;
  const c = cam(-280, 560, 2.1, t, 1.5); drawWorld(ctx, t, c, ST({ panel: { lamp: 'yellow', blink: 'slow' }, kal: { done: [0], lifted: lifted ? 1 : -1 } }));
  const o = { x: -200, s: 400, flip: -1 };
  if (rinse) person(ctx, OP, C(o, { point: [-135, 520 + Math.sin(lt * 10) * 6], hold: { R: 'probe' }, face: { look: [.2, .6], mouth: 'flat' } }));
  else person(ctx, OP, C(o, { point: lifted ? [-300, 520] : [-355, 560], hold: { R: lifted ? 'bottle' : null }, face: { look: [.5, .3], mouth: 'smile', blink: blinkAt(t) } }));
  chip(ctx, 'Titik 2: pH 6,86', 960, 100, appear(lt, .3));
  chip(ctx, 'Lalu EC: 1,413 → 12,88 mS/cm', 960, 190, appear(lt, 1.2));
});

// ===== ADEGAN 5 — Uji Alat & Validasi (45–57) =====
S(45, 49, (ctx, lt, t) => {                                   // 5a setel vs periksa
  backdrop(ctx); chapter(ctx, 'Uji Alat & Validasi', lt);
  screen(ctx);
  [['Kalibrasi', 'menyetel pembacaan', 470], ['Uji', 'memeriksa hasil & fungsi', 1050]].forEach(([h, d, x], i) => {
    const a = appear(lt, .4 + i * .6); if (a <= 0) return; ctx.save(); ctx.globalAlpha = a;
    card(ctx, x - 250, 300, 500, 300); text(ctx, h, x, 380, 54, COL.forest, INK, 0, SG, 700); text(ctx, d, x, 470, 32, COL.ink, INK, 0, IN, 600); ctx.restore();
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawStick(ctx, C(PM, { x: 1560, y: 840, s: 560, flip: -1, arms: { R: { ik: [.36, -.62] }, L: [.4, -1] }, prop: holding({ L: 'tablet' }), face: { look: [.6, -.1], mouth: 'smile', blink: blinkAt(t) } }));
});
S(49, 53, (ctx, lt, t) => {                                   // 5b handheld meter, then pump test with water into gelas ukur
  const pump = lt > 2 && lt < 3.4;
  const c = cam(1560, 580, 2.1, t, 1.5); drawWorld(ctx, t, c, ST({ panel: { lamp: 'blue', blink: pump ? 'fast' : null, pumpOn: pump ? 'A' : null } }));
  // gelas ukur under the dosing tube end
  applyCam(ctx, c, 1); const fill = kf(lt, [[2, 0], [3.4, 1]]);
  rrect(ctx, INJECT.x - 34, INJECT.y - 70, 44, 62, 6); fillStroke(ctx, 'rgba(220,240,250,.85)', 4);
  ctx.fillStyle = 'rgba(80,170,220,.55)'; ctx.fillRect(INJECT.x - 30, INJECT.y - 12 - 50 * fill, 36, 50 * fill + 2);
  for (let i = 1; i < 4; i++) line(ctx, INJECT.x - 30, INJECT.y - 10 - i * 14, INJECT.x - 18, INJECT.y - 10 - i * 14, 2, '#456');
  const o = { x: 1620, s: 400, flip: lt < 2 ? 1 : -1 };
  if (lt < 2) person(ctx, OP, C(o, { point: [1720, 600], hold: { R: 'meter' }, face: { look: [.6, -.2], mouth: 'flat', blink: blinkAt(t) } }));
  else person(ctx, OP, C(o, { point: [1500, 560], face: { look: [.6, .5], mouth: 'o', browUp: .5 } }));
  if (lt < 2) chip(ctx, 'Alat genggam ≈ sensor GARAP', 960, 100, appear(lt, .3));
  else chip(ctx, 'Air bersih dulu, bukan nutrisi', 960, 100, appear(lt, 2));
});
S(53, 57, (ctx, lt, t) => {                                   // 5c write results (no LULUS stamp)
  const c = cam(1560, 560, 1.6, t, 2); drawWorld(ctx, t, c, ST());
  const w = Math.sin(lt * 16) * .012;
  person(ctx, OP, { x: 1580, s: 400, flip: -1, arms: { L: { ik: [.12, -.55] }, R: { ik: [.16 + w, -.6] } }, hold: { L: 'notebook', R: 'pencil' }, face: { look: [.2, .7], mouth: 'flat', blink: blinkAt(t) } });
  person(ctx, PM, { x: 1300, s: 400, flip: 1, headTilt: Math.sin(lt * 5) * .04, hold: { L: 'tablet' }, arms: { L: [.5, -1.2] }, face: { look: [.6, 0], mouth: 'smile', blink: blinkAt(t, 1) } });
  checkRow(ctx, ['Dibanding alat genggam', 'Data ikut diperbarui', 'Pompa diuji air bersih'], 110, 200, appear(lt, .2, 3.2), { w: 520 });
  chip(ctx, 'Catat hasil uji', 1500, 100, appear(lt, .2));
});

// ===== ADEGAN 6 — semai melon (57–74), SOP lapangan GARAP =====
function soakBowl(ctx, x, base, t, o = {}) {           // clear container, cutaway water, seeds sink / float
  rrect(ctx, x - 70, base - 90, 140, 90, 10); fillStroke(ctx, 'rgba(225,240,250,.55)', 5);
  ctx.fillStyle = 'rgba(190,120,140,.35)'; ctx.fillRect(x - 66, base - 72, 132, 70);   // air ekstrak bawang merah
  const R = rng(4);
  for (let i = 0; i < 9; i++) {
    const sink = i % 4 !== 0; const sx = x - 55 + R() * 110;
    const k = o.sink == null ? 1 : o.sink;
    const sy = sink ? lerp(base - 72, base - 10 - R() * 6, ease(clamp(k * 1.2 - i * .05))) : base - 74 + Math.sin(t * 2 + i) * 2;
    if (!sink && o.floatGone) continue;
    ellipse(ctx, sx, sy, 7, 4, R()); fillStroke(ctx, '#f3e6b8', 2);
  }
}
S(57, 60.5, (ctx, lt, t) => {                                 // 6a soak 1 hari
  const c = cam(420, 560, 2, t, 2); drawWorld(ctx, t, c, ST());
  applyCam(ctx, c, 1); soakBowl(ctx, 330, SEMAI.top - 16, t, { sink: inv(.6, 3, lt) });
  // red onions beside bowl
  for (let i = 0; i < 3; i++) { circle(ctx, 440 + i * 26, SEMAI.top - 30, 13); fillStroke(ctx, '#b23a5a', 3); }
  const pour = lt > .3 && lt < 1.3;
  person(ctx, OP, { x: 470, s: 400, flip: -1, point: pour ? [345, 520] : [400, 590], face: { look: [.4, .6], mouth: 'smile', blink: blinkAt(t) } });
  if (pour) { for (let i = 0; i < 4; i++) { const p = ((lt * 2) + i * .25) % 1; ellipse(ctx, 340 + i * 3, lerp(530, 560, p), 5, 3); fillStroke(ctx, '#f3e6b8', 2); } }
  chapter(ctx, 'Semai Melon · SOP lapangan GARAP', lt);
  chip(ctx, 'Rendam • 1 hari', 960, 220, appear(lt, .4));
  calendar(ctx, 1680, 210, '+1 hari', 0, appear(lt, .4));
});
S(60.5, 62.5, (ctx, lt, t) => {                               // 6b uji apung: pakai yang tenggelam
  const c = cam(360, 560, 4, t, 1); drawWorld(ctx, t, c, ST());
  applyCam(ctx, c, 1); const scoop = inv(.3, 1.4, lt);
  soakBowl(ctx, 330, SEMAI.top - 16, t, { sink: 1, floatGone: scoop > .6 });
  rrect(ctx, 410, SEMAI.top - 40, 50, 24, 8); fillStroke(ctx, '#fff', 3);                 // small dish for floaters
  if (scoop > .6) for (let i = 0; i < 3; i++) { ellipse(ctx, 422 + i * 12, SEMAI.top - 30, 6, 3.5); fillStroke(ctx, '#e8d9a8', 2); }
  const sx = lerp(300, 435, ease(scoop)), sy = lerp(560, 600, Math.sin(scoop * Math.PI));
  line(ctx, sx, sy, sx + 40, sy - 60, 5, '#9aa3a8'); ellipse(ctx, sx, sy, 14, 7); fillStroke(ctx, '#c4cbcf', 3);
  chip(ctx, 'Uji apung: pakai yang tenggelam', 960, 100, appear(lt, .2));
  chip(ctx, 'Praktik SOP, bukan jaminan tumbuh', 960, 190, appear(lt, .6), { size: 26, bg: COL.abu });
});
S(62.5, 65.5, (ctx, lt, t) => {                               // 6c peram kain hitam 2 hari (gelap)
  const c = cam(420, 560, 2, t, 2); drawWorld(ctx, t, c, ST({ dim: .55 * appear(lt, 1.2, 2.2) }));
  applyCam(ctx, c, 1); const place = inv(.2, 1.1, lt);
  const bx = lerp(470, 320, place), by = lerp(520, SEMAI.top - 30, place);
  ctx.beginPath(); ctx.ellipse(bx, by, 52, 18, 0, 0, TAU); fillStroke(ctx, '#1f1f24', 4); line(ctx, bx - 40, by - 4, bx + 40, by - 8, 2, '#444');
  person(ctx, OP, { x: 470, s: 400, flip: -1, point: [bx + 20, by - 10], face: { look: [.4, .6], mouth: 'flat', blink: blinkAt(t, 2) } });
  chip(ctx, 'Peram kain hitam lembap • 2 hari', 960, 120, appear(lt, .3));
  calendar(ctx, 1680, 210, '+2 hari', inv(1.2, 1.6, lt) % 1, 1);
});
S(65.5, 70, (ctx, lt, t) => {                                 // 6d jemur sinar pagi 2 hari, jaga lembap
  const c = cam(420, 540, 2, t, 2); drawWorld(ctx, t, c, ST({ sun: [-150, 120, 50], sunPow: .9 }));
  applyCam(ctx, c, 1);
  ctx.beginPath(); ctx.ellipse(330, SEMAI.top - 22, 80, 12, 0, 0, TAU); fillStroke(ctx, '#1f1f24', 4);
  const lens = [26, 18, 34, 0, 22, 12, 30];                 // uneven on purpose: not all seeds sprout together
  lens.forEach((h, i) => { const x = 270 + i * 20; ellipse(ctx, x, SEMAI.top - 30, 6, 4); fillStroke(ctx, '#f3e6b8', 2); if (h) { ctx.beginPath(); ctx.moveTo(x, SEMAI.top - 30); ctx.quadraticCurveTo(x + 6, SEMAI.top - 30 - h * .6, x + 2, SEMAI.top - 30 - h * Math.min(1, lt / 2)); ctx.lineWidth = 3; ctx.strokeStyle = '#f6f6ee'; ctx.stroke(); } });
  const spray = lt > 1.5 && lt < 3.2;
  person(ctx, OP, { x: 470, s: 400, flip: -1, point: [400, 560], hold: { R: 'sprayer' }, face: { look: [.4, .6], mouth: 'smile', blink: blinkAt(t) } });
  if (spray) for (let i = 0; i < 5; i++) { const p = ((lt * 3) + i * .2) % 1; circle(ctx, lerp(385, 300, p), lerp(548, 600, p), 4 + p * 6); ctx.fillStyle = `rgba(200,235,255,${.7 * (1 - p)})`; ctx.fill(); }
  chip(ctx, 'Sinar pagi • 2 hari • jaga lembap', 960, 100, appear(lt, .3));
  chip(ctx, 'Pertumbuhan bisa berbeda', 960, 190, appear(lt, 2), { size: 26, bg: COL.abu });
  calendar(ctx, 1680, 210, '+2 hari', inv(.6, 1, lt) % 1, 1);
});
S(70, 74, (ctx, lt, t) => {                                   // 6e pindah ke rockwool
  const n = Math.floor(clamp(inv(.3, 3.3, lt)) * 5 + .001);
  const c = cam(lerp(500, 470, lt / 4), 560, lerp(2.8, 2.1, ease(inv(0, 4, lt))), t, 1.5); drawWorld(ctx, t, c, ST({ semai: { trayFill: n } }));
  const slot = Math.min(n, 4);
  person(ctx, OP, { x: 640, s: 400, flip: -1, point: [SEMAI.x + 58 + slot * 29, SEMAI.top - 78], face: { look: [.3, .7], mouth: 'smile', blink: blinkAt(t) } });
  chip(ctx, 'Pindah ke rockwool', 960, 100, appear(lt, .2));
  chip(ctx, 'Nutrisi awal 400–600 PPM saat pindah', 960, 190, appear(lt, 1.2));
}, 'fade');

// ===== ADEGAN 7 — pengaturan & pembacaan (74–84) =====
S(74, 78, (ctx, lt, t) => {                                   // 7a Mulai Semai -> target ke alat
  if (lt < 2.1) {
    const c = cam(1300, 560, 1.4, t, 1); blurWorld(ctx, t, c, ST(), 8);
    device(ctx, 960, 440, PHONE_W, 800, webScreen('kebun', { hl: l => l > 1.1 ? [.06, .2, .88, .07] : null }), lt, { r: 50 });
    chip(ctx, 'Kebun Saya → Mulai Semai', 960, 40 + 20, appear(lt, .2), { size: 28 });
    if (lt > 1.4) { screen(ctx); const p = inv(1.4, 2.1, lt); ctx.save(); ctx.translate(lerp(1000, 1900, p), lerp(560, 300, p)); rrect(ctx, -40, -26, 80, 52, 6); fillStroke(ctx, '#fff', 4); ctx.beginPath(); ctx.moveTo(-40, -26); ctx.lineTo(0, 6); ctx.lineTo(40, -26); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore(); }
  } else {
    const c = cam(1080, 430, 2.6, t, 1); drawWorld(ctx, t, c, ST({ panel: { lamp: 'blue', lcd: ['Target diterima', 'SEMAI  ONLINE'] } }));
    chip(ctx, 'Target ppm & pH dikirim ke alat', 960, 100, appear(lt, 2.2));
    illu(ctx, 'Ilustrasi tampilan LCD', 1440, 790, 1);
  }
});
S(78, 84, (ctx, lt, t) => {                                   // 7b ppm nyata vs rencana target
  const c = cam(1720, 600, 2, t, 1); drawWorld(ctx, t, c, ST({ tank: { hlEC: .6 + .4 * Math.sin(lt * 3) } }));
  person(ctx, OP, { x: 1560, s: 400, flip: lt < 3 ? -1 : 1, point: [1640, 640], hold: { R: 'phone' }, face: { look: [.5, .3], mouth: 'flat', blink: blinkAt(t) } });
  device(ctx, 1500, 440, PHONE_W, 800, webScreen('sensor-nutrisi'), lt, { r: 50 });
  // dashed link from the real-reading line to the probe on screen
  screen(ctx); const a = appear(lt, 2.5); if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.setLineDash([14, 12]); line(ctx, 1290, 520, 760, 520, 5, COL.forest); ctx.restore(); }
  chip(ctx, 'ppm nyata ↔ rencana target', 520, 120, appear(lt, .8));
  chip(ctx, 'Target ≠ bacaan', 520, 210, appear(lt, 3.6), { bg: COL.forest });
});

// ===== ADEGAN 8 — bagaimana dosing bekerja (84–102) =====
const DOSE_STEPS = ['Bacaan\ndiperiksa', 'Syarat\n& izin', 'Tambah\nterukur', 'Tunggu\ntercampur', 'Baca\nulang'];
S(84, 88, (ctx, lt, t) => {                                   // 8a 5-step diagram
  backdrop(ctx); chapter(ctx, 'Bagaimana dosing bekerja?', lt);
  flowBoxes(ctx, DOSE_STEPS, 110, 340, 300, 190, 50, appear(lt, .2, 2.4), { size: 32, active: lt > 2.6 ? 0 : -1 });
  chip(ctx, 'Dosing = tambah cairan terukur', 960, 680, appear(lt, 1), { bg: COL.forest });
});
S(88, 91, (ctx, lt, t) => {                                   // 8b low nutrient does not start the pump
  const c = cam(1260, 540, 1.6, t, 1.5); drawWorld(ctx, t, c, ST());
  person(ctx, OP, { x: 1520, s: 400, flip: -1, point: [1390, 480 + Math.sin(lt * 3) * 6], face: { look: [.6, 0], mouth: 'o', browUp: .6 } });
  person(ctx, PM, { x: 1680, s: 400, flip: -1, point: [1560, 460], hold: { L: 'tablet' }, face: { look: [.6, 0], mouth: 'flat', browAng: .15, blink: blinkAt(t) } });
  chip(ctx, 'Nutrisi rendah ≠ pompa langsung jalan', 960, 100, appear(lt, .3));
});
S(91, 95, (ctx, lt, t) => {                                   // 8c conditions
  backdrop(ctx);
  flowBoxes(ctx, DOSE_STEPS, 110, 120, 300, 150, 50, 1, { size: 28, active: 1 });
  checkRow(ctx, ['Mode SEMAI', 'Saklar Otomasi Alat ON', 'Bacaan tenang'], 560, 430, appear(lt, .2, 3), { w: 800 });
});
S(95, 98, (ctx, lt, t) => {                                   // 8d A -> jeda -> B, one pump at a time
  const on = lt < 1.1 ? 'A' : lt > 1.8 && lt < 2.8 ? 'B' : null;
  const c = cam(1340, 470, 2.4, t, 1); drawWorld(ctx, t, c, ST({ panel: { lamp: 'blue', blink: on ? 'fast' : null, pumpOn: on } }));
  chip(ctx, 'Ilustrasi setelah izin operasional', 960, 70, 1, { size: 28, bg: COL.red });
  chip(ctx, 'A → jeda → B', 960, 160, appear(lt, .2));
  if (!on && lt > 1.1 && lt < 1.8) { screen(ctx); circle(ctx, 1560, 420, 54); fillStroke(ctx, '#fff', 6); const a = (lt - 1.1) * 6; line(ctx, 1560, 420, 1560 + Math.sin(a) * 36, 420 - Math.cos(a) * 36, 6); text(ctx, 'jeda', 1560, 505, 30, COL.ink, INK, 0, SG, 700); }
});
S(98, 102, (ctx, lt, t) => {                                  // 8e wait to mix, then read again
  const c = cam(2050, 470, .75, t, 1); drawWorld(ctx, t, c, ST({ tank: { hlEC: appear(lt, 2.6), hlPH: appear(lt, 2.6) } }));
  person(ctx, OP, { x: 2300, s: 400, flip: 1, face: { look: [.3, -.3], mouth: 'smile', blink: blinkAt(t) } });
  chip(ctx, 'Ilustrasi setelah izin operasional', 960, 70, 1, { size: 28, bg: COL.red });
  chip(ctx, 'Tunggu tercampur → baca ulang', 960, 160, appear(lt, .3));
  screen(ctx); const a = appear(lt, .5); if (a > 0) { ctx.save(); ctx.globalAlpha = a; circle(ctx, 1700, 330, 46); fillStroke(ctx, '#fff', 5); const r = lt * 2; line(ctx, 1700, 330, 1700 + Math.sin(r) * 30, 330 - Math.cos(r) * 30, 5); text(ctx, 'waktu monitoring', 1700, 400, 22, COL.ink, '#fff', 6, SG, 700); ctx.restore(); }
});

// ===== ADEGAN 9 — pemantauan & gangguan (102–113) =====
const DAILY = ['Lampu', 'Dashboard', 'Tinggi air', 'Botol nutrisi', 'Selang'];
S(102, 105, (ctx, lt, t) => {                                 // 9a lamp blue + dashboard
  const c = cam(1150, 520, 1.6, t, 1.5); drawWorld(ctx, t, c, ST());
  person(ctx, OP, { x: 1340, s: 400, flip: -1, point: lt < 1.4 ? [1150, 470] : [1270, 600], hold: lt < 1.4 ? {} : { R: 'phone' }, face: { look: [.6, -.2], mouth: 'flat', blink: blinkAt(t) } });
  if (lt > 1.4) device(ctx, 1560, 440, PHONE_W, 800, webScreen('dashboard'), lt, { r: 50 });
  checkRow(ctx, DAILY, 110, 140, inv(.3, 2.6, lt) * 2 / 5);
  chip(ctx, 'Biru tetap = normal', 640, 760, appear(lt, .3), { size: 26, dot: '#2f7fd6' });
});
S(105, 108, (ctx, lt, t) => {                                 // 9b tinggi air, botol, selang
  const c = cam(1300, 600, 1.7, t, 1.5); drawWorld(ctx, t, c, ST());
  const ph = lt < 1 ? 0 : lt < 2 ? 1 : 2;
  const tgt = [[1500, 600], [1100, 690], [1300, 480]][ph];
  person(ctx, OP, { x: 1420, s: 400, flip: ph === 0 ? 1 : -1, point: [tgt[0] + (ph === 1 ? Math.sin(lt * 18) * 6 : 0), tgt[1] + (ph === 2 ? Math.sin(lt * 4) * 30 : 0)], face: { look: [.6, .4], mouth: 'flat', blink: blinkAt(t, 1) } });
  checkRow(ctx, DAILY, 110, 140, (2 + inv(0, 2.8, lt) * 3) / 5);
});
S(108, 110.5, (ctx, lt, t) => {                               // 9c contoh peringatan
  const c = cam(1150, 520, 1.6, t, 1.5); drawWorld(ctx, t, c, ST({ panel: { lamp: 'yellow' } }));
  person(ctx, OP, { x: 1340, s: 400, flip: -1, point: [1270, 600], hold: { R: 'phone' }, face: { eyes: 'wide', look: [.6, 0], mouth: 'flat', browUp: .6 } });
  device(ctx, 1560, 440, PHONE_W, 800, webScreen('peringatan', { hl: l => l > .4 ? [.04, .3, .92, .25] : null }), lt, { r: 50 });
  chip(ctx, 'Periksa penyebab sebelum lanjut', 640, 120, appear(lt, .5));
  chip(ctx, 'Kuning = perlu dicek', 640, 760, appear(lt, .2), { size: 26, dot: COL.warn });
});
S(110.5, 113, (ctx, lt, t) => {                               // 9d E-STOP
  const c = cam(1060, 520, 2.6, t, 1); drawWorld(ctx, t, c, ST({ panel: { lamp: 'blue', estopHl: .5 + .5 * Math.sin(lt * 6) } }));
  person(ctx, PM, { x: 1270, s: 400, flip: -1, point: [1030, 560], hold: { L: 'tablet' }, face: { look: [.6, 0], mouth: 'flat', browAng: .15 } });
  person(ctx, OP, { x: 860, s: 400, flip: 1, face: { look: [.6, -.2], eyes: 'wide', mouth: 'o' } });
  chip(ctx, 'E-STOP: hentikan listrik pompa saat darurat', 960, 100, appear(lt, .2), { bg: COL.red });
}, 'fade');

// ===== ADEGAN 10 — penutup (113–120) =====
S(113, 117, (ctx, lt, t) => {
  const c = cam(1150, 500, lerp(1.05, .85, ease(lt / 4)), t, 2); drawWorld(ctx, t, c, ST());
  person(ctx, OP, { x: 1240, s: 400, flip: 1, arms: { R: lt > .8 ? [2.6, .9] : [.3, -.1] }, face: { eyes: 'happy', mouth: 'grin' } });
  person(ctx, PM, { x: 1380, s: 400, flip: -1, hold: { L: 'tablet' }, arms: { L: [.5, -1.2] }, face: { mouth: 'smile', eyes: 'happy' } });
  ['Kalibrasi', 'Uji', 'Semai', 'Atur', 'Pantau'].forEach((w, i) => chip(ctx, w, 360 + i * 300, 140, appear(lt, .3 + i * .5), { size: 40, bg: i % 2 ? COL.forest : COL.navy }));
});
S(117, 120, (ctx, lt, t) => {
  const c = cam(1150, 500, .85, t, 1); blurWorld(ctx, t, c, ST(), 10);
  screen(ctx); ctx.fillStyle = 'rgba(10,31,56,.88)'; ctx.fillRect(0, 0, W, H);
  const a = appear(lt, .1, .7);
  ctx.save(); ctx.globalAlpha = a; text(ctx, 'GARAP', 960, 330, 150, '#fff', INK, 0, SG, 700);
  text(ctx, 'Greenhouse Automation & Research Arutmin–Politala', 960, 450, 40, COL.gold, INK, 0, SG, 600); ctx.restore();
  logos(ctx, 960, 650, appear(lt, .6, 1.2), 150);
});
