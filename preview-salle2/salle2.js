/* ORION FLOOR v2 — salle 3/4 : 5 bureaux personnels, grand écran mural, petits blobs géométriques (aperçu).
   Canvas 2D, aucune dépendance, aucun trafic réseau propre : tout vient de neon-left.js (mêmes data/*.json que la page officielle
   + prix publics Bitvavo). Animation décorative : les « ± € » affichés sont uniquement des P&L réels (positions ouvertes / clôtures 24 h). */
(function () {
'use strict';
window.SalleFloor = function (E) {
const {$, D, LIVE, COL, ok, eur, fmtH, sym, hash, clamp, TAU, RM, lastEq, num, nf, ageStr, lastEv, latestWide, latestCycle, stats, latent} = E;
const room = $('room'), cv = $('fc'), ctx = cv.getContext('2d'), stage = $('stage');
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
const lerp = (a, b, k) => a + (b - a) * k, ease = k => k * k * (3 - 2 * k);
const GRN = '#3dff9a', RED = '#ff4d7a', INK = '#05060f';
const OUT = 'rgba(5,6,15,.92)';
const rgb = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const mix = (h, t, f) => { const a = rgb(h), b = t === 'w' ? [255, 255, 255] : t === 'k' ? [6, 8, 20] : rgb(t); return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',') + ')'; };
const rgba = (h, al) => 'rgba(' + rgb(h).join(',') + ',' + al + ')';
const rr = (p, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.arcTo(x + w, y, x + w, y + r, r); p.lineTo(x + w, y + h - r); p.arcTo(x + w, y + h, x + w - r, y + h, r); p.lineTo(x + r, y + h); p.arcTo(x, y + h, x, y + h - r, r); p.lineTo(x, y + r); p.arcTo(x, y, x + r, y, r); p.closePath(); };
const rrect = (c, x, y, w, h, r) => { c.beginPath(); rr(c, x, y, w, h, r); };
const FONT = (n, w = 600) => w + ' ' + n + 'px ui-sans-serif,system-ui,sans-serif';

/* ============ identités : 5 agents + 4 petits assistants (blobs plats, deux yeux) ============ */
const IDS = {
  scout: {c: COL.cy, shape: 'ghost', g: 0, main: 1, name: 'SCOUT'}, trader: {c: COL.mg, shape: 'tri', g: 3, main: 1, name: 'TRADER'},
  sentinel: {c: COL.li, shape: 'pill', g: 1, main: 1, name: 'SENTINEL'}, research: {c: COL.vi, shape: 'round', g: 8, main: 1, name: 'RESEARCH'},
  arbitre: {c: COL.go, shape: 'oct', g: 11, main: 1, name: 'ARBITRE'},
  b1: {c: '#ff8a3a', shape: 'sq', g: 6, sc: .7}, b2: {c: '#eef3ff', shape: 'ghost', g: 9, sc: .7}, b3: {c: '#2dffc6', shape: 'drop', g: 5, sc: .7}, b4: {c: '#4d7bff', shape: 'round', g: 10, sc: .7}};
const ORDER = ['scout', 'trader', 'sentinel', 'research', 'arbitre', 'b1', 'b2', 'b3', 'b4'], AGENTS = ORDER.slice(0, 5);
const NAMES = {}; AGENTS.forEach(k => NAMES[k] = IDS[k].name);
for (const k in IDS) { const d = IDS[k]; d.lt = mix(d.c, 'w', .4); d.dk = mix(d.c, 'k', .55); }

/* ============ géométrie de la salle ============ */
let L = null, S = 1, dpr = 1, kpx = 1, bg = null, T = 0, running = false, raf = 0, last = 0, visOn = true;
const CS = 16;
function makeLayout(mode) {
  const w = mode === 'W';
  const l = w ? {W: 960, H: 700, ft: 215, cs: 1.1} : {W: 640, H: 1010, ft: 262, cs: 1.22};
  l.mode = mode;
  const A = w ? {scout: [170, 345], trader: [480, 345], sentinel: [790, 345], research: [325, 525], arbitre: [635, 525]} : {scout: [160, 410], trader: [480, 410], sentinel: [160, 600], research: [480, 600], arbitre: [320, 790]};
  l.pods = AGENTS.map((id, i) => { const [cx, fy] = A[id]; const p = {i, id, cx, fy, col: IDS[id].c}; p.seat = {pod: i, id, x: cx, y: fy + 40, st: {x: cx, y: fy + 84}, occ: null, res: null, pull: 8}; return p; });
  l.wall = w ? {x: 150, y: 22, w: 660, h: 154} : {x: 20, y: 16, w: 600, h: 232};
  l.panel = w ? {x: 24, y: 44, w: 80, h: 112} : null; l.clock = w ? {x: 866, y: 44, w: 74, h: 74} : null; l.banners = w ? [126, 834] : [];
  l.plants = w ? [[58, l.ft + 30], [902, l.ft + 30], [915, 440], [925, 675]] : [[30, l.ft + 34], [610, l.ft + 34], [36, 850], [604, 985]];
  l.cooler = w ? {x: 50, y: 470} : {x: 612, y: 505};
  l.couch = w ? {x: 100, y: 620} : {x: 100, y: 930};
  l.rocket = w ? {x: 895, y: 590} : {x: 556, y: 905}; l.trophy = w ? {x: 895, y: 505} : null;
  l.logo = w ? {x: 480, y: 678, s: .8} : {x: 330, y: 988, s: .5};
  const cu = l.couch; l.couchSeats = [-30, 30].map((dx, j) => ({couch: 1, j, x: cu.x + dx, y: cu.y + 3, st: {x: cu.x + dx, y: cu.y + 40}, occ: null, res: null, pull: 0}));
  const ob = [];
  l.pods.forEach(p => { ob.push([p.cx - 128, p.fy - 52, p.cx + 128, p.fy + 22]); ob.push([p.cx - 20, p.fy + 20, p.cx + 20, p.fy + 60]); });
  l.plants.forEach(([x, y]) => ob.push([x - 17, y - 12, x + 17, y + 8]));
  ob.push([l.cooler.x - 22, l.cooler.y - 16, l.cooler.x + 22, l.cooler.y + 8]);
  ob.push([cu.x - 72, cu.y - 26, cu.x + 72, cu.y + 16]);
  ob.push([l.rocket.x - 20, l.rocket.y - 14, l.rocket.x + 20, l.rocket.y + 8]); if (l.trophy) ob.push([l.trophy.x - 20, l.trophy.y - 14, l.trophy.x + 20, l.trophy.y + 8]);
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
let SER = [], pool = [], cyc = null;
const KC = {keep: COL.li, watch: COL.go, drop: COL.mg, sig: COL.cy};
const risk = () => { const e = lastEv('SENTINEL', 'risque_agrege'); return e ? e.payload : null; };
function buildSeries() {
  SER = [];
  (D.pos || []).forEach(p => { const c = D.candles[p.m]; if (c && c.length >= 10) SER.push({c, m: p.m}); });
  if (D.btcC && D.btcC.length >= 10) SER.push({c: D.btcC, m: 'BTC-EUR'});
  if (D.ethC && D.ethC.length >= 10) SER.push({c: D.ethC, m: 'ETH-EUR'});
}
function buildPool() {
  cyc = latestCycle(); const m = new Map(), put = (s, o) => { if (s && !m.has(s)) m.set(s, o); };
  if (cyc && cyc.verdicts_F) for (const [mk, v] of Object.entries(cyc.verdicts_F)) put(sym(mk), {kind: v === 'selectionner' ? 'keep' : v === 'rejeter' ? 'drop' : 'watch'});
  const th = D.wide && Array.isArray(D.wide.top_hausse_24h) ? D.wide.top_hausse_24h : [];
  th.slice(0, 14).forEach(x => put(sym(x.market), {kind: 'sig', chg: null}));
  pool = [...m].map(([s, o]) => Object.assign({s}, o));
}
function decorCandle(seed, n) {
  const v = k => .5 + .26 * Math.sin(k * .55 + seed * 3.1) + .17 * Math.sin(k * 1.37 + seed * 7.3) + .07 * Math.sin(k * 3.3 + seed);
  const o = v(n), c = v(n + 1), e = .05 * Math.abs(Math.sin(n * 2.7 + seed)); return [0, o, Math.max(o, c) + e, Math.min(o, c) - e, c];
}
function dCandles(c, w, h, t, ser, seed) {
  const N = 18, bw = (w - 8) / N; let cs = [], off = 0;
  if (ser) { cs = ser.c.slice(-N); const m = ser.m; if (ok(LIVE.price[m]) && cs.length) { const q = cs[cs.length - 1].slice(); q[4] = LIVE.price[m]; q[2] = Math.max(q[2], q[4]); q[3] = Math.min(q[3], q[4]); cs[cs.length - 1] = q; } }
  else { const k = t * .8 + seed * 11, n0 = Math.floor(k); off = (k - n0) * bw; for (let i = 0; i <= N; i++) cs.push(decorCandle(seed, n0 + i)); }
  let lo = 1e9, hi = -1e9; cs.forEach(q => { lo = Math.min(lo, q[3]); hi = Math.max(hi, q[2]); }); const sp = (hi - lo) || 1, py = v => 14 + (h - 20) - (v - lo) / sp * (h - 28);
  if (ser) lbl(c, sym(ser.m), 5, 2, '#c7d4f5', 9);
  c.save(); c.beginPath(); c.rect(4, 12, w - 8, h - 14); c.clip();
  cs.forEach((q, i) => { const bx = 4 + i * bw - off + bw * .15, col = q[4] >= q[1] ? GRN : RED, y1 = py(q[1]), y2 = py(q[4]); c.fillStyle = col; c.fillRect(bx + bw * .32, py(q[2]), Math.max(.8, bw * .1), Math.max(1, py(q[3]) - py(q[2]))); c.fillRect(bx, Math.min(y1, y2), bw * .7, Math.max(1.4, Math.abs(y2 - y1))); });
  if (ser && cs.length) { const ly = py(cs[cs.length - 1][4]); c.globalAlpha = .45 + .25 * Math.sin(t * 4); c.fillStyle = '#fff'; c.fillRect(4, ly, w - 8, .8); }
  c.restore();
}
  const lbl = (c, t, x, y, col, n = 8, al = 'left') => { c.font = FONT(n); c.textAlign = al; c.textBaseline = 'top'; c.fillStyle = col; c.fillText(t, x, y); };

  /* Scout : radar des candidats courants */
  function dRadar(c, w, h, t) {
    const cx = w / 2, cy = h / 2 + 3, R = Math.min(w, h) / 2 - 5;
    c.strokeStyle = 'rgba(39,230,255,.22)'; c.lineWidth = .8; for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(cx, cy, R * i / 3, 0, TAU); c.stroke(); } c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.stroke();
    const sw = (t * 1.25) % TAU;
    for (let k = 0; k < 16; k++) { c.fillStyle = 'rgba(39,230,255,' + (.28 - k * .017) + ')'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, sw - (k + 1) * .07, sw - k * .07); c.closePath(); c.fill(); }
    c.strokeStyle = 'rgba(160,250,255,.9)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(sw) * R, cy + Math.sin(sw) * R); c.stroke();
    for (const b of pool) { const a = hash(b.s) * TAU, r = (.25 + .7 * hash(b.s + 'r')) * R, since = ((sw - a) % TAU + TAU) % TAU, al = .28 + .72 * Math.max(0, 1 - since / 2.6), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      c.globalAlpha = al; c.fillStyle = KC[b.kind]; c.shadowColor = KC[b.kind]; c.shadowBlur = 6; c.beginPath(); c.arc(x, y, b.kind === 'keep' ? 3.2 : 2, 0, TAU); c.fill(); c.shadowBlur = 0;
      if (b.kind === 'keep') { c.strokeStyle = KC.keep; c.lineWidth = .8; c.beginPath(); c.arc(x, y, 4 + (t * 6 % 7), 0, TAU); c.globalAlpha = al * (1 - (t * 6 % 7) / 7); c.stroke(); lbl(c, b.s, x + 5, y - 4, '#fff', 8); } }
    c.globalAlpha = 1;
  }
  function dFunnel(c, w, h, t) {
    const inst = latestWide(), ex = D.wide && D.wide.exclusions || [], kept = (ex.find(e => e.k === 'retenu') || {}).n, v = [inst && inst.n_eur, kept, cyc && cyc.n_anomalies, cyc && cyc.n_deep, cyc && Array.isArray(cyc.selected) ? cyc.selected.length : null];
    const mx = Math.max(...v.filter(ok), 1), rows = 5, rh = (h - 10) / rows;
    v.forEach((n, i) => { const y = 5 + i * rh, ww = ok(n) ? Math.max(3, Math.sqrt(n / mx) * (w - 12)) : 0; c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(6, y + 2, w - 12, rh - 5); const g = c.createLinearGradient(6, 0, 6 + ww, 0); g.addColorStop(0, i === 4 ? COL.li : COL.cy); g.addColorStop(1, i === 4 ? '#c8ff7a' : '#7aa2ff'); c.fillStyle = g; c.fillRect(6, y + 2, ww, rh - 5); const sh = ((t * 40 + i * 22) % (w + 30)) - 15; c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(Math.min(sh, 6 + ww - 3), y + 2, 3, rh - 5); });
  }
  function dTop(c, w, h, t) {
    const th = (D.wide && Array.isArray(D.wide.top_hausse_24h) ? D.wide.top_hausse_24h : []).slice(0, 8).map(x => ({s: sym(x.market), v: ok(x.last) && ok(x.open) && x.open > 0 ? (x.last - x.open) / x.open : 0})), mx = Math.max(...th.map(x => x.v), .01), bw = (w - 10) / Math.max(1, th.length);
    th.forEach((x, i) => { const hh = Math.max(2, x.v / mx * (h - 16)) * (.92 + .08 * Math.sin(t * 2 + i)), g = c.createLinearGradient(0, h - 4 - hh, 0, h - 4); g.addColorStop(0, COL.cy); g.addColorStop(1, 'rgba(168,107,255,.5)'); c.fillStyle = g; c.fillRect(5 + i * bw + 1, h - 4 - hh, bw - 3, hh); });
  }
  /* Sentinel : jauge de risque, distance aux stops, capacité */
  function dGauge(c, w, h, t) {
    const r = risk(), cx = w / 2, cy = h * .8, R = Math.min(w * .4, h * .66), ratio = r && ok(r.pct_equite) && ok(r.plafond_observation_pct) && r.plafond_observation_pct > 0 ? clamp(r.pct_equite / r.plafond_observation_pct, 0, 1) : 0;
    c.lineCap = 'round'; c.lineWidth = 9; c.strokeStyle = 'rgba(255,255,255,.08)'; c.beginPath(); c.arc(cx, cy, R, Math.PI, TAU); c.stroke();
    const col = ratio < .6 ? COL.li : ratio < .9 ? COL.go : COL.mg, a1 = Math.PI + Math.PI * ratio * (RM ? 1 : (.96 + .04 * Math.sin(t * 2))); c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 8; c.beginPath(); c.arc(cx, cy, R, Math.PI, a1); c.stroke(); c.shadowBlur = 0;
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a1) * (R - 12), cy + Math.sin(a1) * (R - 12)); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, 3, 0, TAU); c.fill();
    lbl(c, r && ok(r.pct_equite) ? num(r.pct_equite) + ' %' : '—', cx, cy - R * .55 - 10, '#fff', 19, 'center'); lbl(c, 'plafond ' + (r && ok(r.plafond_observation_pct) ? num(r.plafond_observation_pct, 0) + ' %' : '—'), cx, cy + 5, COL.mut, 8, 'center');
  }
  function dStops(c, w, h, t) {
    const P = D.pos || [], rh = (h - 8) / Math.max(5, P.length);
    P.forEach((p, i) => { const y = 5 + i * rh, d = p.mark && p.sl ? (p.mark - p.sl) / p.mark : null, lock = p.sl && p.entry && p.sl > p.entry, col = d === null ? COL.mut : lock ? COL.cy : d < .04 ? COL.mg : d < .09 ? COL.go : COL.li;
      c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(30, y + 1, w - 36, rh - 4); c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 5; c.fillRect(30, y + 1, d === null ? 0 : clamp(d / .25, .04, 1) * (w - 36), rh - 4); c.shadowBlur = 0; lbl(c, p.s.slice(0, 5), 3, y + 1, '#c7d4f5', 8); });
  }
  function dSlots(c, w, h, t) {
    const n = D.pos ? D.pos.length : 0, r = Math.min(10, (w - 14) / 5 / 2 - 1), y = h * .36; for (let i = 0; i < 5; i++) { const x = 7 + r + i * (2 * r + 2); c.beginPath(); c.arc(x, y, r, 0, TAU); if (i < n) { c.fillStyle = COL.li; c.shadowColor = COL.li; c.shadowBlur = 8; c.fill(); c.shadowBlur = 0; } else { c.strokeStyle = 'rgba(141,255,58,.35)'; c.lineWidth = 1; c.stroke(); } }
    lbl(c, n + '/5 positions', w / 2, h * .62, '#dfffc9', 9, 'center'); c.strokeStyle = 'rgba(141,255,58,' + (.35 + .25 * Math.sin(t * 2.2)) + ')'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(w / 2, h * .78); c.lineTo(w / 2 + 9, h * .84); c.lineTo(w / 2 + 6, h * .97); c.lineTo(w / 2, h); c.lineTo(w / 2 - 6, h * .97); c.lineTo(w / 2 - 9, h * .84); c.closePath(); c.stroke();
  }
  /* Arbitre : courbe d'équité, bilan, trades clos */
  function eqLine(c, x0, y0, w, h, t, glow = true) {
    const cu = D.curve; if (cu.length < 2) return; const vs = cu.map(q => q.equity), base = D.base ?? vs[0], lo = Math.min(...vs, base), hi = Math.max(...vs, base), sp = (hi - lo) || 1, t0 = cu[0].ts, t1 = cu[cu.length - 1].ts, up = vs[vs.length - 1] >= base, col = up ? COL.g : COL.r;
    const X = q => x0 + (q.ts - t0) / (t1 - t0) * w, Y = v => y0 + h - 2 - (v - lo) / sp * (h - 4);
    c.beginPath(); cu.forEach((q, i) => i ? c.lineTo(X(q), Y(q.equity)) : c.moveTo(X(q), Y(q.equity))); const ln = new Path2D(); c.lineTo(x0 + w, y0 + h); c.lineTo(x0, y0 + h); c.closePath(); const g = c.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, up ? 'rgba(61,255,154,.35)' : 'rgba(255,77,122,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(200,215,255,.3)'; c.setLineDash([2, 3]); c.lineWidth = .8; c.beginPath(); c.moveTo(x0, Y(base)); c.lineTo(x0 + w, Y(base)); c.stroke(); c.setLineDash([]);
    c.strokeStyle = col; c.lineWidth = 1.6; if (glow) { c.shadowColor = col; c.shadowBlur = 6; } c.beginPath(); cu.forEach((q, i) => i ? c.lineTo(X(q), Y(q.equity)) : c.moveTo(X(q), Y(q.equity))); c.stroke(); c.shadowBlur = 0;
    const lx = X(cu[cu.length - 1]), ly = Y(vs[vs.length - 1]); c.fillStyle = '#fff'; c.beginPath(); c.arc(lx, ly, 2, 0, TAU); c.fill(); const k = (t * .8) % 1; c.strokeStyle = col; c.globalAlpha = 1 - k; c.beginPath(); c.arc(lx, ly, 2 + k * 7, 0, TAU); c.stroke(); c.globalAlpha = 1;
  }
  function dEqui(c, w, h, t) { eqLine(c, 6, 6, w - 12, h - 18, t); lbl(c, num(lastEq(), 2) + ' €', w - 6, h - 11, '#fff', 8, 'right'); }
  function dBilan(c, w, h, t) {
    const pf = D.team && D.team.resume && D.team.resume.performance, st = stats(), v = [pf && pf.variation_24h_eur, st && st.pnl_realise, latent()], names = ['24H', 'RÉAL.', 'LAT.'], mx = Math.max(...v.filter(ok).map(Math.abs), .5), cx = w / 2, rh = (h - 10) / 3;
    c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(cx, 4, 1, h - 8);
    v.forEach((x, i) => { const y = 6 + i * rh, ww = ok(x) ? Math.abs(x) / mx * (w / 2 - 16) : 0, col = !ok(x) ? COL.mut : x >= 0 ? COL.g : COL.r; c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 6; c.fillRect(x >= 0 ? cx + 1 : cx - ww, y + 2, ww, rh - 7); c.shadowBlur = 0; lbl(c, names[i], x >= 0 ? 5 : w - 5, y + 2, COL.mut, 7, x >= 0 ? 'left' : 'right'); });
  }
  function dClos(c, w, h, t) {
    const cl = D.closed.slice().sort((a, z) => a.exit_ts - z.exit_ts), n = D.nClos ?? cl.length;
    cl.slice(-8).forEach((x, i) => { const r = clamp(Math.abs(x.pnl) / 10 * 8 + 3, 3, 11), px_ = 12 + i * 20, col = x.pnl >= 0 ? COL.g : COL.r; c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 8; c.beginPath(); c.arc(px_, h * .34, r, 0, TAU); c.fill(); c.shadowBlur = 0; });
    const f = clamp(n / 30, 0, 1); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(8, h * .72, w - 16, 6); c.fillStyle = COL.go; c.fillRect(8, h * .72, Math.max(2, f * (w - 16)), 6); lbl(c, n + '/30 clos', w / 2, h * .84, '#ffe9a6', 8, 'center');
  }
  /* Research : avancement des carnets fantômes */
  function dGhostBars(c, w, h, t) {
    const G = D.ghosts && D.ghosts.carnets || [], n = D.ghosts && ok(D.ghosts.seuil_lecture) ? D.ghosts.seuil_lecture : 30, rh = (h - 8) / Math.max(G.length, 1);
    G.forEach((g, i) => { const y = 4 + i * rh; lbl(c, g.id, 4, y, COL.vi, 7); c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(24, y + 1, w - 30, rh - 3); c.fillStyle = 'rgba(168,107,255,.38)'; c.fillRect(24, y + 1, clamp((g.pris || 0) / n, 0, 1) * (w - 30), rh - 3); c.fillStyle = COL.mg; c.fillRect(24, y + 1, clamp((g.clos || 0) / n, 0, 1) * (w - 30), rh - 3); });
    const sh = (t * 30) % (w + 20); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(sh - 10, 0, 6, h);
  }
  function dDonut(c, w, h, t) {
    const G = D.ghosts && D.ghosts.carnets || [], tot = G.reduce((a, g) => a + (g.pris || 0), 0), cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 8; let a = -Math.PI / 2 + (RM ? 0 : t * .25);
    G.forEach((g, i) => { if (!g.pris) return; const da = g.pris / tot * TAU; c.strokeStyle = 'hsl(' + (265 + i * 22) + ',85%,64%)'; c.lineWidth = 9; c.beginPath(); c.arc(cx, cy, R - 5, a + .03, a + da - .03); c.stroke(); a += da; });
    lbl(c, String(tot), cx, cy - 8, '#fff', 15, 'center'); lbl(c, 'trades pris', cx, cy + 8, COL.mut, 7, 'center');
  }
  function dGhostPnl(c, w, h, t) {
    const G = D.ghosts && D.ghosts.carnets || [], v = G.map(g => g.pnl_latent_eur || 0), mx = Math.max(...v.map(Math.abs), .1), bw = (w - 8) / Math.max(G.length, 1), cy = h / 2;
    c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(2, cy, w - 4, 1);
    v.forEach((x, i) => { const hh = Math.abs(x) / mx * (h / 2 - 6); c.fillStyle = x >= 0 ? COL.g : COL.r; c.fillRect(4 + i * bw + 1, x >= 0 ? cy - hh : cy, bw - 2, Math.max(hh, 1)); });
  }
  /* Trader : bougies 1 h de la position suivie (entrée + stop) et P&L des positions */
  function dPosChart(c, w, h, t) {
    const P = D.pos || []; if (!P.length) { lbl(c, '—', w / 2, h / 2 - 5, COL.mut, 12, 'center'); return; }
    const p = P[Math.floor(t / 9) % P.length], cd = D.candles[p.m], fade = Math.min(1, ((t % 9)) * 2.5), lv = LIVE.price[p.m]; c.globalAlpha = fade;
    const col = p.pnl === null ? COL.mut : p.pnl >= 0 ? COL.g : COL.r;
    lbl(c, p.s, 5, 2, '#fff', 14); lbl(c, p.pnl === null ? '—' : (p.pnl > 0 ? '+' : '−') + Math.abs(p.pnl).toFixed(1).replace('.', ',') + ' €', w - 5, 3, col, 13, 'right');
    const x0 = 4, y0 = 22, ww = w - 8, hh = h - 27;
    let cs = cd && cd.length ? cd.filter(k => k[0] >= p.entry_ts - 6 * 3600e3) : null; if (cs && cs.length < 2) cs = cd.slice(-12);
    if (cs && cs.length && ok(lv)) { cs = cs.slice(); const l = cs[cs.length - 1].slice(); l[4] = lv; l[2] = Math.max(l[2], lv); l[3] = Math.min(l[3], lv); cs[cs.length - 1] = l; }
    const ys = [p.entry].concat(p.sl ? [p.sl] : [], cs ? cs.map(k => [k[2], k[3]]).flat() : [], p.mark ? [p.mark] : []).filter(ok); let lo = Math.min(...ys), hi = Math.max(...ys); const pd = (hi - lo) * .1 || hi * .01; lo -= pd; hi += pd;
    const Y = v => y0 + (1 - (v - lo) / (hi - lo)) * hh;
    if (cs && cs.length > 1) {
      const t0 = cs[0][0], t1 = cs[cs.length - 1][0], X = ts => x0 + (ts - t0) / ((t1 - t0) || 1) * ww, bw = Math.max(1, ww / cs.length * .6);
      cs.forEach(k => { const up = k[4] >= k[1], cc = up ? COL.g : COL.r, x = X(k[0]); c.strokeStyle = cc; c.fillStyle = cc; c.lineWidth = .8; c.beginPath(); c.moveTo(x, Y(k[2])); c.lineTo(x, Y(k[3])); c.stroke(); c.fillRect(x - bw / 2, Math.min(Y(k[1]), Y(k[4])), bw, Math.max(1, Math.abs(Y(k[1]) - Y(k[4])))); });
      if (p.entry_ts >= t0) { c.strokeStyle = 'rgba(255,255,255,.4)'; c.setLineDash([2, 2]); c.beginPath(); c.moveTo(X(p.entry_ts), y0); c.lineTo(X(p.entry_ts), y0 + hh); c.stroke(); c.setLineDash([]); }
    } else lbl(c, 'bougies indisponibles', w / 2, h / 2, COL.mut, 8, 'center');
    const hl = (v, cc, tx) => { if (!ok(v) || v < lo || v > hi) return; c.strokeStyle = cc; c.lineWidth = 1; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(x0, Y(v)); c.lineTo(x0 + ww, Y(v)); c.stroke(); c.setLineDash([]); lbl(c, tx, x0 + ww, Y(v) - 10, cc, 9, 'right'); };
    hl(p.entry, '#e8f0ff', 'entrée'); hl(p.sl, COL.r, 'stop'); const mk = ok(lv) ? lv : p.mark; if (mk) hl(mk, COL.cy, '');
    if (cs && cs.length > 1) { const sx = x0 + ((t * .22) % 1) * ww; c.fillStyle = 'rgba(39,230,255,.10)'; c.fillRect(sx - 6, y0, 12, hh); c.fillStyle = 'rgba(255,255,255,' + (.25 + .25 * Math.sin(t * 5)) + ')'; c.fillRect(x0 + ww - 3, y0, 3, hh); }
    c.globalAlpha = 1;
  }
  function dPosPnl(c, w, h, t) {
    const P = D.pos || [], mx = Math.max(...P.map(p => Math.abs(p.pnl || 0)), .5), rh = (h - 8) / Math.max(5, P.length), cx = w * .5;
    c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(cx, 3, 1, h - 6);
    P.forEach((p, i) => { const y = 5 + i * rh, v = p.pnl ?? 0, ww = Math.abs(v) / mx * (w / 2 - 22), col = p.pnl === null ? COL.mut : v >= 0 ? COL.g : COL.r; c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 6; c.fillRect(v >= 0 ? cx + 1 : cx - ww, y + 1, Math.max(ww, 1.5), rh - 4); c.shadowBlur = 0; lbl(c, p.s.slice(0, 4), v >= 0 ? 3 : w - 3, y + 1, '#c7d4f5', 7, v >= 0 ? 'left' : 'right'); });
  }

/* ============ rendu des blobs : formes plates, deux yeux, ni jambes ni bras ============ */
const BP = {}, EYE = {ghost: [-27, 15], tri: [-20, 12], pill: [-20, 18], round: [-27, 15], oct: [-27, 15], sq: [-27, 15], drop: [-31, 11]};
function blobPath(shape) {
  if (BP[shape]) return BP[shape]; const p = new Path2D();
  if (shape === 'ghost') { p.moveTo(-22, -3); p.lineTo(-22, -29); p.arc(0, -29, 22, Math.PI, 0); p.lineTo(22, -3); p.quadraticCurveTo(15, -11, 7.3, -3); p.quadraticCurveTo(0, -11, -7.3, -3); p.quadraticCurveTo(-15, -11, -22, -3); p.closePath(); }
  else if (shape === 'tri') { p.moveTo(0, -46); p.lineTo(21, -9); p.lineTo(-21, -9); p.closePath(); }
  else if (shape === 'pill') rr(p, -30, -37, 60, 34, 17);
  else if (shape === 'round') p.ellipse(0, -26, 25, 23, 0, 0, TAU);
  else if (shape === 'oct') { for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; p[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 25, -27 + Math.sin(a) * 25); } p.closePath(); }
  else if (shape === 'sq') rr(p, -21, -44, 42, 41, 13);
  else rr(p, -15, -50, 30, 47, 15);
  return (BP[shape] = p);
}
const GL = {};
function glowG(d) { if (!GL[d.c]) { const g = ctx.createRadialGradient(0, -26, 4, 0, -26, 46); g.addColorStop(0, rgba(d.c, .3)); g.addColorStop(1, rgba(d.c, 0)); GL[d.c] = g; } return GL[d.c]; }
function eyeB(c, x, y, bl, px, py) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y, 4.3, Math.max(.9, 4.6 * (1 - bl * .85)), 0, 0, TAU); c.fill(); if (bl < .5) { c.fillStyle = '#0a0f22'; c.beginPath(); c.arc(x + px, y + py, 2.2, 0, TAU); c.fill(); } }
function drawBlob(c, id, x, y, o) {
  const d = IDS[id], sc = (d.sc || 1) * (o.scale || 1), face = o.face, mv = o.moving ? 1 : 0, sit = o.sit || 0, u = o.walk || 0;
  const hopK = mv ? Math.abs(Math.sin(Math.PI * u)) : 0, hop = hopK * 8, tilt = mv ? Math.sin(Math.PI * u) * .13 : 0;
  let sy = mv ? .88 + .24 * Math.pow(hopK, .7) : 1 + .03 * Math.sin(T * 2.2 + (o.ph || 0)), sx = mv ? 1.12 - .2 * hopK : 1 / Math.sqrt(sy);
  const typ = o.type | 0; if (typ) { sy *= typ === 1 ? 1.03 : .985; }
  if (o.talk) sy *= 1 + .04 * Math.sin(T * 18);
  sy *= 1 - .07 * sit; sx *= 1 + .04 * sit;
  c.save(); c.translate(x, y);
  if (o.sel) { c.strokeStyle = rgba(d.c, .9); c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, 1, 26 * sc, 8 * sc, 0, 0, TAU); c.stroke(); }
  c.fillStyle = 'rgba(0,0,0,' + (.42 - hopK * .18) + ')'; c.beginPath(); c.ellipse(0, 1, (20 - hopK * 5) * sc, (6 - hopK * 1.4) * sc, 0, 0, TAU); c.fill();
  c.translate(0, -hop * sc + sit * 3 * sc - (typ === 1 ? 1.2 : 0)); c.rotate(tilt); c.scale(sc * sx, sc * sy);
  c.fillStyle = glowG(d); c.fillRect(-48, -76, 96, 96);
  const bp = blobPath(d.shape);
  if (d.shape === 'tri') { c.lineJoin = 'round'; c.strokeStyle = d.dk; c.lineWidth = 17; c.stroke(bp); c.strokeStyle = d.c; c.fillStyle = d.c; c.lineWidth = 12; c.stroke(bp); c.fill(bp); }
  else { c.fillStyle = d.c; c.fill(bp); c.lineJoin = 'round'; c.strokeStyle = d.dk; c.lineWidth = 3; c.stroke(bp); }
  c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.ellipse(-8, d.shape === 'tri' ? -26 : -39, 6.5, 3, -.5, 0, TAU); c.fill();
  const [ey, sp] = EYE[d.shape], bl = o.blink || 0, lk = o.look || 0;
  if (face === 'l' || face === 'r') { const dx = face === 'r' ? 1 : -1, cx = dx * 8; eyeB(c, cx - 3.6, ey, bl, dx * 1.5, 0); eyeB(c, cx + 3.6, ey, bl, dx * 1.5, 0); }
  else if (face === 'u') { eyeB(c, -sp / 2, ey - 5, bl, 0, -1.5); eyeB(c, sp / 2, ey - 5, bl, 0, -1.5); }
  else { eyeB(c, -sp / 2, ey, bl, lk * 1.4, .4); eyeB(c, sp / 2, ey, bl, lk * 1.4, .4); }
  c.restore();
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


/* ============ moniteurs : contenu mis en cache (≈ 11 images/s) puis recopié ============ */
let MONS = [], WALLC = null;
function mkCache(iw, ih, nw, nh, fn) { const cc = document.createElement('canvas'); cc.width = Math.max(8, Math.round(iw * kpx)); cc.height = Math.max(8, Math.round(ih * kpx)); return {cv: cc, c: cc.getContext('2d'), nw, nh, fn, next: 0, k: cc.width / nw}; }
function refreshCache(m) {
  if (T < m.next) return; m.next = T + .085 + Math.random() * .03; const c = m.c; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, m.cv.width, m.cv.height); c.setTransform(m.k, 0, 0, m.k, 0, 0);
  const g = c.createLinearGradient(0, 0, 0, m.nh); g.addColorStop(0, '#0b1a30'); g.addColorStop(1, '#050a18'); c.fillStyle = g; c.fillRect(0, 0, m.nw, m.nh); c.save(); c.beginPath(); c.rect(0, 0, m.nw, m.nh); c.clip(); m.fn(c, m.nw, m.nh, T); c.restore();
}
const MSZ = [[56, 36, 96, 62], [86, 52, 132, 80], [56, 36, 96, 62]];
function buildMons() {
  MONS = []; WALLC = null; const w = L.wall;
  WALLC = mkCache(w.w, w.h, w.w, w.h, drawWallScreen);
  const WID = {scout: [dTop, dRadar, dFunnel], trader: [dPosPnl, dPosChart, null], sentinel: [dStops, dGauge, dSlots], research: [dDonut, dGhostBars, dGhostPnl], arbitre: [dBilan, dEqui, dClos]};
  L.pods.forEach(p => { p.mons = [0, 1, 2].map(j => { const z = MSZ[j]; let fn = WID[p.id][j]; if (!fn) fn = (c, ww, hh, t) => dCandles(c, ww, hh, t, serFor(p.i, j), p.i * 3 + j + .7); return mkCache(z[0], z[1], z[2], z[3], fn); }); });
}
const serFor = (a, b) => SER.length ? SER[(a * 2 + b) % SER.length] : null;
function monitor(cx, base, w, h, m, col, lit, boost) {
  const c = ctx, x = cx - w / 2, y = base - 6 - h; refreshCache(m);
  c.fillStyle = '#0c1226'; c.fillRect(cx - 3.5, base - 7, 7, 7); c.fillStyle = '#121a36'; c.beginPath(); c.ellipse(cx, base, 14, 3, 0, 0, TAU); c.fill();
  c.globalAlpha = (lit ? .24 : .08) + boost * .3; c.fillStyle = col; rrect(c, x - 4, y - 4, w + 8, h + 8, 8); c.fill(); c.globalAlpha = 1;
  c.fillStyle = '#080d1e'; rrect(c, x, y, w, h, 4); c.fill(); c.strokeStyle = rgba(col, lit ? .95 : .5); c.lineWidth = 1.5; c.stroke();
  c.globalAlpha = lit ? 1 : .55; c.drawImage(m.cv, x + 3, y + 3, w - 6, h - 6); c.globalAlpha = 1;
  c.fillStyle = 'rgba(255,255,255,.06)'; c.beginPath(); c.moveTo(x + 3, y + 3); c.lineTo(x + w * .5, y + 3); c.lineTo(x + w * .28, y + h - 3); c.lineTo(x + 3, y + h - 3); c.fill();
}

/* ============ grand écran mural : courbe de capital réelle + chiffres clés ============ */
function drawWallScreen(c, nw, nh, t) {
  const tall = L.mode === 'T', cu = D.curve || [], perf = D.team && D.team.resume && D.team.resume.performance || {}, le = lastEq(), base = ok(D.base) ? D.base : (cu.length ? cu[0].equity : null);
  c.fillStyle = '#050a1a'; c.fillRect(0, 0, nw, nh);
  c.fillStyle = 'rgba(39,230,255,.05)'; for (let y = 0; y < nh; y += 4) c.fillRect(0, y, nw, 1);
  lbl(c, 'CAPITAL · CARNET ULTRA 1.2 · PAPER', 12, 8, '#9fb2e6', 11); const nowS = new Intl.DateTimeFormat('fr-FR', {timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(Date.now());
  lbl(c, 'PARIS ' + nowS, nw - 12, 8, COL.cy, 11, 'right');
  const cx0 = 12, cy0 = 28, cw = tall ? nw - 24 : Math.round(nw * .57), ch = tall ? 100 : nh - 38;
  c.strokeStyle = 'rgba(39,230,255,.13)'; c.lineWidth = 1; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(cx0, cy0 + i * ch / 4); c.lineTo(cx0 + cw, cy0 + i * ch / 4); c.stroke(); }
  if (cu.length > 2) {
    const n = Math.min(120, cu.length), pts = []; for (let i = 0; i < n; i++) pts.push(cu[Math.round(i * (cu.length - 1) / (n - 1))].equity);
    const lo = Math.min(...pts, base ?? 1e9), hi = Math.max(...pts, base ?? -1e9), sp = (hi - lo) || 1, up = pts[n - 1] >= (base ?? pts[0]), col = up ? GRN : RED, X = i => cx0 + i / (n - 1) * (cw - 34), Y = v => cy0 + ch - 4 - (v - lo) / sp * (ch - 10);
    c.beginPath(); pts.forEach((v, i) => c[i ? 'lineTo' : 'moveTo'](X(i), Y(v))); c.lineTo(X(n - 1), cy0 + ch); c.lineTo(X(0), cy0 + ch); c.closePath(); const fg = c.createLinearGradient(0, cy0, 0, cy0 + ch); fg.addColorStop(0, rgba(col, .32)); fg.addColorStop(1, rgba(col, 0)); c.fillStyle = fg; c.fill();
    if (ok(base)) { c.strokeStyle = 'rgba(200,215,255,.35)'; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(cx0, Y(base)); c.lineTo(cx0 + cw - 30, Y(base)); c.stroke(); c.setLineDash([]); lbl(c, 'départ', cx0 + cw - 4, Y(base) - 5, '#8fa0d6', 9, 'right'); }
    c.strokeStyle = col; c.lineWidth = 2.4; c.lineJoin = 'round'; c.beginPath(); pts.forEach((v, i) => c[i ? 'lineTo' : 'moveTo'](X(i), Y(v))); c.stroke();
    const lx = X(n - 1), ly = Y(pts[n - 1]), k = (t * .7) % 1; c.fillStyle = '#fff'; c.beginPath(); c.arc(lx, ly, 3.4, 0, TAU); c.fill(); c.strokeStyle = col; c.globalAlpha = 1 - k; c.beginPath(); c.arc(lx, ly, 3 + k * 9, 0, TAU); c.stroke(); c.globalAlpha = 1;
    lbl(c, nf({maximumFractionDigits: 0}).format(hi), cx0 + cw, cy0 - 2, '#6d7ba0', 9, 'right'); lbl(c, nf({maximumFractionDigits: 0}).format(lo), cx0 + cw, cy0 + ch - 11, '#6d7ba0', 9, 'right');
  } else lbl(c, 'en attente de données', cx0 + 10, cy0 + ch / 2, '#6d7ba0', 12);
  const pl = ok(le) && ok(base) ? le - base : null, cl = ok(D.nClos) ? D.nClos : perf.n_clos_total, tk = D.team && D.team.genere, h24 = perf.variation_24h_eur;
  const T6 = [['CAPITAL', eur(le), COL.cy, ok(base) ? 'départ ' + nf({maximumFractionDigits: 0}).format(base) : ''], ['P&L TOTAL', eur(pl, true), pl === null ? '#6d7ba0' : pl >= 0 ? GRN : RED, pl !== null && base ? (pl / base >= 0 ? '+' : '−') + Math.abs(pl / base * 100).toFixed(2).replace('.', ',') + ' %' : ''],
    ['24 H', eur(h24, true), !ok(h24) ? '#6d7ba0' : h24 >= 0 ? GRN : RED, ''], ['TRADES CLOS', ok(cl) ? cl + ' / 30' : '—', COL.go, 'n < 30'],
    ['OUVERTES', (D.pos ? D.pos.length : '—') + ' / 5', COL.li, ok(latent()) ? 'lat. ' + eur(latent(), true) : ''], ['CYCLE', ok(tk) ? fmtH(tk) : '—', COL.vi, ok(tk) ? 'il y a ' + ageStr(Date.now() - tk) : '']];
  const cols = tall ? 3 : 2, rows = tall ? 2 : 3, gx = tall ? 12 : cx0 + cw + 14, gy = tall ? cy0 + ch + 10 : 28, gw = nw - gx - 12, gh = nh - gy - 10, tw = (gw - (cols - 1) * 8) / cols, th = (gh - (rows - 1) * 6) / rows;
  T6.forEach((v, i) => { const x = gx + (i % cols) * (tw + 8), y = gy + Math.floor(i / cols) * (th + 6); c.fillStyle = 'rgba(255,255,255,.05)'; rrect(c, x, y, tw, th, 7); c.fill(); c.strokeStyle = rgba(v[2], .45); c.lineWidth = 1.2; c.stroke();
    lbl(c, v[0], x + 7, y + 4, '#8fa0d6', 8.5); lbl(c, v[3], x + tw - 6, y + 4, '#7d8bb5', 8, 'right'); lbl(c, v[1], x + 7, y + (tall ? 20 : 14), v[2], tall ? 21 : 16); });
}

/* ============ décor ============ */
function buildBg() {
  bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height; const c = bg.getContext('2d'), k = cv.width / L.W; c.setTransform(k, 0, 0, k, 0, 0);
  const W = L.W, H = L.H, ft = L.ft;
  let g = c.createLinearGradient(0, 0, 0, ft); g.addColorStop(0, '#0a0820'); g.addColorStop(1, '#14102f'); c.fillStyle = g; c.fillRect(0, 0, W, ft);
  c.strokeStyle = 'rgba(39,230,255,.07)'; c.lineWidth = 2; for (let x = 40; x < W; x += 80) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, ft); c.stroke(); }
  for (let i = 0; i < 5; i++) { const lx = W * (i + .5) / 5; const lg = c.createRadialGradient(lx, 0, 2, lx, 0, 150); lg.addColorStop(0, 'rgba(160,130,255,.2)'); lg.addColorStop(1, 'rgba(160,130,255,0)'); c.fillStyle = lg; c.fillRect(lx - 150, 0, 300, ft); }
  g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, COL.cy); g.addColorStop(.5, COL.mg); g.addColorStop(1, COL.vi); c.fillStyle = g; c.fillRect(0, ft - 9, W, 4); c.globalAlpha = .25; c.fillRect(0, ft - 14, W, 14); c.globalAlpha = 1;
  c.fillStyle = '#0a0c1c'; c.fillRect(0, ft - 5, W, 8);
  const w = L.wall; c.globalAlpha = .3; c.fillStyle = COL.cy; rrect(c, w.x - 9, w.y - 9, w.w + 18, w.h + 18, 12); c.fill(); c.globalAlpha = 1; c.fillStyle = '#02050f'; rrect(c, w.x - 3, w.y - 3, w.w + 6, w.h + 6, 8); c.fill(); c.strokeStyle = COL.cy; c.lineWidth = 2.6; c.stroke();
  L.banners.forEach(bx => { c.fillStyle = '#0d1230'; c.strokeStyle = COL.go; c.lineWidth = 2; c.beginPath(); c.moveTo(bx - 15, 0); c.lineTo(bx - 15, 128); c.lineTo(bx, 142); c.lineTo(bx + 15, 128); c.lineTo(bx + 15, 0); c.fill(); c.stroke();
    c.strokeStyle = COL.go; c.lineWidth = 2.4; c.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; c[i ? 'lineTo' : 'moveTo'](bx + Math.cos(a) * 9, 40 + Math.sin(a) * 9); } c.closePath(); c.stroke(); c.fillStyle = COL.go; c.fillRect(bx - 1.5, 36, 3, 8);
    c.fillStyle = COL.go; c.font = '800 9px ui-sans-serif,system-ui,sans-serif'; c.textAlign = 'center'; c.fillText('ORION', bx, 74); c.fillStyle = 'rgba(255,207,58,.5)'; c.fillRect(bx - 9, 82, 18, 2); c.fillRect(bx - 9, 88, 18, 2); });
  g = c.createLinearGradient(0, ft, 0, H); g.addColorStop(0, '#0d1030'); g.addColorStop(1, '#070918'); c.fillStyle = g; c.fillRect(0, ft + 3, W, H - ft);
  for (let r = 0, y = ft + 3; y < H; r++, y += 40) for (let x = (r % 2) * 40; x < W; x += 80) { c.fillStyle = 'rgba(120,140,255,.035)'; c.fillRect(x, y, 40, 40); }
  c.strokeStyle = 'rgba(120,150,255,.07)'; c.lineWidth = 1; for (let x = 0; x <= W; x += 80) { c.beginPath(); c.moveTo(x, ft + 3); c.lineTo(x, H); c.stroke(); } for (let y = ft + 43; y < H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  const rw = 292;
  L.pods.forEach(p => {
    const x0 = p.cx - rw / 2, y0 = p.fy - 62, h = 176; c.fillStyle = rgba(p.col, .07); rrect(c, x0, y0, rw, h, 22); c.fill(); c.strokeStyle = rgba(p.col, .5); c.lineWidth = 2; c.stroke();
    c.setLineDash([10, 8]); c.strokeStyle = rgba(p.col, .22); rrect(c, x0 + 9, y0 + 9, rw - 18, h - 18, 16); c.stroke(); c.setLineDash([]);
    const sg = c.createRadialGradient(p.cx, p.fy + 10, 10, p.cx, p.fy + 10, 190); sg.addColorStop(0, rgba(p.col, .15)); sg.addColorStop(1, rgba(p.col, 0)); c.fillStyle = sg; c.fillRect(x0 - 30, y0 - 30, rw + 60, h + 60);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(p.cx, p.fy + 22, 140, 11, 0, 0, TAU); c.fill();
  });
  const cu = L.couch; c.fillStyle = 'rgba(168,107,255,.08)'; rrect(c, cu.x - 86, cu.y - 40, 172, 112, 20); c.fill(); c.strokeStyle = 'rgba(168,107,255,.4)'; c.lineWidth = 2; c.stroke();
  const lg = L.logo; c.save(); c.translate(lg.x, lg.y); c.scale(lg.s, .42 * lg.s); c.font = '800 78px ui-sans-serif,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; if ('letterSpacing' in c) c.letterSpacing = '14px';
  c.lineJoin = 'round'; c.lineWidth = 10; c.strokeStyle = 'rgba(39,230,255,.22)'; c.strokeText('ORION FLOOR', 0, 0); c.lineWidth = 3; c.strokeStyle = 'rgba(39,230,255,.85)'; c.strokeText('ORION FLOOR', 0, 0); c.fillStyle = 'rgba(255,61,216,.22)'; c.fillText('ORION FLOOR', 0, 0); c.restore();
  const vg = c.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,8,.5)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
}
function wallDyn() {
  const c = ctx, w = L.wall; refreshCache(WALLC); c.drawImage(WALLC.cv, w.x, w.y, w.w, w.h);
  c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(w.x, w.y + ((T * 26) % w.h), w.w, 2);
  if (L.panel) { const p = L.panel, P = (D.pos || []).filter(q => ok(q.pnl)), mx = Math.max(.5, ...P.map(q => Math.abs(q.pnl)));
    c.globalAlpha = .22; c.fillStyle = COL.go; rrect(c, p.x - 5, p.y - 5, p.w + 10, p.h + 10, 9); c.fill(); c.globalAlpha = 1; c.fillStyle = '#060a1b'; rrect(c, p.x, p.y, p.w, p.h, 6); c.fill(); c.strokeStyle = COL.go; c.lineWidth = 2; c.stroke();
    c.font = FONT(8, 700); c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = '#c7d4f5'; c.fillText('P&L POSITIONS', p.x + p.w / 2, p.y + 5); const my = p.y + p.h / 2 + 6; c.strokeStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.moveTo(p.x + 6, my); c.lineTo(p.x + p.w - 6, my); c.stroke();
    P.slice(0, 5).forEach((q, i) => { const bw = (p.w - 16) / 5, h = Math.abs(q.pnl) / mx * (p.h / 2 - 20); c.fillStyle = q.pnl >= 0 ? GRN : RED; c.fillRect(p.x + 8 + i * bw, q.pnl >= 0 ? my - h : my, bw * .7, Math.max(1.5, h)); }); }
  if (L.clock) { const k = L.clock, s = new Intl.DateTimeFormat('fr-FR', {timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'}).format(Date.now());
    c.globalAlpha = .22; c.fillStyle = COL.cy; rrect(c, k.x - 5, k.y - 5, k.w + 10, k.h + 10, 9); c.fill(); c.globalAlpha = 1; c.fillStyle = '#060a1b'; rrect(c, k.x, k.y, k.w, k.h, 6); c.fill(); c.strokeStyle = COL.cy; c.lineWidth = 2; c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.font = FONT(19, 700); c.fillText(s.slice(0, 5), k.x + k.w / 2, k.y + 28); c.fillStyle = COL.cy; c.font = FONT(11, 600); c.fillText(s.slice(6), k.x + k.w / 2, k.y + 48); c.fillStyle = '#6d7ba0'; c.font = FONT(7.5, 700); c.fillText('HEURE PARIS', k.x + k.w / 2, k.y + 64); }
}
function drawPlant(x, y) {
  const c = ctx, sw = Math.sin(T * 1.3 + x) * 2.2; c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y, 20, 6, 0, 0, TAU); c.fill();
  c.fillStyle = '#2a1a55'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 13, y - 22); c.lineTo(x + 13, y - 22); c.lineTo(x + 10, y); c.lineTo(x - 10, y); c.closePath(); c.fill(); c.stroke(); c.fillStyle = COL.mg; c.fillRect(x - 12, y - 20, 24, 3);
  [[-26, -50, -1.1], [-14, -64, -.5], [0, -72, 0], [14, -62, .5], [26, -48, 1.1], [-6, -46, -.2], [8, -44, .25]].forEach(([dx, dy, a], i) => { c.save(); c.translate(x, y - 22); c.rotate(a + sw * .02 * (i % 2 ? 1 : -1)); const len = Math.hypot(dx, dy + 22) * .9; c.fillStyle = i % 3 ? '#1fa85a' : '#38d977'; c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.ellipse(0, -len / 2, 7.5, len / 2, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); });
}
function drawCooler(p) {
  const c = ctx, x = p.x, y = p.y; c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y, 24, 7, 0, 0, TAU); c.fill();
  c.fillStyle = '#c8d4f5'; c.strokeStyle = INK; c.lineWidth = 2; rrect(c, x - 16, y - 54, 32, 56, 5); c.fill(); c.stroke(); c.fillStyle = '#8fa0d6'; c.fillRect(x - 12, y - 34, 24, 3);
  c.fillStyle = '#3aa8ff'; c.fillRect(x - 6, y - 30, 4, 5); c.fillStyle = '#ff5a7a'; c.fillRect(x + 2, y - 30, 4, 5);
  c.fillStyle = 'rgba(80,200,255,.55)'; c.beginPath(); c.arc(x, y - 72, 15, 0, TAU); c.fill(); c.strokeStyle = 'rgba(190,240,255,.9)'; c.lineWidth = 2; c.stroke();
  for (let i = 0; i < 3; i++) { const k = (T * .5 + i / 3) % 1; c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(x - 5 + i * 5, y - 60 - k * 18, 1.7, 0, TAU); c.fill(); }
}
function drawCouch(p) {
  const c = ctx, x = p.x, y = p.y; c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y + 14, 80, 9, 0, 0, TAU); c.fill();
  c.strokeStyle = INK; c.lineWidth = 2; c.fillStyle = '#3a2470'; rrect(c, x - 72, y - 40, 144, 42, 12); c.fill(); c.stroke();
  c.fillStyle = '#5a37a8'; [-1, 1].forEach(s => { rrect(c, x + s * 36 - 31, y - 12, 62, 24, 8); c.fill(); c.stroke(); });
  c.fillStyle = '#2f1d5e'; [-1, 1].forEach(s => { rrect(c, x + s * 70 - 9, y - 26, 18, 40, 8); c.fill(); c.stroke(); });
  c.fillStyle = rgba(COL.mg, .8); c.fillRect(x - 70, y - 38, 140, 2.5);
}
function drawRocket(p) {
  const c = ctx, x = p.x, y = p.y; c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y, 22, 7, 0, 0, TAU); c.fill();
  c.fillStyle = '#1a2150'; c.strokeStyle = INK; c.lineWidth = 2; rrect(c, x - 16, y - 16, 32, 18, 5); c.fill(); c.stroke(); c.fillStyle = rgba(COL.cy, .8); c.fillRect(x - 12, y - 8, 24, 2);
  const f = 5 + Math.sin(T * 18) * 2.5; c.fillStyle = '#ffb02e'; c.beginPath(); c.moveTo(x - 5, y - 16); c.lineTo(x, y - 16 + f + 6); c.lineTo(x + 5, y - 16); c.fill();
  c.fillStyle = '#eef3ff'; c.beginPath(); c.moveTo(x, y - 78); c.quadraticCurveTo(x + 13, y - 56, x + 10, y - 20); c.lineTo(x - 10, y - 20); c.quadraticCurveTo(x - 13, y - 56, x, y - 78); c.fill(); c.stroke();
  c.fillStyle = '#ff3d5a'; c.beginPath(); c.moveTo(x - 10, y - 30); c.lineTo(x - 20, y - 16); c.lineTo(x - 10, y - 20); c.fill(); c.beginPath(); c.moveTo(x + 10, y - 30); c.lineTo(x + 20, y - 16); c.lineTo(x + 10, y - 20); c.fill();
  c.fillStyle = COL.cy; c.beginPath(); c.arc(x, y - 52, 5, 0, TAU); c.fill(); c.stroke();
}
function drawTrophy(p) {
  const c = ctx, x = p.x, y = p.y; c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y, 22, 7, 0, 0, TAU); c.fill();
  c.fillStyle = '#1a2150'; c.strokeStyle = INK; c.lineWidth = 2; rrect(c, x - 16, y - 16, 32, 18, 5); c.fill(); c.stroke(); c.fillStyle = rgba(COL.go, .8); c.fillRect(x - 12, y - 8, 24, 2);
  c.fillStyle = '#ffcf3a'; c.beginPath(); c.moveTo(x - 14, y - 62); c.lineTo(x + 14, y - 62); c.quadraticCurveTo(x + 13, y - 36, x, y - 32); c.quadraticCurveTo(x - 13, y - 36, x - 14, y - 62); c.fill(); c.stroke();
  c.fillRect(x - 3, y - 34, 6, 12); c.strokeRect(x - 3, y - 34, 6, 12); rrect(c, x - 10, y - 24, 20, 7, 2); c.fill(); c.stroke();
  c.strokeStyle = '#ffcf3a'; c.lineWidth = 3; c.beginPath(); c.arc(x - 16, y - 54, 6, Math.PI * .5, Math.PI * 1.5); c.stroke(); c.beginPath(); c.arc(x + 16, y - 54, 6, -Math.PI * .5, Math.PI * .5); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x - 8, y - 58, 3, 16);
}
function drawPod(p) {
  const c = ctx, {cx, fy, col} = p, oc = p.seat.occ, occ = oc && oc.state === 'type', bo = flash[p.id] || 0;
  let g = c.createLinearGradient(0, fy - 48, 0, fy); g.addColorStop(0, '#1b2250'); g.addColorStop(1, '#10163a');
  c.fillStyle = g; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 118, fy - 48); c.lineTo(cx + 118, fy - 48); c.lineTo(cx + 126, fy); c.lineTo(cx - 126, fy); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = rgba(col, .55); c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx - 118, fy - 47); c.lineTo(cx + 118, fy - 47); c.stroke();
  const kb = occ; c.fillStyle = '#0a0f26'; c.strokeStyle = rgba(col, kb ? .9 : .4); c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx - 17, fy - 12); c.lineTo(cx + 17, fy - 12); c.lineTo(cx + 21, fy - 3); c.lineTo(cx - 21, fy - 3); c.closePath(); c.fill(); c.stroke();
  if (kb) for (let i = 0; i < 7; i++) { c.fillStyle = Math.sin(T * 14 + i * 2.1) > .2 ? '#fff' : rgba(col, .7); c.fillRect(cx - 14 + i * 4.2, fy - 9, 2.6, 2.2); }
  c.fillStyle = '#0a0f26'; c.beginPath(); c.ellipse(cx + 30, fy - 7, 3.4, 4.6, 0, 0, TAU); c.fill();
  c.fillStyle = '#e8d2a0'; c.strokeStyle = INK; c.lineWidth = 1.4; rrect(c, cx + 104, fy - 30, 9, 11, 2); c.fill(); c.stroke();
  c.fillStyle = col; c.globalAlpha = .9; c.beginPath(); c.arc(cx - 108, fy - 38, 4, 0, TAU); c.fill(); c.globalAlpha = .25; c.beginPath(); c.arc(cx - 108, fy - 38, 12, 0, TAU); c.fill(); c.globalAlpha = 1;
  monitor(cx - 82, fy - 22, 62, 42, p.mons[0], col, occ, bo); monitor(cx + 82, fy - 22, 62, 42, p.mons[2], col, occ, bo); monitor(cx, fy - 24, 92, 58, p.mons[1], col, occ, bo);
  g = c.createLinearGradient(0, fy, 0, fy + 17); g.addColorStop(0, '#171d47'); g.addColorStop(1, '#0b1030'); c.fillStyle = g; c.strokeStyle = INK; c.lineWidth = 2; c.fillRect(cx - 126, fy, 252, 17); c.strokeRect(cx - 126, fy, 252, 17);
  c.fillStyle = rgba(col, .9); c.fillRect(cx - 120, fy + 13, 240, 2.4);
  const nm = IDS[p.id].name, ty = fy - 112; c.font = '800 12px ui-sans-serif,system-ui,sans-serif'; if ('letterSpacing' in c) c.letterSpacing = '2px'; const tw = c.measureText(nm).width + 30;
  c.fillStyle = 'rgba(5,8,22,.92)'; rrect(c, cx - tw / 2, ty - 10, tw, 20, 10); c.fill(); c.strokeStyle = col; c.lineWidth = 1.8; c.stroke(); c.fillStyle = col; c.beginPath(); c.arc(cx - tw / 2 + 11, ty, 3.6, 0, TAU); c.fill();
  c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(nm, cx - tw / 2 + 20, ty + .5); if ('letterSpacing' in c) c.letterSpacing = '0px';
}
function drawChairSeat(s) { const c = ctx, x = s.x, y = s.y + s.pull, col = L.pods[s.pod].col; c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x, y + 4, 18, 6, 0, 0, TAU); c.fill(); c.strokeStyle = '#0a0d20'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 12, y + 4); c.lineTo(x + 12, y + 4); c.moveTo(x, y - 2); c.lineTo(x, y + 4); c.stroke(); c.fillStyle = '#0c1130'; c.beginPath(); c.arc(x - 12, y + 5, 2.2, 0, TAU); c.arc(x + 12, y + 5, 2.2, 0, TAU); c.fill();
  c.fillStyle = '#1a2150'; c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.ellipse(x, y - 4, 16, 7, 0, 0, TAU); c.fill(); c.stroke(); c.strokeStyle = rgba(col, .6); c.lineWidth = 1.2; c.stroke(); }
function drawChairBack(s) { const c = ctx, x = s.x, y = s.y + s.pull, col = L.pods[s.pod].col; c.fillStyle = '#141a44'; c.strokeStyle = INK; c.lineWidth = 1.8; rrect(c, x - 17, y - 12, 34, 14, 7); c.fill(); c.stroke(); c.strokeStyle = rgba(col, .85); c.lineWidth = 2; c.beginPath(); c.moveTo(x - 12, y - 8); c.lineTo(x + 12, y - 8); c.stroke(); }

/* ============ acteurs & machine d'états ============ */
let actors = {}, list = [], bubs = [], pops = [], chats = [], figs = [], figI = 0, lastNum = -9, queue = [], qi = 0, nextEv = 4, tag = 'rejoue le dernier cycle', watchAt = 2, sel = null, flash = {};
const seats = () => L.pods.map(p => p.seat).concat(L.couchSeats), isHelper = a => !IDS[a.id].main, HEAD = a => 60 * (IDS[a.id].sc || 1) * L.cs;
function release(a) { if (a.seat && a.seat.res === a) a.seat.res = null; if (a.seat && a.seat.occ !== a) a.seat = null; }
function walkTo(a, x, y, cb) {
  release(a); const p = findPath(a.x, a.y, x, y); if (!p) { a.state = 'idle'; a.until = T + .3; a.then = hop; a.cb = null; return false; }
  a.path = p; a.pi = 0; a.cb = cb || null; a.state = 'walk'; a.t0 = T; return true;
}
function setState(a, st, dur, then) { a.state = st; a.t0 = T; a.until = T + dur; a.then = then || null; }
function say(a, n, dur = 2.2) { const gl = [IDS[a.id].g]; while (gl.length < n) gl.push(Math.floor(Math.random() * 12)); for (let i = bubs.length - 1; i >= 0; i--) if (bubs[i].a === a) bubs.splice(i, 1); bubs.push({a, g: gl, t0: T, dur}); a.talk = T + Math.min(dur, 1.4); }
const others = a => list.filter(o => o !== a);
function done(a) { a.trips--; if (a.trips > 0) hop(a); else if (a.home) goDesk(a); else helperNext(a); }
function goDesk(a) { const s = a.home; if (!s || s.occ || (s.res && s.res !== a)) { a.trips = 1; return hop(a); } if (!walkTo(a, s.st.x, s.st.y, ar => sitIn(ar))) return; s.res = a; a.seat = s; }
function goCouch(a) { const fr = L.couchSeats.filter(s => !s.occ && !s.res); if (!fr.length) return hop(a); const s = pick(fr); if (!walkTo(a, s.st.x, s.st.y, ar => sitIn(ar))) return; s.res = a; a.seat = s; }
function helperNext(a) { if (Math.random() < .65 && L.couchSeats.some(s => !s.occ && !s.res)) return goCouch(a); a.trips = 2 + Math.floor(Math.random() * 2); hop(a); }
function sitIn(a) { const s = a.seat; if (!s) return hop(a); s.occ = a; s.res = null; a.sx = a.x; a.sy = a.y; a.face = s.couch ? 'd' : 'u'; a.sitK = 0; a.state = 'sitIn'; a.t0 = T; a.then = null; }
function afterSit(a) { const cs = a.seat.couch; a.state = cs ? 'rest' : 'type'; a.t0 = T; a.until = T + (cs ? rnd(7, 13) : rnd(35, 60)); a.ext = 0; a.then = standUp; a.popAt = T + rnd(.4, 1.2); }
function standUp(a) { a.state = 'sitOut'; a.t0 = T; a.then = null; }
function spotWalk(a, x, y, face, st, dur, ic) { walkTo(a, x, y, ar => { ar.face = face; setState(ar, st, dur, done); if (ic) pop(ar, ic); if (Math.random() < .6) say(ar, 2, dur * .6); }); }
function hop(a) {
  const r = Math.random(), cl = L.cooler, hp = isHelper(a);
  if (r < .17) return spotWalk(a, cl.x + rnd(-8, 8), cl.y + 34, 'u', 'drink', 2.6, 'drop');
  if (r < .32) return spotWalk(a, L.wall.x + L.wall.w * rnd(.25, .75), L.ft + 54, 'u', 'look', rnd(2.4, 3.4), 'spark');
  if (r < .46) { const t = (L.trophy && Math.random() < .5) ? L.trophy : L.rocket; return spotWalk(a, t.x - 4, t.y + 34, 'u', 'look', 2.4, t === L.rocket ? 'bolt' : 'gem'); }
  if (r < .64) return visit(a);
  if (r < .66 && !hp) return goCouch(a);
  return meet(a);
}
function visit(a) {
  const t = others(a).filter(o => o.home && o.state === 'type'); if (!t.length) return meet(a);
  const b = pick(t); walkTo(a, b.home.st.x + pick([-26, 0, 26]), b.home.st.y + 6, ar => { ar.face = 'u'; setState(ar, 'look', 2.8, done); say(ar, 2, 1.4); ar.replyAt = T + 1.5; ar.replyTo = b; });
}
function meet(a) {
  const c = others(a).filter(o => !o.seat && !o.meet && ['walk', 'idle', 'wait', 'look', 'drink'].includes(o.state)); if (!c.length) return visit2(a);
  const b = pick(c); let M = null; for (let i = 0; i < 40 && !M; i++) { const x = rnd(70, L.W - 70), y = rnd(L.ft + 70, L.H - 60); if (freeAt(x - 26, y, 16) && freeAt(x + 26, y, 16)) M = {x, y}; }
  if (!M) return visit2(a);
  a.meet = {p: b, ready: false}; b.meet = {p: a, ready: false};
  const go = (u, dx) => { if (!walkTo(u, M.x + dx, M.y, ar => arriveMeet(ar))) abortMeet(u); };
  go(a, -26); go(b, 26);
}
function visit2(a) { const cl = L.cooler; spotWalk(a, cl.x + rnd(-8, 8), cl.y + 34, 'u', 'drink', 2.2, 'drop'); }
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
function pop(a, ic) { pops.push({x: a.x + rnd(-8, 8), y: a.y - HEAD(a) - 6, t0: T, dur: 1.9, ic}); }
function popNum(a, f) { pops.push({x: a.x, y: a.y - HEAD(a) - 16, t0: T, dur: 2.6, num: f}); }
const fmtFig = v => eur(v, true);
function buildFigs() {
  const f = []; (D.pos || []).forEach(p => { if (ok(p.pnl)) f.push({s: p.s, v: p.pnl, k: 'latent'}); });
  const cl = D.team && D.team.resume && D.team.resume.performance && D.team.resume.performance.clotures_24h; if (Array.isArray(cl)) cl.forEach(x => { if (ok(x.pnl)) f.push({s: sym(x.market), v: x.pnl, k: 'clos'}); });
  figs = f;
}
function mkActor(id, i) { return {id, i, x: 0, y: 0, face: 'd', state: 'idle', t0: 0, until: 0, path: [], pi: 0, sitK: 0, walk: 0, ph: Math.random() * 6, speed: rnd(54, 64), seat: null, home: null, trips: 1, talk: 0, popAt: 0, meet: null, then: null, cb: null}; }
function reset() {
  seats().forEach(s => { s.occ = s.res = null; s.pull = s.couch ? 0 : 8; }); bubs = []; pops = []; chats = []; actors = {}; list = ORDER.map(mkActor); list.forEach(a => actors[a.id] = a);
  L.pods.forEach(p => { const a = actors[p.id], s = p.seat; a.home = s; s.occ = a; a.seat = s; a.x = s.x; a.y = s.y; a.face = 'u'; a.sitK = 1; a.state = 'type'; a.t0 = T - rnd(0, 3); a.until = T + rnd(8, 26); a.ext = 0; a.then = standUp; a.popAt = T + rnd(0, 1.5); });
  list.filter(isHelper).forEach(a => { let x, y; do { x = rnd(80, L.W - 80); y = rnd(L.ft + 70, L.H - 60); } while (!freeAt(x, y, 16)); a.x = x; a.y = y; a.trips = 2 + Math.floor(Math.random() * 2); hop(a); });
}
function stepActor(a, dt) {
  const st = a.state;
  if (st === 'walk') {
    let rem = a.speed * dt * (IDS[a.id].sc ? 1.1 : 1); a.walk = (a.walk + a.speed * dt / 46) % 2;
    while (rem > 0 && a.pi < a.path.length) {
      const t = a.path[a.pi], dx = t.x - a.x, dy = t.y - a.y, dist = Math.hypot(dx, dy);
      if (dist > 1) { const ax = Math.abs(dx), ay = Math.abs(dy), cur = a.face; if (ax > ay * 1.25) a.face = dx > 0 ? 'r' : 'l'; else if (ay > ax * 1.25 || cur === 'u' || cur === 'd') a.face = dy > 0 ? 'd' : 'u'; }
      if (dist <= rem) { a.x = t.x; a.y = t.y; rem -= dist; a.pi++; } else { a.x += dx / dist * rem; a.y += dy / dist * rem; rem = 0; }
    }
    if (a.pi >= a.path.length) { a.state = 'idle'; a.until = T + .05; const cb = a.cb; a.cb = null; a.then = null; if (cb) cb(a); else a.then = hop; }
  } else if (st === 'sitIn' || st === 'sitOut') {
    const s = a.seat; a.sitK = clamp(a.sitK + (st === 'sitIn' ? dt / .7 : -dt / .6), 0, 1); const e = ease(a.sitK);
    if (s) { a.x = lerp(s.st.x, s.x, e); a.y = lerp(s.st.y, s.y + 12 * (1 - e) * (s.couch ? 0 : 1), e); a.walk = 0; }
    if (st === 'sitIn' && a.sitK >= 1) afterSit(a);
    if (st === 'sitOut' && a.sitK <= 0) { const wasCouch = s && s.couch; if (s) { s.occ = null; s.res = null; } a.seat = null; a.face = 'd'; a.state = 'idle'; a.until = T + .2;
      if (wasCouch && a.home) { a.trips = 0; a.then = goDesk; } else { a.trips = a.home ? (Math.random() < .2 ? 2 : 1) : 2 + Math.floor(Math.random() * 2); a.then = hop; } }
  } else if (st === 'type') {
    const s = a.seat; if (s) { a.x = s.x; a.y = s.y; }
    if (T > a.popAt) { a.popAt = T + rnd(1.1, 2.4); const f = figs[figI % Math.max(1, figs.length)]; if (f && T - lastNum > 3 && Math.random() < .5) { popNum(a, f); figI++; lastNum = T; } else pop(a, pick(POPI)); }
  } else if (st === 'rest') { const s = a.seat; if (s) { a.x = s.x; a.y = s.y; } }
  if (a.replyAt && T > a.replyAt) { const b = a.replyTo; a.replyAt = 0; if (b && b.state === 'type') say(b, 2, 1.6); }
  if (st === 'type' && T >= a.until && (a.ext | 0) < 4 && (list.filter(o => o.state === 'walk').length >= 4 || AGENTS.filter(k => !['type', 'sitIn'].includes(actors[k].state)).length >= 2)) { a.until = T + 5; a.ext = (a.ext | 0) + 1; }
  if (st !== 'walk' && st !== 'sitIn' && st !== 'sitOut' && T >= a.until && a.then) { const f = a.then; a.then = null; f(a); }
}
function stepWorld(dt) {
  T += dt; list.forEach(a => stepActor(a, dt));
  for (let i = chats.length - 1; i >= 0; i--) { const ch = chats[i]; if (T > ch.until + .1 || ch.a.state !== 'chat') { chats.splice(i, 1); continue; } if (T > ch.next) { ch.next = T + 1.3; const sp = ch.turn++ % 2 ? ch.b : ch.a; say(sp, 2 + Math.floor(Math.random() * 2), 1.5); if (Math.random() < .5) pop(sp, pick(['spark', 'gem', 'bars', 'bolt'])); } }
  seats().forEach(s => { if (s.couch) return; const tg = s.occ ? (s.occ.state === 'type' ? 0 : 12 * (1 - ease(s.occ.sitK))) : s.res ? 12 : 8; s.pull += (tg - s.pull) * Math.min(1, dt * 7); });
  for (let i = bubs.length - 1; i >= 0; i--) if (T - bubs[i].t0 > bubs[i].dur) bubs.splice(i, 1);
  for (let i = pops.length - 1; i >= 0; i--) if (T - pops[i].t0 > pops[i].dur) pops.splice(i, 1);
  for (const k in flash) flash[k] = Math.max(0, flash[k] - dt * 1.2);
  if (T > watchAt) { watchAt = T + 1;
    const walkers = list.filter(a => a.state === 'walk').length;
    if (walkers < 2) { const rs = list.filter(x => ['rest', 'wait', 'look', 'drink'].includes(x.state) && !x.meet && T - x.t0 > 1.5); if (rs.length) pick(rs).until = T; else { const ty = list.filter(x => x.state === 'type' && T - x.t0 > 8); if (ty.length) pick(ty).until = T; } }
  }
  if (T > nextEv) { nextEv = T + rnd(6, 9); evStep(); }
}
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
  L.pods.forEach(p => { it.push([p.fy + 17, 0, p]); it.push([p.seat.y + p.seat.pull - 2, 1, p.seat]); it.push([p.seat.y + p.seat.pull + 4, 2, p.seat]); });
  L.plants.forEach(p => it.push([p[1], 3, p])); it.push([L.cooler.y, 4, L.cooler]); it.push([L.couch.y, 6, L.couch]); it.push([L.rocket.y, 7, L.rocket]); if (L.trophy) it.push([L.trophy.y, 8, L.trophy]);
  list.forEach(a => it.push([a.y + (a.state === 'type' || a.state === 'sitIn' || a.state === 'sitOut' || a.state === 'rest' ? 1.5 : 0), 5, a]));
  it.sort((a, b) => a[0] - b[0]);
  for (const [, t, o] of it) {
    if (t === 0) drawPod(o); else if (t === 1) drawChairSeat(o); else if (t === 2) drawChairBack(o); else if (t === 3) drawPlant(o[0], o[1]); else if (t === 4) drawCooler(o); else if (t === 6) drawCouch(o); else if (t === 7) drawRocket(o); else if (t === 8) drawTrophy(o);
    else drawBlob(c, o.id, o.x, o.y, {face: o.face, walk: o.walk, moving: o.state === 'walk', sit: (o.state === 'type' || o.state === 'rest') ? 1 : (o.state === 'sitIn' || o.state === 'sitOut') ? ease(o.sitK) : 0, type: o.state === 'type' ? ((Math.floor(T * 8 + o.ph * 5) % 2) + 1) : 0,
      blink: ((T + o.ph * 3) % 3.6) < .14 ? 1 : 0, look: o.state === 'chat' ? 0 : Math.sin(T * .7 + o.ph) > .6 ? 1 : Math.sin(T * .7 + o.ph) < -.6 ? -1 : 0, talk: T < o.talk, ph: o.ph, scale: L.cs, sel: sel && sel.a === o && T < sel.until});
  }
  const bs = L.mode === 'T' ? 1.3 : 1;
  pops.forEach(p => { const k2 = (T - p.t0) / p.dur, al = k2 < .12 ? k2 / .12 : k2 > .7 ? (1 - k2) / .3 : 1, y = p.y - 36 * ease(Math.min(1, k2)) * bs, x = p.x + Math.sin(k2 * 5 + p.t0) * 3; c.globalAlpha = clamp(al, 0, 1);
    if (p.num) { const f = p.num, up = f.v >= 0, col = up ? GRN : RED, txt = fmtFig(f.v), fs = 13 * bs; c.font = '700 ' + fs + 'px ui-sans-serif,system-ui,sans-serif'; const w1 = c.measureText(f.s).width, w2 = c.measureText(txt).width, w = w1 + w2 + 22 * bs; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(4,8,20,.88)'; rrect(c, x - w / 2, y - 10 * bs, w, 20 * bs, 10 * bs); c.fill(); c.strokeStyle = f.k === 'clos' ? COL.go : col; c.lineWidth = 1.6; c.stroke(); c.textAlign = 'left'; c.fillStyle = '#8fa0d6'; c.fillText(f.s, x - w / 2 + 9 * bs, y + .5); c.fillStyle = col; c.fillText(txt, x - w / 2 + 13 * bs + w1, y + .5); }
    else icon(c, p.ic, x, y, 1.15 * bs); c.globalAlpha = 1; });
  bubs.forEach(b => { const a = b.a, k2 = (T - b.t0) / b.dur, al = k2 < .1 ? k2 / .1 : k2 > .8 ? (1 - k2) / .2 : 1, n = b.g.length, w = (8 + n * 15) * bs, h = 22 * bs, x = a.x, y = a.y - HEAD(a) - 14 * bs;
    c.globalAlpha = clamp(al, 0, 1); c.fillStyle = 'rgba(8,12,30,.9)'; c.strokeStyle = IDS[a.id].c; c.lineWidth = 1.8; c.beginPath(); rr(c, x - w / 2, y - h, w, h, 8 * bs); c.moveTo(x - 4 * bs, y); c.lineTo(x, y + 6 * bs); c.lineTo(x + 4 * bs, y); c.fill(); c.stroke();
    b.g.forEach((g, i) => glyph(c, g, x - w / 2 + (12 + i * 15) * bs, y - h / 2, .95 * bs, i ? '#dfe8ff' : IDS[a.id].c)); c.globalAlpha = 1; });
}
function drawIcon(cvn) {
  const k = cvn.dataset.k, c = cvn.getContext('2d'); if (!IDS[k]) return; c.clearRect(0, 0, 112, 112); const g = c.createRadialGradient(56, 62, 4, 56, 62, 54); g.addColorStop(0, rgba(IDS[k].c, .35)); g.addColorStop(1, rgba(IDS[k].c, 0)); c.fillStyle = g; c.fillRect(0, 0, 112, 112);
  drawBlob(c, k, 56, 96, {face: 'd', scale: 1.55, ph: 0, blink: 0});
}
/* ============ boucle, mise en page, API ============ */
let fpsN = 0, fpsT = 0, slow = 0, lowQ = false;
function layoutF() {
  const w = room.clientWidth; if (!w) return; const mode = w < 640 ? 'T' : 'W', first = !L || L.mode !== mode;
  if (first) { L = makeLayout(mode); }
  S = w / L.W; dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 700 ? 1.6 : 2); room.style.setProperty('--ar', L.W + '/' + L.H);
  const cw = Math.round(w * dpr), ch = Math.round(w * L.H / L.W * dpr); if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  kpx = cv.width / L.W; GL && Object.keys(GL).forEach(k => delete GL[k]);
  buildBg(); buildMons(); if (first) { reset(); } if (!running) drawFrame();
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
  list.forEach(a => { if (!IDS[a.id].main) return; const d = Math.hypot(x - a.x, (y - (a.y - 26 * L.cs)) * .9); if (d < 36 * L.cs && d < bd) { bd = d; best = a.id; } }); if (best) info(best);
});
layoutF();
return {
  refresh(isNew) {
    buildSeries(); buildPool(); buildFigs(); const prev = D.lastTick; buildQueue();
    if (queue.length && (isNew || D.lastTick !== prev)) { tag = prev && D.lastTick !== prev ? 'nouveau cycle' : 'rejoue le dernier cycle'; nextEv = Math.min(nextEv, T + 1.2); }
    if (RM || !queue.length) { const q = queue[queue.length - 1]; if (q) tick(q.who, q.kind, q.ts); else $('tkTxt').textContent = 'en attente de données'; }
    document.querySelectorAll('canvas.ico').forEach(drawIcon); if (!running) { if (MONS.length || L) MONS.forEach(m => m.next = 0); L.pods.forEach(p => p.mons && p.mons.forEach(m => m.next = 0)); WALLC && (WALLC.next = 0); drawFrame(); }
  },
  start, info, step: dt => { stepWorld(dt); drawFrame(); }, T: () => T, get actors() { return actors; }, get L() { return L; }, seats, list: () => list
};
};
})();
