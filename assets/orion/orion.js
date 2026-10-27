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
const pct1 = x => ok(x) ? nf({style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero'}).format(x).replace('-', '−') : '—';
const cls = x => !ok(x) ? 'z' : x > 0.00004 ? 'g' : x < -0.00004 ? 'r' : 'z';
const get = async f => { try { const r = await fetch(DATA + f + '.json?' + Date.now(), {cache: 'no-store'}); return r.ok ? await r.json() : null; } catch (e) { return null; } };
const fmtDay = ts => ok(ts) ? new Intl.DateTimeFormat('fr-FR', {day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris'}).format(ts) : '—';
const ageStr = ms => { if (!ok(ms) || ms < 0) return '—'; const m = Math.floor(ms / 60e3); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); };
const sym = m => String(m || '').replace(/-EUR$/, '');

let hero = null, scanner = null;          // champ décoratif (défini plus bas)
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
function renderCap(p) {          // le panneau Capital est remplacé par le Scanner : il ne reste que les stats de l'en-tête (comme en v2)
  const b = p && p.carnets && p.carnets[BOOK], base = p && ok(p.capital) ? p.capital : null;
  const c = b && Array.isArray(b.courbe) ? b.courbe.filter(q => ok(q.equity) && ok(q.ts)) : [];
  if (!c.length || base === null) { $('s_eq').textContent = $('s_pl').textContent = '—'; return null; }
  const last = c[c.length - 1], net = last.equity - base;
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
/* ---- scanner : données réelles du dernier scan (wide.json, ultra.json, ui.json) ---- */
const EXCL = {volume24h_lt_10k_eur: 'volume 24 h < 10 k€', stablecoin: 'stablecoin', spread_gt_2pct: 'spread > 2 %'};
let funnelCounted = false;
function renderScan(wide, ultra, ui) {
  const inst = wide && Array.isArray(wide.instantanes) && wide.instantanes.length ? wide.instantanes.reduce((a, z) => (z.ts > a.ts ? z : a)) : null;
  const cyc = ui && ui.journal_ultra && Array.isArray(ui.journal_ultra.cycles) && ui.journal_ultra.cycles.length ? ui.journal_ultra.cycles.reduce((a, z) => (z.ts > a.ts ? z : a)) : null;
  const ex = wide && Array.isArray(wide.exclusions) ? wide.exclusions : [];
  const kept = (ex.find(e => e.k === 'retenu') || {}).n;
  const F = [
    {n: inst && inst.n_eur, l: 'MARCHÉS EUR<br>ANALYSÉS'}, {n: kept, l: 'RETENUS<br>UNIVERS LIQUIDE'},
    {n: cyc && cyc.n_anomalies, l: 'ANOMALIES<br>DÉTECTÉES'}, {n: cyc && cyc.n_deep, l: 'ANALYSE<br>APPROFONDIE'}, {n: cyc && Array.isArray(cyc.selected) ? cyc.selected.length : null, l: 'RETENU<br>POUR TRADE', k: 1}];
  const fe = $('funnel'); fe.innerHTML = F.map((f, i) => `<div class="fn ${f.k ? 'k' : ''}"><b data-n="${ok(f.n) ? f.n : ''}">${ok(f.n) ? f.n : '—'}</b><small>${f.l}</small></div>`).join('');
  if (!RM && !funnelCounted) { funnelCounted = true; fe.querySelectorAll('b[data-n]').forEach(b => { const to = +b.dataset.n; if (b.dataset.n === '') return; const t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / 1500), e = 1 - Math.pow(1 - k, 3); b.textContent = Math.round(to * e); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }); }
  const vf = cyc && cyc.verdicts_F ? Object.values(cyc.verdicts_F) : null, cnt = v => vf ? vf.filter(x => x === v).length : '—';
  const why = ex.filter(e => e.k !== 'retenu');
  const ex2 = inst && ok(inst.n_excluded) ? `<span><b>${inst.n_excluded}</b> écartés</span>` : '';
  $('why').innerHTML = ex2 + why.map(e => `<span>${esc(EXCL[e.k] || e.k)} <b>×${e.n}</b></span>`).join('') + (vf ? `<span class="k">retenu <b>×${cnt('selectionner')}</b></span><span class="w">surveillé <b>×${cnt('surveiller')}</b></span><span class="d">écarté <b>×${cnt('rejeter')}</b></span>` : '');
  const ts = inst ? inst.ts : cyc ? cyc.ts : null;
  $('scanMeta').textContent = [inst && ok(inst.n_eur) ? inst.n_eur + ' ANALYSÉES' : null, ok(kept) ? kept + ' RETENUES' : null, ok(ts) ? 'DERNIER SCAN IL Y A ' + ageStr(Date.now() - ts).toUpperCase() : null].filter(Boolean).join(' · ') || '—';
  $('scanNote').textContent = 'Animation décorative — rejoue les symboles réels du dernier scan' + (ok(ts) ? ' (' + new Intl.DateTimeFormat('fr-FR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'}).format(ts) + ', heure de Paris)' : '') + '. Les verdicts affichés sont ceux du cycle ; les % sont des variations 24 h réelles.';
  /* pool de symboles réels, priorité : verdict final > anomalie > détection > plus forte hausse 24 h */
  const m = new Map(), put = (s, o) => { if (s && !m.has(s)) m.set(s, o); };
  if (cyc && cyc.verdicts_F) for (const [mk, v] of Object.entries(cyc.verdicts_F)) put(sym(mk), v === 'selectionner' ? {kind: 'keep', tag: 'RETENU', w: 4} : v === 'rejeter' ? {kind: 'drop', tag: 'ÉCARTÉ', w: 4} : {kind: 'watch', tag: 'SURVEILLÉ', w: 3});
  const jr = ultra && Array.isArray(ultra.journal) ? ultra.journal : [], mx = jr.reduce((a, x) => Math.max(a, x.ts || 0), 0);
  jr.filter(x => x.ts === mx && x.fn === 'U-A' && x.observations && ok(x.observations.chg24)).forEach(x => put(sym(x.market), {kind: 'sig', tag: '▲ ' + pct1(x.observations.chg24), w: 2}));
  jr.filter(x => x.ts === mx && x.fn === 'A' && x.market && x.market[0] !== '*').forEach(x => put(sym(x.market), {kind: 'watch', tag: 'DÉTECTÉ', w: 1}));
  const th = wide && Array.isArray(wide.top_hausse_24h) ? wide.top_hausse_24h : [];
  th.forEach(x => put(sym(x.market), ok(x.last) && ok(x.open) && x.open > 0 ? {kind: 'sig', tag: '▲ ' + pct1((x.last - x.open) / x.open), w: 1} : {kind: 'none', tag: '', w: 1}));
  const pool = [...m].map(([s, o]) => Object.assign({s}, o));
  if (scanner) scanner.setPool(pool);
}
async function load() {
  const [p, ui, st, team, wide, ultra] = await Promise.all([get('paper10'), get('ui'), get('status'), get('team'), get('wide'), get('ultra')]);
  const safe = f => { try { f(); } catch (e) { console.error(e); } };
  const rows = openRows(p, ui); state.pos = rows || [];
  safe(() => renderHead(p, st)); safe(() => renderCap(p)); safe(() => renderPos(rows)); safe(() => renderHeat(rows));
  safe(() => renderLog(p, ui)); safe(() => renderStn(team)); safe(() => renderFoot(ui)); safe(() => renderScan(wide, ultra, ui));
  if (hero) hero.setPositions(state.pos.filter(r => r.pnl !== null).map(r => ({s: r.s, pnl: r.pnl, pc: r.pc})));
}

/* ===================== BUREAU ORION : mascottes holographiques + anneau de décision (décoratif) ===================== */
const TAU = Math.PI * 2, rnd = Math.random;
const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,"Roboto Mono","DejaVu Sans Mono",monospace';
const PA = s => new Path2D(s);
const SH = {   // silhouettes en unités (pieds y=0, sommet ≈ -100)
  body: PA('M0 -76 L-15 -73 Q-20 -60 -12 -40 L-14 0 L-4 0 L0 -20 L4 0 L14 0 L12 -40 Q20 -60 15 -73 Z'),
  head: PA('M0 -97 C7 -97 10 -91 9 -85 C8 -79 4 -76 0 -76 C-4 -76 -8 -79 -9 -85 C-10 -91 -7 -97 0 -97Z'),
  arms: PA('M-16 -72 Q-25 -56 -21 -38 M16 -72 Q25 -56 21 -38'),
  armsR: PA('M-16 -72 Q-25 -56 -21 -38 M16 -72 Q32 -70 29 -86'),
  cape: PA('M-13 -73 Q-46 -42 -40 5 L-6 -4 Q-3 -40 0 -74Z M13 -73 Q46 -42 40 5 L6 -4 Q3 -40 0 -74Z'),
  epa: PA('M-24 -75 L-10 -81 L-12 -70Z M24 -75 L10 -81 L12 -70Z'),
  hood: PA('M-10.5 -84 Q-12 -103 0 -112 Q12 -103 10.5 -84 Q0 -92 -10.5 -84Z'),
  headset: PA('M-10 -90 Q-11 -101 0 -101 Q11 -101 10 -90 M-10 -90 L-12 -82 L-9 -80 M-9 -80 Q-4 -73 3 -75'),
  crest: PA('M-3 -97 Q5 -113 17 -108 Q10 -105 7 -97'),
  pauld: PA('M-27 -75 L-11 -82 L-11 -67 Z M27 -75 L11 -82 L11 -67 Z'),
  tails: PA('M-12 -30 L-19 3 M12 -30 L19 3'),
  glasses: PA('M-8 -88 L8 -88 L7 -83 L-7 -83 Z')};
const CHARS = [
  {k: 'ORION', cap: 'DIRECTEUR', c: [255, 45, 117], w: 1.1, fills: ['body', 'head'], lines: ['body', 'head', 'arms', 'epa'], big: true},
  {k: 'SCOUT', cap: 'DÉTECTE', c: [46, 230, 214], w: .86, fills: ['body', 'head', 'hood'], lines: ['body', 'head', 'arms', 'hood']},
  {k: 'TRADER', cap: 'EXÉCUTE', c: [255, 77, 140], w: 1.1, fills: ['body', 'head'], lines: ['body', 'head', 'arms', 'headset']},
  {k: 'SENTINEL', cap: 'PROTÈGE', c: [255, 154, 60], w: 1.22, fills: ['body', 'head', 'pauld'], lines: ['body', 'head', 'arms', 'crest', 'pauld']},
  {k: 'RESEARCH', cap: 'TESTE', c: [165, 107, 255], w: .92, fills: ['body', 'head'], lines: ['body', 'head', 'armsR', 'tails', 'glasses']}];
const hexP = r => { const p = new Path2D(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; p[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } p.closePath(); return p; };
const HEX18 = hexP(18), HEX12 = hexP(12), HEX6 = hexP(6);
/* ex : {walk, look(-1..1), blink(0..1), carry} */
function drawChar(ctx, c, x, feet, h, t, fl, flip, ex) {
  const s = h / 100, col = c.c.join(','), br = 1 + .014 * Math.sin(t * 1.6 + c.ph), bob = ex.walk ? -Math.abs(Math.sin(t * 8.5 + c.ph)) * 3.2 : 1.6 * Math.sin(t * .9 + c.ph);
  ctx.save(); ctx.translate(x, feet);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(0, 0, h * .26, h * .07, 0, 0, TAU); ctx.fill();           // ombre au sol
  ctx.strokeStyle = `rgba(${col},.4)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, h * .26 + 1, h * .07 + .5, 0, 0, TAU); ctx.stroke();
  const ag = ctx.createRadialGradient(0, -h * .5, 0, 0, -h * .5, h * .8); ag.addColorStop(0, `rgba(${col},${.1 + .26 * fl + .03 * Math.sin(t * 2 + c.ph)})`); ag.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0, -h * .5, h * .8, 0, TAU); ctx.fill();
  ctx.translate(0, bob * s * .6); ctx.rotate(ex.walk ? (flip ? -1 : 1) * .04 * Math.sin(t * 8.5 + c.ph) : 0); ctx.scale((flip ? -1 : 1) * s, s * br);
  const lw = 1.25 / s;
  if (c.big) { ctx.globalAlpha = .5; ctx.fillStyle = `rgba(${col},.16)`; ctx.fill(SH.cape); ctx.strokeStyle = `rgba(${col},.55)`; ctx.lineWidth = lw; ctx.stroke(SH.cape); ctx.globalAlpha = 1; }
  const lg = ctx.createLinearGradient(0, -100, 0, 0); lg.addColorStop(0, `rgba(${col},${.5 + .3 * fl})`); lg.addColorStop(.6, `rgba(${col},.16)`); lg.addColorStop(1, `rgba(${col},.03)`);
  const lk = ex.look * 1.6, headOff = nm => (nm === 'head' || nm === 'hood' || nm === 'headset' || nm === 'crest' || nm === 'glasses') ? lk : 0;
  for (const nm of c.fills) {
    ctx.save(); ctx.translate(headOff(nm), 0); ctx.scale(nm === 'body' || nm === 'pauld' ? c.w : 1, 1); ctx.clip(SH[nm]); ctx.fillStyle = lg; ctx.fillRect(-60, -120, 120, 130);
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.6)'; const off = (t * 7) % 3.6; for (let y = -120 + off; y < 6; y += 3.6) ctx.fillRect(-60, y, 120, 1.25); ctx.restore();
  }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass ? `rgba(${col},.95)` : `rgba(${col},.16)`; ctx.lineWidth = pass ? lw : lw * 3.6;
    for (const nm of c.lines) { ctx.save(); ctx.translate(headOff(nm), 0); if (nm === 'body' || nm === 'pauld' || nm === 'arms' || nm === 'armsR' || nm === 'epa' || nm === 'tails') ctx.scale(c.w, 1); ctx.stroke(SH[nm]); ctx.restore(); }
  }
  const vw = c.k === 'SCOUT' ? 8.5 : 6, sx = Math.sin(t * (c.k === 'SCOUT' ? 2.1 : 1.3) + c.ph) * (vw - 1) * (1 - Math.abs(ex.look) * .5) + lk;
  ctx.strokeStyle = `rgba(${col},${.95 * (1 - ex.blink * .85)})`; ctx.lineWidth = 1.65 / s; ctx.beginPath(); ctx.moveTo(-vw + lk, -87); ctx.lineTo(vw + lk, -87); ctx.stroke();
  ctx.fillStyle = `rgba(255,255,255,${.95 * (1 - ex.blink)})`; ctx.fillRect(sx - 1.6, -88.2, 3.2, 2.4);
  ctx.strokeStyle = `rgba(${col},.95)`; ctx.fillStyle = `rgba(${col},.2)`; ctx.lineWidth = lw;
  if (c.k === 'ORION') {
    for (let i = -1; i <= 1; i++) { const a = .55 + .45 * Math.sin(t * 2 + i * 1.3); ctx.fillStyle = `rgba(255,236,244,${a})`; ctx.beginPath(); ctx.arc(i * 5, -61 + i * 1.5, 1.7, 0, TAU); ctx.fill(); }
    for (let i = -1; i <= 1; i++) { const a = .5 + .5 * Math.sin(t * 1.7 + i); ctx.fillStyle = `rgba(255,214,228,${a})`; ctx.beginPath(); ctx.arc(i * 9 + lk, -108 - (i ? 0 : 3), 2, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = `rgba(${col},.5)`; ctx.beginPath(); ctx.moveTo(-9 + lk, -108); ctx.lineTo(lk, -111); ctx.lineTo(9 + lk, -108); ctx.stroke(); ctx.beginPath(); ctx.ellipse(lk, -100, 17, 4.5, 0, 0, TAU); ctx.stroke();
  } else if (c.k === 'SCOUT') {
    ctx.lineWidth = 3.4 / s; ctx.beginPath(); ctx.moveTo(10, -70); ctx.lineTo(33, -79); ctx.stroke(); ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(35, -79.5, 3.4, 0, TAU); ctx.fill(); ctx.stroke();
    const k = .5 + .5 * Math.sin(t * 2.2 + c.ph), bg = ctx.createLinearGradient(38, 0, 96, 0); bg.addColorStop(0, `rgba(${col},${.28 + .2 * k})`); bg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(38, -80); ctx.lineTo(96, -100); ctx.lineTo(96, -60); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 2; i++) { const r = ((t * 13 + i * 11) % 22); ctx.strokeStyle = `rgba(${col},${(1 - r / 22) * .8})`; ctx.beginPath(); ctx.arc(38, -80, r + 3, -.7, .7); ctx.stroke(); }
  } else if (c.k === 'TRADER') {
    ctx.save(); ctx.translate(40, -72); ctx.strokeStyle = `rgba(${col},.7)`; ctx.fillStyle = `rgba(${col},.08)`; ctx.beginPath(); ctx.moveTo(-14, -24); ctx.lineTo(16, -20); ctx.lineTo(16, 20); ctx.lineTo(-14, 24); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 4; i++) { const x = -8 + i * 7, hh = 6 + 5 * Math.sin(t * 1.3 + i * 1.7 + c.ph), y = -4 * Math.sin(t * 1.1 + i * 2.1); ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,.85)' : `rgba(${col},.95)`; ctx.beginPath(); ctx.moveTo(x, y - hh - 3); ctx.lineTo(x, y + hh + 3); ctx.stroke(); ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.7)' : `rgba(${col},.8)`; ctx.fillRect(x - 2, y - hh * .6, 4, hh * 1.2); }
    ctx.restore();
  } else if (c.k === 'SENTINEL') {
    ctx.save(); ctx.translate(30, -46);
    ctx.fillStyle = `rgba(${col},${.12 + .3 * fl})`; ctx.fill(HEX18); ctx.lineWidth = lw * 1.6; ctx.stroke(HEX18); ctx.lineWidth = lw; ctx.strokeStyle = `rgba(${col},.6)`; ctx.stroke(HEX12);
    const r = (t * 9 + c.ph * 3) % 12; ctx.strokeStyle = `rgba(${col},${(1 - r / 12) * .7})`; ctx.save(); ctx.scale(1 + r / 14, 1 + r / 14); ctx.stroke(HEX18); ctx.restore();
    ctx.fillStyle = `rgba(255,255,255,${.5 + .3 * Math.sin(t * 2.4)})`; ctx.fill(HEX6); ctx.restore();
  } else if (c.k === 'RESEARCH') {
    ctx.save(); ctx.translate(31, -100); const cs = Math.cos(t * 1.4);
    ctx.fillStyle = `rgba(${col},.3)`; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5 * cs, 0); ctx.lineTo(0, 7); ctx.lineTo(-5 * cs, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = `rgba(${col},.8)`; for (let i = 0; i < 2; i++) { ctx.save(); ctx.rotate(t * (i ? -.9 : .7) + i * 1.1); ctx.beginPath(); ctx.ellipse(0, 0, 13, 4.3, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    for (let i = 0; i < 3; i++) { const a = t * 1.8 + i * 2.1; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(Math.cos(a) * 13, Math.sin(a) * 4.3, 1.1, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  if (ex.carry) {                                               // « signal » transporté
    const pz = .6 + .4 * Math.sin(t * 5); ctx.save(); ctx.translate(26, -64 + Math.sin(t * 4) * 2); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 12); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.35, `rgba(${col},.55)`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 12 * (.8 + .2 * pz), 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(3.2, 0); ctx.lineTo(0, 4); ctx.lineTo(-3.2, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}

/* Scène : bureau néon en vue 3/4 isométrique, table holographique au centre qui projette l'anneau de décision. */
function Field(cv0, cv, cv2, onArrive) {
  const s0 = cv0.getContext('2d'), ctx = cv.getContext('2d'), o2 = cv2.getContext('2d');
  const mobile = Math.min(innerWidth, innerHeight) < 700 || (matchMedia && matchMedia('(pointer:coarse)').matches);
  const NMAX = mobile ? 1500 : 3000;
  let N = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ? Math.floor(NMAX * .7) : NMAX;
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.2;
  const KY = .5;                                              // aplatissement isométrique
  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, k = 1, A = 200, B = 100, Hw = 64, R = 62, ringY = 0;
  let t = 0, running = false, raf = 0, last = 0, ema = 0.016, nfr = 0, fps = 0, fpsN = 0, fpsT = 0;
  const fl = (u, v, z = 0) => [cx + (u - v) * A / 2, cy + (u + v) * B / 2 - z];
  const wL = (s, z) => [cx - A / 2 - s, cy - B / 2 + s * B / A - z], wR = (s, z) => [cx + A / 2 + s, cy - B / 2 + s * B / A - z];
  const poly = (c, pts) => { c.beginPath(); pts.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p[0], p[1])); c.closePath(); };
  const circ = (fn, a, b, r, n = 28) => { const o = []; for (let i = 0; i < n; i++) { const q = i / n * TAU; o.push(fn(a + Math.cos(q) * r, b + Math.sin(q) * r)); } return o; };
  /* particules de l'anneau */
  const th = new Float32Array(NMAX), off = new Float32Array(NMAX), spd = new Float32Array(NMAX), ph = new Float32Array(NMAX), fr = new Float32Array(NMAX), grp = new Uint8Array(NMAX);
  for (let i = 0; i < NMAX; i++) {
    const a = rnd() * TAU, thick = .008 + .02 * (.5 + .5 * Math.sin(3 * a + 1.3)) + .004 * Math.sin(7 * a);
    th[i] = a; off[i] = gauss() * thick * 1.35 * (rnd() < .14 ? 3.4 : 1); spd[i] = .035 + rnd() * .035; ph[i] = rnd() * TAU; fr[i] = .5 + rnd() * 1.6;
    const u = ((a / TAU + .09 * gauss()) % 1 + 1) % 1, q = rnd();
    grp[i] = q < .03 ? 4 : q < .12 ? 3 : u < .38 ? 0 : u < .66 ? 1 : 2;
  }
  const COL = ['255,45,117', '226,60,255', '138,92,255', '46,230,214', '255,230,240'], LV = [.09, .15, .25];
  const bx = new Float32Array(NMAX), by = new Float32Array(NMAX), bk = new Uint8Array(NMAX), ord = new Uint16Array(NMAX), cnt = new Uint16Array(16), stt = new Uint16Array(16);
  const tendrils = [];
  function makeTendril(ang) {
    const segs = [], inward = rnd() < .22, base = inward ? ang + Math.PI : ang;
    const maxLen = (inward ? .3 : .4 + rnd() * .22), c = rnd() < .55 ? [46, 230, 214] : rnd() < .6 ? [255, 45, 117] : [190, 110, 255];
    let budget = 60;
    const grow = (x0, y0, dir, len, depth) => {
      let px = x0, py = y0, d = dir, L = len;
      for (let i = 0; i < 40 && budget > 0 && L < maxLen; i++) {
        d += (rnd() - .5) * .7; const step = .028 + rnd() * .02, nx = px + Math.cos(d) * step, ny = py + Math.sin(d) * step; L += step; budget--;
        segs.push({x0: px, y0: py, x1: nx, y1: ny, t: L / maxLen * .9 + depth * .02, d: depth}); px = nx; py = ny;
        if (depth < 3 && rnd() < .13 - depth * .02) grow(px, py, d + (rnd() < .5 ? -1 : 1) * (.5 + rnd() * .6), L, depth + 1);
      }
    };
    grow(Math.cos(ang), Math.sin(ang), base, 0, 0); segs.sort((a, b) => a.t - b.t);
    const mt = segs.length ? segs[segs.length - 1].t : 1; segs.forEach(s => s.t /= mt);
    return {segs, c, age: 0, grow: 4.5 + rnd() * 3, hold: 2.5 + rnd() * 4, fade: 2.5, ang, w: .55 + rnd() * .5};
  }
  const spawnT = i => { let a, tries = 0; do { a = rnd() * TAU; tries++; } while (tries < 12 && tendrils.some((q, j) => j !== i && q && Math.abs(Math.atan2(Math.sin(a - q.ang), Math.cos(a - q.ang))) < .35)); return makeTendril(a); };
  const NT = mobile ? 6 : 9;
  for (let i = 0; i < NT; i++) { tendrils.push(spawnT(i)); tendrils[i].age = rnd() * 8; }
  /* mascottes */
  const HOME = {ORION: [-.85, -.85], SCOUT: [-.68, .38], TRADER: [.38, -.68], SENTINEL: [-.1, .78], RESEARCH: [.78, -.1]};
  const actors = CHARS.map(c => { c.ph = rnd() * TAU; const h = HOME[c.k]; return {c, hu: h[0], hv: h[1], u: h[0], v: h[1], flash: 0, look: 0, lookT: 0, lookNext: 1 + rnd() * 3, blink: 0, blinkNext: 1.5 + rnd() * 3, walk: false, carry: false, face: null, x: 0, y: 0, h: 0}; });
  const A_ = n => actors.find(a => a.c.k === n);
  let errand = null, cool = 2.5, lastErr = -1, packets = [], floats = [], posNodes = [], posIn = [], tip = null, hits = [], beat = 1.2, oFl = 0;
  const ERR = [['SCOUT', 'TRADER', 1], ['TRADER', 'ORION', 0], ['SENTINEL', 'TABLE', 0], ['RESEARCH', 'TABLE', 1], ['ORION', 'TABLE', 0], ['SENTINEL', 'SCOUT', 0], ['RESEARCH', 'TRADER', 1]];
  function startErrand() {
    let i; do { i = (rnd() * ERR.length) | 0; } while (i === lastErr); lastErr = i; const [who, to, carry] = ERR[i], a = A_(who);
    let dest, target = null;
    if (to === 'TABLE') { const d = Math.hypot(a.hu, a.hv) || 1; dest = [a.hu / d * .47, a.hv / d * .47]; } else { target = A_(to); dest = [target.hu * .7, target.hv * .7]; }
    errand = {a, target, dest, phase: 'out', carry: !!carry, dwell: 0};
  }
  function stepActors(dt) {
    for (const a of actors) {
      a.flash = Math.max(0, a.flash - dt * 2); a.lookNext -= dt; a.blinkNext -= dt;
      if (a.lookNext <= 0) { a.lookT = [-1, 0, 1, 0][(rnd() * 4) | 0]; a.lookNext = 1.4 + rnd() * 3.2; }
      a.look += (a.lookT - a.look) * Math.min(1, dt * 6);
      if (a.blinkNext <= 0) { a.blink = 1; a.blinkNext = 2 + rnd() * 4; } a.blink = Math.max(0, a.blink - dt * 7);
      a.walk = false;
    }
    if (RM) return;
    if (!errand) { cool -= dt; if (cool <= 0) startErrand(); return; }
    const e = errand, a = e.a, mv = (tu, tv) => { const du = tu - a.u, dv = tv - a.v, d = Math.hypot(du, dv), sp = .3 * dt; a.walk = true; a.face = (du - dv) < 0; if (d <= sp) { a.u = tu; a.v = tv; return true; } a.u += du / d * sp; a.v += dv / d * sp; return false; };
    a.carryNow = false;
    if (e.phase === 'out') { a.carryNow = e.carry; if (mv(e.dest[0], e.dest[1])) { e.phase = 'dwell'; e.dwell = 1.6 + rnd() * .8; a.face = null;
        const [x0, y0] = chest(a), p = e.target ? chest(e.target) : [cx, ringY];
        sendPacket(x0, y0, p[0], p[1], a.c.c, .9, () => { if (e.target) { e.target.flash = 1; e.target.lookT = (a.x < e.target.x) ? 1 : -1; e.target.lookNext = 2; } else { oFl = 1; } if (onArrive) onArrive(e.target ? e.target.c.k : a.c.k); }); } }
    else if (e.phase === 'dwell') { e.dwell -= dt; a.carryNow = false; if (e.dwell <= 0) e.phase = 'back'; }
    else if (mv(a.hu, a.hv)) { errand = null; cool = 2 + rnd() * 3; a.face = null; }
  }
  const chest = a => [a.x, a.y - a.h * .55];
  function sendPacket(x0, y0, x1, y1, c, dur, cb) { packets.push({x0, y0, x1, y1, c, dur, k: 0, cb, am: (rnd() < .5 ? -1 : 1) * (10 + rnd() * 14) * k}); }
  /* ---- mise en page ---- */
  function layout() {
    const r = cv.getBoundingClientRect(); W = Math.max(200, r.width); H = Math.max(200, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2);
    for (const c of [cv0, cv, cv2]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); o2.setTransform(dpr, 0, 0, dpr, 0, 0);
    k = Math.min(W / 412, H / 412, 2.2); cx = W / 2; cy = H * .6; A = 206 * k; B = 103 * k; Hw = 64 * k; R = 62 * k; ringY = cy - 58 * k;
    posNodes.forEach(() => {}); buildPos(); paintStatic(); if (RM) still();
  }
  function buildPos() {
    const n = posIn.length; posNodes = posIn.map((p, i) => { const a = -Math.PI / 2 + i * TAU / n; return Object.assign({}, p, {a, x: cx + Math.cos(a) * R, y: ringY + Math.sin(a) * R * KY, next: 1.2 + rnd() * 3 + i * .5, ph: rnd() * TAU}); });
  }
  /* ---- décor statique (une seule fois par mise en page) ---- */
  function box(c, u0, v0, u1, v1, h, col, topF, sideF) {
    const T = [fl(u0, v0, h), fl(u1, v0, h), fl(u1, v1, h), fl(u0, v1, h)], Rf = [fl(u1, v0, h), fl(u1, v1, h), fl(u1, v1), fl(u1, v0)], Lf = [fl(u0, v1, h), fl(u1, v1, h), fl(u1, v1), fl(u0, v1)];
    poly(c, Lf); c.fillStyle = sideF; c.fill(); poly(c, Rf); c.fillStyle = 'rgba(6,6,16,.9)'; c.fill(); poly(c, T); c.fillStyle = topF; c.fill();
    c.strokeStyle = `rgba(${col},.75)`; c.lineWidth = 1.1; for (const p of [Lf, Rf, T]) { poly(c, p); c.stroke(); }
  }
  function paintStatic() {
    const s = s0; s.setTransform(dpr, 0, 0, dpr, 0, 0); s.clearRect(0, 0, W, H); s.lineJoin = 'round';
    /* sol */
    poly(s, [fl(-1, -1), fl(1, -1), fl(1, 1), fl(-1, 1)]); let g = s.createRadialGradient(cx, cy, 0, cx, cy, A); g.addColorStop(0, 'rgba(78,26,104,.6)'); g.addColorStop(1, 'rgba(14,8,32,.5)'); s.fillStyle = g; s.fill();
    s.strokeStyle = 'rgba(130,150,230,.09)'; s.lineWidth = 1; s.beginPath(); for (let i = -1; i <= 1.001; i += .25) { let p = fl(i, -1), q = fl(i, 1); s.moveTo(p[0], p[1]); s.lineTo(q[0], q[1]); p = fl(-1, i); q = fl(1, i); s.moveTo(p[0], p[1]); s.lineTo(q[0], q[1]); } s.stroke();
    s.strokeStyle = 'rgba(255,45,117,.16)'; s.lineWidth = 6; s.beginPath(); let p0 = fl(-1, 1); s.moveTo(p0[0], p0[1]); p0 = fl(1, 1); s.lineTo(p0[0], p0[1]); p0 = fl(1, -1); s.lineTo(p0[0], p0[1]); s.stroke();
    s.strokeStyle = 'rgba(255,45,117,.7)'; s.lineWidth = 1.3; s.stroke();
    /* murs */
    const wall = (fn, a0, a1, x0) => { poly(s, [fn(a0, Hw), fn(a1, Hw), fn(a1, 0), fn(a0, 0)]); const gg = s.createLinearGradient(0, cy - B - Hw, 0, cy); gg.addColorStop(0, 'rgba(34,14,60,.92)'); gg.addColorStop(1, 'rgba(12,8,28,.92)'); s.fillStyle = gg; s.fill();
      s.strokeStyle = 'rgba(255,45,117,.8)'; s.lineWidth = 1.3; let a = fn(a0, Hw), b = fn(a1, Hw); s.beginPath(); s.moveTo(a[0], a[1]); s.lineTo(b[0], b[1]); s.stroke();
      s.strokeStyle = 'rgba(46,230,214,.5)'; a = fn(a0, 0); b = fn(a1, 0); s.beginPath(); s.moveTo(a[0], a[1]); s.lineTo(b[0], b[1]); s.stroke(); };
    wall(wL, -A / 2, A / 2); wall(wR, -A / 2, A / 2);
    s.strokeStyle = 'rgba(255,200,225,.85)'; s.lineWidth = 1.6; s.beginPath(); let c0 = wL(-A / 2, Hw), c1 = wL(-A / 2, 0); s.moveTo(c0[0], c0[1]); s.lineTo(c1[0], c1[1]); s.stroke();
    /* fenêtres : skyline derrière Orion (2 murs), fenêtre étoilée de Scout */
    const win = (fn, s0_, s1_, z0, z1, kind, seed) => {
      const q = [fn(s0_, z1), fn(s1_, z1), fn(s1_, z0), fn(s0_, z0)]; poly(s, q); const gg = s.createLinearGradient(0, q[0][1], 0, q[3][1] + 4);
      if (kind === 'sky') { gg.addColorStop(0, 'rgba(60,20,96,.95)'); gg.addColorStop(1, 'rgba(255,45,117,.45)'); } else { gg.addColorStop(0, 'rgba(6,12,44,.95)'); gg.addColorStop(1, 'rgba(36,16,70,.9)'); }
      s.fillStyle = gg; s.fill(); s.save(); poly(s, q); s.clip(); let sd = seed;
      const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      if (kind === 'sky') { for (let i = 0; i < 9; i++) { const bw = (s1_ - s0_) / 9, bh = (z1 - z0) * (.25 + rr() * .5), a = fn(s0_ + i * bw, z0 + bh), b = fn(s0_ + (i + .86) * bw, z0 + bh), c = fn(s0_ + (i + .86) * bw, z0), d = fn(s0_ + i * bw, z0); poly(s, [a, b, c, d]); s.fillStyle = 'rgba(8,6,20,.95)'; s.fill(); s.strokeStyle = 'rgba(46,230,214,.5)'; s.lineWidth = 1; s.stroke(); for (let j = 0; j < 3; j++) { const pp = fn(s0_ + (i + .15 + rr() * .55) * bw, z0 + bh * (.2 + rr() * .7)); s.fillStyle = 'rgba(255,214,120,.8)'; s.fillRect(pp[0], pp[1], 1.4, 1.4); } } }
      else { for (let i = 0; i < 16; i++) { const pp = fn(s0_ + rr() * (s1_ - s0_), z0 + rr() * (z1 - z0)); s.fillStyle = `rgba(220,235,255,${.4 + rr() * .6})`; s.fillRect(pp[0], pp[1], 1.3, 1.3); }
        const pc = circ(fn, s0_ + (s1_ - s0_) * .72, z0 + (z1 - z0) * .6, 5.5 * k, 20); poly(s, pc); s.fillStyle = 'rgba(255,45,117,.6)'; s.fill(); const rg = [fn(s0_ + (s1_ - s0_) * .72 - 10 * k, z0 + (z1 - z0) * .6), fn(s0_ + (s1_ - s0_) * .72 + 10 * k, z0 + (z1 - z0) * .6)]; s.strokeStyle = 'rgba(255,200,225,.8)'; s.lineWidth = 1; s.beginPath(); s.moveTo(rg[0][0], rg[0][1]); s.lineTo(rg[1][0], rg[1][1]); s.stroke(); }
      s.restore(); poly(s, q); s.strokeStyle = 'rgba(46,230,214,.85)'; s.lineWidth = 1.3; s.stroke();
    };
    win(wL, -.46 * A, -.26 * A, 24 * k, 56 * k, 'sky', 11); win(wR, -.46 * A, -.26 * A, 24 * k, 56 * k, 'sky', 29);
    win(wL, .09 * A, .31 * A, 22 * k, 54 * k, 'night', 7);
    /* radar (mur gauche) */
    const rc = [-.05 * A, 38 * k], rr0 = 13 * k; poly(s, circ(wL, rc[0], rc[1], rr0)); s.fillStyle = 'rgba(4,16,24,.9)'; s.fill(); s.strokeStyle = 'rgba(46,230,214,.8)'; s.lineWidth = 1.2; s.stroke();
    for (const f of [.33, .66]) { poly(s, circ(wL, rc[0], rc[1], rr0 * f)); s.strokeStyle = 'rgba(46,230,214,.3)'; s.lineWidth = 1; s.stroke(); }
    /* écrans de Trader (cadres) */
    for (let i = 0; i < 3; i++) { const a = .02 * A + i * .135 * A, b = a + .115 * A, q = [wR(a, 54 * k), wR(b, 54 * k), wR(b, 26 * k), wR(a, 26 * k)]; poly(s, q); s.fillStyle = 'rgba(30,8,28,.9)'; s.fill(); s.strokeStyle = 'rgba(255,77,140,.9)'; s.lineWidth = 1.2; s.stroke(); }
    /* mobilier */
    box(s, -1, -1, -.62, -.62, 5 * k, '255,45,117', 'rgba(60,20,70,.9)', 'rgba(14,8,28,.95)');                  // estrade du directeur
    box(s, .08, -1, .72, -.86, 13 * k, '255,77,140', 'rgba(40,14,44,.95)', 'rgba(14,8,28,.95)');               // bureau Trader
    s.strokeStyle = 'rgba(255,77,140,.45)'; s.lineWidth = 3; s.beginPath(); let kb = fl(.22, -.9, 13 * k), kb2 = fl(.5, -.9, 13 * k); s.moveTo(kb[0], kb[1]); s.lineTo(kb2[0], kb2[1]); s.stroke();
    {                                                                                                             // télescope de Scout
      const hub = fl(-.84, .5, 26 * k); s.strokeStyle = 'rgba(46,230,214,.7)'; s.lineWidth = 1.2; s.beginPath(); for (const q of [[-.9, .42], [-.76, .46], [-.84, .62]]) { const f = fl(q[0], q[1]); s.moveTo(hub[0], hub[1]); s.lineTo(f[0], f[1]); } s.stroke();
      s.strokeStyle = 'rgba(46,230,214,.95)'; s.lineWidth = 4 * k; s.lineCap = 'round'; s.beginPath(); s.moveTo(hub[0] + 6 * k, hub[1] + 3 * k); s.lineTo(hub[0] - 20 * k, hub[1] - 10 * k); s.stroke(); s.lineCap = 'butt'; }
    box(s, -.52, .3, -.16, .48, 12 * k, '255,154,60', 'rgba(44,24,14,.95)', 'rgba(14,8,28,.95)');                // console Sentinel
    box(s, .3, -.52, .48, -.16, 12 * k, '165,107,255', 'rgba(30,18,50,.95)', 'rgba(14,8,28,.95)');               // paillasse Research
    for (let i = 0; i < 3; i++) { const b0 = fl(.34 + i * .05, -.4 + i * .08, 12 * k), b1 = fl(.34 + i * .05, -.4 + i * .08, (22 + i * 3) * k); s.strokeStyle = ['rgba(46,230,214,.9)', 'rgba(255,45,117,.9)', 'rgba(165,107,255,.95)'][i]; s.lineWidth = 3 * k; s.beginPath(); s.moveTo(b0[0], b0[1]); s.lineTo(b1[0], b1[1]); s.stroke(); }
    /* table holographique */
    const top = circ(fl, 0, 0, .27, 40).map((_, i, arr) => arr[i]); const topL = [], botL = [];
    for (let i = 0; i <= 20; i++) { const a = -Math.PI / 4 + i / 20 * Math.PI; topL.push(fl(Math.cos(a) * .27, Math.sin(a) * .27, 14 * k)); }
    for (let i = 20; i >= 0; i--) { const a = -Math.PI / 4 + i / 20 * Math.PI; botL.push(fl(Math.cos(a) * .27, Math.sin(a) * .27, 0)); }
    poly(s, topL.concat(botL)); s.fillStyle = 'rgba(14,8,34,.95)'; s.fill(); s.strokeStyle = 'rgba(46,230,214,.6)'; s.lineWidth = 1.1; s.stroke();
    poly(s, circ((u, v) => fl(u, v, 14 * k), 0, 0, .27, 40)); g = s.createRadialGradient(cx, cy - 14 * k, 0, cx, cy - 14 * k, 54 * k); g.addColorStop(0, 'rgba(255,45,117,.55)'); g.addColorStop(1, 'rgba(60,20,90,.8)'); s.fillStyle = g; s.fill(); s.strokeStyle = 'rgba(255,120,170,.95)'; s.lineWidth = 1.4; s.stroke();
    poly(s, circ((u, v) => fl(u, v, 14 * k), 0, 0, .46, 48)); s.setLineDash([3, 5]); s.strokeStyle = 'rgba(46,230,214,.25)'; s.lineWidth = 1; s.stroke(); s.setLineDash([]);
  }
  /* ---- anneau (projeté au-dessus de la table) ---- */
  function drawRing() {
    const breathe = 1 + .012 * Math.sin(t * .5), tableY = cy - 14 * k;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 12 * k; ctx.strokeStyle = 'rgba(214,60,255,.015)'; ctx.beginPath(); ctx.ellipse(cx, ringY, R * breathe, R * KY * breathe, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,45,117,.02)'; ctx.beginPath(); ctx.ellipse(cx, ringY, R * breathe, R * KY * breathe, 0, 0, TAU); ctx.stroke();
    /* faisceaux de projection table → anneau */
    ctx.strokeStyle = 'rgba(255,45,117,.05)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, x = cx + Math.cos(a) * R * .86, y0 = tableY + Math.sin(a) * R * .43 * KY * 2 * .5, y1 = ringY + Math.sin(a) * R * KY; ctx.moveTo(x, y0); ctx.lineTo(cx + Math.cos(a) * R, y1); } ctx.stroke();
    for (let i = 0; i < 26; i++) { const a = (i * 2.399) % TAU, f = (t * .22 + i * .137) % 1, x = cx + Math.cos(a) * R * (.86 + .14 * f), y = (tableY + Math.sin(a) * R * .43 * KY) + (ringY + Math.sin(a) * R * KY - (tableY + Math.sin(a) * R * .43 * KY)) * f; ctx.fillStyle = 'rgba(255,170,205,' + (.5 * Math.sin(f * Math.PI)) + ')'; ctx.fillRect(x - .7, y - .7, 1.5, 1.5); }
    cnt.fill(0);
    for (let i = 0; i < N; i++) {
      const a = th[i] + spd[i] * t, rr = R * (breathe + off[i]) + .004 * R * Math.sin(t * fr[i] + ph[i]);
      const front = Math.sin(a) > 0 ? 1 : 0, lv = Math.min(2, ((Math.sin(t * fr[i] * 1.7 + ph[i]) * .5 + .5) * 3 + front * .35) | 0), b = grp[i] * 3 + lv;
      bx[i] = cx + Math.cos(a) * rr; by[i] = ringY + Math.sin(a) * rr * KY; bk[i] = b; cnt[b]++;
    }
    let s = 0; for (let b = 0; b < 15; b++) { stt[b] = s; s += cnt[b]; }
    for (let i = 0; i < N; i++) ord[stt[bk[i]]++] = i;
    let p = 0;
    for (let b = 0; b < 15; b++) {
      const e = p + cnt[b]; if (e === p) continue; const lv = b % 3, sz = lv === 2 ? 1.8 : 1.15;
      ctx.fillStyle = 'rgba(' + COL[(b / 3) | 0] + ',' + LV[lv] + ')'; ctx.beginPath();
      for (let j = p; j < e; j++) { const i = ord[j]; ctx.rect(bx[i] - sz / 2, by[i] - sz / 2, sz, sz); }
      ctx.fill(); p = e;
    }
    const gr = ctx.createRadialGradient(cx, tableY, 0, cx, tableY, R * .9); gr.addColorStop(0, 'rgba(255,45,117,' + (.05 + .06 * oFl) + ')'); gr.addColorStop(1, 'rgba(255,45,117,0)');
    ctx.save(); ctx.translate(0, tableY); ctx.scale(1, .5); ctx.translate(0, -tableY); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, tableY, R * .9, 0, TAU); ctx.fill(); ctx.restore();
  }
  function drawTendrils(dt) {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < tendrils.length; i++) {
      const q = tendrils[i]; q.age += RM ? 0 : dt; const tot = q.grow + q.hold + q.fade;
      if (q.age > tot) { tendrils[i] = spawnT(i); continue; }
      const g = Math.min(1, q.age / q.grow), life = q.age < q.grow + q.hold ? 1 : 1 - (q.age - q.grow - q.hold) / q.fade, gg = 1 - Math.pow(1 - g, 2);
      const c = q.c.join(','); ctx.strokeStyle = 'rgba(' + c + ',' + (.11 * life).toFixed(3) + ')'; ctx.lineWidth = q.w; ctx.beginPath();
      let tipS = null;
      for (const s of q.segs) { if (s.t > gg) break; ctx.moveTo(cx + s.x0 * R, ringY + s.y0 * R * KY); ctx.lineTo(cx + s.x1 * R, ringY + s.y1 * R * KY); tipS = s; }
      ctx.stroke();
      if (tipS && g < 1) { ctx.fillStyle = 'rgba(' + c + ',.35)'; ctx.fillRect(cx + tipS.x1 * R - 1.2, ringY + tipS.y1 * R * KY - 1.2, 2.4, 2.4); }
      else if (g >= 1 && life > 0) { ctx.fillStyle = 'rgba(' + c + ',' + (.05 * life).toFixed(3) + ')'; for (const s of q.segs) if (s.d >= 2) ctx.fillRect(cx + s.x1 * R - 1, ringY + s.y1 * R * KY - 1, 2, 2); }
    }
  }
  function drawPackets(dt) {
    ctx.globalCompositeOperation = 'lighter';
    if (!RM) { beat -= dt; if (beat <= 0) { const a = actors[1 + ((rnd() * 4) | 0)], [x1, y1] = chest(a); sendPacket(cx, ringY, x1, y1, a.c.c, 1.1 + rnd() * .6, () => { a.flash = 1; if (onArrive) onArrive(a.c.k); }); beat = 1.3 + rnd() * 2.2; } }
    for (let i = packets.length - 1; i >= 0; i--) {
      const u = packets[i]; u.k += dt / u.dur; const kk = Math.min(1, u.k), e = kk < .5 ? 2 * kk * kk : 1 - Math.pow(-2 * kk + 2, 2) / 2;
      const nx = -(u.y1 - u.y0), ny = u.x1 - u.x0, nl = Math.hypot(nx, ny) || 1, pos = f => { const o = Math.sin(Math.PI * f) * u.am; return [u.x0 + (u.x1 - u.x0) * f + nx / nl * o, u.y0 + (u.y1 - u.y0) * f + ny / nl * o]; };
      const pt = pos(e), tl = pos(Math.max(0, e - .12)), col = u.c.join(',');
      ctx.strokeStyle = 'rgba(' + col + ',.5)'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(tl[0], tl[1]); ctx.lineTo(pt[0], pt[1]); ctx.stroke();
      ctx.fillStyle = 'rgba(' + col + ',.25)'; ctx.beginPath(); ctx.arc(pt[0], pt[1], 5, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(pt[0], pt[1], 1.7, 0, TAU); ctx.fill();
      if (u.k >= 1) { if (u.cb) u.cb(); packets.splice(i, 1); }
    }
  }
  /* ---- animations des postes + mascottes (calque supérieur) ---- */
  function drawStations() {
    const c = o2; c.globalCompositeOperation = 'source-over'; c.lineJoin = 'round';
    { const rc = [-.05 * A, 38 * k], r = 13 * k, th_ = t * 1.3, a = [wL(rc[0], rc[1])]; for (let i = 0; i <= 8; i++) { const q = th_ - i * .09; a.push(wL(rc[0] + Math.cos(q) * r, rc[1] + Math.sin(q) * r)); }
      poly(c, a); c.fillStyle = 'rgba(46,230,214,.28)'; c.fill(); const e = wL(rc[0] + Math.cos(th_) * r, rc[1] + Math.sin(th_) * r), o = wL(rc[0], rc[1]); c.strokeStyle = 'rgba(180,255,245,.95)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(o[0], o[1]); c.lineTo(e[0], e[1]); c.stroke(); }
    for (let i = 0; i < 3; i++) {
      const a = .02 * A + i * .135 * A, w = .115 * A, z0 = 26 * k, hh = 28 * k; c.save(); poly(c, [wR(a, z0 + hh), wR(a + w, z0 + hh), wR(a + w, z0), wR(a, z0)]); c.clip();
      c.strokeStyle = i === 1 ? 'rgba(46,230,214,.95)' : 'rgba(255,120,170,.95)'; c.lineWidth = 1.2; c.beginPath();
      for (let j = 0; j <= 10; j++) { const z = z0 + hh * (.5 + .3 * Math.sin(t * .9 + i * 2 + j * .8) + .1 * Math.sin(t * 2.1 + j * 1.3)), p = wR(a + w * (.06 + .88 * j / 10), z); c[j ? 'lineTo' : 'moveTo'](p[0], p[1]); } c.stroke();
      for (let j = 0; j < 5; j++) { const hz = (.15 + .12 * Math.abs(Math.sin(t * 1.1 + j + i))) * hh, p0 = wR(a + w * (.12 + j * .18), z0 + 3 * k), p1 = wR(a + w * (.12 + j * .18), z0 + 3 * k + hz); c.strokeStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke(); }
      c.restore();
    }
    for (let i = 0; i < 2; i++) {                                                  // moniteurs de Sentinel
      const u0 = -.5 + i * .17, u1 = u0 + .15, q = [fl(u0, .3, 30 * k), fl(u1, .3, 30 * k), fl(u1, .3, 14 * k), fl(u0, .3, 14 * k)];
      poly(c, q); c.fillStyle = 'rgba(30,14,6,.95)'; c.fill(); c.strokeStyle = 'rgba(255,154,60,.9)'; c.lineWidth = 1.1; c.stroke();
      const f = (t * .8 + i * .5) % 1, a = fl(u0 + .15 * .1, .3, 14 * k + 16 * k * f), b = fl(u1 - .15 * .1, .3, 14 * k + 16 * k * f); c.strokeStyle = 'rgba(255,200,120,.8)'; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
      const m = fl((u0 + u1) / 2, .3, 22 * k); c.fillStyle = `rgba(255,154,60,${.35 + .3 * Math.sin(t * 2.2 + i)})`; c.beginPath(); c.arc(m[0], m[1], 2.6 * k, 0, TAU); c.fill(); }
    { const hp = fl(.39, -.34, 38 * k), cs = Math.cos(t * 1.4), r = 7 * k;                // hologramme de Research
      c.strokeStyle = 'rgba(165,107,255,.5)'; c.lineWidth = 1; c.beginPath(); const b0 = fl(.39, -.34, 12 * k); c.moveTo(b0[0], b0[1]); c.lineTo(hp[0], hp[1]); c.stroke();
      c.fillStyle = 'rgba(165,107,255,.35)'; c.strokeStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.moveTo(hp[0], hp[1] - r); c.lineTo(hp[0] + r * .7 * cs, hp[1]); c.lineTo(hp[0], hp[1] + r); c.lineTo(hp[0] - r * .7 * cs, hp[1]); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(165,107,255,.85)'; for (let i = 0; i < 2; i++) { c.save(); c.translate(hp[0], hp[1]); c.rotate(t * (i ? -.9 : .7) + i); c.beginPath(); c.ellipse(0, 0, 13 * k, 4 * k, 0, 0, TAU); c.stroke(); c.restore(); } }
    { const rr = ((t * .6) % 1); poly(c, circ(fl, -.81, -.81, .12 + rr * .16, 30)); c.strokeStyle = `rgba(255,45,117,${(1 - rr) * .7})`; c.lineWidth = 1.3; c.stroke(); }     // estrade d'Orion
    { const rr = ((t * .5) % 1); poly(c, circ((u, v) => fl(u, v, 14 * k), 0, 0, .27 + rr * .1, 36)); c.strokeStyle = `rgba(255,120,170,${(1 - rr) * .55})`; c.lineWidth = 1.2; c.stroke(); }   // onde de la table
  }
  function drawActors(dt) {
    const c = o2; hits = [];
    for (const a of actors) { const p = fl(a.u, a.v); a.x = p[0]; a.y = p[1]; a.h = (a.c.k === 'ORION' ? 68 : 58) * k; }
    const sorted = actors.slice().sort((a, b) => a.y - b.y);
    for (const a of sorted) {
      const flip = a.face !== null ? a.face : a.x > cx + 2;
      drawChar(c, a.c, a.x, a.y, a.h, t, a.c.k === 'ORION' ? Math.max(a.flash, oFl) : a.flash, flip, {walk: a.walk, look: a.look, blink: a.blink, carry: !!a.carryNow});
      hits.push({x0: a.x - a.h * .42, y0: a.y - a.h * 1.1, x1: a.x + a.h * .42, y1: a.y + 4, txt: a.c.k + ' · ' + a.c.cap, x: a.x, y: a.y - a.h * 1.12, col: a.c.c});
    }
    oFl = Math.max(0, oFl - dt * 2);
    for (const p of posNodes) {                                                       // orbes de position (données réelles)
      const cc = p.pnl > 0 ? '43,245,154' : p.pnl < 0 ? '255,77,106' : '150,160,200', cs = p.pnl > 0 ? '#2bf59a' : p.pnl < 0 ? '#ff4d6a' : '#96a0c8', pu = .5 + .5 * Math.sin(t * 2.2 + p.ph);
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 13); g.addColorStop(0, 'rgba(' + cc + ',' + (.55 + .2 * pu) + ')'); g.addColorStop(1, 'rgba(' + cc + ',0)');
      c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, 13, 0, TAU); c.fill(); c.fillStyle = cs; c.beginPath(); c.arc(p.x, p.y, 3, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, 1.1, 0, TAU); c.fill();
      hits.unshift({x0: p.x - 13, y0: p.y - 13, x1: p.x + 13, y1: p.y + 13, txt: p.s + '  ' + pct(p.pc), x: p.x, y: p.y - 10, col: p.pnl >= 0 ? [43, 245, 154] : [255, 77, 106], orb: 1});
      if (!RM) { p.next -= dt; if (p.next <= 0) { floats.push({x: p.x, y: p.y - 12, txt: eur(p.pnl, true), cs, k: 0}); p.next = 4 + rnd() * 5; } }
    }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.k += dt / 1.1; if (f.k >= 1) { floats.splice(i, 1); continue; }
      const e = 1 - Math.pow(1 - f.k, 2), al = f.k < .15 ? f.k / .15 : 1 - (f.k - .15) / .85;
      c.globalAlpha = Math.max(0, al); c.fillStyle = f.cs; c.font = '700 11px ' + MONO; c.shadowColor = f.cs; c.shadowBlur = 8; c.fillText(f.txt, f.x, f.y - 26 * e); c.shadowBlur = 0; c.globalAlpha = 1;
    }
    if (tip && t < tip.until) {
      const al = Math.min(1, (tip.until - t) * 3), y = Math.max(14, tip.h.y - 8), cc = tip.h.col.join(',');
      c.globalAlpha = al; c.font = '700 9px ' + MONO; try { c.letterSpacing = '1px'; } catch (e) {}
      const w2 = c.measureText(tip.h.txt).width + 16, x = Math.max(w2 / 2 + 4, Math.min(W - w2 / 2 - 4, tip.h.x));
      c.fillStyle = 'rgba(5,5,12,.88)'; c.fillRect(x - w2 / 2, y - 9, w2, 18); c.strokeStyle = 'rgba(' + cc + ',.8)'; c.lineWidth = 1; c.strokeRect(x - w2 / 2 + .5, y - 9 + .5, w2 - 1, 17);
      c.fillStyle = 'rgb(' + cc + ')'; c.fillText(tip.h.txt, x, y + .5); try { c.letterSpacing = '0px'; } catch (e) {} c.globalAlpha = 1;
    }
  }
  function frame(dt, clear) {
    ctx.globalCompositeOperation = 'destination-out'; if (clear) ctx.clearRect(0, 0, W, H); else { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(0, 0, W, H); }
    o2.clearRect(0, 0, W, H);
    stepActors(dt); drawRing(); drawTendrils(dt); drawPackets(dt); drawStations(); drawActors(dt);
  }
  function still() { t = 3; for (const q of tendrils) q.age = q.grow + 1; frame(0, true); for (let i = 0; i < 14; i++) frame(0, false); }
  function loop(ts) {
    if (!running) return; raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts; t += dt;
    frame(dt, false);
    ema += (dt - ema) * .05; nfr++; fpsN++; if (ts - fpsT > 1000) { fps = fpsN * 1000 / (ts - fpsT); fpsN = 0; fpsT = ts; }
    if (nfr % 90 === 0 && ema > .026 && N > 700) N = Math.max(700, Math.floor(N * .75));
  }
  function start() { if (RM || running) return; running = true; last = performance.now(); fpsT = last; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  new ResizeObserver(() => layout()).observe(cv);
  layout();
  cv2.addEventListener('pointerdown', e => {                                     // nom d'une mascotte / d'une position au toucher
    const r = cv2.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const h = hits.find(q => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1);
    if (h) { tip = {h, until: t + 2.4}; if (RM) still(); }
  });
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : (vis && start()); });
  let vis = true; if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; vis && !document.hidden ? start() : stop(); }).observe(cv);
  start();
  return {setPositions(rows) { posIn = rows; buildPos(); if (RM) still(); }, fps: () => fps, count: () => N};
}

/* ===================== SCANNER (canvas, décoratif — symboles réels du dernier scan) ===================== */
function Scanner(cv) {
  const ctx = cv.getContext('2d');
  const mobile = Math.min(innerWidth, innerHeight) < 700;
  const KC = {keep: '43,245,154', watch: '255,179,71', drop: '255,77,140', sig: '46,230,214', none: '46,230,214'};
  let W = 0, H = 0, dpr = 1, t = 0, running = false, raf = 0, last = 0, lanes = [], sparks = [], rings = [], beamX = 0, pbeam = 0, pool = [{s: '—', kind: 'none', tag: '', w: 1}], bag = [], fps = 0, fpsN = 0, fpsT = 0;
  const pick = () => { if (!bag.length) { pool.forEach(p => { for (let i = 0; i < (p.w || 1); i++) bag.push(p); }); for (let i = bag.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [bag[i], bag[j]] = [bag[j], bag[i]]; } } return bag.pop(); };
  const mk = (ln, x) => { const p = pick(); return {p, x, y: ln.y, d: ln.d, v: ln.v, scanned: false, flash: 0, age: 0, fy: 0}; };
  const bX = tt => W * .5 + Math.sin(tt * .42) * W * .2;
  function layout() {
    const r = cv.getBoundingClientRect(); W = Math.max(200, r.width); H = Math.max(120, r.height); dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = mobile ? 11 : 14, top = 20, lh = (H - top - 14) / n; beamX = bX(t); pbeam = beamX;
    lanes = []; for (let i = 0; i < n; i++) { const d = .62 + rnd() * .75, ln = {y: top + (i + .5) * lh, d, v: (mobile ? 85 : 110) * d * (.9 + rnd() * 1.0) + 50, items: [], gap: 56 + rnd() * 70}; lanes.push(ln);
      for (let x = -40 + rnd() * 60; x < W + 60; x += (mobile ? 105 : 130) + ln.gap * (.8 + rnd() * .7)) ln.items.push(mk(ln, x)); }
    if (RM) stillScan(); else draw();
  }
  function scanHit(it) { it.scanned = true; it.flash = 1; const c = KC[it.p.kind];
    for (let i = 0; i < 6 && sparks.length < 140; i++) sparks.push({x: beamX, y: it.y, vx: (rnd() - .3) * 70, vy: (rnd() - .5) * 60, l: 1, c});
    if (it.p.kind === 'keep' || it.p.kind === 'drop') rings.push({x: beamX, y: it.y, k: 0, c}); }
  function step(dt) {
    t += dt; pbeam = beamX; beamX = bX(t);
    for (const ln of lanes) {
      for (let i = ln.items.length - 1; i >= 0; i--) {
        const it = ln.items[i], px = it.x; it.x += it.v * dt; it.flash = Math.max(0, it.flash - dt * 1.6);
        if (!it.scanned && ((px - pbeam < 0 && it.x - beamX >= 0) || (px - pbeam > 0 && it.x - beamX <= 0))) scanHit(it);
        if (it.scanned) { it.age += dt; if (it.p.kind === 'drop' && it.age > .5) { it.fy += 34 * dt * (1 + it.age); } }
        if (it.x > W + 120 || it.fy > 60) ln.items.splice(i, 1);
      }
      const lastIt = ln.items.reduce((a, z) => Math.min(a, z.x), 1e9);
      if (lastIt > 80 + ln.gap * (.8 + .6 * ((ln.items.length * 7) % 5) / 5)) ln.items.push(mk(ln, -50));
    }
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.l -= dt * 2.2; if (s.l <= 0) sparks.splice(i, 1); }
    for (let i = rings.length - 1; i >= 0; i--) { rings[i].k += dt * 1.6; if (rings[i].k >= 1) rings.splice(i, 1); }
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    /* règle + faisceau */
    ctx.strokeStyle = 'rgba(140,155,210,.10)'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x < W; x += 24) { ctx.moveTo(x, 6); ctx.lineTo(x, x % 96 === 0 ? 14 : 10); ctx.moveTo(x, H - 6); ctx.lineTo(x, x % 96 === 0 ? H - 14 : H - 10); } ctx.stroke();
    const bg = ctx.createLinearGradient(beamX - 90, 0, beamX + 4, 0); bg.addColorStop(0, 'rgba(255,45,117,0)'); bg.addColorStop(1, 'rgba(255,45,117,.13)');
    ctx.fillStyle = bg; ctx.fillRect(beamX - 90, 0, 94, H);
    const bg2 = ctx.createLinearGradient(beamX, 0, beamX + 26, 0); bg2.addColorStop(0, 'rgba(46,230,214,.12)'); bg2.addColorStop(1, 'rgba(46,230,214,0)'); ctx.fillStyle = bg2; ctx.fillRect(beamX, 0, 26, H);
    ctx.fillStyle = 'rgba(255,150,190,.95)'; ctx.fillRect(beamX - .8, 0, 1.6, H);
    ctx.fillStyle = 'rgba(255,45,117,.9)'; ctx.beginPath(); ctx.moveTo(beamX - 6, 0); ctx.lineTo(beamX + 6, 0); ctx.lineTo(beamX, 8); ctx.fill(); ctx.beginPath(); ctx.moveTo(beamX - 6, H); ctx.lineTo(beamX + 6, H); ctx.lineTo(beamX, H - 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,235,.8)'; for (let i = 0; i < 9; i++) { const y = ((t * 90 + i * H / 9) % H); ctx.fillRect(beamX - 4, y, 8, 1); }
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    for (const ln of lanes) for (const it of ln.items) {
      const fs = Math.round(7 + 3.2 * it.d), c = KC[it.p.kind], y = it.y + it.fy; ctx.font = (it.scanned ? '700 ' : '500 ') + fs + 'px ' + MONO;
      if (!it.scanned) { ctx.fillStyle = 'rgba(165,178,225,' + (.14 + .26 * it.d) + ')'; ctx.fillText(it.p.s, it.x, y); continue; }
      const drop = it.p.kind === 'drop', al = drop ? Math.max(0, 1 - Math.max(0, it.age - .5) / 1.2) : 1, txt = it.p.s + (it.p.tag ? '  ' + it.p.tag : '');
      const jit = drop && it.age < .35 ? (rnd() - .5) * 3 : 0; ctx.globalAlpha = al;
      const w = ctx.measureText(txt).width;
      if (it.flash > 0 || !drop) { ctx.fillStyle = 'rgba(' + c + ',' + (.05 + .2 * it.flash) + ')'; ctx.fillRect(it.x - 3, y - fs * .7, w + 8, fs * 1.4); }
      ctx.fillStyle = it.flash > .5 ? '#fff' : 'rgb(' + c + ')'; ctx.fillText(txt, it.x + jit, y);
      if (drop) { ctx.fillStyle = 'rgba(' + c + ',.9)'; ctx.fillRect(it.x - 1, y, w + 2, 1); }
      ctx.globalAlpha = 1;
    }
    for (const r of rings) { ctx.strokeStyle = 'rgba(' + r.c + ',' + (1 - r.k) * .7 + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(r.x, r.y, 4 + r.k * 22, 0, TAU); ctx.stroke(); }
    for (const s of sparks) { ctx.fillStyle = 'rgba(' + s.c + ',' + s.l + ')'; ctx.fillRect(s.x, s.y, 1.8, 1.8); }
  }
  function stillScan() { t = 2.4; beamX = pbeam = bX(t); for (const ln of lanes) for (const it of ln.items) if (it.x < beamX) { it.scanned = true; it.age = 0; } sparks = []; rings = []; draw(); }
  function loop(ts) { if (!running) return; raf = requestAnimationFrame(loop); const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts; step(dt); draw(); fpsN++; if (ts - fpsT > 1000) { fps = fpsN * 1000 / (ts - fpsT); fpsN = 0; fpsT = ts; } }
  function start() { if (RM || running) return; running = true; last = performance.now(); fpsT = last; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  new ResizeObserver(() => layout()).observe(cv); layout();
  let vis = true; if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; vis && !document.hidden ? start() : stop(); }).observe(cv);
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : (vis && start()); });
  start();
  return {setPool(p) { bag = []; pool = p.length ? p : [{s: '—', kind: 'none', tag: '', w: 1}]; lanes.forEach(l => l.items.forEach(it => { if (!it.scanned) it.p = pick(); })); if (RM) { layout(); } }, fps: () => fps, pool: () => pool};
}

/* ===================== démarrage ===================== */
try {
  hero = Field($('cv0'), $('cv'), $('cv2'), k => { const r = document.querySelector('.row[data-m="' + k + '"]'); if (r) { r.classList.add('hit'); setTimeout(() => r.classList.remove('hit'), 450); } });
  scanner = Scanner($('cv3'));
  window.__orion = {fps: () => hero.fps(), fps3: () => scanner.fps(), n: () => hero.count(), pool: () => scanner.pool()};
} catch (e) { console.error(e); }
load();
setInterval(() => { if (!document.hidden) load(); }, 5 * 60e3);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
