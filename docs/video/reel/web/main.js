// ---------- compositor: shots, transitions, subtitles, light grade ----------
const canvas = document.getElementById('c'); canvas.width = W; canvas.height = H;
const out = canvas.getContext('2d');
const buf = document.createElement('canvas'); buf.width = W; buf.height = H; const bctx = buf.getContext('2d');
const DUR = SHOTS[SHOTS.length - 1].end;
window.SHOT_SPANS = SHOTS.map(s => [s.start, s.end]);
const TOTAL_FRAMES = Math.round(DUR * FPS);

// subtitles: max 2 lines, bottom band y 880-1010, navy box 80%
const SUB_FONT = `600 44px Inter`, SUB_MAX = 1560;
function wrap(ctx, str) {
  ctx.font = SUB_FONT; const words = str.split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > SUB_MAX && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function drawSubtitle(ctx, t) {
  const s = SUBS.find(s => t >= s.s && t < s.e); if (!s) return;
  const lines = wrap(ctx, s.text); if (lines.length > 2) console.log('SUB >2 lines', s.text);
  const a = Math.min(clamp((t - s.s) / .12), clamp((s.e - t) / .12));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.font = SUB_FONT;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 72, h = lines.length * 58 + 30;
  const y1 = 1010, y0 = y1 - h;
  rrect(ctx, W / 2 - w / 2, y0, w, h, 18); ctx.fillStyle = 'rgba(10,31,56,.82)'; ctx.fill();
  lines.forEach((l, i) => text(ctx, l, W / 2, y0 + 15 + 29 + i * 58, 44, '#fff', INK, 0, 'Inter', 600));
  ctx.restore();
}
function renderShot(ctx, i, t) {
  const s = SHOTS[i];
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); s.draw(ctx, t - s.start, t); ctx.restore();
}
function blit(src, dx, blur) {
  const n = blur > 2 ? 9 : 1;
  out.save(); out.setTransform(1, 0, 0, 1, 0, 0);
  for (let k = 0; k < n; k++) { const off = n > 1 ? (k / (n - 1) - .5) * blur : 0; out.globalAlpha = 1 / (k + 1); const x = dx + off; out.drawImage(src, x, 0); if (x > 0) out.drawImage(src, x - W, 0); if (x < 0) out.drawImage(src, x + W, 0); }
  out.restore();
}
function renderFrame(f) {
  const t = Math.min(f / FPS, DUR - 1e-3);
  let i = SHOTS.findIndex(s => t >= s.start && t < s.end); if (i < 0) i = SHOTS.length - 1;
  const s = SHOTS[i], WT = .2;
  out.setTransform(1, 0, 0, 1, 0, 0); out.fillStyle = '#000'; out.fillRect(0, 0, W, H);
  let dx = 0, blur = 0;
  if (s.tr === 'whip' && i < SHOTS.length - 1 && t > s.end - WT) { const p = easeIn((t - (s.end - WT)) / WT); dx = -p * 600; blur = p * 320; }
  const prev = SHOTS[i - 1];
  if (prev && prev.tr === 'whip' && t < s.start + WT) { const p = 1 - easeOut((t - s.start) / WT); dx = p * 600; blur = p * 320; }
  renderShot(bctx, i, t); blit(buf, dx, blur);
  // fade transitions
  if (prev && prev.tr === 'fade' && t < s.start + .25) { out.save(); out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = 1 - (t - s.start) / .25; out.fillStyle = '#fff'; out.fillRect(0, 0, W, H); out.restore(); }
  if (s.tr === 'fade' && t > s.end - .25) { out.save(); out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = (t - (s.end - .25)) / .25; out.fillStyle = '#fff'; out.fillRect(0, 0, W, H); out.restore(); }
  // soft vignette
  out.save(); out.setTransform(1, 0, 0, 1, 0, 0);
  const g = out.createRadialGradient(960, 520, 600, 960, 540, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,15,30,.22)'); out.fillStyle = g; out.fillRect(0, 0, W, H);
  out.restore();
  drawSubtitle(out, t);
}
window.renderFrame = renderFrame; window.TOTAL_FRAMES = TOTAL_FRAMES; window.DUR = DUR;
window.grab = (q = .93) => canvas.toDataURL('image/jpeg', q);
