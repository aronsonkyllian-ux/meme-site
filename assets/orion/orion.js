/* ORION · ULTRA 1.2 — lit uniquement data/paper10.json et data/ui.json (publiés par le cycle). Aucune valeur inventée : donnée absente = « — ».
   La scène animée est purement décorative. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const BOOK = 'ultra-1.2-test';
const DATA = new URL('../../data/', document.currentScript.src).href;     // fonctionne depuis /preview/ comme depuis la racine
const ok = x => typeof x === 'number' && isFinite(x);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const fmt = (o) => new Intl.NumberFormat('fr-FR', o);
const eur = (x, sign) => ok(x) ? fmt({style: 'currency', currency: 'EUR', signDisplay: sign ? 'exceptZero' : 'auto'}).format(x).replace('-', '−') : '—';
const eur0 = x => ok(x) ? fmt({style: 'currency', currency: 'EUR', maximumFractionDigits: Number.isInteger(x) ? 0 : 2}).format(x) : '—';
const pct = x => ok(x) ? fmt({style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero'}).format(x).replace('-', '−') : '—';
const cls = x => !ok(x) ? 'z' : x > 0.00004 ? 'g' : x < -0.00004 ? 'r' : 'z';
const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const get = async f => { try { const r = await fetch(DATA + f + '.json?' + Date.now(), {cache: 'no-store'}); return r.ok ? await r.json() : null; } catch (e) { return null; } };

/* ---------- logotype & ciel ---------- */
document.querySelectorAll('.logo span').forEach((s, i) => s.style.setProperty('--i', i));
(function stars() {
  const mk = (n, max) => { const a = []; for (let i = 0; i < n; i++) { const x = Math.random() * 100, y = Math.random() * 100, s = Math.random() * 0.6 + .4, o = (Math.random() * .6 + .4).toFixed(2);
    a.push(`${x.toFixed(1)}vw ${y.toFixed(1)}vh 0 ${s.toFixed(2)}px rgba(${200 + Math.random() * 55 | 0},${215 + Math.random() * 40 | 0},255,${o})`); } return a.join(','); };
  [['.l1', 34], ['.l2', 30], ['.l3', 22]].forEach(([q, n]) => { const e = document.querySelector(q); if (e) e.style.boxShadow = mk(n); });
})();

/* ---------- capital ---------- */
let counted = false;
function countUp(el, to, f) {
  if (RM || counted) { el.textContent = f(to); return; }
  counted = true; const t0 = performance.now(), D = 1300;
  const step = t => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 4); el.textContent = f(1000 + (to - 1000) * e); if (k < 1) requestAnimationFrame(step); else el.textContent = f(to); };
  requestAnimationFrame(step);
}
function spark(pts, base) {
  const W = 300, Hh = 96, p = 6;
  const t0 = pts[0].ts, t1 = pts[pts.length - 1].ts, vs = pts.map(q => q.equity), lo = Math.min(...vs, base), hi = Math.max(...vs, base), pad = (hi - lo) * .15 || 1;
  const X = t => p + (t - t0) / ((t1 - t0) || 1) * (W - 2 * p - 6), Y = v => Hh - 8 - (v - (lo - pad)) / ((hi + pad) - (lo - pad)) * (Hh - 16);
  const line = pts.map((q, i) => (i ? 'L' : 'M') + X(q.ts).toFixed(1) + ' ' + Y(q.equity).toFixed(1)).join(' ');
  const last = pts[pts.length - 1], up = last.equity >= base, c = up ? '#22f08a' : '#ff5d73';
  return `<svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" role="img" aria-label="Courbe du capital depuis le départ">
    <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" x2="${W}" y1="${Y(base).toFixed(1)}" y2="${Y(base).toFixed(1)}" stroke="rgba(160,180,255,.28)" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>
    <path class="ar" d="${line} L${X(t1).toFixed(1)} ${Hh} L${X(t0).toFixed(1)} ${Hh}Z" fill="url(#sg)"/>
    <path class="ln" pathLength="1" d="${line}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" style="filter:drop-shadow(0 0 5px ${c})"/>
  </svg>`;
}
function dotOverlay(pts, base) {   // point final en HTML (évite la déformation du SVG étiré)
  const vs = pts.map(q => q.equity), lo = Math.min(...vs, base), hi = Math.max(...vs, base), pad = (hi - lo) * .15 || 1, t0 = pts[0].ts, t1 = pts[pts.length - 1].ts;
  const last = pts[pts.length - 1], c = last.equity >= base ? '#22f08a' : '#ff5d73';
  const xp = (6 + (t1 - t0) / ((t1 - t0) || 1) * (300 - 12 - 6)) / 300 * 100, yp = (96 - 8 - (last.equity - (lo - pad)) / ((hi + pad) - (lo - pad)) * 80) / 96 * 100;
  return `<span class="dot" style="position:absolute;left:${xp}%;top:${yp}%;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:${c};box-shadow:0 0 10px ${c}"><i class="pulse" style="position:absolute;inset:0;border-radius:50%;border:1.5px solid ${c}"></i></span>`;
}
function renderCap(p) {
  const b = p && p.carnets && p.carnets[BOOK], base = p && ok(p.capital) ? p.capital : null;
  const eq = $('eq'), perf = $('perf'), sp = $('spark');
  const c = b && Array.isArray(b.courbe) ? b.courbe.filter(q => ok(q.equity) && ok(q.ts)) : [];
  if (!c.length || base === null) { eq.textContent = '—'; eq.classList.add('na'); perf.innerHTML = '<span class="chip">—</span>'; sp.innerHTML = ''; return; }
  const last = c[c.length - 1], net = last.equity - base, rel = net / base;
  eq.classList.remove('na'); countUp(eq, last.equity, v => eur(v));
  perf.innerHTML = `<span class="chip ${cls(net)} ${net > 0.004 ? 'ar' : net < -0.004 ? 'ar' : ''}">${eur(net, true)} · ${pct(rel)}</span><span class="start">vs ${eur0(base)} de départ</span>`;
  sp.style.position = 'relative';
  sp.innerHTML = c.length > 1 ? spark(c, base) + dotOverlay(c, base) : '';
}

/* ---------- positions ---------- */
function renderPos(p, ui) {
  const b = p && p.carnets && p.carnets[BOOK], list = $('plist'), tot = $('ptot'), cnt = $('posCnt');
  if (!b || !Array.isArray(b.positions)) { list.innerHTML = '<div class="empty">—</div>'; tot.textContent = ''; cnt.textContent = ''; return; }
  const open = b.positions.filter(x => x.status === 'ouverte');
  const uiPos = (ui && ui.carnets && ui.carnets[BOOK] && ui.carnets[BOOK].positions_ouvertes) || [];
  const rows = open.map(x => { const q = uiPos.find(u => u.market === x.market) || {}; return {m: String(x.market || ''), amt: ok(q.cout) ? q.cout : null, pnl: ok(q.pnl_latent_net) ? q.pnl_latent_net : null, pc: ok(q.pnl_latent_net_pct) ? q.pnl_latent_net_pct : null}; })
    .sort((a, z) => (z.amt ?? -1) - (a.amt ?? -1));
  cnt.textContent = String(rows.length);
  if (!rows.length) { list.innerHTML = '<div class="empty">Aucune position ouverte</div>'; tot.textContent = ''; return; }
  list.innerHTML = rows.map((r, i) => {
    const sym = r.m.replace(/-EUR$/, ''), h = hue(sym), k = cls(r.pnl), w = ok(r.pc) ? Math.min(100, Math.abs(r.pc) / .1 * 100) : 0;
    return `<article class="pc ${k}" style="--i:${i};--w:${w.toFixed(0)}%"><div class="av" style="--hc:hsl(${h} 90% 55%);background:linear-gradient(135deg,hsl(${h} 90% 68%),hsl(${(h + 40) % 360} 85% 52%))">${esc(sym.slice(0, 4))}</div>
      <div class="pn"><b>${esc(sym)}</b><small>${r.amt === null ? '—' : eur(r.amt)} investis</small></div>
      <div class="pp"><b>${eur(r.pnl, true)}</b><span>${pct(r.pc)}</span></div></article>`; }).join('');
  const known = rows.filter(r => r.pnl !== null);
  if (known.length) { const s = known.reduce((a, r) => a + r.pnl, 0); tot.innerHTML = `Latent total <b class="${cls(s)}">${eur(s, true)}</b>`; } else tot.textContent = '';
}

/* ---------- pied : un seul badge discret ---------- */
function renderFoot(p, ui, st) {
  const b = ui && ui.carnets && ui.carnets[BOOK] && ui.carnets[BOOK].stats_clos, nmin = ui && ok(ui.n_min_conclusion) ? ui.n_min_conclusion : 30;
  $('badge').textContent = 'Paper trading · capital fictif · aucun ordre réel' + (b && ok(b.n_clos) && b.n_clos < nmin ? ` · ${b.n_clos} trades clos : rien de prouvé` : '');
  const g = (st && st.genere) || (p && p.genere), e = $('stale');
  if (ok(g) && (Date.now() - g) > 4 * 3600e3) { e.hidden = false; e.textContent = 'données non rafraîchies depuis ' + Math.floor((Date.now() - g) / 3600e3) + ' h'; } else e.hidden = true;
}

async function load() {
  const [p, ui, st] = await Promise.all([get('paper10'), get('ui'), get('status')]);
  const safe = f => { try { f(); } catch (e) { console.error(e); } };
  safe(() => renderCap(p)); safe(() => renderPos(p, ui)); safe(() => renderFoot(p, ui, st));
}

/* ---------- personnages (décoratifs) ---------- */
const C = {
  orion: ['#ffc857', '#ff8a3d'], scout: ['#38d6ff', '#2b7bff'], trader: ['#22f08a', '#0fb36a'], sentinel: ['#ff5d73', '#ff9a4d'], research: ['#b98cff', '#7a5cff']};
function bot(k, acc) {
  const [a, b] = C[k], u = 'c_' + k;
  const defs = `<defs>
    <linearGradient id="${u}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4670"/><stop offset=".55" stop-color="#1b2243"/><stop offset="1" stop-color="#0f1430"/></linearGradient>
    <linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3358"/><stop offset="1" stop-color="#10152f"/></linearGradient>
    <radialGradient id="${u}v" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${a}" stop-opacity=".55"/><stop offset=".5" stop-color="#0a1030"/><stop offset="1" stop-color="#04050f"/></radialGradient>
    <linearGradient id="${u}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${a}"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></linearGradient>
    <linearGradient id="${u}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="#3a1233"/></linearGradient></defs>`;
  const cape = k === 'orion' ? `<path class="cape" d="M26 60 Q6 88 16 106 Q40 96 64 106 Q74 88 54 60Z" fill="url(#${u}c)" stroke="${a}" stroke-opacity=".5"/>` : '';
  const top = k === 'orion'
    ? `<g class="glw"><circle cx="28" cy="9" r="3" fill="${a}"/><circle cx="40" cy="6.5" r="3.4" fill="#fff3c4"/><circle cx="52" cy="9" r="3" fill="${a}"/></g><path d="M28 9 L40 6.5 L52 9" stroke="${a}" stroke-opacity=".5" fill="none"/>`
    : `<line x1="40" y1="14" x2="40" y2="5" stroke="${a}" stroke-width="2" stroke-linecap="round"/><circle class="glw" cx="40" cy="4.5" r="3" fill="${a}"/>`;
  const body = `<ellipse class="flame" cx="40" cy="96" rx="7" ry="11" fill="url(#${u}f)"/>
    <rect x="13" y="62" width="11" height="24" rx="5.5" fill="url(#${u}b)" stroke="${a}" stroke-opacity=".4"/><rect x="56" y="62" width="11" height="24" rx="5.5" fill="url(#${u}b)" stroke="${a}" stroke-opacity=".4"/>
    <rect x="23" y="58" width="34" height="38" rx="13" fill="url(#${u}b)" stroke="${a}" stroke-opacity=".55"/>
    <rect x="23" y="80" width="34" height="3" fill="${a}" opacity=".5"/><circle class="glw" cx="40" cy="70" r="4.6" fill="${a}"/><circle cx="40" cy="70" r="8" fill="none" stroke="${a}" stroke-opacity=".35"/>
    <rect x="14" y="14" width="52" height="46" rx="22" fill="url(#${u}h)" stroke="${a}" stroke-width="1.4"/>
    <rect x="21" y="24" width="38" height="28" rx="14" fill="url(#${u}v)" stroke="${a}" stroke-opacity=".35"/>
    <g class="blink"><ellipse cx="32.5" cy="38" rx="3.2" ry="4.6" fill="${a}"/></g><g class="blink" style="animation-delay:.05s"><ellipse cx="47.5" cy="38" rx="3.2" ry="4.6" fill="${a}"/></g>
    <path d="M25 30 Q31 26 41 27" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="14" cy="38" r="3.4" fill="${a}"/><circle cx="66" cy="38" r="3.4" fill="${a}"/>`;
  const acc2 = {
    orion: `<g class="holo"><ellipse cx="40" cy="104" rx="38" ry="8" fill="none" stroke="${a}" stroke-opacity=".6" stroke-dasharray="6 5"/></g>`,
    scout: `<g transform="translate(62 76) rotate(-42)"><rect x="-2" y="-4" width="26" height="8" rx="3" fill="#1d2a52" stroke="${a}"/><rect x="21" y="-6" width="8" height="12" rx="2" fill="${a}"/></g>
      <circle class="ping" cx="82" cy="55" r="12" fill="none" stroke="${a}" stroke-width="1.5"/><circle class="ping" style="--pd:1.3s" cx="82" cy="55" r="12" fill="none" stroke="${a}" stroke-width="1.5"/>`,
    trader: `<g><rect x="62" y="50" width="34" height="38" rx="6" fill="rgba(34,240,138,.08)" stroke="${a}" stroke-opacity=".8"/>
      <g stroke="${a}" stroke-width="1.4"><line x1="70" y1="60" x2="70" y2="82"/><line x1="78" y1="58" x2="78" y2="78"/><line x1="86" y1="62" x2="86" y2="84"/></g>
      <rect class="cdl" style="--pd:0s" x="67" y="66" width="6" height="12" rx="1" fill="${a}"/><rect class="cdl" style="--pd:.6s" x="75" y="62" width="6" height="12" rx="1" fill="#fff" opacity=".85"/><rect class="cdl" style="--pd:1.2s" x="83" y="68" width="6" height="12" rx="1" fill="${a}"/>
      <polyline class="trend" points="65,82 72,76 79,79 87,64 93,60" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></g>`,
    sentinel: `<g class="shield"><path d="M-3 54 L12 60 V76 Q12 90 -3 97 Q-18 90 -18 76 V60Z" fill="rgba(255,93,115,.14)" stroke="${a}" stroke-width="1.8"/><path d="M-8 74 L-3 79 L5 68" stroke="${a}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
      <circle class="ping" cx="-3" cy="76" r="17" fill="none" stroke="${a}" stroke-width="1.4"/>`,
    research: `<g class="swing"><line x1="66" y1="84" x2="75" y2="70" stroke="#c9b6ff" stroke-width="3.4" stroke-linecap="round"/><circle cx="82" cy="58" r="12" fill="rgba(185,140,255,.14)" stroke="${a}" stroke-width="2.6"/><path d="M76 54 Q79 50 84 50" stroke="#fff" stroke-opacity=".6" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>
      <circle class="tw2" style="--pd:.3s" cx="-6" cy="30" r="2" fill="${a}"/><circle class="tw2" style="--pd:1s" cx="92" cy="26" r="1.6" fill="#fff"/><circle class="tw2" style="--pd:1.6s" cx="-2" cy="52" r="1.5" fill="${a}"/>`};
  return `<svg viewBox="-20 0 118 114" aria-hidden="true">${defs}${cape}${body}${top}${acc2[k]}</svg>`;
}
(function scene() {
  const st = $('stage'); if (!st) return;
  const names = {scout: 'SCOUT', trader: 'TRADER', sentinel: 'SENTINEL', research: 'RESEARCH'};
  const slot = (k, a, w, t, d) => `<div class="arm" style="--a:${a}deg"><div class="slot" style="--w:${w}%"><div class="up" style="--a:${a}deg"><div class="cnt-rot" style="--t:${t}s"><div class="bob ch" style="--k:${C[k][0]};--bd:${d}s">${bot(k)}<span class="tag">${names[k]}</span></div></div></div></div></div>`;
  st.innerHTML =
    `<div class="pulse-r" style="--pd:0s"></div><div class="pulse-r" style="--pd:1.8s"></div><div class="pulse-r" style="--pd:3.6s"></div>
     <i class="planet"></i><div class="orbit" style="--d:54%;--t:44s">${slot('scout', 0, 38, 44, 0)}${slot('trader', 180, 38, 44, -1.4)}<div class="arm" style="--a:95deg"><i class="moon"></i></div></div>
     <div class="orbit rev" style="--d:80%;--t:70s">${slot('sentinel', 90, 26, 70, -.7)}${slot('research', 270, 26, 70, -2.1)}<div class="arm" style="--a:30deg"><i class="moon m2"></i></div></div>
     <div class="hub"><div class="bob ch" style="--k:${C.orion[0]};--bd:-.4s">${bot('orion')}<span class="tag" style="font-size:clamp(8px,2.6vw,12px)">ORION</span></div></div>`;
})();

load();
setInterval(() => { if (!document.hidden) load(); }, 5 * 60e3);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
