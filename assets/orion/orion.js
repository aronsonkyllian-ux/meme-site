/* ORION // ULTRA 1.2 — lit uniquement data/{paper10,ui,status,team,wide,ultra}.json (publiés par le cycle).
   Aucune valeur inventée : donnée absente = « — ». Les animations (anneau, personnages, scanner) sont purement décoratives. */
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
const TAU = Math.PI * 2, rnd = Math.random;
const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,"Roboto Mono","DejaVu Sans Mono",monospace';

let hero = null, scanner = null;
const state = {pos: []};

/* ===================== PANNEAUX (données réelles) ===================== */
function renderHeadStats(p) {
  const b = p && p.carnets && p.carnets[BOOK], base = p && ok(p.capital) ? p.capital : null;
  const c = b && Array.isArray(b.courbe) ? b.courbe.filter(q => ok(q.equity) && ok(q.ts)) : [];
  if (!c.length || base === null) { $('s_eq').textContent = $('s_pl').textContent = '—'; return; }
  const last = c[c.length - 1], net = last.equity - base;
  $('s_eq').textContent = eur(last.equity);
  $('s_pl').innerHTML = `<span class="${cls(net)}">${eur(net, true)}</span><span class="pc">${pct(net / base)} vs ${eur0(base)}</span>`;
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
  safe(() => renderHead(p, st)); safe(() => renderHeadStats(p)); safe(() => renderPos(rows)); safe(() => renderHeat(rows));
  safe(() => renderLog(p, ui)); safe(() => renderStn(team)); safe(() => renderFoot(ui)); safe(() => renderScan(wide, ultra, ui));
  if (hero) hero.setPositions(state.pos.filter(r => r.pnl !== null).map(r => ({s: r.s, pnl: r.pnl, pc: r.pc})));
}

/* ===================== PERSONNAGES holographiques (décoratifs) ===================== */
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
const hexP = (r, n) => { const p = new Path2D(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; p[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } p.closePath(); return p; };
const HEX18 = hexP(18), HEX12 = hexP(12), HEX6 = hexP(6);
function drawChar(ctx, c, x, feet, h, t, fl, flip) {
  const s = h / 100, col = c.c.join(','), br = 1 + .014 * Math.sin(t * 1.6 + c.ph), fy = 2.2 * Math.sin(t * .9 + c.ph);
  ctx.save(); ctx.translate(x, feet);
  /* aura + socle holographique */
  const ag = ctx.createRadialGradient(0, -h * .5, 0, 0, -h * .5, h * .85); ag.addColorStop(0, `rgba(${col},${.16 + .26 * fl + .04 * Math.sin(t * 2 + c.ph)})`); ag.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0, -h * .5, h * .85, 0, TAU); ctx.fill();
  ctx.strokeStyle = `rgba(${col},.55)`; ctx.lineWidth = 1; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 9; ctx.beginPath(); ctx.ellipse(0, 0, h * .36, h * .075, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = `rgba(${col},.25)`; ctx.beginPath(); ctx.ellipse(0, 0, h * .22, h * .045, 0, 0, TAU); ctx.stroke();
  const cone = ctx.createLinearGradient(0, 0, 0, -h * 1.05); cone.addColorStop(0, `rgba(${col},.13)`); cone.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(-h * .36, 0); ctx.lineTo(-h * .15, -h * 1.05); ctx.lineTo(h * .15, -h * 1.05); ctx.lineTo(h * .36, 0); ctx.closePath(); ctx.fill();
  /* figure */
  ctx.translate(0, fy * s * .6); ctx.scale((flip ? -1 : 1) * s, s * br);
  const lw = 1.25 / s;
  if (c.big) { ctx.globalAlpha = .5; ctx.fillStyle = `rgba(${col},.16)`; ctx.fill(SH.cape); ctx.strokeStyle = `rgba(${col},.55)`; ctx.lineWidth = lw; ctx.stroke(SH.cape); ctx.globalAlpha = 1; }
  const lg = ctx.createLinearGradient(0, -100, 0, 0); lg.addColorStop(0, `rgba(${col},${.5 + .3 * fl})`); lg.addColorStop(.6, `rgba(${col},.16)`); lg.addColorStop(1, `rgba(${col},.03)`);
  for (const nm of c.fills) {
    ctx.save(); ctx.scale(nm === 'body' || nm === 'pauld' ? c.w : 1, 1); ctx.clip(SH[nm]); ctx.fillStyle = lg; ctx.fillRect(-60, -120, 120, 130);
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.6)'; const off = (t * 7) % 3.6; for (let y = -120 + off; y < 6; y += 3.6) ctx.fillRect(-60, y, 120, 1.25); ctx.restore();
  }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass ? `rgba(${col},.95)` : `rgba(${col},.16)`; ctx.lineWidth = pass ? lw : lw * 3.6;
    for (const nm of c.lines) { ctx.save(); if (nm === 'body' || nm === 'pauld' || nm === 'arms' || nm === 'armsR' || nm === 'epa' || nm === 'tails') ctx.scale(c.w, 1); ctx.stroke(SH[nm]); ctx.restore(); }
  }
  /* visière qui balaye */
  const vw = c.k === 'SCOUT' ? 8.5 : 6, sx = Math.sin(t * (c.k === 'SCOUT' ? 2.1 : 1.3) + c.ph) * (vw - 1);
  ctx.strokeStyle = `rgba(${col},.95)`; ctx.lineWidth = 1.5 / s * 1.1; ctx.beginPath(); ctx.moveTo(-vw, -87); ctx.lineTo(vw, -87); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(sx - 1.6, -88.2, 3.2, 2.4);
  /* accessoires */
  ctx.strokeStyle = `rgba(${col},.95)`; ctx.fillStyle = `rgba(${col},.2)`; ctx.lineWidth = lw;
  if (c.k === 'ORION') {                                    // ceinture d'Orion + halo
    for (let i = -1; i <= 1; i++) { const a = .55 + .45 * Math.sin(t * 2 + i * 1.3); ctx.fillStyle = `rgba(255,236,244,${a})`; ctx.beginPath(); ctx.arc(i * 5, -61 + i * 1.5, 1.7, 0, TAU); ctx.fill(); }
    for (let i = -1; i <= 1; i++) { const a = .5 + .5 * Math.sin(t * 1.7 + i); ctx.fillStyle = `rgba(255,214,228,${a})`; ctx.beginPath(); ctx.arc(i * 9, -108 - (i ? 0 : 3), 2, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = `rgba(${col},.5)`; ctx.beginPath(); ctx.moveTo(-9, -108); ctx.lineTo(0, -111); ctx.lineTo(9, -108); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -100, 17, 4.5, 0, 0, TAU); ctx.stroke();
  } else if (c.k === 'SCOUT') {                             // lunette + faisceau
    ctx.lineWidth = 3.4 / s; ctx.beginPath(); ctx.moveTo(10, -70); ctx.lineTo(33, -79); ctx.stroke(); ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(35, -79.5, 3.4, 0, TAU); ctx.fill(); ctx.stroke();
    const k = .5 + .5 * Math.sin(t * 2.2 + c.ph), bg = ctx.createLinearGradient(38, 0, 96, 0); bg.addColorStop(0, `rgba(${col},${.28 + .2 * k})`); bg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(38, -80); ctx.lineTo(96, -100); ctx.lineTo(96, -60); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 2; i++) { const r = ((t * 13 + i * 11) % 22); ctx.strokeStyle = `rgba(${col},${(1 - r / 22) * .8})`; ctx.beginPath(); ctx.arc(38, -80, r + 3, -.7, .7); ctx.stroke(); }
  } else if (c.k === 'TRADER') {                            // panneau holographique de chandeliers
    ctx.save(); ctx.translate(40, -72); ctx.strokeStyle = `rgba(${col},.7)`; ctx.fillStyle = `rgba(${col},.08)`; ctx.beginPath(); ctx.moveTo(-14, -24); ctx.lineTo(16, -20); ctx.lineTo(16, 20); ctx.lineTo(-14, 24); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 4; i++) { const x = -8 + i * 7, hh = 6 + 5 * Math.sin(t * 1.3 + i * 1.7 + c.ph), y = -4 * Math.sin(t * 1.1 + i * 2.1); ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,.85)' : `rgba(${col},.95)`; ctx.beginPath(); ctx.moveTo(x, y - hh - 3); ctx.lineTo(x, y + hh + 3); ctx.stroke(); ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.7)' : `rgba(${col},.8)`; ctx.fillRect(x - 2, y - hh * .6, 4, hh * 1.2); }
    ctx.restore();
  } else if (c.k === 'SENTINEL') {                          // bouclier hexagonal
    ctx.save(); ctx.translate(30, -46); ctx.scale(1, 1);
    ctx.fillStyle = `rgba(${col},${.12 + .3 * fl})`; ctx.fill(HEX18); ctx.lineWidth = lw * 1.6; ctx.stroke(HEX18); ctx.lineWidth = lw; ctx.strokeStyle = `rgba(${col},.6)`; ctx.stroke(HEX12);
    const r = (t * 9 + c.ph * 3) % 12; ctx.strokeStyle = `rgba(${col},${(1 - r / 12) * .7})`; ctx.save(); ctx.scale(1 + r / 14, 1 + r / 14); ctx.stroke(HEX18); ctx.restore();
    ctx.fillStyle = `rgba(255,255,255,${.5 + .3 * Math.sin(t * 2.4)})`; ctx.fill(HEX6); ctx.restore();
  } else if (c.k === 'RESEARCH') {                          // hologramme orbital
    ctx.save(); ctx.translate(31, -100); const cs = Math.cos(t * 1.4);
    ctx.fillStyle = `rgba(${col},.3)`; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5 * cs, 0); ctx.lineTo(0, 7); ctx.lineTo(-5 * cs, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = `rgba(${col},.8)`; for (let i = 0; i < 2; i++) { ctx.save(); ctx.rotate(t * (i ? -.9 : .7) + i * 1.1); ctx.beginPath(); ctx.ellipse(0, 0, 13, 4.3, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    for (let i = 0; i < 3; i++) { const a = t * 1.8 + i * 2.1; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(Math.cos(a) * 13, Math.sin(a) * 4.3, 1.1, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  ctx.restore();
}

/* ===================== CHAMP DE DÉCISION (canvas, décoratif) ===================== */
function Field(cv, cv2, onArrive) {
  const ctx = cv.getContext('2d'), o2 = cv2.getContext('2d');
  const mobile = Math.min(innerWidth, innerHeight) < 700 || (matchMedia && matchMedia('(pointer:coarse)').matches);
  const NMAX = mobile ? 2300 : 4600;
  let N = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ? Math.floor(NMAX * .7) : NMAX;
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.2;
  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 100, sx = 1;
  let t = 0, running = false, raf = 0, last = 0, ema = 0.016, nfr = 0, fps = 0, fpsN = 0, fpsT = 0;
  const th = new Float32Array(NMAX), off = new Float32Array(NMAX), spd = new Float32Array(NMAX), ph = new Float32Array(NMAX), fr = new Float32Array(NMAX), grp = new Uint8Array(NMAX);
  for (let i = 0; i < NMAX; i++) {
    const a = rnd() * TAU, thick = .008 + .02 * (.5 + .5 * Math.sin(3 * a + 1.3)) + .004 * Math.sin(7 * a);
    th[i] = a; off[i] = gauss() * thick * 1.35 * (rnd() < .14 ? 3.4 : 1); spd[i] = .035 + rnd() * .035; ph[i] = rnd() * TAU; fr[i] = .5 + rnd() * 1.6;
    const u = ((a / TAU + .09 * gauss()) % 1 + 1) % 1, q = rnd();
    grp[i] = q < .03 ? 4 : q < .12 ? 3 : u < .38 ? 0 : u < .66 ? 1 : 2;
  }
  const COL = ['255,45,117', '226,60,255', '138,92,255', '46,230,214', '255,230,240'], LV = [.1, .17, .28];
  const bx = new Float32Array(NMAX), by = new Float32Array(NMAX), bk = new Uint8Array(NMAX), ord = new Uint16Array(NMAX), cnt = new Uint16Array(16), stt = new Uint16Array(16);
  const tendrils = [];
  function makeTendril(ang) {
    const segs = [], inward = rnd() < .22, base = inward ? ang + Math.PI : ang;
    const maxLen = (inward ? .3 : .45 + rnd() * .22), c = rnd() < .55 ? [46, 230, 214] : rnd() < .6 ? [255, 45, 117] : [190, 110, 255];
    let budget = 70;
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
  const NT = mobile ? 7 : 11;
  for (let i = 0; i < NT; i++) { tendrils.push(spawnT(i)); tendrils[i].age = rnd() * 8; }
  let oFl = 0, chars = [], paths = [], circuits = [], posNodes = [], floats = [], pulses = [], posIn = [], tip = null, hits = [];
  CHARS.forEach(c => { c.ph = rnd() * TAU; c.flash = 0; });
  function wobble(x0, y0, x1, y1, seed, amp) {
    const n = 46, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, sg = seed % 2 ? 1 : -1, pts = [];
    for (let j = 0; j <= n; j++) { const s = j / n, o = sg * amp * Math.sin(Math.PI * s) * (.75 + .25 * Math.sin(s * 9 + seed)) + .012 * R * Math.sin(s * 23 + seed * 2) * Math.sin(Math.PI * s);
      pts.push(x0 + dx * s + nx * o, y0 + dy * s + ny * o); }
    return pts;
  }
  function cum(poly) { const c = [0]; for (let i = 2; i < poly.length; i += 2) c.push(c[c.length - 1] + Math.hypot(poly[i] - poly[i - 2], poly[i + 1] - poly[i - 1])); return c; }
  function at(poly, c, d) { d = Math.max(0, Math.min(c[c.length - 1], d)); let i = 1; while (i < c.length - 1 && c[i] < d) i++; const k = (d - c[i - 1]) / ((c[i] - c[i - 1]) || 1); return [poly[2 * (i - 1)] + (poly[2 * i] - poly[2 * (i - 1)]) * k, poly[2 * (i - 1) + 1] + (poly[2 * i + 1] - poly[2 * (i - 1) + 1]) * k]; }
  const ANG = {SCOUT: -135, TRADER: -45, SENTINEL: 135, RESEARCH: 45};
  function layout() {
    const r = cv.getBoundingClientRect(); W = Math.max(200, r.width); H = Math.max(200, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2);
    cv.width = cv2.width = Math.round(W * dpr); cv.height = cv2.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); o2.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = H / 2 + 4; R = Math.min(W * .27, H * .27); sx = Math.max(1, Math.min(1.7, W / H * .95));
    const hm = R * .56, ho = R * .7;
    chars = CHARS.map(c => {
      if (c.k === 'ORION') return {c, x: cx, y: cy, h: ho, flip: false};
      const a = ANG[c.k] * Math.PI / 180; const x = cx + Math.cos(a) * R * 1.48 * sx, y = cy + Math.sin(a) * R * 1.48;
      return {c, x, y, h: hm, flip: x > cx};
    });
    const mods = chars.filter(q => q.c.k !== 'ORION');
    paths = mods.map((q, i) => { const pts = wobble(cx, cy, q.x, q.y, i + 1, R * .16); return {pts, cum: cum(pts), q, next: 1 + rnd() * 2.5}; });
    circuits = mods.map((q, i) => {
      const sideX = q.x < cx ? 12 : W - 12, ty = q.y < cy ? 18 : H - 18, x1 = q.x + (sideX - q.x) * .5, y2 = q.y + (ty - q.y) * .6, x0 = q.x + (q.x < cx ? -1 : 1) * 26;
      const poly = [x0, q.y, x1, q.y, x1, y2, sideX, y2], c = cum(poly); return {poly, cum: c, d: rnd() * c[c.length - 1], v: (mobile ? 120 : 170) * (.8 + rnd() * .5), col: i % 2 ? '255,45,117' : '46,230,214'}; });
    buildPos(); if (RM) still();
  }
  function buildPos() {
    const n = posIn.length; posNodes = posIn.map((p, i) => { const a = -Math.PI / 2 + i * TAU / n + .0; return Object.assign({}, p, {a, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, next: 1.2 + rnd() * 3 + i * .5, ph: rnd() * TAU}); });
  }
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
    let s = 0; for (let b = 0; b < 15; b++) { stt[b] = s; s += cnt[b]; }
    for (let i = 0; i < N; i++) ord[stt[bk[i]]++] = i;
    let p = 0;
    for (let b = 0; b < 15; b++) {
      const e = p + cnt[b]; if (e === p) continue; const lv = b % 3, sz = lv === 2 ? 1.9 : 1.2;
      ctx.fillStyle = 'rgba(' + COL[(b / 3) | 0] + ',' + LV[lv] + ')'; ctx.beginPath();
      for (let j = p; j < e; j++) { const i = ord[j]; ctx.rect(bx[i] - sz / 2, by[i] - sz / 2, sz, sz); }
      ctx.fill(); p = e;
    }
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .34); gr.addColorStop(0, 'rgba(255,45,117,' + (.035 + .05 * oFl) + ')'); gr.addColorStop(1, 'rgba(255,45,117,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, R * .34, 0, TAU); ctx.fill();
  }
  function drawTendrils(dt) {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < tendrils.length; i++) {
      const q = tendrils[i]; q.age += RM ? 0 : dt; const tot = q.grow + q.hold + q.fade;
      if (q.age > tot) { tendrils[i] = spawnT(i); continue; }
      const g = Math.min(1, q.age / q.grow), life = q.age < q.grow + q.hold ? 1 : 1 - (q.age - q.grow - q.hold) / q.fade, gg = 1 - Math.pow(1 - g, 2);
      const c = q.c.join(','); ctx.strokeStyle = 'rgba(' + c + ',' + (.11 * life).toFixed(3) + ')'; ctx.lineWidth = q.w; ctx.beginPath();
      let tipS = null;
      for (const s of q.segs) { if (s.t > gg) break; ctx.moveTo(cx + s.x0 * R, cy + s.y0 * R); ctx.lineTo(cx + s.x1 * R, cy + s.y1 * R); tipS = s; }
      ctx.stroke();
      if (tipS && g < 1) { ctx.fillStyle = 'rgba(' + c + ',.35)'; ctx.fillRect(cx + tipS.x1 * R - 1.2, cy + tipS.y1 * R - 1.2, 2.4, 2.4); }
      else if (g >= 1 && life > 0) { ctx.fillStyle = 'rgba(' + c + ',' + (.05 * life).toFixed(3) + ')'; for (const s of q.segs) if (s.d >= 2) ctx.fillRect(cx + s.x1 * R - 1, cy + s.y1 * R - 1, 2, 2); }
    }
  }
  function drawLinks(dt) {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1;
    for (const P of paths) { ctx.strokeStyle = 'rgba(' + P.q.c.c.join(',') + ',.03)'; ctx.beginPath(); ctx.moveTo(P.pts[0], P.pts[1]); for (let j = 2; j < P.pts.length; j += 2) ctx.lineTo(P.pts[j], P.pts[j + 1]); ctx.stroke(); }
    for (const C of circuits) {
      ctx.strokeStyle = 'rgba(120,150,210,.03)'; ctx.beginPath(); ctx.moveTo(C.poly[0], C.poly[1]); for (let j = 2; j < C.poly.length; j += 2) ctx.lineTo(C.poly[j], C.poly[j + 1]); ctx.stroke();
      const L = C.cum[C.cum.length - 1]; C.d = (C.d + C.v * dt) % (L + 40);
      if (C.d < L) { const a = at(C.poly, C.cum, C.d - 14), b = at(C.poly, C.cum, C.d); ctx.strokeStyle = 'rgba(' + C.col + ',.26)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.lineWidth = 1; }
      const e = C.poly.length; ctx.fillStyle = 'rgba(' + C.col + ',.08)'; ctx.fillRect(C.poly[e - 2] - 2, C.poly[e - 1] - 2, 4, 4);
    }
    if (!RM) {
      for (const P of paths) { P.next -= dt; if (P.next <= 0) { pulses.push({P, back: rnd() < .3, k: 0, dur: 1 + rnd()}); P.next = 1.4 + rnd() * 3; } }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const u = pulses[i]; u.k += dt / u.dur; const k = Math.min(1, u.k), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, d = (u.back ? 1 - e : e) * u.P.cum[u.P.cum.length - 1];
        const col = u.P.q.c.c.join(','), pt = at(u.P.pts, u.P.cum, d), tl = at(u.P.pts, u.P.cum, d + (u.back ? 14 : -14));
        ctx.strokeStyle = 'rgba(' + col + ',.45)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(tl[0], tl[1]); ctx.lineTo(pt[0], pt[1]); ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = 'rgba(' + col + ',.22)'; ctx.beginPath(); ctx.arc(pt[0], pt[1], 5, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(pt[0], pt[1], 1.7, 0, TAU); ctx.fill();
        if (u.k >= 1) { if (u.back) oFl = 1; else { u.P.q.c.flash = 1; if (onArrive) onArrive(u.P.q.c.k); } pulses.splice(i, 1); }
      }
    }
  }
  function drawOverlay(dt) {
    const c2 = o2; c2.globalCompositeOperation = 'source-over'; hits = [];
    oFl = Math.max(0, oFl - dt * 2); CHARS[0].flash = oFl;
    for (const q of chars) { q.c.flash = Math.max(0, q.c.flash - dt * 2); drawChar(c2, q.c, q.x, q.y + q.h * .5, q.h, t, q.c.flash, q.flip); hits.push({x0: q.x - q.h * .42, y0: q.y - q.h * .62, x1: q.x + q.h * .42, y1: q.y + q.h * .55, txt: q.c.k + ' · ' + q.c.cap, x: q.x, y: q.y - q.h * .6, col: q.c.c}); }
    for (const p of posNodes) {
      const c = p.pnl > 0 ? '43,245,154' : p.pnl < 0 ? '255,77,106' : '150,160,200', cs = p.pnl > 0 ? '#2bf59a' : p.pnl < 0 ? '#ff4d6a' : '#96a0c8', pu = .5 + .5 * Math.sin(t * 2.2 + p.ph);
      const g = c2.createRadialGradient(p.x, p.y, 0, p.x, p.y, 15); g.addColorStop(0, 'rgba(' + c + ',' + (.5 + .2 * pu) + ')'); g.addColorStop(1, 'rgba(' + c + ',0)');
      c2.fillStyle = g; c2.beginPath(); c2.arc(p.x, p.y, 15, 0, TAU); c2.fill(); c2.fillStyle = cs; c2.beginPath(); c2.arc(p.x, p.y, 3.3, 0, TAU); c2.fill(); c2.fillStyle = '#fff'; c2.beginPath(); c2.arc(p.x, p.y, 1.2, 0, TAU); c2.fill();
      hits.push({x0: p.x - 14, y0: p.y - 14, x1: p.x + 14, y1: p.y + 14, txt: p.s + '  ' + pct(p.pc), x: p.x, y: p.y - 10, col: p.pnl >= 0 ? [43, 245, 154] : [255, 77, 106], orb: 1});
      if (!RM) { p.next -= dt; if (p.next <= 0) { floats.push({x: p.x, y: p.y - 12, txt: eur(p.pnl, true), cs, k: 0}); p.next = 5 + rnd() * 6; } }
    }
    c2.textAlign = 'center'; c2.textBaseline = 'middle';
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.k += dt / 1.1; if (f.k >= 1) { floats.splice(i, 1); continue; }
      const e = 1 - Math.pow(1 - f.k, 2), a = f.k < .15 ? f.k / .15 : 1 - (f.k - .15) / .85;
      c2.globalAlpha = Math.max(0, a); c2.fillStyle = f.cs; c2.font = '700 11px ' + MONO; c2.shadowColor = f.cs; c2.shadowBlur = 8; c2.fillText(f.txt, f.x, f.y - 26 * e); c2.shadowBlur = 0; c2.globalAlpha = 1;
    }
    if (tip && t < tip.until) {                                   // nom au toucher
      const a = Math.min(1, (tip.until - t) * 3), w = c2.measureText(tip.h.txt).width + 16, x = Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, tip.h.x)), y = Math.max(14, tip.h.y - 8), cc = tip.h.col.join(',');
      c2.globalAlpha = a; c2.font = '700 9px ' + MONO; try { c2.letterSpacing = '1px'; } catch (e) {}
      const w2 = c2.measureText(tip.h.txt).width + 16; c2.fillStyle = 'rgba(5,5,12,.85)'; c2.fillRect(x - w2 / 2, y - 9, w2, 18); c2.strokeStyle = 'rgba(' + cc + ',.8)'; c2.strokeRect(x - w2 / 2 + .5, y - 9 + .5, w2 - 1, 17);
      c2.fillStyle = 'rgb(' + cc + ')'; c2.fillText(tip.h.txt, x, y + .5); try { c2.letterSpacing = '0px'; } catch (e) {} c2.globalAlpha = 1;
    }
  }
  function frame(dt, clear) {
    ctx.globalCompositeOperation = 'destination-out'; if (clear) ctx.clearRect(0, 0, W, H); else { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(0, 0, W, H); }
    o2.clearRect(0, 0, W, H);
    drawRing(); drawTendrils(dt); drawLinks(dt); drawOverlay(dt);
  }
  function still() { t = 3; for (const q of tendrils) q.age = q.grow + 1; frame(0, true); for (let i = 0; i < 14; i++) frame(0, false); }
  function loop(ts) {
    if (!running) return; raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts; t += dt;
    frame(dt, false);
    ema += (dt - ema) * .05; nfr++; fpsN++; if (ts - fpsT > 1000) { fps = fpsN * 1000 / (ts - fpsT); fpsN = 0; fpsT = ts; }
    if (nfr % 90 === 0 && ema > .026 && N > 900) N = Math.max(900, Math.floor(N * .75));
  }
  function start() { if (RM || running) return; running = true; last = performance.now(); fpsT = last; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  new ResizeObserver(() => layout()).observe(cv);
  layout();
  cv2.addEventListener('pointerdown', e => {                       // nom d'un personnage / d'une position au toucher
    const r = cv2.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const h = hits.filter(q => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1).sort((a, b) => (b.orb ? 1 : 0) - (a.orb ? 1 : 0))[0];
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
  hero = Field($('cv'), $('cv2'), k => { const r = document.querySelector('.row[data-m="' + k + '"]'); if (r) { r.classList.add('hit'); setTimeout(() => r.classList.remove('hit'), 450); } });
  scanner = Scanner($('cv3'));
  window.__orion = {fps: () => hero.fps(), fps3: () => scanner.fps(), n: () => hero.count(), pool: () => scanner.pool()};
} catch (e) { console.error(e); }
load();
setInterval(() => { if (!document.hidden) load(); }, 5 * 60e3);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
