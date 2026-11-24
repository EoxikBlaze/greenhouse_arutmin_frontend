// ---------- GARAP world, landscape 1920x1080 ----------
// World layout is fixed across all shots: left = semai & kalibrasi tables, centre = panel + penampung, right = talang melon.
const COL = {
  navy: '#0A1F38', navy2: '#071527', forest: '#2D452F', olive: '#4C6A4B', moss: '#6B9D4A', mint: '#CFE2CE',
  page: '#F4F7F2', gold: '#E9CD53', red: '#C0392B', warn: '#E0A42B', ink: '#0B1A2B', abu: '#4F6075',
  blue: '#2f7fd6', water: '#8fd3e8', waterDk: '#4fa9c9', steel: '#b9c2c8', grey: '#8c959b',
};
const FLOOR = 800;
const PANEL = { x: 1080, top: 330, w: 230, h: 300 };           // box centre x, top y
const TANK = { x0: 1420, x1: 1760, top: 600 };
const SENSOR = { x0: 1640, x1: 1860, y: 640 };               // sampling line above tank
const INJECT = { x: 1480, y: 600 };                          // titik suntik near return flow
const SEMAI = { x: 420, top: 640 };
const KAL = { x: -260, top: 640 };

function applyCam(ctx, cam, depth = 1) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const z = 1 + (cam.z - 1) * depth;
  ctx.translate(W / 2, H / 2); ctx.rotate((cam.r || 0) * depth); ctx.scale(z, z);
  ctx.translate(-(960 + (cam.x - 960) * depth), -(540 + (cam.y - 540) * depth));
}
function screen(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; }
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mixc(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; }

// ---------- greenhouse shell ----------
function drawGreenhouse(ctx, t, cam, o = {}) {
  const dim = o.dim || 0;
  applyCam(ctx, cam, .2);
  const g = ctx.createLinearGradient(0, -300, 0, 800); g.addColorStop(0, mixc('#7cc4ef', '#2c3d55', dim)); g.addColorStop(1, mixc('#e6f4fb', '#55617a', dim));
  ctx.fillStyle = g; ctx.fillRect(-3000, -2000, 9000, 4000);
  if (o.sun) drawSunGlow(ctx, o.sun[0], o.sun[1], o.sun[2] || 60, o.sunPow || 1);
  applyCam(ctx, cam, .35);
  ctx.fillStyle = mixc('#9cc98a', '#3f5547', dim); ctx.beginPath(); ctx.moveTo(-3000, 560);
  for (let x = -3000; x <= 6000; x += 200) ctx.lineTo(x, 520 + Math.sin(x * .004) * 40 + Math.sin(x * .011) * 18);
  ctx.lineTo(6000, 1400); ctx.lineTo(-3000, 1400); ctx.fill();
  applyCam(ctx, cam, 1);
  // back wall: UV plastic + frame ribs
  ctx.fillStyle = 'rgba(245,250,252,.55)'; ctx.fillRect(-900, 60, 5200, FLOOR - 60);
  ctx.strokeStyle = 'rgba(120,140,150,.55)'; ctx.lineWidth = 6;
  for (let x = -900; x <= 4300; x += 400) { line(ctx, x, 60, x, FLOOR, 7, '#9aa7ad'); }
  line(ctx, -900, 300, 4300, 300, 4, 'rgba(154,167,173,.7)');
  // roof arches
  ctx.save(); ctx.strokeStyle = '#9aa7ad'; ctx.lineWidth = 8;
  for (let x = -900; x <= 4300; x += 400) { ctx.beginPath(); ctx.moveTo(x, 60); ctx.quadraticCurveTo(x + 200, -40, x + 400, 60); ctx.stroke(); }
  ctx.restore();
  // floor
  const fg = ctx.createLinearGradient(0, FLOOR, 0, 1400); fg.addColorStop(0, mixc('#cdbf9f', '#5c5648', dim)); fg.addColorStop(1, mixc('#b5a37f', '#4a4436', dim));
  ctx.fillStyle = fg; ctx.fillRect(-1500, FLOOR, 6500, 900);
  line(ctx, -1500, FLOOR, 5000, FLOOR, 5, INK);
  if (dim > 0) { ctx.save(); screen(ctx); ctx.fillStyle = `rgba(10,15,30,${dim * .35})`; ctx.fillRect(0, 0, W, H); ctx.restore(); applyCam(ctx, cam, 1); }
}
function drawSunGlow(ctx, x, y, r, p = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, r * .2, x, y, r * 5); g.addColorStop(0, `rgba(255,245,200,${.95 * p})`); g.addColorStop(.3, `rgba(255,220,140,${.35 * p})`); g.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r * 6, y - r * 6, r * 12, r * 12); ctx.restore();
  circle(ctx, x, y, r); fillStroke(ctx, '#ffe9a0', 4, '#e7b84a');
}
function shadowAt(ctx, x, y, w) { ellipse(ctx, x, y, w, w * .12); ctx.fillStyle = 'rgba(40,20,30,.18)'; ctx.fill(); }

// ---------- talang + melon ----------
function drawTalang(ctx, t, o = {}) {
  for (const [x0, x1] of [[2000, 2700], [2820, 3520]]) {
    shadowAt(ctx, (x0 + x1) / 2, FLOOR, (x1 - x0) * .55);
    for (const lx of [x0 + 30, x1 - 30]) { rrect(ctx, lx - 10, 575, 20, FLOOR - 575, 4); fillStroke(ctx, '#7b8790', 4); }
    rrect(ctx, x0, 545, x1 - x0, 34, 8); fillStroke(ctx, '#eef1f2', 5);
    ctx.fillStyle = 'rgba(70,90,100,.18)'; ctx.fillRect(x0 + 6, 565, x1 - x0 - 12, 10);
    for (let i = 0; i < 4; i++) drawMelonPlant(ctx, x0 + 90 + i * ((x1 - x0 - 180) / 3), 545, t, i + x0, o.fruit !== false);
  }
  // overhead wire
  line(ctx, 1950, 120, 3560, 120, 4, '#7b8790');
}
function drawMelonPlant(ctx, x, base, t, seed, fruit) {
  const sw = Math.sin(t * .9 + seed) * 4;
  line(ctx, x, 120, x, base, 2, 'rgba(240,240,230,.9)');           // tali rambat
  ctx.beginPath(); ctx.moveTo(x, base); ctx.bezierCurveTo(x + 12, base - 120, x - 12 + sw, base - 260, x + sw, 150);
  ctx.lineWidth = 7; ctx.strokeStyle = '#4b8a3c'; ctx.stroke();
  const R = rng(seed + 7);
  for (let k = 0; k < 7; k++) {
    const yy = base - 50 - k * 52, side = k % 2 ? 1 : -1, sz = 34 + R() * 12;
    leaf(ctx, x + sw * (1 - (yy - 150) / (base - 150)) + side * 8, yy, sz, side * (.5 + R() * .4) + Math.sin(t + k + seed) * .05);
  }
  if (fruit) { const fy = base - 170; line(ctx, x + 6, fy - 40, x + 26, fy - 12, 4, '#4b8a3c'); circle(ctx, x + 30, fy + 12, 30); fillStroke(ctx, '#cfd9a0', 4); netting(ctx, x + 30, fy + 12, 30); }
}
function leaf(ctx, x, y, s, ang) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(s * .4, -s * .7, s * 1.3, -s * .5, s * 1.4, 0); ctx.bezierCurveTo(s * 1.2, s * .5, s * .4, s * .6, 0, 0);
  fillStroke(ctx, '#5fae4a', 3); line(ctx, 0, 0, s * 1.2, 0, 2, 'rgba(30,70,30,.5)'); ctx.restore();
}
function netting(ctx, x, y, r) {
  ctx.save(); circle(ctx, x, y, r); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,240,.7)'; ctx.lineWidth = 1.5;
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x - r, y + i * 9); ctx.lineTo(x + r, y + i * 9 + 12); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + i * 9, y - r); ctx.lineTo(x + i * 9 + 10, y + r); ctx.stroke(); }
  ctx.restore();
}

// ---------- penampung, sirkulasi, sensor line, pompa isi ----------
function drawTank(ctx, t, o = {}) {
  const { x0, x1, top } = TANK;
  shadowAt(ctx, (x0 + x1) / 2, FLOOR, 200);
  // circulation pump (grey, not controlled by GARAP) + pipes: tank -> pump -> talang -> return
  const flow = o.flow == null ? 1 : o.flow;
  pipe(ctx, [[x1 - 10, 780], [1810, 780]], 16);
  rrect(ctx, 1790, 735, 70, 60, 10); fillStroke(ctx, '#9aa3a8', 5); circle(ctx, 1825, 765, 16); fillStroke(ctx, '#c4cbcf', 4);
  pipe(ctx, [[1860, 760], [1900, 760], [1900, 520], [2010, 520], [2010, 548]], 14);                   // up to talang
  pipe(ctx, [[3530, 560], [3600, 560], [3600, 860], [1460, 860], [1460, 830]], 14, .65);               // return under floor line (drawn behind)
  pipe(ctx, [[1460, 830], [1460, top - 10]], 14);
  if (flow) flowDots(ctx, [[1810, 780], [1860, 760], [1900, 760], [1900, 520], [2010, 520]], t, 70, flow);
  // sensor sampling line: T after pump -> EC+suhu -> pH -> back into tank
  pipe(ctx, [[1880, 760], [1880, SENSOR.y], [SENSOR.x0, SENSOR.y], [SENSOR.x0, top - 4]], 9);
  if (flow) flowDots(ctx, [[1880, 760], [1880, SENSOR.y], [SENSOR.x0, SENSOR.y], [SENSOR.x0, top]], t, 45, flow * .7, 5);
  probeHousing(ctx, 1810, SENSOR.y, 'EC', o.hlEC); probeHousing(ctx, 1740, SENSOR.y, 'pH', o.hlPH);
  // tank body
  rrect(ctx, x0, top, x1 - x0, FLOOR - top, 14); fillStroke(ctx, '#3d7fb8', 6);
  ctx.save(); rrect(ctx, x0, top, x1 - x0, FLOOR - top, 14); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x0 + 20, top, 30, 300); ctx.fillStyle = 'rgba(0,20,40,.18)'; ctx.fillRect(x1 - 70, top, 70, 300);
  for (let y = top + 50; y < FLOOR; y += 60) line(ctx, x0, y, x1, y, 3, 'rgba(0,30,60,.25)');
  ctx.restore();
  rrect(ctx, x0 - 10, top - 14, x1 - x0 + 20, 22, 8); fillStroke(ctx, '#2f6a9e', 5);
  text(ctx, 'PENAMPUNG', (x0 + x1) / 2, top + 110, 26, 'rgba(255,255,255,.85)', INK, 0, 'Space Grotesk', 700);
  // pompa isi air + keran
  pipe(ctx, [[1300, 700], [1300, 590], [1400, 590], [1400, top - 4]], 10);
  rrect(ctx, 1270, 700, 60, 50, 8); fillStroke(ctx, o.isiOn ? '#6aa6e0' : '#4d6f8f', 4); circle(ctx, 1300, 725, 11); fillStroke(ctx, '#d9e2e8', 3);
  line(ctx, 1300, 750, 1300, FLOOR, 8, '#7b8790');
  // float switches visible as small markers
  line(ctx, x1 - 40, top + 4, x1 - 40, top + 60, 3, INK); circle(ctx, x1 - 40, top + 64, 8); fillStroke(ctx, '#f4d35e', 3);
}
function pipe(ctx, pts, w, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; path(ctx, pts, false); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.lineWidth = w + 8; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = w; ctx.strokeStyle = '#e9eef0'; ctx.stroke();
  ctx.lineWidth = w * .3; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.stroke(); ctx.restore();
}
function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function polyAt(pts, d) { for (let i = 1; i < pts.length; i++) { const s = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (d <= s) { const k = d / s; return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]; } d -= s; } return pts[pts.length - 1]; }
// water moves along the pipe in its real direction (start -> end)
function flowDots(ctx, pts, t, gap, a = 1, r = 6, col = '#3aa7d9', speed = 120) {
  const L = polyLen(pts); ctx.save(); ctx.globalAlpha = a;
  for (let d = (t * speed) % gap; d < L; d += gap) { const [x, y] = polyAt(pts, d); circle(ctx, x, y, r); ctx.fillStyle = col; ctx.fill(); }
  ctx.restore();
}
function probeHousing(ctx, x, y, lab, hl) {
  if (hl) { ctx.save(); ctx.globalAlpha = hl; circle(ctx, x, y - 10, 52); ctx.fillStyle = 'rgba(233,205,83,.45)'; ctx.fill(); ctx.restore(); }
  rrect(ctx, x - 16, y - 12, 32, 30, 6); fillStroke(ctx, '#dfe6ea', 4);
  rrect(ctx, x - 7, y - 70, 14, 62, 4); fillStroke(ctx, lab === 'pH' ? '#2b2b33' : '#1f4f7a', 4);
  ctx.beginPath(); ctx.moveTo(x, y - 70); ctx.quadraticCurveTo(x + 10, y - 120, x - 60, y - 140); ctx.lineWidth = 4; ctx.strokeStyle = '#222'; ctx.stroke();
  text(ctx, lab, x, y - 92, 18, '#fff', INK, 5, 'Space Grotesk', 700);
}

// ---------- panel GARAP (gambar 3D final: box abu di atas rangka kaki) ----------
// st.lamp: 'blue' | 'yellow' | 'red'; st.blink: 'fast' | 'slow'; st.lcd: [line1, line2]
function drawPanel(ctx, t, st = {}) {
  const { x, top, w, h } = PANEL; const x0 = x - w / 2, bot = top + h;
  shadowAt(ctx, x, FLOOR, 150);
  // stand + lower shelf with dosing bottles
  ctx.lineWidth = 5;
  for (const lx of [x0 + 14, x0 + w - 14]) { rrect(ctx, lx - 9, bot, 18, FLOOR - bot, 3); fillStroke(ctx, '#8e8a73', 4); }
  rrect(ctx, x0 + 4, 745, w - 8, 14, 3); fillStroke(ctx, '#8e8a73', 4);
  rrect(ctx, x0 + 4, bot + 6, w - 8, 12, 3); fillStroke(ctx, '#8e8a73', 4);
  drawDosingBottles(ctx, x0 + 22, 745, st);
  // box
  rrect(ctx, x0, top, w, h, 10); fillStroke(ctx, '#d7dadb', 6);
  rrect(ctx, x0 + 12, top + 12, w - 24, h - 24, 6); fillStroke(ctx, '#e6e8e9', 3);
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(x0 + w - 40, top + 8, 30, h - 16);
  // LCD 20x4
  rrect(ctx, x0 + 30, top + 34, 150, 62, 5); fillStroke(ctx, '#2a4e2a', 4);
  ctx.save(); rrect(ctx, x0 + 36, top + 40, 138, 50, 3); ctx.fillStyle = '#9fd27a'; ctx.fill(); ctx.restore();
  const l = st.lcd || ['pH   ppm   EC', t < 76 ? 'SIAP   ONLINE' : 'SEMAI  ONLINE'];   // mode SIAP until Mulai Semai (7a)
  text(ctx, l[0], x0 + 42, top + 54, 13, '#16301a', INK, 0, 'Space Grotesk', 700, 'left'); text(ctx, l[1], x0 + 42, top + 76, 13, '#16301a', INK, 0, 'Space Grotesk', 700, 'left');
  // 3 pilot lamps: merah, kuning, biru (only one lit at a time)
  const on = lampOn(st, t);
  [['red', '#d23a2c'], ['yellow', '#efc23a'], ['blue', '#2f7fd6']].forEach(([k, c], i) => {
    const lx = x0 + 52 + i * 52, ly = top + 140, lit = on === k;
    if (lit) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, 46); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(lx - 50, ly - 50, 100, 100); ctx.restore(); }
    circle(ctx, lx, ly, 17); fillStroke(ctx, '#555', 4); circle(ctx, lx, ly, 12); fillStroke(ctx, lit ? c : mixc(c, '#3a3a3a', .65), 0);
    if (lit) { circle(ctx, lx - 4, ly - 4, 4); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill(); }
  });
  // E-STOP (jamur merah) + RESET (hijau)
  const ex = x0 + 70, ey = top + 220;
  if (st.estopHl) { ctx.save(); ctx.globalAlpha = st.estopHl; circle(ctx, ex, ey, 52); ctx.fillStyle = 'rgba(255,230,120,.6)'; ctx.fill(); ctx.restore(); }
  circle(ctx, ex, ey, 30); fillStroke(ctx, '#f2c230', 4); circle(ctx, ex, ey + (st.estopIn ? 3 : 0), 22); fillStroke(ctx, '#d0302a', 4);
  circle(ctx, ex - 7, ey - 7, 6); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill();
  circle(ctx, x0 + 160, ey, 16); fillStroke(ctx, '#3fa35b', 4);
  text(ctx, 'E-STOP', ex, ey + 46, 14, INK, INK, 0, 'Space Grotesk', 700); text(ctx, 'RESET', x0 + 160, ey + 34, 13, INK, INK, 0, 'Space Grotesk', 700);
  // glands + cables down
  for (let i = 0; i < 6; i++) { circle(ctx, x0 + 40 + i * 30, bot + 2, 6); ctx.fillStyle = '#333'; ctx.fill(); }
  text(ctx, 'GARAP', x, top + 18, 15, COL.navy, INK, 0, 'Space Grotesk', 700);
  drawDosingPumps(ctx, t, st);
}
function lampOn(st, t) {
  if (!st.lamp) return null;
  if (st.blink === 'fast') return Math.floor(t * 4) % 2 ? null : st.lamp;
  if (st.blink === 'slow') return Math.floor(t * 1.2) % 2 ? null : st.lamp;
  return st.lamp;
}
const DOSE = [['A', '#e7e1c9'], ['B', '#c9dbe7'], ['pH+', '#e9cfd7'], ['pH−', '#d7e9cf']];
function drawDosingBottles(ctx, x, shelf, st) {
  DOSE.forEach(([k, c], i) => { const bx = x + i * 50; rrect(ctx, bx, shelf - 70, 36, 70, 7); fillStroke(ctx, c, 4); rrect(ctx, bx + 10, shelf - 82, 16, 14, 3); fillStroke(ctx, '#555', 3); text(ctx, k, bx + 18, shelf - 36, 14, INK, INK, 0, 'Space Grotesk', 700); });
}
// 4 small peristaltic pumps on the right side of the box; separate tubes to titik suntik
function drawDosingPumps(ctx, t, st) {
  const x0 = PANEL.x + PANEL.w / 2 + 24;
  DOSE.forEach(([k], i) => {
    const y = PANEL.top + 70 + i * 52, on = st.pumpOn === k;
    // tube from bottle (shelf) up to pump, then to injection point
    ctx.beginPath(); ctx.moveTo(PANEL.x - PANEL.w / 2 + 40 + i * 50, 663); ctx.quadraticCurveTo(x0 - 10, 690 - i * 6, x0 + 10, y + 16);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(60,60,60,.55)'; ctx.stroke();
    const tube = [[x0 + 60, y + 10], [x0 + 90 + i * 6, y + 10], [INJECT.x - 20 + i * 10, INJECT.y - 60 - i * 6], [INJECT.x - 20 + i * 10, INJECT.y - 2]];
    path(ctx, tube, false); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(60,60,60,.55)'; ctx.stroke();
    if (on) flowDots(ctx, tube, t, 18, 1, 3.5, i < 2 ? '#c9a640' : '#c04a7a', 90);
    rrect(ctx, x0, y, 60, 38, 8); fillStroke(ctx, on ? '#5fa1e8' : '#3a4650', 4);
    ctx.save(); ctx.translate(x0 + 22, y + 19); ctx.rotate(on ? t * 12 : 0); circle(ctx, 0, 0, 11); fillStroke(ctx, '#c9d1d6', 3); line(ctx, -9, 0, 9, 0, 3, INK); ctx.restore();
    text(ctx, k, x0 + 46, y + 19, 12, '#fff', INK, 0, 'Space Grotesk', 700);
  });
}

// ---------- semai & kalibrasi tables ----------
function table(ctx, x, top, w, col = '#c89a66') {
  shadowAt(ctx, x, FLOOR, w * .55);
  for (const lx of [x - w / 2 + 24, x + w / 2 - 24]) { rrect(ctx, lx - 8, top, 16, FLOOR - top, 3); fillStroke(ctx, mixc(col, '#000000', .25), 4); }
  rrect(ctx, x - w / 2, top - 16, w, 22, 5); fillStroke(ctx, col, 5);
}
function drawSemaiTable(ctx, t, st = {}) {
  table(ctx, SEMAI.x, SEMAI.top, 420);
  // rak rockwool
  const tray = st.trayFill == null ? 0 : st.trayFill;
  rrect(ctx, SEMAI.x + 40, SEMAI.top - 46, 150, 30, 4); fillStroke(ctx, '#3a3a3a', 4);
  for (let i = 0; i < 5; i++) { rrect(ctx, SEMAI.x + 46 + i * 29, SEMAI.top - 70, 24, 24, 3); fillStroke(ctx, '#e7d9a8', 3); if (i < tray) sprout(ctx, SEMAI.x + 58 + i * 29, SEMAI.top - 70, 22 + (i % 3) * 8, i); }
}
function sprout(ctx, x, y, h, seed) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 4, y - h * .6, x + (seed % 2 ? 3 : -3), y - h); ctx.lineWidth = 3; ctx.strokeStyle = '#7bbf5a'; ctx.stroke();
  if (h > 20) { ellipse(ctx, x - 7, y - h, 8, 4, -.4); fillStroke(ctx, '#8fd06a', 2); ellipse(ctx, x + 7, y - h, 8, 4, .4); fillStroke(ctx, '#8fd06a', 2); }
}
function drawKalTable(ctx, t, st = {}) {
  table(ctx, KAL.x, KAL.top, 460, '#d9dcd6');
  const bots = [['pH 4,01', '#f08a7a'], ['pH 6,86', '#f2c86a'], ['EC 1,413', '#7ab8e8'], ['EC 12,88', '#5f8fd0']];
  bots.forEach(([lab, c], i) => {
    const bx = KAL.x - 190 + i * 70 + (st.next === i ? -6 : 0); const lift = (st.lifted === i) ? 1 : 0;
    if (lift) return;
    drawBottle(ctx, bx, KAL.top - 16, lab, c, st.done && st.done.includes(i));
  });
  // gelas bilas + meter genggam
  rrect(ctx, KAL.x + 110, KAL.top - 76, 50, 60, 6); fillStroke(ctx, 'rgba(200,235,250,.7)', 4); ctx.fillStyle = 'rgba(90,170,220,.35)'; ctx.fillRect(KAL.x + 114, KAL.top - 50, 42, 30);
  text(ctx, 'bilas', KAL.x + 135, KAL.top - 92, 14, INK, INK, 0, 'Inter', 600);
}
function drawBottle(ctx, x, base, lab, c, done) {
  rrect(ctx, x, base - 74, 50, 74, 8); fillStroke(ctx, 'rgba(240,248,252,.9)', 4);
  ctx.fillStyle = c; ctx.globalAlpha = .55; ctx.fillRect(x + 4, base - 44, 42, 40); ctx.globalAlpha = 1;
  rrect(ctx, x + 14, base - 90, 22, 18, 4); fillStroke(ctx, '#444', 3);
  rrect(ctx, x - 6, base - 66, 62, 22, 4); fillStroke(ctx, '#fff', 3);
  text(ctx, lab, x + 25, base - 55, 12.5, INK, INK, 0, 'Space Grotesk', 700);
  if (done) { circle(ctx, x + 46, base - 82, 11); fillStroke(ctx, COL.moss, 3); ctx.beginPath(); ctx.moveTo(x + 40, base - 82); ctx.lineTo(x + 45, base - 77); ctx.lineTo(x + 52, base - 87); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke(); }
}

// ---------- the whole set ----------
function drawWorld(ctx, t, cam, st = {}) {
  drawGreenhouse(ctx, t, cam, st);
  applyCam(ctx, cam, 1);
  drawKalTable(ctx, t, st.kal || {});
  drawSemaiTable(ctx, t, st.semai || {});
  drawTalang(ctx, t, st.talang || {});
  drawTank(ctx, t, st.tank || {});
  drawPanel(ctx, t, st.panel || {});
}

// ---------- hand props (local figure units, hand at h) ----------
const PROPS = {
  tablet(ctx, h, side) { ctx.save(); ctx.translate(h[0] + side * .02, h[1] - .05); rrect(ctx, -.075, -.055, .15, .11, .012); fillStroke(ctx, COL.navy, .01); rrect(ctx, -.064, -.045, .128, .09, .006); ctx.fillStyle = '#e8f1e6'; ctx.fill(); ctx.fillStyle = COL.forest; ctx.fillRect(-.055, -.035, .06, .012); ctx.fillRect(-.055, -.015, .1, .008); ctx.fillRect(-.055, .0, .08, .008); ctx.restore(); },
  phone(ctx, h, side) { ctx.save(); ctx.translate(h[0], h[1] - .04); rrect(ctx, -.03, -.05, .06, .1, .01); fillStroke(ctx, '#1a1f26', .008); rrect(ctx, -.024, -.042, .048, .084, .005); ctx.fillStyle = '#dff0e6'; ctx.fill(); ctx.restore(); },
  cup(ctx, h) { ctx.save(); ctx.translate(h[0], h[1] - .03); ctx.beginPath(); ctx.moveTo(-.03, -.04); ctx.lineTo(.03, -.04); ctx.lineTo(.024, .04); ctx.lineTo(-.024, .04); ctx.closePath(); fillStroke(ctx, 'rgba(210,240,252,.85)', .008); ctx.fillStyle = 'rgba(70,160,210,.5)'; ctx.fillRect(-.026, -.01, .052, .048); ctx.restore(); },
  probe(ctx, h) { ctx.save(); ctx.translate(h[0], h[1]); rrect(ctx, -.009, -.02, .018, .13, .005); fillStroke(ctx, '#2b2b33', .006); ctx.beginPath(); ctx.moveTo(0, -.02); ctx.quadraticCurveTo(.05, -.1, .1, -.08); ctx.lineWidth = .008; ctx.strokeStyle = '#222'; ctx.stroke(); ctx.restore(); },
  notebook(ctx, h, side) { ctx.save(); ctx.translate(h[0] + side * .03, h[1] - .03); rrect(ctx, -.06, -.04, .12, .08, .006); fillStroke(ctx, '#fffbea', .008); for (let i = 0; i < 4; i++) line(ctx, -.045, -.022 + i * .015, .045 - (i % 2) * .02, -.022 + i * .015, .004, '#8a7f6a'); ctx.restore(); },
  sprayer(ctx, h) { ctx.save(); ctx.translate(h[0], h[1] - .05); rrect(ctx, -.022, -.03, .044, .08, .01); fillStroke(ctx, '#7ec8e3', .008); rrect(ctx, -.012, -.06, .03, .03, .004); fillStroke(ctx, '#f0f0f0', .006); line(ctx, .018, -.05, .04, -.05, .008); ctx.restore(); },
  meter(ctx, h) { ctx.save(); ctx.translate(h[0], h[1] - .02); rrect(ctx, -.02, -.06, .04, .1, .008); fillStroke(ctx, '#f2c230', .008); rrect(ctx, -.014, -.05, .028, .03, .004); ctx.fillStyle = '#cfe8c0'; ctx.fill(); rrect(ctx, -.006, .04, .012, .06, .003); fillStroke(ctx, '#555', .005); ctx.restore(); },
  bottle(ctx, h) { ctx.save(); ctx.translate(h[0], h[1] - .03); rrect(ctx, -.025, -.04, .05, .08, .008); fillStroke(ctx, '#e7e1c9', .008); rrect(ctx, -.01, -.055, .02, .016, .003); fillStroke(ctx, '#555', .005); ctx.restore(); },
  pencil(ctx, h) { line(ctx, h[0], h[1], h[0] + .03, h[1] - .05, .01, '#e0a42b'); },
};
function holding(map) { return (ctx, k, h, ang, side) => { const p = map[k]; if (p && PROPS[p]) PROPS[p](ctx, h, side); }; }
