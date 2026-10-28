/* ORION FLOOR — salle en vue 3/4 (aperçu). Canvas 2D, aucune dépendance, aucun trafic réseau propre :
   tout vient de neon-left.js (mêmes data/*.json que la page officielle + prix publics Bitvavo).
   Animation décorative : les « ± € » affichés sont uniquement des P&L réels (positions ouvertes / clôtures 24 h). */
(function () {
'use strict';
window.SalleFloor = function (E) {
const {$, D, LIVE, COL, ok, eur, fmtH, sym, hash, clamp, TAU, RM, lastEq} = E;
const room = $('room'), cv = $('fc'), ctx = cv.getContext('2d'), stage = $('stage');
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
const lerp = (a, b, k) => a + (b - a) * k, ease = k => k * k * (3 - 2 * k);
const GRN = '#3dff9a', RED = '#ff4d7a', INK = '#05060f';
const rgb = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const mix = (h, t, f) => { const a = rgb(h), b = t === 'w' ? [255, 255, 255] : t === 'k' ? [6, 8, 20] : rgb(t); return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',') + ')'; };
const rgba = (h, al) => 'rgba(' + rgb(h).join(',') + ',' + al + ')';
const rr = (p, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.arcTo(x + w, y, x + w, y + r, r); p.lineTo(x + w, y + h - r); p.arcTo(x + w, y + h, x + w - r, y + h, r); p.lineTo(x + r, y + h); p.arcTo(x, y + h, x, y + h - r, r); p.lineTo(x, y + r); p.arcTo(x, y, x + r, y, r); p.closePath(); };
const rrect = (c, x, y, w, h, r) => { c.beginPath(); rr(c, x, y, w, h, r); };

/* ============ identités : 5 agents + 4 petits assistants ============ */
const IDS = {
  scout: {c: COL.cy, shape: 'sphere', acc: 'antenna', g: 0, main: 1}, trader: {c: COL.mg, shape: 'capsule', acc: 'headset', g: 3, main: 1},
  sentinel: {c: COL.li, shape: 'cube', acc: 'shield', g: 1, main: 1}, research: {c: COL.vi, shape: 'pear', acc: 'glasses', g: 8, main: 1},
  arbitre: {c: COL.go, shape: 'hex', acc: 'crown', g: 11, main: 1},
  b1: {c: '#ff8a3a', shape: 'cube', acc: 'bolts', g: 6, sc: .8}, b2: {c: '#e6eeff', shape: 'sphere', acc: 'ring', g: 9, sc: .8},
  b3: {c: '#2dffc6', shape: 'capsule', acc: 'cyclops', g: 5, sc: .8}, b4: {c: '#ff6b9a', shape: 'cube', acc: 'ears', g: 10, sc: .8}};
const ORDER = ['scout', 'trader', 'sentinel', 'research', 'arbitre', 'b1', 'b2', 'b3', 'b4'];
const NAMES = {scout: 'SCOUT', trader: 'TRADER', sentinel: 'SENTINEL', research: 'RESEARCH', arbitre: 'ARBITRE'};
for (const k in IDS) { const d = IDS[k]; d.lt = mix(d.c, 'w', .5); d.md = d.c; d.dk = mix(d.c, 'k', .5); d.dk2 = mix(d.c, 'k', .74); }

/* ============ géométrie de la salle ============ */
let L = null, S = 1, dpr = 1, bg = null, T = 0, running = false, raf = 0, last = 0, visOn = true;
const POD_COLS = [COL.cy, COL.mg, COL.li], SEAT_DX = [-80, 0, 80], CS = 16;
function makeLayout(mode) {
  const w = mode === 'W';
  const l = w ? {W: 960, H: 640, ft: 170, cs: 1} : {W: 640, H: 860, ft: 180, cs: 1.14};
  l.mode = mode;
  const pp = w ? [[215, 300], [745, 300], [480, 468]] : [[170, 350], [470, 350], [320, 590]];
  l.pods = pp.map(([cx, fy], i) => ({i, cx, fy, col: POD_COLS[i], seats: SEAT_DX.map((dx, j) => ({pod: i, j, x: cx + dx, y: fy + 40, st: {x: cx + dx, y: fy + 84}, occ: null, res: null, pull: 8}))}));
  l.racks = w ? [80, 880] : [64, 576];
  l.wall = w ? {x: 480, w: 290, h: 106} : {x: 320, w: 250, h: 100};
  l.plants = w ? [[150, l.ft + 22], [810, l.ft + 22], [50, 560], [912, 560], [912, 330]] : [[130, l.ft + 22], [510, l.ft + 22], [40, 810], [600, 810], [40, 400]];
  l.cooler = w ? {x: 48, y: 410} : {x: 596, y: 480};
  l.logo = w ? {x: 480, y: 598, s: 1} : {x: 320, y: 800, s: .6};
  // obstacles (rectangles x0,y0,x1,y1)
  const ob = [];
  l.pods.forEach(p => { ob.push([p.cx - 128, p.fy - 52, p.cx + 128, p.fy + 22]); p.seats.forEach(s => ob.push([s.x - 20, p.fy + 20, s.x + 20, p.fy + 60])); });
  l.plants.forEach(([x, y]) => ob.push([x - 17, y - 12, x + 17, y + 8]));
  ob.push([l.cooler.x - 22, l.cooler.y - 16, l.cooler.x + 22, l.cooler.y + 8]);
  l.racks.forEach(x => ob.push([x - 36, l.ft - 4, x + 36, l.ft + 30]));
  l.ob = ob; l.cols = Math.ceil(l.W / CS); l.rows = Math.ceil(l.H / CS);
  const g = new Uint8Array(l.cols * l.rows);
  for (let r = 0; r < l.rows; r++) for (let c = 0; c < l.cols; c++) {
    const x = c * CS + CS / 2, y = r * CS + CS / 2; let b = x < 26 || x > l.W - 26 || y < l.ft + 22 || y > l.H - 14;
    if (!b) for (const o of ob) if (x > o[0] - 10 && x < o[2] + 10 && y > o[1] - 10 && y < o[3] + 10) { b = true; break; }
    g[r * l.cols + c] = b ? 1 : 0;
  }
  l.grid = g;
  return l;
}
const cellOf = (x, y) => [clamp(Math.floor(x / CS), 0, L.cols - 1), clamp(Math.floor(y / CS), 0, L.rows - 1)];
const blocked = (c, r) => c < 0 || r < 0 || c >= L.cols || r >= L.rows || L.grid[r * L.cols + c] === 1;
const freeAt = (x, y, m = 0) => { for (let dy = -m; dy <= m; dy += 16) for (let dx = -m; dx <= m; dx += 16) { const [c, r] = cellOf(x + dx, y + dy); if (blocked(c, r)) return false; } return true; };
function nearestFree(x, y) {
  const [c0, r0] = cellOf(x, y); if (!blocked(c0, r0)) return [c0, r0];
  for (let R = 1; R < 9; R++) for (let dr = -R; dr <= R; dr++) for (let dc = -R; dc <= R; dc++) if (Math.max(Math.abs(dr), Math.abs(dc)) === R && !blocked(c0 + dc, r0 + dr)) return [c0 + dc, r0 + dr];
  return [c0, r0];
}
function los(x0, y0, x1, y1) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6); for (let i = 1; i < n; i++) { const [c, r] = cellOf(lerp(x0, x1, i / n), lerp(y0, y1, i / n)); if (blocked(c, r)) return false; } return true; }
function findPath(sx, sy, tx, ty) {
  const [a, b] = nearestFree(sx, sy), [c, d] = nearestFree(tx, ty), cols = L.cols, N = cols * L.rows, s = b * cols + a, t = d * cols + c;
  const g = new Float32Array(N).fill(1e9), par = new Int32Array(N).fill(-1), cl = new Uint8Array(N), open = [s]; g[s] = 0;
  const h = i => Math.hypot((i % cols) - c, Math.floor(i / cols) - d);
  while (open.length) {
    let bi = 0, bf = 1e9; for (let i = 0; i < open.length; i++) { const f = g[open[i]] + h(open[i]); if (f < bf) { bf = f; bi = i; } }
    const cur = open.splice(bi, 1)[0]; if (cur === t) break; cl[cur] = 1; const cc = cur % cols, cr = Math.floor(cur / cols);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue; const nc = cc + dc, nr = cr + dr; if (blocked(nc, nr)) continue;
      if (dr && dc && (blocked(cc + dc, cr) || blocked(cc, cr + dr))) continue;
      const ni = nr * cols + nc; if (cl[ni]) continue; const ng = g[cur] + (dr && dc ? 1.414 : 1);
      if (ng < g[ni]) { g[ni] = ng; par[ni] = cur; if (!open.includes(ni)) open.push(ni); }
    }
  }
  if (par[t] < 0 && s !== t) return null;
  const pts = []; for (let i = t; i !== -1; i = par[i]) pts.push({x: (i % cols) * CS + CS / 2, y: Math.floor(i / cols) * CS + CS / 2}); pts.reverse();
  const out = []; let cx = sx, cy = sy, i = 0;
  while (i < pts.length) { let j = pts.length - 1; while (j > i && !los(cx, cy, pts[j].x, pts[j].y)) j--; out.push(pts[j]); cx = pts[j].x; cy = pts[j].y; i = j + 1; }
  return out;
}

/* ============ séries pour les écrans (bougies 1 h réelles si chargées, sinon décoratif) ============ */
let SER = [];
function buildSeries() {
  SER = [];
  (D.pos || []).forEach(p => { const c = D.candles[p.m]; if (c && c.length >= 10) SER.push({c, m: p.m}); });
  if (D.btcC && D.btcC.length >= 10) SER.push({c: D.btcC, m: 'BTC-EUR'});
  if (D.ethC && D.ethC.length >= 10) SER.push({c: D.ethC, m: 'ETH-EUR'});
}
function decorCandle(seed, n) {
  const v = k => .5 + .26 * Math.sin(k * .55 + seed * 3.1) + .17 * Math.sin(k * 1.37 + seed * 7.3) + .07 * Math.sin(k * 3.3 + seed);
  const o = v(n), c = v(n + 1), e = .05 * Math.abs(Math.sin(n * 2.7 + seed)); return [0, o, Math.max(o, c) + e, Math.min(o, c) - e, c];
}
function chart(x, y, w, h, ser, seed, lit) {
  const N = 17, bw = w / N; let cs = [], off = 0;
  if (ser) { cs = ser.c.slice(-N); const m = ser.m; if (ok(LIVE.price[m]) && cs.length) { const q = cs[cs.length - 1].slice(); q[4] = LIVE.price[m]; q[2] = Math.max(q[2], q[4]); q[3] = Math.min(q[3], q[4]); cs[cs.length - 1] = q; } }
  else { const k = T * .8 + seed * 11, n0 = Math.floor(k); off = (k - n0) * bw; for (let i = 0; i <= N; i++) cs.push(decorCandle(seed, n0 + i)); }
  let lo = 1e9, hi = -1e9; cs.forEach(q => { lo = Math.min(lo, q[3]); hi = Math.max(hi, q[2]); }); const sp = (hi - lo) || 1, py = v => y + h - 3 - (v - lo) / sp * (h - 8);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.globalAlpha = lit ? 1 : .5;
  cs.forEach((q, i) => {
    const bx = x + i * bw - off + bw * .15, up = q[4] >= q[1], col = up ? GRN : RED, y1 = py(q[1]), y2 = py(q[4]);
    ctx.fillStyle = col; ctx.fillRect(bx + bw * .32, py(q[2]), Math.max(.8, bw * .1), Math.max(1, py(q[3]) - py(q[2]))); ctx.fillRect(bx, Math.min(y1, y2), bw * .7, Math.max(1.4, Math.abs(y2 - y1)));
  });
  if (ser && cs.length) { const ly = py(cs[cs.length - 1][4]); ctx.globalAlpha = (lit ? .55 : .25) + .25 * Math.sin(T * 4 + seed * 9); ctx.fillStyle = '#fff'; ctx.fillRect(x, ly, w, .8); }
  ctx.globalAlpha = lit ? .18 : .08; const sw = ((T * .35 + seed) % 1) * w; ctx.fillStyle = '#fff'; ctx.fillRect(x + sw, y, 1.4, h);
  ctx.restore();
}
let flash = {};
function monitor(cx, base, w, h, ser, seed, col, lit, boost) {
  const c = ctx, x = cx - w / 2, y = base - 6 - h;
  c.fillStyle = '#0c1226'; c.fillRect(cx - 3.5, base - 7, 7, 7); c.fillStyle = '#121a36'; c.beginPath(); c.ellipse(cx, base, 13, 3, 0, 0, TAU); c.fill();
  c.globalAlpha = (lit ? .22 : .08) + boost * .25; c.fillStyle = col; rrect(c, x - 4, y - 4, w + 8, h + 8, 7); c.fill(); c.globalAlpha = 1;
  c.fillStyle = '#080d1e'; rrect(c, x, y, w, h, 4); c.fill(); c.strokeStyle = rgba(col, lit ? .95 : .5); c.lineWidth = 1.4; c.stroke();
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, lit ? '#0d2038' : '#0a1226'); g.addColorStop(1, '#050a18'); c.fillStyle = g; c.fillRect(x + 3, y + 3, w - 6, h - 6);
  chart(x + 4, y + 5, w - 8, h - 10, ser, seed, lit);
  c.fillStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.moveTo(x + 3, y + 3); c.lineTo(x + w * .55, y + 3); c.lineTo(x + w * .3, y + h - 3); c.lineTo(x + 3, y + h - 3); c.fill();
}
const serFor = (a, b) => SER.length ? SER[(a * 5 + b) % SER.length] : null;

/* ============ rendu des personnages ============ */
const HP = {};
function headPath(shape) {
  if (HP[shape]) return HP[shape]; const p = new Path2D();
  if (shape === 'sphere') p.arc(0, -39, 19, 0, TAU);
  else if (shape === 'capsule') rr(p, -15, -61, 30, 44, 15);
  else if (shape === 'cube') rr(p, -18, -57, 36, 36, 8);
  else if (shape === 'hex') { p.moveTo(0, -61); p.lineTo(19, -50); p.lineTo(19, -28); p.lineTo(0, -17); p.lineTo(-19, -28); p.lineTo(-19, -50); p.closePath(); }
  else { p.moveTo(0, -60); p.bezierCurveTo(11, -60, 12, -49, 17, -43); p.bezierCurveTo(25, -34, 19, -18, 0, -18); p.bezierCurveTo(-19, -18, -25, -34, -17, -43); p.bezierCurveTo(-12, -49, -11, -60, 0, -60); p.closePath(); }
  return (HP[shape] = p);
}
const GR = {};
function grad(d, key, x0, y0, r0, x1, y1, r1, stops) { const k = d.c + key; if (!GR[k]) { const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1); stops.forEach(s => g.addColorStop(s[0], s[1])); GR[k] = g; } return GR[k]; }
const OUT = 'rgba(5,6,15,.92)';
function limb(c, x, y, rx, ry, col) { c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = 1.6; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); c.stroke(); }
function eyeF(c, x, y, rx, ry, bl, lk, d) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y, rx, Math.max(.8, ry * (1 - bl * .85)), 0, 0, TAU); c.fill(); if (bl < .5) { c.fillStyle = '#0a0f22'; c.beginPath(); c.arc(x + lk * 1.5, y + .6, rx * .52, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.fillRect(x + lk * 1.5 - 1.6, y - 1.6, 1.4, 1.4); } }
function drawChibi(c, id, x, y, o) {
  const d = IDS[id], sc = (d.sc || 1) * (o.scale || 1), face = o.face, side = face === 'l' || face === 'r', back = face === 'u', sit = o.sit || 0, mv = o.moving ? 1 : 0;
  const sn = Math.sin((o.walk || 0) * TAU), bob = mv ? Math.abs(sn) * 2.8 : (1 - sit) * Math.sin(T * 2.2 + (o.ph || 0)) * .9;
  c.save(); c.translate(x, y);
  if (o.sel) { c.strokeStyle = rgba(d.c, .85); c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, 1, 24 * sc, 8 * sc, 0, 0, TAU); c.stroke(); }
  c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(0, 1, (sit ? 13 : 15) * sc, 5 * sc, 0, 0, TAU); c.fill();
  c.scale(sc * (face === 'l' ? -1 : 1), sc); c.translate(0, sit * 4 - bob);
  const lc = d.dk2;
  if (sit < .55) { // jambes
    if (side) { limb(c, -sn * 5, -4, 3.4, 4.6, mix(d.c, 'k', .72)); limb(c, sn * 5, -4, 3.6, 4.8, lc); }
    else { limb(c, -5.5, -4 - (mv ? Math.max(0, sn) * 3.4 : 0), 3.6, 4.6, lc); limb(c, 5.5, -4 - (mv ? Math.max(0, -sn) * 3.4 : 0), 3.6, 4.6, lc); }
  }
  // bras arrière / corps
  const typ = o.type | 0, wave = o.wave ? Math.sin(T * 12) * 4 : 0;
  const armY = k => -15 + (mv ? sn * 3.2 * k : 0);
  if (!side && !back) { limb(c, -13, armY(1), 3.6, 5.4, d.md); limb(c, 13, o.wave ? -27 + wave : armY(-1), 3.6, 5.4, d.md); }
  const bw = side ? 8 : 10;
  c.fillStyle = grad(d, 'b', 0, -21, 1, 0, -15, 16, [[0, mix(d.c, 'w', .15)], [1, d.dk]]); c.strokeStyle = OUT; c.lineWidth = 1.8; rrect(c, -bw, -24, bw * 2, 17, 6); c.fill(); c.stroke();
  if (!back && !side) { c.fillStyle = rgba(d.lt, .5); c.beginPath(); c.ellipse(0, -14, 4.4, 3.6, 0, 0, TAU); c.fill();
    if (d.acc === 'shield') { c.fillStyle = mix(d.c, 'w', .1); c.strokeStyle = OUT; c.beginPath(); c.moveTo(-6, -22); c.lineTo(6, -22); c.lineTo(6, -14); c.quadraticCurveTo(0, -7, -6, -14); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-1, -20, 2, 7); } }
  if (back && d.acc === 'shield') { c.fillStyle = d.lt; c.strokeStyle = OUT; c.beginPath(); c.moveTo(-7, -22); c.lineTo(7, -22); c.lineTo(7, -13); c.quadraticCurveTo(0, -5, -7, -13); c.closePath(); c.fill(); c.stroke(); }
  if (side) { if (d.acc === 'shield') { c.fillStyle = d.lt; c.strokeStyle = OUT; c.beginPath(); c.moveTo(3, -22); c.lineTo(8, -20); c.lineTo(8, -12); c.lineTo(3, -9); c.closePath(); c.fill(); c.stroke(); } limb(c, sn * 5 * (o.moving ? 1 : 0), -15, 3.4, 5.2, d.md); }
  if (back) { // mains qui tapent (2 images) ou bras ballants
    if (typ) { const f1 = typ === 1; limb(c, -14, -17 - (f1 ? 4 : 0), 4.2, 4.6, d.lt); limb(c, 14, -17 - (f1 ? 0 : 4), 4.2, 4.6, d.lt); }
    else { limb(c, -13, armY(1), 3.6, 5.4, d.md); limb(c, 13, o.wave ? -27 + wave : armY(-1), 3.6, 5.4, d.md); }
  }
  // tête
  c.save(); if (typ) c.translate(0, (typ === 1 ? -.8 : .6)); if (side) c.scale(.92, 1);
  const hp = headPath(d.shape);
  if (d.acc === 'ears') { c.fillStyle = d.md; c.strokeStyle = OUT; c.lineWidth = 1.8; [-1, 1].forEach(s => { c.beginPath(); c.moveTo(s * 17, -55); c.lineTo(s * 11, -69); c.lineTo(s * 4, -57); c.closePath(); c.fill(); c.stroke(); }); }
  if (d.acc === 'antenna') { const sw = Math.sin(T * 3 + (o.ph || 0)) * 1.4; c.strokeStyle = OUT; c.lineWidth = 3.4; c.beginPath(); c.moveTo(0, -57); c.lineTo(2 + sw, -68); c.stroke(); c.strokeStyle = d.lt; c.lineWidth = 1.4; c.stroke(); c.fillStyle = '#fff'; c.strokeStyle = d.c; c.lineWidth = 1.6; c.beginPath(); c.arc(2 + sw, -70, 3.4 + .6 * Math.sin(T * 5), 0, TAU); c.fill(); c.stroke(); }
  if (d.acc === 'cyclops') { c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -60); c.lineTo(0, -66); c.stroke(); c.fillStyle = d.lt; c.beginPath(); c.arc(0, -67, 2.6, 0, TAU); c.fill(); }
  c.fillStyle = grad(d, 'h' + d.shape, -6, -48, 2, 0, -39, 28, [[0, mix(d.c, 'w', .55)], [.45, d.c], [1, back ? d.dk2 : d.dk]]); c.fill(hp); c.strokeStyle = OUT; c.lineWidth = 2.6; c.lineJoin = 'round'; c.stroke(hp);
  c.fillStyle = 'rgba(255,255,255,.34)'; c.beginPath(); c.ellipse(-8, -50, 5.5, 2.8, -.5, 0, TAU); c.fill();
  if (d.acc === 'ring') { c.strokeStyle = 'rgba(80,200,255,.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, -39, 25, 6.5, 0, 0, TAU); c.stroke(); }
  if (d.acc === 'bolts' && !side) [-1, 1].forEach(s => { c.fillStyle = '#6b7390'; c.strokeStyle = OUT; c.lineWidth = 1.4; c.beginPath(); c.arc(s * 19, -39, 3.4, 0, TAU); c.fill(); c.stroke(); });
  if (d.acc === 'headset') { c.strokeStyle = OUT; c.lineWidth = 4.6; c.beginPath(); c.arc(0, -41, side ? 14 : 16.5, Math.PI * 1.04, Math.PI * 1.96); c.stroke(); c.strokeStyle = d.lt; c.lineWidth = 2; c.stroke();
    const cups = side ? [-1] : [-1, 1]; cups.forEach(s => { c.fillStyle = '#10142c'; c.strokeStyle = d.lt; c.lineWidth = 1.6; rrect(c, side ? -4 : (s < 0 ? -22 : 15), -47, side ? 8 : 7, 13, 3); c.fill(); c.stroke(); });
    if (!back) { c.strokeStyle = '#10142c'; c.lineWidth = 2; c.beginPath(); c.moveTo(side ? 5 : 16, -35); c.quadraticCurveTo(side ? 12 : 12, -26, side ? 10 : 5, -27); c.stroke(); c.fillStyle = d.lt; c.beginPath(); c.arc(side ? 10 : 5, -27, 2, 0, TAU); c.fill(); } }
  if (d.acc === 'crown') { c.fillStyle = '#ffe58a'; c.strokeStyle = OUT; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-11, -59); c.lineTo(-12, -70); c.lineTo(-5, -64); c.lineTo(0, -73); c.lineTo(5, -64); c.lineTo(12, -70); c.lineTo(11, -59); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#ff3dd8'; c.fillRect(-1.5, -66, 3, 3); }
  // visage
  if (!back) {
    const bl = o.blink || 0, lk = o.look || 0, ex = side ? 0 : 1;
    if (d.acc === 'cyclops') { const ex0 = side ? 7 : 0; c.fillStyle = '#fff'; c.beginPath(); c.arc(ex0, -40, 8, 0, TAU); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.4; c.stroke(); if (bl < .5) { c.fillStyle = '#0a0f22'; c.beginPath(); c.arc(ex0 + lk * 1.6 + (side ? 2 : 0), -40, 3.8, 0, TAU); c.fill(); } }
    else if (d.acc === 'glasses') {
      const xs = side ? [8] : [-8, 8]; xs.forEach(gx => { c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.arc(gx, -40, 7.4, 0, TAU); c.fill(); eyeF(c, gx + (side ? 1 : 0), -40, 3.8, 4.8, bl, lk, d); c.strokeStyle = '#1b1240'; c.lineWidth = 2.2; c.beginPath(); c.arc(gx, -40, 7.4, 0, TAU); c.stroke(); c.strokeStyle = d.lt; c.lineWidth = .9; c.stroke(); });
      c.strokeStyle = '#1b1240'; c.lineWidth = 2; c.beginPath(); if (side) { c.moveTo(0, -40); c.lineTo(-14, -42); } else { c.moveTo(-1, -40); c.lineTo(1, -40); } c.stroke();
    } else if (side) eyeF(c, 8, -40, 3.8, 5.2, bl, lk, d); else { eyeF(c, -7.5, -40, 4.2, 5.4, bl, lk, d); eyeF(c, 7.5, -40, 4.2, 5.4, bl, lk, d); }
    c.strokeStyle = OUT; c.lineWidth = 1.7; c.lineCap = 'round'; c.beginPath();
    const mx = side ? 12 : 0; if (o.talk && ((T * 7 + (o.ph || 0)) % 1) < .55) { c.fillStyle = '#3a0b25'; c.ellipse(mx, -29, 3.4, 2.6, 0, 0, TAU); c.fill(); } else { c.moveTo(mx - 3.5, -30); c.quadraticCurveTo(mx, -26.5, mx + 3.5, -30); c.stroke(); }
    c.lineCap = 'butt';
  } else { if (d.acc === 'glasses') { c.strokeStyle = '#1b1240'; c.lineWidth = 2; [-1, 1].forEach(s => { c.beginPath(); c.moveTo(s * 18, -42); c.lineTo(s * 19, -37); c.stroke(); }); } c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1.4; c.beginPath(); c.arc(0, -39, 11, Math.PI * .15, Math.PI * .85); c.stroke(); }
  c.restore(); c.restore();
}

/* ============ glyphes (langue inventée) + icônes décoratives ============ */
function glyph(c, id, x, y, s, col) {
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.7; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
  switch (id % 12) {
    case 0: c.arc(0, 0, 4.4, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, 1.4, 0, TAU); c.fill(); break;
    case 1: c.moveTo(0, -5); c.lineTo(5, 4); c.lineTo(-5, 4); c.closePath(); c.stroke(); break;
    case 2: c.moveTo(0, -5.5); c.lineTo(5, 0); c.lineTo(0, 5.5); c.lineTo(-5, 0); c.closePath(); c.stroke(); break;
    case 3: c.moveTo(-6, 0); c.bezierCurveTo(-3, -6, -1, -6, 0, 0); c.bezierCurveTo(1, 6, 3, 6, 6, 0); c.stroke(); break;
    case 4: c.moveTo(-4.5, -4.5); c.lineTo(4.5, 4.5); c.moveTo(4.5, -4.5); c.lineTo(-4.5, 4.5); c.stroke(); break;
    case 5: c.arc(0, 0, 5, .3, 5.2); c.stroke(); c.beginPath(); c.arc(0, 0, 2.2, 3, 8); c.stroke(); break;
    case 6: c.moveTo(-4, 4); c.lineTo(-4, -1); c.moveTo(0, 4); c.lineTo(0, -5); c.moveTo(4, 4); c.lineTo(4, 1); c.stroke(); break;
    case 7: c.moveTo(-5, 0); c.lineTo(5, 0); c.moveTo(1.5, -3.5); c.lineTo(5, 0); c.lineTo(1.5, 3.5); c.stroke(); break;
    case 8: c.ellipse(0, 0, 5.6, 3.4, 0, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, 1.6, 0, TAU); c.fill(); break;
    case 9: c.moveTo(0, -6); c.quadraticCurveTo(0, 0, 6, 0); c.quadraticCurveTo(0, 0, 0, 6); c.quadraticCurveTo(0, 0, -6, 0); c.quadraticCurveTo(0, 0, 0, -6); c.fill(); break;
    case 10: c.arc(0, 0, 5, .9, 5.4); c.quadraticCurveTo(0, 0, 3, 3.9); c.stroke(); break;
    default: for (let i = 0; i < 6; i++) { const a = i * TAU / 6 - 1.57; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 5, Math.sin(a) * 5); } c.closePath(); c.stroke();
  }
  c.restore();
}
function icon(c, id, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineWidth = 1.6; c.lineJoin = 'round'; c.strokeStyle = OUT;
  switch (id) {
    case 'coin': c.fillStyle = '#ffcf3a'; c.beginPath(); c.arc(0, 0, 6.2, 0, TAU); c.fill(); c.stroke(); c.strokeStyle = '#b8860b'; c.beginPath(); c.arc(0, 0, 3.6, 0, TAU); c.stroke(); c.fillStyle = '#fff3b0'; c.fillRect(-.8, -2.6, 1.6, 5.2); break;
    case 'bars': c.fillStyle = GRN; [[-4, 2, 3.6], [0, -1, 6.4], [4, -4, 9]].forEach(b => { c.beginPath(); c.rect(b[0] - 1.6, b[1], 3.2, b[2]); c.fill(); }); break;
    case 'bolt': c.fillStyle = '#ffe14a'; c.beginPath(); c.moveTo(2, -7); c.lineTo(-4, 1); c.lineTo(0, 1); c.lineTo(-2, 7); c.lineTo(4, -2); c.lineTo(0, -2); c.closePath(); c.fill(); c.stroke(); break;
    case 'gem': c.fillStyle = '#6fe8ff'; c.beginPath(); c.moveTo(-5, -2); c.lineTo(-2.5, -6); c.lineTo(2.5, -6); c.lineTo(5, -2); c.lineTo(0, 6); c.closePath(); c.fill(); c.stroke(); break;
    case 'gear': c.fillStyle = '#b9c4ee'; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i * TAU / 16, r = i % 2 ? 4.6 : 6.4; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#22284a'; c.beginPath(); c.arc(0, 0, 2, 0, TAU); c.fill(); break;
    case 'spark': c.fillStyle = '#fff6a8'; c.beginPath(); c.moveTo(0, -7); c.quadraticCurveTo(0, 0, 7, 0); c.quadraticCurveTo(0, 0, 0, 7); c.quadraticCurveTo(0, 0, -7, 0); c.quadraticCurveTo(0, 0, 0, -7); c.fill(); break;
    case 'drop': c.fillStyle = '#4fd2ff'; c.beginPath(); c.moveTo(0, -7); c.quadraticCurveTo(7, 2, 0, 6); c.quadraticCurveTo(-7, 2, 0, -7); c.fill(); c.stroke(); break;
    default: c.fillStyle = '#c9a4ff'; c.beginPath(); c.moveTo(0, -6); c.lineTo(5, -4); c.lineTo(5, 1); c.quadraticCurveTo(0, 7, -5, 1); c.lineTo(-5, -4); c.closePath(); c.fill(); c.stroke();
  }
  c.restore();
}
const POPI = ['coin', 'bars', 'bolt', 'gem', 'gear', 'spark', 'shield'];

/* ============ décor : fond statique (mur, sol, tapis, logo peint) ============ */
function buildBg() {
  bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height; const c = bg.getContext('2d'), k = cv.width / L.W; c.setTransform(k, 0, 0, k, 0, 0);
  const W = L.W, H = L.H, ft = L.ft;
  let g = c.createLinearGradient(0, 0, 0, ft); g.addColorStop(0, '#0d0a24'); g.addColorStop(1, '#171236'); c.fillStyle = g; c.fillRect(0, 0, W, ft);
  c.strokeStyle = 'rgba(39,230,255,.08)'; c.lineWidth = 2; for (let x = 40; x < W; x += 80) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, ft); c.stroke(); }
  c.fillStyle = 'rgba(255,61,216,.05)'; for (let x = 0; x < W; x += 160) c.fillRect(x, 0, 80, ft);
  for (let i = 0; i < 5; i++) { const lx = W * (i + .5) / 5; const lg = c.createRadialGradient(lx, 0, 2, lx, 0, 150); lg.addColorStop(0, 'rgba(160,130,255,.28)'); lg.addColorStop(1, 'rgba(160,130,255,0)'); c.fillStyle = lg; c.fillRect(lx - 150, 0, 300, ft); c.fillStyle = '#cdbbff'; c.fillRect(lx - 24, 0, 48, 4); }
  g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, COL.cy); g.addColorStop(.5, COL.mg); g.addColorStop(1, COL.vi); c.fillStyle = g; c.fillRect(0, ft - 9, W, 4); c.globalAlpha = .25; c.fillRect(0, ft - 14, W, 14); c.globalAlpha = 1;
  c.fillStyle = '#0a0c1c'; c.fillRect(0, ft - 5, W, 8);
  g = c.createLinearGradient(0, ft, 0, H); g.addColorStop(0, '#0d1030'); g.addColorStop(1, '#070918'); c.fillStyle = g; c.fillRect(0, ft + 3, W, H - ft);
  for (let r = 0, y = ft + 3; y < H; r++, y += 40) for (let x = (r % 2) * 40; x < W; x += 80) { c.fillStyle = 'rgba(120,140,255,.035)'; c.fillRect(x, y, 40, 40); }
  c.strokeStyle = 'rgba(120,150,255,.07)'; c.lineWidth = 1; for (let x = 0; x <= W; x += 80) { c.beginPath(); c.moveTo(x, ft + 3); c.lineTo(x, H); c.stroke(); } for (let y = ft + 43; y < H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  L.pods.forEach(p => { // tapis lumineux sous chaque pod
    const rw = L.mode === 'W' ? 344 : 300, x0 = p.cx - rw / 2, y0 = p.fy - 66, w = rw, h = 186; c.fillStyle = rgba(p.col, .07); rrect(c, x0, y0, w, h, 22); c.fill(); c.strokeStyle = rgba(p.col, .5); c.lineWidth = 2; c.stroke();
    c.setLineDash([10, 8]); c.strokeStyle = rgba(p.col, .22); rrect(c, x0 + 9, y0 + 9, w - 18, h - 18, 16); c.stroke(); c.setLineDash([]);
    const sg = c.createRadialGradient(p.cx, p.fy + 10, 10, p.cx, p.fy + 10, 190); sg.addColorStop(0, rgba(p.col, .16)); sg.addColorStop(1, rgba(p.col, 0)); c.fillStyle = sg; c.fillRect(x0 - 30, y0 - 30, w + 60, h + 60);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(p.cx, p.fy + 22, 150, 12, 0, 0, TAU); c.fill();
  });
  // 'ORION FLOOR' peint au sol, en perspective écrasée
  const lg = L.logo; c.save(); c.translate(lg.x, lg.y); c.scale(lg.s, .42 * lg.s); c.font = '800 78px ui-sans-serif,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; if ('letterSpacing' in c) c.letterSpacing = '14px';
  c.lineJoin = 'round'; c.lineWidth = 10; c.strokeStyle = 'rgba(39,230,255,.22)'; c.strokeText('ORION FLOOR', 0, 0); c.lineWidth = 3; c.strokeStyle = 'rgba(39,230,255,.85)'; c.strokeText('ORION FLOOR', 0, 0); c.fillStyle = 'rgba(255,61,216,.22)'; c.fillText('ORION FLOOR', 0, 0);
  c.lineWidth = 4; c.strokeStyle = 'rgba(255,61,216,.55)'; c.beginPath(); c.moveTo(-250, 62); c.lineTo(250, 62); c.stroke(); c.restore();
  const vg = c.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,8,.5)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
}

/* ============ éléments dynamiques ============ */
function wallDyn() {
  const c = ctx, ft = L.ft, w = L.wall;
  // racks serveurs
  L.racks.forEach((x, ri) => {
    c.fillStyle = '#0a0d20'; c.strokeStyle = 'rgba(120,140,255,.6)'; c.lineWidth = 2; rrect(c, x - 33, ft - 124, 66, 126, 5); c.fill(); c.stroke();
    for (let r = 0; r < 8; r++) { const y = ft - 117 + r * 14.5; c.fillStyle = '#131a3a'; c.fillRect(x - 28, y, 56, 11);
      for (let k = 0; k < 4; k++) { const h = hash('led' + ri + r + k), on = Math.sin(T * (1.4 + h * 4) + h * 30) > (h < .2 ? .4 : -.55); c.fillStyle = on ? ['#3dff9a', '#27e6ff', '#ffcf3a', '#ff3dd8'][(r + k) % 4] : '#1b2347'; c.fillRect(x - 24 + k * 6, y + 4, 3.4, 3.4); }
      c.fillStyle = '#26305c'; c.fillRect(x + 4, y + 3, 22, 2); c.fillRect(x + 4, y + 6.5, 14, 2); }
  });
  // écran mural principal : courbe du capital (réelle)
  const sx = w.x - w.w / 2, sy = 20;
  c.globalAlpha = .28; c.fillStyle = COL.cy; rrect(c, sx - 8, sy - 8, w.w + 16, w.h + 16, 12); c.fill(); c.globalAlpha = 1;
  c.fillStyle = '#05091a'; rrect(c, sx, sy, w.w, w.h, 8); c.fill(); c.strokeStyle = COL.cy; c.lineWidth = 2.4; c.stroke();
  const cu = D.curve || [];
  c.save(); c.beginPath(); c.rect(sx + 4, sy + 4, w.w - 8, w.h - 8); c.clip();
  c.strokeStyle = 'rgba(39,230,255,.12)'; c.lineWidth = 1; for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(sx, sy + i * w.h / 5); c.lineTo(sx + w.w, sy + i * w.h / 5); c.stroke(); }
  if (cu.length > 2) {
    const n = Math.min(90, cu.length), pts = []; for (let i = 0; i < n; i++) pts.push(cu[Math.round(i * (cu.length - 1) / (n - 1))].equity);
    const lo = Math.min(...pts), hi = Math.max(...pts), sp = (hi - lo) || 1, up = pts[n - 1] >= pts[0], col = up ? GRN : RED, X = i => sx + 10 + i / (n - 1) * (w.w - 20), Y = v => sy + w.h - 16 - (v - lo) / sp * (w.h - 44);
    c.beginPath(); pts.forEach((v, i) => c[i ? 'lineTo' : 'moveTo'](X(i), Y(v))); c.lineTo(X(n - 1), sy + w.h); c.lineTo(X(0), sy + w.h); c.closePath(); const fg = c.createLinearGradient(0, sy, 0, sy + w.h); fg.addColorStop(0, rgba(col, .35)); fg.addColorStop(1, rgba(col, 0)); c.fillStyle = fg; c.fill();
    c.strokeStyle = col; c.lineWidth = 2.2; c.beginPath(); pts.forEach((v, i) => c[i ? 'lineTo' : 'moveTo'](X(i), Y(v))); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(X(n - 1), Y(pts[n - 1]), 3 + Math.sin(T * 5), 0, TAU); c.fill();
    const le = lastEq(); if (ok(le)) { c.font = '700 20px ui-sans-serif,system-ui,sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = '#fff'; c.fillText(eur(le), sx + 12, sy + 9); c.font = '600 10px ui-sans-serif,system-ui,sans-serif'; c.fillStyle = COL.cy; c.fillText('CAPITAL · PAPER', sx + 12, sy + 32); }
  } else { c.fillStyle = 'rgba(39,230,255,.25)'; for (let i = 0; i < 20; i++) c.fillRect(sx + 14 + i * 12, sy + w.h - 20 - Math.abs(Math.sin(i + T)) * 40, 7, 6); }
  c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(sx, sy + ((T * 30) % w.h), w.w, 2);
  c.restore();
  if (L.mode === 'W') { // petits écrans muraux : P&L des positions (réel) + radar décoratif
    const pw = 134, ph = 84, y0 = 38;
    [[150, 0], [676, 1]].forEach(([x0, k]) => {
      c.globalAlpha = .2; c.fillStyle = k ? COL.vi : COL.go; rrect(c, x0 - 5, y0 - 5, pw + 10, ph + 10, 9); c.fill(); c.globalAlpha = 1; c.fillStyle = '#060a1b'; rrect(c, x0, y0, pw, ph, 6); c.fill(); c.strokeStyle = k ? COL.vi : COL.go; c.lineWidth = 2; c.stroke();
      c.save(); c.beginPath(); c.rect(x0 + 3, y0 + 3, pw - 6, ph - 6); c.clip();
      if (!k) { const P = (D.pos || []).filter(p => ok(p.pnl)), mx = Math.max(.5, ...P.map(p => Math.abs(p.pnl))); c.strokeStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.moveTo(x0 + 8, y0 + ph / 2); c.lineTo(x0 + pw - 8, y0 + ph / 2); c.stroke(); P.slice(0, 6).forEach((p, i) => { const bw = (pw - 24) / Math.max(P.length, 3), h = Math.abs(p.pnl) / mx * (ph / 2 - 12); c.fillStyle = p.pnl >= 0 ? GRN : RED; c.fillRect(x0 + 12 + i * bw, p.pnl >= 0 ? y0 + ph / 2 - h : y0 + ph / 2, bw * .7, Math.max(1.5, h)); }); }
      else { const cx = x0 + pw / 2, cy = y0 + ph / 2, R = ph / 2 - 8; c.strokeStyle = 'rgba(168,107,255,.35)'; for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(cx, cy, R * i / 3, 0, TAU); c.stroke(); } const a = T * 1.4; c.strokeStyle = 'rgba(200,170,255,.95)'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.stroke(); for (let i = 0; i < 6; i++) { const aa = hash('r' + i) * TAU, rr_ = (.3 + .6 * hash('q' + i)) * R; c.fillStyle = '#c9a4ff'; c.fillRect(cx + Math.cos(aa) * rr_ - 1.5, cy + Math.sin(aa) * rr_ - 1.5, 3, 3); } }
      c.restore();
    });
  }
}
function drawPlant(x, y) {
  const c = ctx, sw = Math.sin(T * 1.3 + x) * 2.2; c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y, 20, 6, 0, 0, TAU); c.fill();
  c.fillStyle = '#2a1a55'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 13, y - 22); c.lineTo(x + 13, y - 22); c.lineTo(x + 10, y); c.lineTo(x - 10, y); c.closePath(); c.fill(); c.stroke(); c.fillStyle = COL.mg; c.fillRect(x - 12, y - 20, 24, 3);
  [[-26, -50, -1.1], [-14, -64, -.5], [0, -72, 0], [14, -62, .5], [26, -48, 1.1], [-6, -46, -.2], [8, -44, .25]].forEach(([dx, dy, a], i) => { c.save(); c.translate(x, y - 22); c.rotate(a + sw * .02 * (i % 2 ? 1 : -1)); const len = Math.hypot(dx, dy + 22) * .9; c.fillStyle = i % 3 ? '#1fa85a' : '#38d977'; c.strokeStyle = OUT; c.lineWidth = 1.6; c.beginPath(); c.ellipse(0, -len / 2, 7.5, len / 2, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); });
}
function drawCooler(p) {
  const c = ctx, x = p.x, y = p.y; c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y, 24, 7, 0, 0, TAU); c.fill();
  c.fillStyle = '#c8d4f5'; c.strokeStyle = OUT; c.lineWidth = 2; rrect(c, x - 16, y - 54, 32, 56, 5); c.fill(); c.stroke(); c.fillStyle = '#8fa0d6'; c.fillRect(x - 12, y - 34, 24, 3);
  c.fillStyle = '#3aa8ff'; c.fillRect(x - 6, y - 30, 4, 5); c.fillStyle = '#ff5a7a'; c.fillRect(x + 2, y - 30, 4, 5);
  c.fillStyle = 'rgba(80,200,255,.55)'; c.beginPath(); c.arc(x, y - 72, 15, 0, TAU); c.fill(); c.strokeStyle = 'rgba(190,240,255,.9)'; c.lineWidth = 2; c.stroke(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x - 12, y - 66, 24, 2);
  for (let i = 0; i < 3; i++) { const k = (T * .5 + i / 3) % 1; c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(x - 5 + i * 5, y - 60 - k * 18, 1.7, 0, TAU); c.fill(); }
}
function drawPod(p) {
  const c = ctx, {cx, fy, col} = p, occ = p.seats.map(s => s.occ && s.occ.state === 'type'), fl = Math.max(flash.scout || 0, 0);
  monitor(cx - 42, fy - 40, 76, 46, serFor(p.i, 3), p.i * 2 + .3, col, occ[0] || occ[1] || occ[2], 0); monitor(cx + 42, fy - 40, 76, 46, serFor(p.i, 4), p.i * 2 + 1.3, col, occ[1] || occ[2] || occ[0], 0);
  let g = c.createLinearGradient(0, fy - 48, 0, fy); g.addColorStop(0, '#1b2250'); g.addColorStop(1, '#10163a');
  c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 122, fy - 48); c.lineTo(cx + 122, fy - 48); c.lineTo(cx + 130, fy); c.lineTo(cx - 130, fy); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = rgba(col, .55); c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx - 122, fy - 47); c.lineTo(cx + 122, fy - 47); c.stroke();
  p.seats.forEach((s, j) => { // clavier + souris
    const kb = occ[j]; c.fillStyle = '#0a0f26'; c.strokeStyle = rgba(col, kb ? .9 : .4); c.lineWidth = 1.2; c.beginPath(); c.moveTo(s.x - 15, fy - 14); c.lineTo(s.x + 15, fy - 14); c.lineTo(s.x + 18, fy - 4); c.lineTo(s.x - 18, fy - 4); c.closePath(); c.fill(); c.stroke();
    if (kb) { for (let i = 0; i < 6; i++) { c.fillStyle = Math.sin(T * 14 + i * 2.1 + j) > .2 ? '#fff' : rgba(col, .7); c.fillRect(s.x - 12 + i * 4.4, fy - 11, 2.6, 2.2); } }
    c.fillStyle = '#0a0f26'; c.beginPath(); c.ellipse(s.x + 26, fy - 8, 3.4, 4.6, 0, 0, TAU); c.fill();
  });
  c.fillStyle = '#e8d2a0'; c.strokeStyle = OUT; c.lineWidth = 1.4; rrect(c, cx + 100, fy - 28, 9, 11, 2); c.fill(); c.stroke(); // tasse
  p.seats.forEach((s, j) => monitor(s.x, fy - 20, 62, 40, serFor(p.i, j), p.i * 3 + j + .7, col, occ[j], (s.occ && flash[s.occ.id]) || 0));
  g = c.createLinearGradient(0, fy, 0, fy + 17); g.addColorStop(0, '#171d47'); g.addColorStop(1, '#0b1030'); c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 2; c.fillRect(cx - 130, fy, 260, 17); c.strokeRect(cx - 130, fy, 260, 17);
  c.fillStyle = rgba(col, .85); c.fillRect(cx - 124, fy + 11, 248, 2.6); c.globalAlpha = .25; c.fillRect(cx - 124, fy + 8, 248, 8); c.globalAlpha = 1;
}
function drawChairSeat(s) { const c = ctx, x = s.x, y = s.y + s.pull, col = L.pods[s.pod].col; c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x, y + 4, 18, 6, 0, 0, TAU); c.fill(); c.strokeStyle = '#0a0d20'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 12, y + 4); c.lineTo(x + 12, y + 4); c.moveTo(x, y - 2); c.lineTo(x, y + 4); c.stroke(); c.fillStyle = '#0c1130'; c.beginPath(); c.arc(x - 12, y + 5, 2.2, 0, TAU); c.arc(x + 12, y + 5, 2.2, 0, TAU); c.fill();
  c.fillStyle = '#1a2150'; c.strokeStyle = OUT; c.lineWidth = 1.8; c.beginPath(); c.ellipse(x, y - 4, 16, 7, 0, 0, TAU); c.fill(); c.stroke(); c.strokeStyle = rgba(col, .6); c.lineWidth = 1.2; c.stroke(); }
function drawChairBack(s) { const c = ctx, x = s.x, y = s.y + s.pull, col = L.pods[s.pod].col; c.fillStyle = '#141a44'; c.strokeStyle = OUT; c.lineWidth = 1.8; rrect(c, x - 17, y - 14, 34, 16, 7); c.fill(); c.stroke(); c.strokeStyle = rgba(col, .85); c.lineWidth = 2; c.beginPath(); c.moveTo(x - 12, y - 10); c.lineTo(x + 12, y - 10); c.stroke(); }

/* ============ acteurs & machine d'états ============ */
let actors = {}, list = [], bubs = [], pops = [], chats = [], figs = [], figI = 0, lastNum = -9, queue = [], qi = 0, nextEv = 4, tag = 'rejoue le dernier cycle', watchAt = 2, sel = null;
const seats = () => L.pods.flatMap(p => p.seats), BACKS = [];
function release(a) { if (a.seat && a.seat.res === a) a.seat.res = null; if (a.seat && a.seat.occ !== a) a.seat = null; }
function walkTo(a, x, y, cb) {
  release(a); const p = findPath(a.x, a.y, x, y); if (!p) { a.state = 'idle'; a.until = T + .3; a.then = hop; a.cb = null; return false; }
  a.path = p; a.pi = 0; a.cb = cb || null; a.state = 'walk'; a.t0 = T; return true;
}
function setState(a, st, dur, then) { a.state = st; a.t0 = T; a.until = T + dur; a.then = then || null; }
function say(a, n, dur = 2.2) { const gl = [IDS[a.id].g]; while (gl.length < n) gl.push(Math.floor(Math.random() * 12)); for (let i = bubs.length - 1; i >= 0; i--) if (bubs[i].a === a) bubs.splice(i, 1); bubs.push({a, g: gl, t0: T, dur}); a.talk = T + Math.min(dur, 1.4); }
const others = a => list.filter(o => o !== a);
function done(a) { a.trips--; if (a.trips > 0) hop(a); else goDesk(a); }
function goDesk(a) {
  const fr = seats().filter(s => !s.occ && !s.res); if (!fr.length) { a.trips = 1; return hop(a); }
  const s = pick(fr); if (!walkTo(a, s.st.x, s.st.y, ar => sitIn(ar))) return; s.res = a; a.seat = s;
}
function sitIn(a) { const s = a.seat; if (!s) return hop(a); s.occ = a; s.res = null; a.sx = a.x; a.sy = a.y; a.face = 'u'; a.sitK = 0; a.state = 'sitIn'; a.t0 = T; a.then = null; }
function afterSit(a) { a.state = 'type'; a.t0 = T; a.until = T + (a.runner ? rnd(6, 10) : rnd(20, 38)); a.ext = 0; a.then = standUp; a.popAt = T + rnd(.4, 1.2); }
function standUp(a) { a.state = 'sitOut'; a.t0 = T; a.then = null; }
function spotWalk(a, x, y, face, st, dur, ic) { walkTo(a, x, y, ar => { ar.face = face; setState(ar, st, dur, done); if (ic) pop(ar, ic); if (Math.random() < .6) say(ar, 2, dur * .6); }); }
function hop(a) {
  const r = Math.random(), cl = L.cooler;
  if (r < .22) return spotWalk(a, cl.x + rnd(-8, 8), cl.y + 34, 'u', 'drink', 2.6, 'drop');
  if (r < .4) return spotWalk(a, L.wall.x + rnd(-110, 110), L.ft + 52, 'u', 'look', rnd(2.4, 3.4), 'spark');
  if (r < .6) return visit(a);
  if (r < .9) return meet(a);
  const p = pick(L.pods); return spotWalk(a, p.cx + pick([-90, 0, 90]), p.fy - 66, 'd', 'look', 2, 'bars');
}
function visit(a) {
  const t = others(a).filter(o => o.seat && o.state === 'type'); if (!t.length) return meet(a);
  const b = pick(t); walkTo(a, b.seat.st.x, b.seat.st.y, ar => { ar.face = 'u'; setState(ar, 'look', 2.8, done); say(ar, 2, 1.4); ar.replyAt = T + 1.5; ar.replyTo = b; });
}
function meet(a) {
  const c = others(a).filter(o => !o.seat && !o.meet && ['walk', 'idle', 'wait', 'look', 'drink'].includes(o.state)); if (!c.length) return visit2(a);
  const b = pick(c); let M = null; for (let i = 0; i < 30 && !M; i++) { const x = rnd(70, L.W - 70), y = rnd(L.ft + 70, L.H - 60); if (freeAt(x - 24, y, 16) && freeAt(x + 24, y, 16)) M = {x, y}; }
  if (!M) return visit2(a);
  a.meet = {p: b, ready: false}; b.meet = {p: a, ready: false};
  const go = (u, dx) => { if (!walkTo(u, M.x + dx, M.y, ar => arriveMeet(ar))) abortMeet(u); };
  go(a, -24); go(b, 24);
}
function visit2(a) { const p = pick(L.pods); spotWalk(a, p.cx + pick([-90, 0, 90]), p.fy - 66, 'd', 'look', 2, 'bars'); }
function arriveMeet(a) {
  const m = a.meet; if (!m) return done(a); const b = m.p; m.ready = true; a.state = 'wait'; a.t0 = T; a.until = T + 14; a.then = abortMeet; a.face = a.x < b.x ? 'r' : 'l';
  if (b.meet && b.meet.ready && b.meet.p === a) startChat(a, b);
}
function abortMeet(a) { const b = a.meet && a.meet.p; if (b && b.meet && b.meet.p === a) { b.meet = null; if (b.state === 'wait') { b.until = T; } } a.meet = null; done(a); }
function startChat(a, b) {
  const d = rnd(3.8, 5.4); [a, b].forEach(u => { u.state = 'chat'; u.t0 = T; u.until = T + d; u.then = endChat; });
  a.face = a.x < b.x ? 'r' : 'l'; b.face = b.x < a.x ? 'r' : 'l'; chats.push({a, b, next: T + .15, turn: 0, until: T + d});
}
function endChat(a) { a.meet = null; done(a); }
function pop(a, ic) { pops.push({x: a.x + rnd(-8, 8), y: a.y - 76 * (IDS[a.id].sc || 1) * L.cs, t0: T, dur: 1.9, ic}); }
function popNum(a, f) { pops.push({x: a.x, y: a.y - 86 * (IDS[a.id].sc || 1) * L.cs, t0: T, dur: 2.6, num: f}); }
const fmtFig = v => eur(v, true);
function buildFigs() {
  const f = []; (D.pos || []).forEach(p => { if (ok(p.pnl)) f.push({s: p.s, v: p.pnl, k: 'latent'}); });
  const cl = D.team && D.team.resume && D.team.resume.performance && D.team.resume.performance.clotures_24h; if (Array.isArray(cl)) cl.forEach(x => { if (ok(x.pnl)) f.push({s: sym(x.market), v: x.pnl, k: 'clos'}); });
  figs = f;
}

function mkActor(id, i) { return {id, i, x: 0, y: 0, face: 'd', state: 'idle', t0: 0, until: 0, path: [], pi: 0, sitK: 0, walk: 0, ph: Math.random() * 6, speed: rnd(56, 66), seat: null, runner: id === 'b3', trips: 1, talk: 0, popAt: 0, meet: null, then: null, cb: null}; }
function reset() {
  seats().forEach(s => { s.occ = s.res = null; s.pull = 8; }); bubs = []; pops = []; chats = []; actors = {}; list = ORDER.map(mkActor); list.forEach(a => actors[a.id] = a);
  const S0 = seats(), plan = {scout: [0, 0], trader: [2, 1], sentinel: [1, 0], research: [1, 2], arbitre: null, b1: [0, 2], b2: null, b3: null, b4: null};
  list.forEach(a => {
    const p = plan[a.id];
    if (p) { const s = L.pods[p[0]].seats[p[1]]; s.occ = a; a.seat = s; a.x = s.x; a.y = s.y; a.face = 'u'; a.sitK = 1; a.state = 'type'; a.t0 = T - rnd(0, 3); a.until = T + rnd(10, 30); a.ext = 0; a.then = standUp; a.popAt = T + rnd(0, 1.5); }
    else { let x, y; do { x = rnd(80, L.W - 80); y = rnd(L.ft + 70, L.H - 60); } while (!freeAt(x, y, 16)); a.x = x; a.y = y; a.trips = 2 + Math.floor(Math.random() * 2); hop(a); }
  });
}
function stepActor(a, dt) {
  const st = a.state;
  if (st === 'walk') {
    let rem = a.speed * dt * (IDS[a.id].sc ? 1.08 : 1); a.walk = (a.walk + a.speed * dt / 38) % 1;
    while (rem > 0 && a.pi < a.path.length) {
      const t = a.path[a.pi], dx = t.x - a.x, dy = t.y - a.y, dist = Math.hypot(dx, dy);
      if (dist > 1) { const ax = Math.abs(dx), ay = Math.abs(dy), cur = a.face; if (ax > ay * 1.25) a.face = dx > 0 ? 'r' : 'l'; else if (ay > ax * 1.25 || cur === 'u' || cur === 'd') a.face = dy > 0 ? 'd' : 'u'; }
      if (dist <= rem) { a.x = t.x; a.y = t.y; rem -= dist; a.pi++; } else { a.x += dx / dist * rem; a.y += dy / dist * rem; rem = 0; }
    }
    if (a.pi >= a.path.length) { a.state = 'idle'; a.until = T + .05; const cb = a.cb; a.cb = null; a.then = null; if (cb) cb(a); else a.then = hop; }
  } else if (st === 'sitIn' || st === 'sitOut') {
    const s = a.seat; a.sitK = clamp(a.sitK + (st === 'sitIn' ? dt / .7 : -dt / .6), 0, 1); const e = ease(a.sitK);
    if (s) { a.x = lerp(s.st.x, s.x, e); a.y = lerp(s.st.y, s.y + 12 * (1 - e), e); a.walk = 0; }
    if (st === 'sitIn' && a.sitK >= 1) afterSit(a);
    if (st === 'sitOut' && a.sitK <= 0) { if (s) { s.occ = null; s.res = null; } a.seat = null; a.face = 'd'; a.state = 'idle'; a.until = T + .2; a.trips = a.runner ? 3 + Math.floor(Math.random() * 3) : (Math.random() < .25 ? 2 : 1); a.then = hop; }
  } else if (st === 'type') {
    const s = a.seat; if (s) { a.x = s.x; a.y = s.y; }
    if (T > a.popAt) { a.popAt = T + rnd(1.1, 2.4); const f = figs[figI % Math.max(1, figs.length)]; if (f && T - lastNum > 3 && Math.random() < .5) { popNum(a, f); figI++; lastNum = T; } else pop(a, pick(POPI)); }
  } else if (st === 'chat') { /* orchestré par chats */ }
  if (a.replyAt && T > a.replyAt) { const b = a.replyTo; a.replyAt = 0; if (b && b.state === 'type') say(b, 2, 1.6); }
  if (st === 'type' && T >= a.until && (a.ext | 0) < 2 && list.filter(o => o.state === 'walk').length >= 4) { a.until = T + 5; a.ext = (a.ext | 0) + 1; }
  if (st !== 'walk' && st !== 'sitIn' && st !== 'sitOut' && T >= a.until && a.then) { const f = a.then; a.then = null; f(a); }
}
function stepWorld(dt) {
  T += dt; list.forEach(a => stepActor(a, dt));
  for (let i = chats.length - 1; i >= 0; i--) { const ch = chats[i]; if (T > ch.until + .1 || ch.a.state !== 'chat') { chats.splice(i, 1); continue; } if (T > ch.next) { ch.next = T + 1.3; const sp = ch.turn++ % 2 ? ch.b : ch.a; say(sp, 2 + Math.floor(Math.random() * 2), 1.5); if (Math.random() < .5) pop(sp, pick(['spark', 'gem', 'bars', 'bolt'])); } }
  seats().forEach(s => { const tg = s.occ ? (s.occ.state === 'type' ? 0 : 12 * (1 - ease(s.occ.sitK))) : s.res ? 12 : 8; s.pull += (tg - s.pull) * Math.min(1, dt * 7); });
  for (let i = bubs.length - 1; i >= 0; i--) if (T - bubs[i].t0 > bubs[i].dur) bubs.splice(i, 1);
  for (let i = pops.length - 1; i >= 0; i--) if (T - pops[i].t0 > pops[i].dur) pops.splice(i, 1);
  for (const k in flash) flash[k] = Math.max(0, flash[k] - dt * 1.2);
  if (T > watchAt) { watchAt = T + 1;
    const walkers = list.filter(a => a.state === 'walk').length, typers = list.filter(a => a.state === 'type' && T - a.t0 > 3.5);
    if (walkers < 2 && !typers.length) { const w = list.filter(x => ['wait', 'look', 'drink'].includes(x.state) && !x.meet); if (w.length) pick(w).until = T; }
    if (walkers < 2 && typers.length) { const a = (typers.filter(x => !x.id.startsWith('b')).length > 2 ? pick(typers.filter(x => !x.runner)) : pick(typers)); a.until = T; }
    const sitters = list.filter(a => a.seat).length; if (sitters < 3) { const w = list.filter(a => !a.seat && (a.state === 'idle' || a.state === 'walk') && a.trips <= 1 && !a.meet); if (w.length) w[0].trips = 0; }
  }
  if (T > nextEv) { nextEv = T + rnd(6, 9); evStep(); }
}
/* événements réels du dernier cycle (team.json) → bandeau + éclair sur l'écran du bon agent */
const ROLE_WHO = {SCANNER: 'scout', SCOUT: 'scout', SENTINEL: 'sentinel', TRADER: 'trader', ARBITRE: 'arbitre', RESEARCH: 'research'}, ORD = {SCANNER: 0, SCOUT: 1, SENTINEL: 2, ARBITRE: 3, TRADER: 4, RESEARCH: 5};
function buildQueue() {
  const j = D.team && Array.isArray(D.team.journal) ? D.team.journal : []; if (!j.length) { queue = []; return; }
  const mx = Math.max(...j.map(e => e.ts)), cur = j.filter(e => e.ts >= mx - 90e3); D.lastTick = mx; const seen = new Set(), pk = [];
  for (const e of cur.slice().sort((a, z) => (ORD[a.role] ?? 9) - (ORD[z.role] ?? 9))) { const k = e.role + '.' + e.kind; if (seen.has(k) || !ROLE_WHO[e.role]) continue; seen.add(k); pk.push(e); }
  queue = pk.slice(0, 8).map(e => ({who: ROLE_WHO[e.role], kind: String(e.kind || ''), ts: e.ts})); qi = 0;
}
function tick(who, kind, ts) {
  const c = IDS[who]; $('tkWho').textContent = NAMES[who]; $('tkWho').style.color = c.c; const dot = document.querySelector('#ticker .dot'); if (dot) { dot.style.background = c.c; dot.style.boxShadow = '0 0 10px ' + c.c; }
  $('tkTxt').textContent = kind.replace(/_/g, ' '); $('tkTag').textContent = ts ? (tag + ' · ' + fmtH(ts) + ' (Paris)') : ''; document.querySelectorAll('.ag').forEach(el => el.classList.toggle('on', el.dataset.k === who));
}
function evStep() { if (!queue.length) return; const q = queue[qi++ % queue.length]; tick(q.who, q.kind, q.ts); flash[q.who] = 1; const a = actors[q.who]; if (a && a.state !== 'sitIn' && a.state !== 'sitOut') { say(a, 3, 2.2); pop(a, 'spark'); } }
function info(k) {
  const el = document.querySelector('[data-st="' + k + '"]'), c = IDS[k], a = actors[k]; if (a) { sel = {a, until: T + 2.6}; say(a, 3, 2.6); flash[k] = 1; }
  $('tkWho').textContent = NAMES[k]; $('tkWho').style.color = c.c; $('tkTxt').textContent = el ? el.textContent : '—'; $('tkTag').textContent = ''; document.querySelectorAll('.ag').forEach(e => e.classList.toggle('on', e.dataset.k === k)); nextEv = Math.max(nextEv, T + 5);
}

/* ============ dessin d'une image ============ */
function drawFrame() {
  if (!L || !bg) return; const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.drawImage(bg, 0, 0); const k = cv.width / L.W; c.setTransform(k, 0, 0, k, 0, 0);
  wallDyn(); const it = [];
  L.pods.forEach(p => { it.push([p.fy + 17, 0, p]); p.seats.forEach(s => { it.push([s.y + s.pull - 2, 1, s]); it.push([s.y + s.pull + 4, 2, s]); }); });
  L.plants.forEach(p => it.push([p[1], 3, p])); it.push([L.cooler.y, 4, L.cooler]);
  list.forEach(a => it.push([a.y + (a.state === 'type' || a.state === 'sitIn' || a.state === 'sitOut' ? 1.5 : 0), 5, a]));
  it.sort((a, b) => a[0] - b[0]);
  for (const [, t, o] of it) {
    if (t === 0) drawPod(o); else if (t === 1) drawChairSeat(o); else if (t === 2) drawChairBack(o); else if (t === 3) drawPlant(o[0], o[1]); else if (t === 4) drawCooler(o);
    else drawChibi(c, o.id, o.x, o.y, {face: o.face, walk: o.walk, moving: o.state === 'walk', sit: o.state === 'type' ? 1 : (o.state === 'sitIn' || o.state === 'sitOut') ? ease(o.sitK) : 0, type: o.state === 'type' ? ((Math.floor(T * 9 + o.ph * 5) % 2) + 1) : 0,
      blink: ((T + o.ph * 3) % 3.6) < .14 ? 1 : 0, look: o.state === 'chat' ? 0 : Math.sin(T * .7 + o.ph) > .6 ? 1 : Math.sin(T * .7 + o.ph) < -.6 ? -1 : 0, talk: T < o.talk, wave: o.state === 'chat' && T < o.talk, ph: o.ph, scale: L.cs, sel: sel && sel.a === o && T < sel.until});
  }
  const bs = L.mode === 'T' ? 1.3 : 1;
  pops.forEach(p => { const k2 = (T - p.t0) / p.dur, al = k2 < .12 ? k2 / .12 : k2 > .7 ? (1 - k2) / .3 : 1, y = p.y - 38 * ease(Math.min(1, k2)) * bs, x = p.x + Math.sin(k2 * 5 + p.t0) * 3; c.globalAlpha = clamp(al, 0, 1);
    if (p.num) { const f = p.num, up = f.v >= 0, col = up ? GRN : RED, txt = fmtFig(f.v), fs = 13 * bs; c.font = '700 ' + fs + 'px ui-sans-serif,system-ui,sans-serif'; const w1 = c.measureText(f.s).width, w2 = c.measureText(txt).width, w = w1 + w2 + 22 * bs; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(4,8,20,.88)'; rrect(c, x - w / 2, y - 10 * bs, w, 20 * bs, 10 * bs); c.fill(); c.strokeStyle = f.k === 'clos' ? COL.go : col; c.lineWidth = 1.6; c.stroke(); c.textAlign = 'left'; c.fillStyle = '#8fa0d6'; c.fillText(f.s, x - w / 2 + 9 * bs, y + .5); c.fillStyle = col; c.fillText(txt, x - w / 2 + 13 * bs + w1, y + .5); }
    else icon(c, p.ic, x, y, 1.15 * bs); c.globalAlpha = 1; });
  bubs.forEach(b => { const a = b.a, k2 = (T - b.t0) / b.dur, al = k2 < .1 ? k2 / .1 : k2 > .8 ? (1 - k2) / .2 : 1, n = b.g.length, w = (8 + n * 15) * bs, h = 22 * bs, x = a.x, y = a.y - 96 * (IDS[a.id].sc || 1) * L.cs - 4 * bs - (a.state === 'type' ? 0 : 0);
    c.globalAlpha = clamp(al, 0, 1); c.fillStyle = 'rgba(8,12,30,.9)'; c.strokeStyle = IDS[a.id].c; c.lineWidth = 1.8; c.beginPath(); rr(c, x - w / 2, y - h, w, h, 8 * bs); c.moveTo(x - 4 * bs, y); c.lineTo(x, y + 6 * bs); c.lineTo(x + 4 * bs, y); c.fill(); c.stroke();
    b.g.forEach((g, i) => glyph(c, g, x - w / 2 + (12 + i * 15) * bs, y - h / 2, .95 * bs, i ? '#dfe8ff' : IDS[a.id].c)); c.globalAlpha = 1; });
}
function drawIcon(cvn) {
  const k = cvn.dataset.k, c = cvn.getContext('2d'); if (!IDS[k]) return; c.clearRect(0, 0, 112, 112); const g = c.createRadialGradient(56, 62, 4, 56, 62, 54); g.addColorStop(0, rgba(IDS[k].c, .35)); g.addColorStop(1, rgba(IDS[k].c, 0)); c.fillStyle = g; c.fillRect(0, 0, 112, 112);
  c.save(); const keep = T; drawChibi(c, k, 56, 98, {face: 'd', scale: 1.38, ph: 0, blink: 0}); c.restore(); T = keep;
}
/* ============ boucle, mise en page, API ============ */
let fpsN = 0, fpsT = 0, slow = 0, lowQ = false;
function layoutF() {
  const w = room.clientWidth; if (!w) return; const mode = w < 640 ? 'T' : 'W', first = !L || L.mode !== mode;
  if (first) { L = makeLayout(mode); }
  S = w / L.W; dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 700 ? 1.6 : 2); room.style.setProperty('--ar', L.W + '/' + L.H);
  const cw = Math.round(w * dpr), ch = Math.round(w * L.H / L.W * dpr); if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  buildBg(); if (first) { reset(); } if (!running) drawFrame();
}
function loop(ts) {
  if (!running) return; raf = requestAnimationFrame(loop); const dt = Math.min(.1, (ts - last) / 1000); if (dt < .026) return; last = ts; stepWorld(dt); drawFrame();
  fpsN++; fpsT += dt; if (fpsT >= 2.5) { const f = fpsN / fpsT; fpsN = 0; fpsT = 0; if (T > 4 && f < 22) { if (++slow >= 2 && !lowQ) { lowQ = true; dpr = Math.max(1, dpr * .75); layoutF(); } } else slow = 0; }
}
function start() { if (RM || running || !visOn || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
function stop() { running = false; cancelAnimationFrame(raf); }
if ('IntersectionObserver' in window) new IntersectionObserver(es => { visOn = es[0].isIntersecting; visOn ? start() : stop(); }).observe(room);
document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
if ('ResizeObserver' in window) new ResizeObserver(() => layoutF()).observe(room); else addEventListener('resize', layoutF);
room.addEventListener('pointerdown', ev => {
  if (!L) return; const r = room.getBoundingClientRect(), x = (ev.clientX - r.left) / S, y = (ev.clientY - r.top) / S; let best = null, bd = 1e9;
  list.forEach(a => { if (!IDS[a.id].main) return; const d = Math.hypot(x - a.x, (y - (a.y - 32 * L.cs)) * .8); if (d < 38 * L.cs && d < bd) { bd = d; best = a.id; } }); if (best) info(best);
});
layoutF();
return {
  refresh(isNew) {
    buildSeries(); buildFigs(); const prev = D.lastTick; buildQueue();
    if (queue.length && (isNew || D.lastTick !== prev)) { tag = prev && D.lastTick !== prev ? 'nouveau cycle' : 'rejoue le dernier cycle'; nextEv = Math.min(nextEv, T + 1.2); }
    if (RM || !queue.length) { const q = queue[queue.length - 1]; if (q) tick(q.who, q.kind, q.ts); else $('tkTxt').textContent = 'en attente de données'; }
    document.querySelectorAll('canvas.ico').forEach(drawIcon); if (!running) drawFrame();
  },
  start, info, step: dt => { stepWorld(dt); drawFrame(); }, T: () => T, get actors() { return actors; }, get L() { return L; }, seats, list: () => list
};
};
})();
