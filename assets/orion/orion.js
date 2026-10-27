/* ORION // ULTRA 1.2 — lit uniquement data/{paper10,ui,status,team}.json (publiés par le cycle).
   Aucune valeur inventée : donnée absente = « — ». L'anneau animé est purement décoratif. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const BOOK = 'ultra-1.2-test';
const DATA = new URL('../../data/', document.currentScript.src).href;   // marche depuis /preview/ comme depuis la racine
const ok = x => typeof x === 'number' && isFinite(x);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const nf = o => new Intl.NumberFormat('fr-FR', o);
const eur = (x, sign) => ok(x) ? nf({style: 'currency', currency: 'EUR', signDisplay: sign ? 'exceptZero' : 'auto'}).format(x).replace('-', '−') : '—';
const eur0 = x => ok(x) ? nf({style: 'currency', currency: 'EUR', maximumFractionDigits: Number.isInteger(x) ? 0 : 2}).format(x) : '—';
const pct = x => ok(x) ? nf({style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero'}).format(x).replace('-', '−') : '—';
const cls = x => !ok(x) ? 'z' : x > 0.00004 ? 'g' : x < -0.00004 ? 'r' : 'z';
const get = async f => { try { const r = await fetch(DATA + f + '.json?' + Date.now(), {cache: 'no-store'}); return r.ok ? await r.json() : null; } catch (e) { return null; } };
const fmtDay = ts => ok(ts) ? new Intl.DateTimeFormat('fr-FR', {day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris'}).format(ts) : '—';
const ageStr = ms => { if (!ok(ms) || ms < 0) return '—'; const m = Math.floor(ms / 60e3); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); };
const sym = m => String(m || '').replace(/-EUR$/, '');

let hero = null;          // champ décoratif (défini plus bas)
const state = {pos: []};

/* ===================== PANNEAUX (données réelles) ===================== */
let counted = false;
function countUp(el, to, f, from) {
  if (RM || counted) { el.textContent = f(to); return; }
  counted = true; const t0 = performance.now(), D = 1400;
  const step = t => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 4); el.textContent = f(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); else el.textContent = f(to); };
  requestAnimationFrame(step);
}
function sparkSvg(pts, base) {
  const W = 300, Hh = 96, p = 6;
  const t0 = pts[0].ts, t1 = pts[pts.length - 1].ts, vs = pts.map(q => q.equity), lo = Math.min(...vs, base), hi = Math.max(...vs, base), pad = (hi - lo) * .15 || 1;
  const X = t => p + (t - t0) / ((t1 - t0) || 1) * (W - 2 * p - 6), Y = v => Hh - 8 - (v - (lo - pad)) / ((hi + pad) - (lo - pad)) * (Hh - 16);
  const line = pts.map((q, i) => (i ? 'L' : 'M') + X(q.ts).toFixed(1) + ' ' + Y(q.equity).toFixed(1)).join(' ');
  const last = pts[pts.length - 1], c = last.equity >= base ? '#2bf59a' : '#ff4d6a';
  const xp = X(t1) / W * 100, yp = Y(last.equity) / Hh * 100;
  return `<svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" role="img" aria-label="Courbe de l'équité depuis le départ">
    <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".38"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" x2="${W}" y1="${Y(base).toFixed(1)}" y2="${Y(base).toFixed(1)}" stroke="rgba(160,180,255,.3)" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>
    <path class="ar" d="${line} L${X(t1).toFixed(1)} ${Hh} L${X(t0).toFixed(1)} ${Hh}Z" fill="url(#sg)"/>
    <path class="ln" pathLength="1" d="${line}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" style="filter:drop-shadow(0 0 5px ${c})"/>
  </svg>
  <span class="dot" style="position:absolute;left:${xp}%;top:calc(${yp}% * .92 + 4px);width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:${c};box-shadow:0 0 12px ${c}"><i style="position:absolute;inset:0;border-radius:50%;border:1.5px solid ${c}"></i></span>
  <span class="ax hi">${eur(hi)}</span><span class="ax lo">${eur(lo)}</span>`;
}
function renderCap(p) {
  const b = p && p.carnets && p.carnets[BOOK], base = p && ok(p.capital) ? p.capital : null;
  const eq = $('eq'), perf = $('perf'), sp = $('spark');
  const c = b && Array.isArray(b.courbe) ? b.courbe.filter(q => ok(q.equity) && ok(q.ts)) : [];
  if (!c.length || base === null) { eq.textContent = '—'; eq.classList.add('na'); perf.innerHTML = '<span class="chip z">—</span>'; sp.innerHTML = ''; $('s_eq').textContent = $('s_pl').textContent = '—'; return null; }
  const last = c[c.length - 1], net = last.equity - base, rel = net / base;
  eq.classList.remove('na'); countUp(eq, last.equity, v => eur(v), base);
  perf.innerHTML = `<span class="chip ${cls(net)}">${eur(net, true)} · ${pct(rel)}</span><span class="start">vs ${eur0(base)} de départ</span>`;
  sp.innerHTML = c.length > 1 ? sparkSvg(c, base) : '';
  $('s_eq').textContent = eur(last.equity); $('s_pl').innerHTML = `<span class="${cls(net)}">${eur(net, true)}</span>`;
  return {last, net};
}
function openRows(p, ui) {
  const b = p && p.carnets && p.carnets[BOOK];
  if (!b || !Array.isArray(b.positions)) return null;
  const uiPos = (ui && ui.carnets && ui.carnets[BOOK] && ui.carnets[BOOK].positions_ouvertes) || [];
  return b.positions.filter(x => x.status === 'ouverte').map(x => {
    const q = uiPos.find(u => u.market === x.market) || {};
    return {m: String(x.market || ''), s: sym(x.market), amt: ok(q.cout) ? q.cout : null, pnl: ok(q.pnl_latent_net) ? q.pnl_latent_net : null, pc: ok(q.pnl_latent_net_pct) ? q.pnl_latent_net_pct : null};
  }).sort((a, z) => (z.amt ?? -1) - (a.amt ?? -1));
}
function renderPos(rows) {
  const list = $('plist'), tot = $('ptot'), cnt = $('posCnt');
  if (!rows) { list.innerHTML = '<div class="empty">—</div>'; tot.textContent = ''; cnt.textContent = '—'; $('s_op').textContent = '—'; return; }
  cnt.textContent = rows.length + ' OUVERTE' + (rows.length > 1 ? 'S' : ''); $('s_op').textContent = String(rows.length);
  if (!rows.length) { list.innerHTML = '<div class="empty">Aucune position ouverte</div>'; tot.textContent = ''; return; }
  list.innerHTML = '<div class="row p hd"><span>Symbole</span><span class="n">Investi</span><span class="n">P&amp;L</span><span></span></div>' + rows.map((r, i) => {
    const k = cls(r.pnl), pill = k === 'g' ? '<span class="pill g">GAIN</span>' : k === 'r' ? '<span class="pill r">PERTE</span>' : '<span class="pill z">—</span>';
    return `<div class="row p" style="--r:${i}"><span><b>${esc(r.s)}</b></span><span class="n">${r.amt === null ? '—' : eur(r.amt)}</span><span class="n ${k}"><b>${eur(r.pnl, true)}</b><br><span class="sub">${pct(r.pc)}</span></span>${pill}</div>`; }).join('');
  const known = rows.filter(r => r.pnl !== null);
  if (known.length) { const s = known.reduce((a, r) => a + r.pnl, 0); tot.innerHTML = `Latent total <b class="${cls(s)}">${eur(s, true)}</b>`; } else tot.textContent = '';
}
function renderHeat(rows) {
  const el = $('bars'); const known = (rows || []).filter(r => r.pnl !== null);
  if (!known.length) { el.innerHTML = '<div class="empty">—</div>'; return; }
  const Ht = 150, ph = Ht - 16, pad = 14, usable = ph - 2 * pad;
  const mp = Math.max(0, ...known.map(r => r.pnl)), mn = Math.max(0, ...known.map(r => -r.pnl)), sum = (mp + mn) || 1;
  const zero = pad + usable * (mp / sum), k = usable / sum;
  el.style.setProperty('--zero', zero.toFixed(1) + 'px');
  el.innerHTML = known.map((r, i) => {
    const h = Math.max(2, Math.abs(r.pnl) * k), up = r.pnl >= 0, top = up ? zero - h : zero, c = cls(r.pnl);
    return `<div class="bar1" style="--r:${i}"><div class="pl"><div class="col ${c}" style="top:${top.toFixed(1)}px;height:${h.toFixed(1)}px;--o:${up ? 'bottom' : 'top'}"></div>
      <span class="v ${c}" style="top:${(up ? top - 12 : top + h + 2).toFixed(1)}px">${eur(r.pnl, true).replace(/\s?€/, '')}</span></div><span class="s">${esc(r.s.slice(0, 6))}</span></div>`; }).join('');
}
let logSig = '';
function renderLog(p, ui) {
  const b = p && p.carnets && p.carnets[BOOK], st = ui && ui.carnets && ui.carnets[BOOK] && ui.carnets[BOOK].stats_clos;
  const el = $('lines'), tot = $('ltot');
  const cl = b && Array.isArray(b.positions) ? b.positions.filter(x => x.status === 'fermee' && ok(x.pnl)).sort((a, z) => (z.exit_ts || 0) - (a.exit_ts || 0)) : null;
  if (!cl) { el.textContent = '—'; tot.textContent = ''; $('logMeta').textContent = '—'; $('s_cl').textContent = '—'; return; }
  $('logMeta').textContent = cl.length + ' TRADE' + (cl.length > 1 ? 'S' : '') + ' CLOS'; $('s_cl').textContent = String(ok(st && st.n_clos) ? st.n_clos : cl.length);
  const lines = cl.slice(0, 12).map(x => [[fmtDay(x.exit_ts) + ' ', 'tm'], [sym(x.market).padEnd(6, ' ') + ' ', ''], [String(x.reason || '—').toUpperCase().replace(/_/g, ' ') + ' ', 'k'], [eur(x.pnl, true), cls(x.pnl)]]);
  const sig = JSON.stringify(lines);
  const sum = cl.reduce((a, x) => a + x.pnl, 0), wins = cl.filter(x => x.pnl > 0).length;
  tot.innerHTML = `<span>NET <b class="${cls(sum)}">${eur(sum, true)}</b></span><span>${wins} G / ${cl.length - wins} P</span>` + (st && ok(st.profit_factor) ? `<span>PF <b>${nf({maximumFractionDigits: 2}).format(st.profit_factor)}</b></span>` : '') + `<span>n&lt;30 : rien de prouvé</span>`;
  if (sig === logSig) return; logSig = sig;
  el.innerHTML = '';
  const mk = l => { const d = document.createElement('div'); const sp = l.map(([t, c]) => { const s = document.createElement('span'); if (c) s.className = c; d.appendChild(s); return [s, t]; }); el.appendChild(d); return sp; };
  if (RM) { lines.forEach(l => mk(l).forEach(([s, t]) => s.textContent = t)); return; }
  const cur = document.createElement('i'); cur.className = 'cur';
  let li = 0; (function nextLine() {
    if (li >= lines.length) { cur.remove(); return; }
    const sp = mk(lines[li++]); sp[sp.length - 1][0].after(cur);
    const full = sp.map(x => x[1]).join(''); let n = 0;
    (function type() { n += 2; let r = n; sp.forEach(([s, t]) => { s.textContent = t.slice(0, Math.max(0, r)); r -= t.length; });
      if (n < full.length) setTimeout(type, 14); else setTimeout(nextLine, 90); })();
  })();
}
let stnFirst = true;
function renderStn(team) {
  const el = $('stn'), meta = $('stnMeta'), r = team && team.resume;
  const ex = r && r.derniere_execution_reelle;
  if (!ex) { el.innerHTML = '<div class="empty">—</div>'; meta.textContent = '—'; return; }
  const now = Date.now(), nt = Array.isArray(r.ticks_24h) ? r.ticks_24h.length : null;
  meta.textContent = nt === null ? '—' : nt + ' TICK' + (nt > 1 ? 'S' : '') + ' / 24 H';
  const names = ['SCOUT', 'TRADER', 'SENTINEL', 'RESEARCH', 'ARBITRE'];
  el.innerHTML = '<div class="row s hd"><span>Module</span><span>Dernière action réelle</span><span></span></div>' + names.map((n, i) => {
    const e = ex[n]; const has = e && ok(e.ts), age = has ? now - e.ts : null;
    const pill = !has ? '<span class="pill z">—</span>' : age < 4 * 3600e3 ? '<span class="pill c">OK</span>' : '<span class="pill a">ANCIEN</span>';
    return `<div class="row s" data-m="${n}" style="--r:${i}"><span><b>${n}</b></span><span>${has ? esc(String(e.kind || '—').replace(/_/g, ' ').toUpperCase()) + '<br><span class="sub">il y a ' + ageStr(age) + '</span>' : '<span class="z">—</span>'}</span>${pill}</div>`; }).join('');
}
function renderHead(p, st) {
  const g = (st && ok(st.genere)) ? st.genere : (p && ok(p.genere)) ? p.genere : null, live = $('live'), age = g === null ? null : Date.now() - g;
  live.className = 'live' + (age === null ? ' na' : age > 4 * 3600e3 ? ' stale' : '');
  live.querySelector('span').textContent = age === null ? 'NO DATA' : age > 4 * 3600e3 ? 'STALE' : 'LIVE';
  $('s_age').textContent = age === null ? '—' : ageStr(age);
}
function renderFoot(ui) {
  const b = ui && ui.carnets && ui.carnets[BOOK] && ui.carnets[BOOK].stats_clos, nmin = ui && ok(ui.n_min_conclusion) ? ui.n_min_conclusion : 30;
  $('badge').textContent = 'Paper trading · capital fictif · aucun ordre réel' + (b && ok(b.n_clos) ? ` · ${b.n_clos} trade${b.n_clos > 1 ? 's' : ''} clos` + (b.n_clos < nmin ? ' : rien de prouvé' : '') : '');
}
async function load() {
  const [p, ui, st, team] = await Promise.all([get('paper10'), get('ui'), get('status'), get('team')]);
  const safe = f => { try { f(); } catch (e) { console.error(e); } };
  const rows = openRows(p, ui); state.pos = rows || [];
  safe(() => renderHead(p, st)); safe(() => renderCap(p)); safe(() => renderPos(rows)); safe(() => renderHeat(rows));
  safe(() => renderLog(p, ui)); safe(() => renderStn(team)); safe(() => renderFoot(ui));
  if (hero) hero.setPositions(state.pos.filter(r => r.pnl !== null).map(r => ({s: r.s, pnl: r.pnl, pc: r.pc})));
}

/* ===================== CHAMP DE DÉCISION (canvas, décoratif) ===================== */
function Field(cv, cv2, onArrive) {
  const ctx = cv.getContext('2d'), o2 = cv2.getContext('2d'), tc = ctx;
  const mobile = Math.min(innerWidth, innerHeight) < 700 || (matchMedia && matchMedia('(pointer:coarse)').matches);
  const NMAX = mobile ? 2300 : 4600;
  let N = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ? Math.floor(NMAX * .7) : NMAX;
  const MODS = [
    {k: 'SCOUT', cap: 'DÉTECTE', c: [46, 230, 214], a: -135}, {k: 'TRADER', cap: 'EXÉCUTE', c: [255, 45, 117], a: -45},
    {k: 'SENTINEL', cap: 'PROTÈGE', c: [255, 154, 60], a: 135}, {k: 'RESEARCH', cap: 'TESTE', c: [165, 107, 255], a: 45}];
  const FONT = '9px ui-monospace,"SF Mono",Menlo,Consolas,"Roboto Mono","DejaVu Sans Mono",monospace';
  const rnd = Math.random, TAU = Math.PI * 2;
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.2;
  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 100, sx = 1;
  let t = 0, running = false, raf = 0, last = 0, ema = 0.016, nfr = 0, fps = 0, fpsN = 0, fpsT = 0;
  /* particules de l'anneau (coordonnées normalisées par R) */
  const th = new Float32Array(NMAX), off = new Float32Array(NMAX), spd = new Float32Array(NMAX), ph = new Float32Array(NMAX), fr = new Float32Array(NMAX), grp = new Uint8Array(NMAX);
  for (let i = 0; i < NMAX; i++) {
    const a = rnd() * TAU, thick = .008 + .02 * (.5 + .5 * Math.sin(3 * a + 1.3)) + .004 * Math.sin(7 * a);
    th[i] = a; off[i] = gauss() * thick * 1.35 * (rnd() < .14 ? 3.4 : 1); spd[i] = .035 + rnd() * .035; ph[i] = rnd() * TAU; fr[i] = .5 + rnd() * 1.6;
    const u = ((a / TAU + .09 * gauss()) % 1 + 1) % 1, q = rnd();
    grp[i] = q < .03 ? 4 : q < .12 ? 3 : u < .38 ? 0 : u < .66 ? 1 : 2;
  }
  const COL = ['255,45,117', '226,60,255', '138,92,255', '46,230,214', '255,230,240'], LV = [.1, .17, .28];
  const bx = new Float32Array(NMAX), by = new Float32Array(NMAX), bk = new Uint8Array(NMAX), ord = new Uint16Array(NMAX), cnt = new Uint16Array(16);
  /* tendrils organiques */
  const tendrils = [];
  function makeTendril(ang) {
    const segs = [], inward = rnd() < .22, base = inward ? ang + Math.PI : ang;
    const maxLen = (inward ? .3 : .45 + rnd() * .22), c = rnd() < .55 ? [46, 230, 214] : rnd() < .6 ? [255, 45, 117] : [190, 110, 255];
    let x = Math.cos(ang), y = Math.sin(ang), budget = 70;
    const grow = (x0, y0, dir, len, depth, t0) => {
      let px = x0, py = y0, d = dir, L = len;
      for (let i = 0; i < 40 && budget > 0 && L < maxLen; i++) {
        d += (rnd() - .5) * .7; const step = .028 + rnd() * .02; const nx = px + Math.cos(d) * step, ny = py + Math.sin(d) * step; L += step; budget--;
        segs.push({x0: px, y0: py, x1: nx, y1: ny, t: t0 + L / maxLen * (1 - t0) * .9 + depth * .02, d: depth}); px = nx; py = ny;
        if (depth < 3 && rnd() < .13 - depth * .02) grow(px, py, d + (rnd() < .5 ? -1 : 1) * (.5 + rnd() * .6), L, depth + 1, t0);
      }
    };
    grow(x, y, base, 0, 0, 0); segs.sort((a, b) => a.t - b.t);
    const mt = segs.length ? segs[segs.length - 1].t : 1; segs.forEach(s => s.t /= mt);
    return {segs, c, age: 0, grow: 4.5 + rnd() * 3, hold: 2.5 + rnd() * 4, fade: 2.5, ang, w: .55 + rnd() * .5};
  }
  const spawnT = (i) => { let a, tries = 0; do { a = rnd() * TAU; tries++; } while (tries < 12 && tendrils.some((q, j) => j !== i && q && Math.abs(Math.atan2(Math.sin(a - q.ang), Math.cos(a - q.ang))) < .35)); return makeTendril(a); };
  const NT = mobile ? 7 : 11;
  for (let i = 0; i < NT; i++) { tendrils.push(spawnT(i)); tendrils[i].age = rnd() * 8; }
  /* nœuds & chemins (px) */
  let nodes = [], paths = [], circuits = [], posNodes = [], floats = [], pulses = [];
  let posIn = [];
  const orion = {flash: 0};
  function wobble(x0, y0, x1, y1, seed, amp) {
    const n = 46, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, sg = seed % 2 ? 1 : -1, pts = [];
    for (let j = 0; j <= n; j++) { const s = j / n, o = sg * amp * Math.sin(Math.PI * s) * (.75 + .25 * Math.sin(s * 9 + seed)) + .012 * R * Math.sin(s * 23 + seed * 2) * Math.sin(Math.PI * s);
      pts.push(x0 + dx * s + nx * o, y0 + dy * s + ny * o); }
    return pts;
  }
  function cum(poly) { const c = [0]; for (let i = 2; i < poly.length; i += 2) c.push(c[c.length - 1] + Math.hypot(poly[i] - poly[i - 2], poly[i + 1] - poly[i - 1])); return c; }
  function at(poly, c, d) { d = Math.max(0, Math.min(c[c.length - 1], d)); let i = 1; while (i < c.length - 1 && c[i] < d) i++; const k = (d - c[i - 1]) / ((c[i] - c[i - 1]) || 1); return [poly[2 * (i - 1)] + (poly[2 * i] - poly[2 * (i - 1)]) * k, poly[2 * (i - 1) + 1] + (poly[2 * i + 1] - poly[2 * (i - 1) + 1]) * k]; }
  function layout() {
    const r = cv.getBoundingClientRect(); W = Math.max(200, r.width); H = Math.max(200, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2);
    cv.width = cv2.width = Math.round(W * dpr); cv.height = cv2.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); o2.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = H / 2 + (W < 500 ? 4 : 0); R = Math.min(W * .29, H * .29); sx = Math.max(1, Math.min(1.75, W / H * .95));
    nodes = MODS.map((m, i) => { const a = m.a * Math.PI / 180; return Object.assign({}, m, {x: cx + Math.cos(a) * R * 1.45 * sx, y: cy + Math.sin(a) * R * 1.45, flash: 0, i}); });
    paths = nodes.map((n, i) => { const pts = wobble(cx, cy, n.x, n.y, i + 1, R * .16); return {pts, cum: cum(pts), n, next: 1 + rnd() * 2.5}; });
    circuits = nodes.map((n, i) => {
      const sideX = n.x < cx ? 12 : W - 12, ty = n.y < cy ? 16 : H - 16, x1 = n.x + (sideX - n.x) * .5, y2 = n.y + (ty - n.y) * .6, x0 = n.x + (n.x < cx ? -1 : 1) * 34;
      const poly = [x0, n.y, x1, n.y, x1, y2, sideX, y2], c = cum(poly); return {poly, cum: c, d: rnd() * c[c.length - 1], v: (mobile ? 120 : 170) * (.8 + rnd() * .5), col: i % 2 ? '255,45,117' : '46,230,214'}; });
    buildPos(); if (RM) still();
  }
  function buildPos() {
    const n = posIn.length; posNodes = posIn.map((p, i) => { const a = -Math.PI / 2 + i * TAU / n; return Object.assign({}, p, {a, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, next: 1.2 + rnd() * 3 + i * .5}); });
  }
  /* rendu */
  function drawRing() {
    const breathe = 1 + .012 * Math.sin(t * .5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 22; ctx.strokeStyle = 'rgba(214,60,255,.016)'; ctx.beginPath(); ctx.arc(cx, cy, R * breathe, 0, TAU); ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,45,117,.018)'; ctx.beginPath(); ctx.arc(cx, cy, R * breathe, 0, TAU); ctx.stroke();
    cnt.fill(0);
    for (let i = 0; i < N; i++) {
      const a = th[i] + spd[i] * t, rr = R * (breathe + off[i]) + .004 * R * Math.sin(t * fr[i] + ph[i]);
      const lv = Math.min(2, ((Math.sin(t * fr[i] * 1.7 + ph[i]) * .5 + .5) * 3) | 0), b = grp[i] * 3 + lv;
      bx[i] = cx + Math.cos(a) * rr; by[i] = cy + Math.sin(a) * rr; bk[i] = b; cnt[b]++;
    }
    let s = 0; const st = new Uint16Array(16); for (let b = 0; b < 15; b++) { st[b] = s; s += cnt[b]; }
    for (let i = 0; i < N; i++) ord[st[bk[i]]++] = i;
    let p = 0;
    for (let b = 0; b < 15; b++) {
      const e = p + cnt[b]; if (e === p) continue; const lv = b % 3, sz = lv === 2 ? 1.9 : 1.2;
      ctx.fillStyle = 'rgba(' + COL[(b / 3) | 0] + ',' + LV[lv] + ')'; ctx.beginPath();
      for (let j = p; j < e; j++) { const i = ord[j]; ctx.rect(bx[i] - sz / 2, by[i] - sz / 2, sz, sz); }
      ctx.fill(); p = e;
    }
  }
  function drawTendrils(dt) {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < tendrils.length; i++) {
      const q = tendrils[i]; q.age += RM ? 0 : dt; const tot = q.grow + q.hold + q.fade;
      if (q.age > tot) { tendrils[i] = spawnT(i); continue; }
      const g = Math.min(1, q.age / q.grow), life = q.age < q.grow + q.hold ? 1 : 1 - (q.age - q.grow - q.hold) / q.fade, gg = 1 - Math.pow(1 - g, 2);
      const c = q.c.join(','); ctx.strokeStyle = 'rgba(' + c + ',' + (.11 * life).toFixed(3) + ')'; ctx.lineWidth = q.w; ctx.beginPath();
      let tip = null;
      for (const s of q.segs) { if (s.t > gg) break; ctx.moveTo(cx + s.x0 * R, cy + s.y0 * R); ctx.lineTo(cx + s.x1 * R, cy + s.y1 * R); tip = s; }
      ctx.stroke();
      if (tip && g < 1) { ctx.fillStyle = 'rgba(' + c + ',.35)'; ctx.fillRect(cx + tip.x1 * R - 1.2, cy + tip.y1 * R - 1.2, 2.4, 2.4); }
      else if (g >= 1 && life > 0) { ctx.fillStyle = 'rgba(' + c + ',' + (.05 * life).toFixed(3) + ')'; for (const s of q.segs) if (s.d >= 2) ctx.fillRect(cx + s.x1 * R - 1, cy + s.y1 * R - 1, 2, 2); }
    }
  }
  function drawLinks(dt) {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1;
    for (const P of paths) { ctx.strokeStyle = 'rgba(' + P.n.c.join(',') + ',.028)'; ctx.beginPath(); ctx.moveTo(P.pts[0], P.pts[1]); for (let j = 2; j < P.pts.length; j += 2) ctx.lineTo(P.pts[j], P.pts[j + 1]); ctx.stroke(); }
    for (const C of circuits) {
      ctx.strokeStyle = 'rgba(120,150,210,.03)'; ctx.beginPath(); ctx.moveTo(C.poly[0], C.poly[1]); for (let j = 2; j < C.poly.length; j += 2) ctx.lineTo(C.poly[j], C.poly[j + 1]); ctx.stroke();
      const L = C.cum[C.cum.length - 1]; C.d = (C.d + C.v * dt) % (L + 40);
      const a = at(C.poly, C.cum, C.d - 14), b = at(C.poly, C.cum, C.d); if (C.d < L) { ctx.strokeStyle = 'rgba(' + C.col + ',.28)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.lineWidth = 1; }
      const e = C.poly.length; ctx.fillStyle = 'rgba(' + C.col + ',.08)'; ctx.fillRect(C.poly[e - 2] - 2, C.poly[e - 1] - 2, 4, 4);
    }
    if (!RM) {
      for (const P of paths) { P.next -= dt; if (P.next <= 0) { pulses.push({P, back: rnd() < .3, k: 0, dur: 1 + rnd(), }); P.next = 1.4 + rnd() * 3; } }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const u = pulses[i]; u.k += dt / u.dur; const k = Math.min(1, u.k), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, d = (u.back ? 1 - e : e) * u.P.cum[u.P.cum.length - 1];
        const col = u.P.n.c.join(','), pt = at(u.P.pts, u.P.cum, d), tl = at(u.P.pts, u.P.cum, d + (u.back ? 14 : -14));
        ctx.strokeStyle = 'rgba(' + col + ',.45)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(tl[0], tl[1]); ctx.lineTo(pt[0], pt[1]); ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = 'rgba(' + col + ',.22)'; ctx.beginPath(); ctx.arc(pt[0], pt[1], 5, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(pt[0], pt[1], 1.7, 0, TAU); ctx.fill();
        if (u.k >= 1) { if (u.back) orion.flash = 1; else { u.P.n.flash = 1; if (onArrive) onArrive(u.P.n.k); } pulses.splice(i, 1); }
      }
    }
  }
  function box(x, y, w, h, c, fl, fill) {
    const ctx = o2;
    ctx.fillStyle = fill; ctx.fillRect(x - w / 2, y - h / 2, w, h);
    if (fl > 0) { ctx.fillStyle = 'rgba(' + c + ',' + (.22 * fl).toFixed(3) + ')'; ctx.fillRect(x - w / 2, y - h / 2, w, h); }
    ctx.lineWidth = 1 + fl * .8; ctx.strokeStyle = 'rgba(' + c + ',' + (.45 + .55 * fl).toFixed(3) + ')'; ctx.strokeRect(x - w / 2 + .5, y - h / 2 + .5, w - 1, h - 1);
    if (fl > .05) { ctx.strokeStyle = 'rgba(' + c + ',' + (.35 * fl).toFixed(3) + ')'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 - 2 - 3 * fl, y - h / 2 - 2 - 3 * fl, w + 4 + 6 * fl, h + 4 + 6 * fl); }
  }
  function drawNodes(dt) {
    const ctx = o2;
    ctx.globalCompositeOperation = 'source-over'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    try { ctx.letterSpacing = '0.6px'; } catch (e) {}
    for (const n of nodes) {
      n.flash = Math.max(0, n.flash - dt * 2.2);
      const w = 62, h = 26; box(n.x, n.y, w, h, n.c.join(','), n.flash, 'rgba(5,5,12,.7)');
      ctx.fillStyle = 'rgba(' + n.c.join(',') + ',' + (.85 + .15 * n.flash) + ')'; ctx.font = '700 9px ' + FONT.slice(4); ctx.fillText(n.k, n.x, n.y - 3);
      ctx.fillStyle = 'rgba(140,150,190,.85)'; ctx.font = '600 7px ' + FONT.slice(4); ctx.fillText(n.cap, n.x, n.y + 7);
    }
    /* ORION au centre */
    orion.flash = Math.max(0, orion.flash - dt * 2.2);
    tc.globalCompositeOperation = 'lighter';
    const gr = tc.createRadialGradient(cx, cy, 0, cx, cy, R * .3); gr.addColorStop(0, 'rgba(255,45,117,' + (.03 + .04 * orion.flash) + ')'); gr.addColorStop(1, 'rgba(255,45,117,0)');
    tc.fillStyle = gr; tc.beginPath(); tc.arc(cx, cy, R * .3, 0, TAU); tc.fill();
    tc.strokeStyle = 'rgba(255,45,117,.08)'; tc.setLineDash([2, 5]); tc.lineWidth = 1; tc.lineDashOffset = -t * 6; tc.beginPath(); tc.arc(cx, cy, R * .27, 0, TAU); tc.stroke(); tc.setLineDash([]);
    box(cx, cy, 58, 30, '255,45,117', orion.flash, 'rgba(5,5,12,.8)');
    ctx.fillStyle = '#ffd6e4'; ctx.font = '700 10px ' + FONT.slice(4); ctx.fillText('ORION', cx, cy - 3); ctx.fillStyle = 'rgba(255,140,175,.85)'; ctx.font = '600 7px ' + FONT.slice(4); ctx.fillText('DIRECTEUR', cx, cy + 8);
  }
  function drawPos(dt) {
    const ctx = o2; ctx.globalCompositeOperation = 'source-over';
    for (const p of posNodes) {
      const c = p.pnl > 0 ? '43,245,154' : p.pnl < 0 ? '255,77,106' : '150,160,200', cs = p.pnl > 0 ? '#2bf59a' : p.pnl < 0 ? '#ff4d6a' : '#96a0c8';
      ctx.fillStyle = 'rgba(' + c + ',.18)'; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, TAU); ctx.fill(); ctx.fillStyle = cs; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill();
      const lx = cx + Math.cos(p.a) * R * .8, ly = cy + Math.sin(p.a) * R * .8, al = Math.cos(p.a) > .35 ? 'right' : Math.cos(p.a) < -.35 ? 'left' : 'center';
      const w = 54, hh = 24, bxl = al === 'right' ? lx + 6 - w : al === 'left' ? lx - 6 : lx - w / 2;
      ctx.fillStyle = 'rgba(5,5,12,.82)'; ctx.fillRect(bxl, ly - hh / 2, w, hh); ctx.strokeStyle = 'rgba(' + c + ',.5)'; ctx.lineWidth = 1; ctx.strokeRect(bxl + .5, ly - hh / 2 + .5, w - 1, hh - 1);
      ctx.textAlign = 'center'; ctx.fillStyle = '#e8ebff'; ctx.font = '700 8.5px ' + FONT.slice(4); ctx.fillText(p.s.slice(0, 7), bxl + w / 2, ly - 4);
      ctx.fillStyle = cs; ctx.font = '700 8.5px ' + FONT.slice(4); ctx.fillText(pct(p.pc), bxl + w / 2, ly + 6);
      if (!RM) { p.next -= dt; if (p.next <= 0) { floats.push({x: p.x, y: p.y - 12, txt: eur(p.pnl, true), cs, k: 0}); p.next = 4 + rnd() * 5; } }
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.k += dt / 1.1; if (f.k >= 1) { floats.splice(i, 1); continue; }
      const e = 1 - Math.pow(1 - f.k, 2), a = f.k < .15 ? f.k / .15 : 1 - (f.k - .15) / .85;
      ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = f.cs; ctx.font = '700 11px ' + FONT.slice(4); ctx.textAlign = 'center'; ctx.shadowColor = f.cs; ctx.shadowBlur = 8; ctx.fillText(f.txt, f.x, f.y - 26 * e); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
  }
  function frame(dt, clear) {
    ctx.globalCompositeOperation = 'destination-out'; if (clear) ctx.clearRect(0, 0, W, H); else { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(0, 0, W, H); }
    o2.clearRect(0, 0, W, H);
    drawRing(); drawTendrils(dt); drawLinks(dt); drawNodes(dt); drawPos(dt);
  }
  function still() { t = 3; for (const q of tendrils) q.age = q.grow + 1; frame(0, true); for (let i = 0; i < 14; i++) frame(0, false); }
  function loop(ts) {
    if (!running) return; raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts; t += dt;
    frame(dt, false);
    ema += (dt - ema) * .05; nfr++; fpsN++; if (ts - fpsT > 1000) { fps = fpsN * 1000 / (ts - fpsT); fpsN = 0; fpsT = ts; }
    if (nfr % 90 === 0 && ema > .026 && N > 900) { N = Math.max(900, Math.floor(N * .75)); }     // allège si l'appareil rame
  }
  function start() { if (RM || running) return; running = true; last = performance.now(); fpsT = last; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  const ro = new ResizeObserver(() => { layout(); }); ro.observe(cv);
  layout();
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : (vis && start()); });
  let vis = true; if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; vis && !document.hidden ? start() : stop(); }).observe(cv);
  start();
  return {setPositions(rows) { posIn = rows; buildPos(); if (RM) still(); }, fps: () => fps, count: () => N};
}

/* ===================== démarrage ===================== */
try {
  hero = Field($('cv'), $('cv2'), k => { const r = document.querySelector('.row[data-m="' + k + '"]'); if (r) { r.classList.add('hit'); setTimeout(() => r.classList.remove('hit'), 450); } });
  window.__orion = {fps: () => hero.fps(), n: () => hero.count()};
} catch (e) { console.error(e); }
load();
setInterval(() => { if (!document.hidden) load(); }, 5 * 60e3);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
