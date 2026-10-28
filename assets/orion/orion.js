/* ORION // ULTRA 1.2 — lit uniquement data/{paper10,ui,status,team,wide,ultra}.json (publiés par le cycle).
   Aucune valeur inventée : donnée absente = « — ». Le bureau pixel-art est purement décoratif (animation décorative). */
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
const pct = x => ok(x) ? nf({style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero'}).format(x).replace('-', '−') : '—';
const pct1 = x => ok(x) ? nf({style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero'}).format(x).replace('-', '−') : '—';
const cls = x => !ok(x) ? 'z' : x > 0.00004 ? 'g' : x < -0.00004 ? 'r' : 'z';
const get = async f => { try { const r = await fetch(DATA + f + '.json?' + Date.now(), {cache: 'no-store'}); return r.ok ? await r.json() : null; } catch (e) { return null; } };
const parisF = o => new Intl.DateTimeFormat('fr-FR', Object.assign({timeZone: 'Europe/Paris'}, o));
const fmtDT = ts => ok(ts) ? parisF({day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(ts).replace(',', '') : '—';
const ageStr = ms => { if (!ok(ms) || ms < 0) return '—'; const m = Math.floor(ms / 60e3); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); };
const sym = m => String(m || '').replace(/-EUR$/, '');
const TAU = Math.PI * 2, rnd = Math.random;
const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,"Roboto Mono","DejaVu Sans Mono",monospace';

let office = null, scanner = null;
const D = {curve: [], base: null, pos: [], closed: [], nClos: null, acts: {}};   // données réelles partagées avec le bureau

/* ===================== PANNEAUX (données réelles) ===================== */
const bookOf = p => p && p.carnets && p.carnets[BOOK];
function openRows(p, ui) {
  const b = bookOf(p);
  if (!b || !Array.isArray(b.positions)) return null;
  const uiPos = (ui && ui.carnets && ui.carnets[BOOK] && ui.carnets[BOOK].positions_ouvertes) || [];
  return b.positions.filter(x => x.status === 'ouverte').map(x => {
    const q = uiPos.find(u => u.market === x.market) || {};
    return {m: String(x.market || ''), s: sym(x.market), amt: ok(q.cout) ? q.cout : null, pnl: ok(q.pnl_latent_net) ? q.pnl_latent_net : null, pc: ok(q.pnl_latent_net_pct) ? q.pnl_latent_net_pct : null};
  }).sort((a, z) => (z.amt ?? -1) - (a.amt ?? -1));
}
function renderTop(p, st) {
  const g = (st && ok(st.genere)) ? st.genere : (p && ok(p.genere)) ? p.genere : null, live = $('live'), age = g === null ? null : Date.now() - g;
  live.className = 'live' + (age === null ? ' na' : age > 4 * 3600e3 ? ' stale' : '');
  live.querySelector('span').textContent = age === null ? 'NO DATA' : age > 4 * 3600e3 ? 'STALE' : 'LIVE';
  $('s_age').textContent = age === null ? '—' : ageStr(age);
  const b = bookOf(p), dep = b && ok(b.depart) ? b.depart : null;
  $('s_day').textContent = dep === null ? '—' : String(Math.floor((Date.now() - dep) / 864e5) + 1);
}
function renderKpi(p, ui, rows) {
  const b = bookOf(p), base = p && ok(p.capital) ? p.capital : null;
  const c = b && Array.isArray(b.courbe) ? b.courbe.filter(q => ok(q.equity) && ok(q.ts)) : [];
  D.curve = c; D.base = base;
  const last = c.length ? c[c.length - 1] : null, net = last && base !== null ? last.equity - base : null;
  $('k_cap').textContent = last ? eur(last.equity) : '—'; $('k_capS').textContent = base !== null ? 'départ ' + eur(base) : '—';
  $('k_pl').className = 'kv ' + cls(net); $('k_pl').textContent = eur(net, true); $('k_plS').textContent = net !== null && base ? pct(net / base) + ' depuis le départ' : '—';
  const known = (rows || []).filter(r => r.pnl !== null), lat = known.length ? known.reduce((a, r) => a + r.pnl, 0) : null;
  $('k_lat').className = 'kv ' + cls(lat); $('k_lat').textContent = eur(lat, true); $('k_latS').textContent = rows ? rows.length + ' position' + (rows.length > 1 ? 's' : '') + ' ouverte' + (rows.length > 1 ? 's' : '') : '—';
  const st = ui && ui.carnets && ui.carnets[BOOK] && ui.carnets[BOOK].stats_clos;
  $('k_win').textContent = st && ok(st.taux_reussite) ? nf({style: 'percent', maximumFractionDigits: 0}).format(st.taux_reussite) : '—';
  $('k_winS').textContent = st && ok(st.n_clos) ? st.gagnants + ' G / ' + st.perdants + ' P · ' + st.n_clos + ' clos' : '—';
  D.nClos = st && ok(st.n_clos) ? st.n_clos : null;
  $('s_cl').textContent = D.nClos === null ? '—' : String(D.nClos);
  $('s_op').textContent = rows ? String(rows.length) : '—';
}
function renderBal() {
  const el = $('balChart'), c = D.curve, base = D.base;
  $('balMeta').textContent = c.length ? c.length + ' POINTS' : '—';
  if (c.length < 2) { el.innerHTML = '<div class="empty">—</div>'; $('balVal').textContent = c.length ? eur(c[0].equity) : '—'; return; }
  const W = 300, Hh = 110, t0 = c[0].ts, t1 = c[c.length - 1].ts, vs = c.map(q => q.equity), lo = Math.min(...vs, base ?? Infinity), hi = Math.max(...vs, base ?? -Infinity), pad = (hi - lo) * .12 || 1;
  const X = t => 2 + (t - t0) / ((t1 - t0) || 1) * (W - 4), Y = v => 6 + (1 - (v - (lo - pad)) / ((hi + pad) - (lo - pad))) * (Hh - 12);
  let d = 'M' + X(c[0].ts).toFixed(1) + ' ' + Y(c[0].equity).toFixed(1);
  for (let i = 1; i < c.length; i++) d += ' H' + X(c[i].ts).toFixed(1) + ' V' + Y(c[i].equity).toFixed(1);
  const last = c[c.length - 1], col = base !== null && last.equity < base ? '#ff5470' : '#2bf59a';
  el.innerHTML = `<svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" role="img" aria-label="Historique de l'équité">
    <defs><linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".30"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
    ${[.25, .5, .75].map(f => `<line x1="0" x2="${W}" y1="${(Hh * f).toFixed(1)}" y2="${(Hh * f).toFixed(1)}" stroke="rgba(150,170,210,.07)" vector-effect="non-scaling-stroke"/>`).join('')}
    ${base !== null ? `<line x1="0" x2="${W}" y1="${Y(base).toFixed(1)}" y2="${Y(base).toFixed(1)}" stroke="rgba(150,170,210,.3)" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>` : ''}
    <path d="${d} V${Hh} H${X(t0).toFixed(1)}Z" fill="url(#bg1)"/>
    <path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="miter" vector-effect="non-scaling-stroke"/></svg>
    <span class="ax hi">${eur(hi)}</span><span class="ax lo">${eur(lo)}</span>`;
  const bv = $('balVal'); bv.className = 'bv ' + (base !== null && last.equity < base ? 'r' : 'g'); bv.textContent = eur(last.equity);
}
function renderPos(rows) {
  const list = $('plist'), cnt = $('posCnt');
  if (!rows) { list.innerHTML = '<div class="empty">—</div>'; cnt.textContent = '—'; return; }
  cnt.textContent = rows.length + ' OUVERTE' + (rows.length > 1 ? 'S' : '');
  if (!rows.length) { list.innerHTML = '<div class="empty">Aucune position ouverte</div>'; return; }
  list.innerHTML = rows.map(r => `<div class="pr"><b>${esc(r.s)}</b><span class="mu">${r.amt === null ? '—' : eur(r.amt)}</span><span class="${cls(r.pnl)}">${eur(r.pnl, true)}</span><small class="${cls(r.pnl)}">${pct(r.pc)}</small></div>`).join('');
}
const TG = {position_ouverte: ['ENTRÉE', 'g'], position_fermee: ['SORTIE', 'p'], ordre_ouvert: ['ORDRE', 'c'], ordre_rempli: ['REMPLI', 'c'], stop_releve_programme: ['STOP ↑', 'a'], ordre_rejete: ['REJET', 'm'], deja_detenu: ['DÉJÀ', 'm'], cycle_manque: ['CYCLE', 'a'], ordre_partiel_puis_abandon: ['PARTIEL', 'a']};
const short = (s, n) => { s = String(s || '').replace(/\s*\(reconstruit après coup\)/, '').replace(/ultra\d+/, '').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
function renderLog(p, team) {
  const b = bookOf(p), el = $('lines'), meta = $('logMeta');
  if (!b || !Array.isArray(b.evenements)) { el.innerHTML = '<div class="empty">—</div>'; meta.textContent = '—'; return; }
  const pos = Array.isArray(b.positions) ? b.positions : [];
  D.closed = pos.filter(x => x.status === 'fermee' && ok(x.pnl));
  const evs = []; let rej = 0;
  for (const e of b.evenements.slice().sort((a, z) => z.ts - a.ts)) {
    const tg = TG[e.kind]; if (!tg) continue; if (e.kind === 'ordre_rejete' && ++rej > 5) continue; if (e.kind === 'ordre_rempli') continue;
    let am = null, tx = short(e.detail, 44), c = tg[1];
    const near = list => list.filter(x => x.market === e.market).sort((a, z) => Math.abs((a.entry_ts || 0) - e.ts) - Math.abs((z.entry_ts || 0) - e.ts))[0];
    if (e.kind === 'position_ouverte') { const x = near(pos); if (x && ok(x.entry_px) && ok(x.qty)) am = {v: x.entry_px * x.qty, c: 'z', s: false}; tx = x && ok(x.entry_px) ? 'entrée @ ' + nf({maximumSignificantDigits: 4}).format(x.entry_px) : ''; }
    if (e.kind === 'position_fermee') { const x = D.closed.filter(q => q.market === e.market).sort((a, z) => Math.abs((a.exit_ts || 0) - e.ts) - Math.abs((z.exit_ts || 0) - e.ts))[0]; if (x) { am = {v: x.pnl, c: cls(x.pnl), s: true}; tx = String(x.reason || '').replace(/_/g, ' ').toUpperCase(); c = x.pnl >= 0 ? 'g' : 'r'; } }
    if (e.kind === 'ordre_rejete') tx = /âge/.test(e.detail || '') ? 'signal périmé / qté nulle' : tx;
    evs.push({ts: e.ts, s: sym(e.market), tag: tg[0], c, am, tx});
  }
  const jr = team && Array.isArray(team.journal) ? team.journal : [], seen = new Set();
  for (const e of jr.slice().sort((a, z) => z.ts - a.ts)) {
    const k = e.role + '.' + e.kind, pl = e.payload || {}; if (seen.has(k)) continue;
    let tx = null, tag = e.role, c = 'c';
    if (k === 'ARBITRE.tick_termine') { tx = 'tick terminé · ' + (ok(pl.n_open) ? pl.n_open + ' pos.' : '—') + (ok(pl.duree_s) ? ' · ' + pl.duree_s + ' s' : ''); c = 'c'; }
    else if (k === 'SENTINEL.risque_agrege') { tx = 'risque ouvert ' + (ok(pl.pct_equite) ? nf({maximumFractionDigits: 2}).format(pl.pct_equite) + ' % équité' : '—'); c = 'a'; }
    else if (k === 'TRADER.evaluation_positions') { tx = ok(pl.n) ? pl.n + ' positions évaluées' : 'évaluation'; c = 'p'; }
    else if (k === 'RESEARCH.fantomes_avances') { tx = 'fantômes avancés'; c = 'v'; }
    if (tx) { seen.add(k); evs.push({ts: e.ts, s: '', tag, c, am: null, tx}); }
  }
  evs.sort((a, z) => z.ts - a.ts); const rows = evs.slice(0, 24);
  meta.textContent = rows.length + ' ÉVÉNEMENTS';
  el.innerHTML = rows.length ? rows.map(r => `<div class="ev"><time>${fmtDT(r.ts)}</time><b>${esc(r.s)}</b><i class="tg ${r.c}">${esc(r.tag)}</i><span class="am ${r.am ? r.am.c : ''}">${r.am ? eur(r.am.v, r.am.s) : ''}</span><span class="tx">${esc(r.tx)}</span></div>`).join('') : '<div class="empty">—</div>';
}
const ROLE = {ORION: 'DIRECTEUR', SCOUT: 'DÉTECTE', TRADER: 'EXÉCUTE', SENTINEL: 'PROTÈGE', RESEARCH: 'TESTE'};
function renderAgents(team) {
  const r = team && team.resume, ex = r && r.derniere_execution_reelle, now = Date.now();
  for (const k of Object.keys(ROLE)) {
    const e = ex && (k === 'ORION' ? ex.ARBITRE : ex[k]), el = document.querySelector('.ag[data-k="' + k + '"] small');
    if (!el) continue;
    el.textContent = e && ok(e.ts) ? String(e.kind || '').replace(/_/g, ' ').toUpperCase() + ' · ' + ageStr(now - e.ts) : ROLE[k];
  }
}
function renderFoot(ui) {
  const b = ui && ui.carnets && ui.carnets[BOOK] && ui.carnets[BOOK].stats_clos, nmin = ui && ok(ui.n_min_conclusion) ? ui.n_min_conclusion : 30;
  $('badge').textContent = 'Paper trading · capital fictif · aucun ordre réel' + (b && ok(b.n_clos) ? ` · ${b.n_clos} trade${b.n_clos > 1 ? 's' : ''} clos` + (b.n_clos < nmin ? ' : rien de prouvé' : '') : '');
  if (office) { /* meta du bureau */ }
  const fm = $('floorMeta'); fm.textContent = '5 AGENTS · ' + (b && ok(b.n_clos) ? b.n_clos + ' TRADES CLOS' : '— TRADES CLOS');
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

/* ===================== BUREAU PIXEL-ART (décoratif) : sprites dessinés en code, 176×120 px logiques ===================== */
const FONT = {};
(() => {
  const g = {A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
    0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
    '.': '000000000000010', ',': '000000000010100', '-': '000000111000000', '+': '000010111010000', '%': '101001010100101', '€': '011111110111011', ':': '000010000010000', '/': '001001010100100', '!': '010010010000010', '?': '110001010000010', '$': '011110010011110', '×': '000101010101000', '·': '000000010000000', ' ': '000000000000000', '▲': '000010111111000'};
  for (const k in g) FONT[k] = g[k].split('').map(Number);
})();
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/−/g, '-');
const tw = (s, sc = 1) => norm(s).length * 4 * sc - sc;
function ptxt(c, s, x, y, col, sc = 1) {
  c.fillStyle = col; x = Math.round(x); y = Math.round(y);
  for (const ch of norm(s)) { const g = FONT[ch] || FONT[' ']; for (let i = 0; i < 15; i++) if (g[i]) c.fillRect(x + (i % 3) * sc, y + ((i / 3) | 0) * sc, sc, sc); x += 4 * sc; }
}
const rgb = a => 'rgb(' + a[0] + ',' + a[1] + ',' + a[2] + ')';
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const WHITE = [255, 255, 255], INK = [8, 8, 24];

/* silhouettes (# = corps) */
const MASK = {
  ORION: ['...#####...', '.#########.', '.#########.', '###########', '###########', '###########', '###########', '.#########.', '.#########.', '...#####...'],
  SCOUT: ['...######...', '..########..', '.##########.', '############', '############', '############', '############', '############', '############', '############', '##.######.##'],
  TRADER: ['..##########..', '.############.', '##############', '##############', '##############', '##############', '##############', '.############.', '..##########..'],
  SENTINEL: ['.....##.....', '....####....', '...######...', '...######...', '..########..', '..########..', '.##########.', '.##########.', '############', '############', '############'],
  RESEARCH: ['.#########.', '###########', '###########', '###########', '###########', '###########', '###########', '###########', '###########', '.#########.']};
const CHARS = [
  {k: 'ORION', cap: 'DIRECTEUR', c: [255, 62, 128], eyeY: 4},
  {k: 'SCOUT', cap: 'DÉTECTE', c: [46, 222, 206], eyeY: 4},
  {k: 'TRADER', cap: 'EXÉCUTE', c: [78, 140, 255], eyeY: 4},
  {k: 'SENTINEL', cap: 'PROTÈGE', c: [255, 150, 56], eyeY: 6},
  {k: 'RESEARCH', cap: 'TESTE', c: [172, 112, 255], eyeY: 4}];
function buildBody(ch) {
  const m = MASK[ch.k], h = m.length, w = m[0].length, cv = document.createElement('canvas'); cv.width = w + 2; cv.height = h + 2; const c = cv.getContext('2d');
  const inn = (x, y) => y >= 0 && y < h && x >= 0 && x < w && m[y][x] === '#';
  const hi = mix(ch.c, WHITE, .5), md = ch.c, sh = mix(ch.c, INK, .3), sh2 = mix(ch.c, INK, .5), ol = mix(ch.c, INK, .8), sp = mix(ch.c, WHITE, .85);
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    let col = null;
    if (inn(x, y)) {
      const dn = !inn(x, y + 1), rt = !inn(x + 1, y), up = !inn(x, y - 1), lf = !inn(x - 1, y);
      if (dn || (rt && y > h * .45)) col = sh2;
      else if (up || (lf && y < h * .6)) col = hi;
      else if (y >= h - 3 || !inn(x + 2, y)) col = sh;
      else col = md;
    } else if (inn(x - 1, y) || inn(x + 1, y) || inn(x, y - 1) || inn(x, y + 1)) col = ol;
    if (col) { c.fillStyle = rgb(col); c.fillRect(x + 1, y + 1, 1, 1); }
  }
  c.fillStyle = rgb(sp); c.fillRect(3, 3, 2, 1); c.fillRect(3, 4, 1, 1);
  return {cv, w, h, ch, col: ch.c, ol, sh, hi};
}
const BODY = {}; CHARS.forEach(ch => { BODY[ch.k] = buildBody(ch); });
const EYE = '#0c0a1a';
function eyeXs(w) { return w % 2 ? [((w - 1) >> 1) - 3, ((w - 1) >> 1) + 2] : [(w >> 1) - 3, (w >> 1) + 1]; }
/* dessine un personnage : (x,fy) = centre bas ; ex = {walk, look, blink, happy, carry, hands} */
function drawChar(c, b, x, fy, t, ex) {
  const ch = b.ch, fr = ((t * 7) | 0) & 1, bob = ex.walk ? (fr ? -1 : 0) : ((t * .9 + ch.k.length) % 2 < .12 ? -1 : 0);
  const ox = Math.round(x - b.w / 2), oy = fy - b.h + (ex.walk ? -1 : 0) + bob;
  c.fillStyle = 'rgba(0,0,0,.38)'; c.fillRect(ox + 1, fy + 1, b.w - 2, 1); c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(ox + 3, fy + 2, b.w - 6, 1);
  if (ex.walk) { c.fillStyle = rgb(b.ol); const l = fr ? 2 : 4, r = fr ? b.w - 5 : b.w - 3; c.fillRect(ox + l, fy - 1, 2, 2); c.fillRect(ox + r - 1, fy - 1, 2, 2); }
  c.drawImage(b.cv, ox - 1, oy - 1);
  const [lx, rx] = eyeXs(b.w), lk = Math.max(-1, Math.min(1, Math.round(ex.look))), ey = oy + ch.eyeY;
  c.fillStyle = EYE;
  if (ex.happy) { for (const e of [lx + lk, rx + lk]) { c.fillRect(ox + e, ey, 2, 1); c.fillRect(ox + e - 1, ey + 1, 1, 1); c.fillRect(ox + e + 2, ey + 1, 1, 1); } }
  else if (ex.blink) { c.fillRect(ox + lx + lk, ey + 1, 2, 1); c.fillRect(ox + rx + lk, ey + 1, 2, 1); }
  else { c.fillRect(ox + lx + lk, ey, 2, 2); c.fillRect(ox + rx + lk, ey, 2, 2); c.fillStyle = '#ffffff'; c.fillRect(ox + lx + lk, ey, 1, 1); c.fillRect(ox + rx + lk, ey, 1, 1); }
  c.fillStyle = 'rgba(255,120,170,.55)'; c.fillRect(ox + lx - 1, ey + 2, 2, 1); c.fillRect(ox + rx + 1, ey + 2, 2, 1);
  const P = (px, py, col) => { c.fillStyle = col; c.fillRect(ox + px, oy + py, 1, 1); }, cx = b.w >> 1;
  if (ch.k === 'ORION') {
    for (const [px, py] of [[cx - 2, -2], [cx, -2], [cx + 2, -2], [cx - 2, -1], [cx - 1, -1], [cx, -1], [cx + 1, -1], [cx + 2, -1]]) P(px, py, '#ffd45a');
    P(cx - 2, -2, '#fff1a8'); P(cx - 2, -1, '#ffe27a'); for (let i = -2; i <= 2; i++) P(cx + i, 0, '#b8801c'); P(cx, -1, '#ff4d6a');
    for (const px of [cx - 3, cx + 3]) P(px, -1, '#2b1c0c'); for (let i = -2; i <= 2; i++) P(cx + i, -3, '#2b1c0c'); P(cx - 3, -2, '#2b1c0c'); P(cx + 3, -2, '#2b1c0c');
  } else if (ch.k === 'SCOUT') {
    const gl = ((t * 3) | 0) & 1; for (let i = 1; i <= 3; i++) P(8, -i, '#0f5a58'); P(8, -4, gl ? '#ffffff' : '#7ffff0'); P(7, -4, 'rgba(120,255,240,.55)'); P(9, -4, 'rgba(120,255,240,.55)'); P(8, -5, 'rgba(120,255,240,.45)');
    P(7, 0, '#0f5a58'); P(9, 0, '#0f5a58');
  } else if (ch.k === 'TRADER') {
    for (let i = 3; i <= 10; i++) P(i, -1, '#dfe8ff'); for (const i of [2, 11]) P(i, 0, '#dfe8ff'); for (const i of [2, 11]) P(i, -1, '#1a2750');
    for (const px of [-1, b.w]) { P(px, 3, '#1a2750'); P(px, 4, '#dfe8ff'); P(px, 5, '#dfe8ff'); P(px, 6, '#1a2750'); }
    P(b.w, 7, '#dfe8ff'); P(b.w - 1, 8, '#dfe8ff'); P(b.w - 2, 8, '#ff4d6a');
  } else if (ch.k === 'SENTINEL') {
    const sx = b.w - 2, sy = b.h - 9, SH = ['#####', '#####', '#####', '#####', '.###.', '..#..'];
    for (let yy = 0; yy < 6; yy++) for (let xx = 0; xx < 5; xx++) if (SH[yy][xx] === '#') { const edge = yy === 0 || xx === 0 || xx === 4 || yy === 5 || (yy === 4 && (xx === 1 || xx === 3)); P(sx + xx, sy + yy, edge ? (xx === 0 || yy === 0 ? '#f2f6ff' : '#8795b4') : '#31405e'); }
    P(sx + 2, sy + 1, '#ff9a38'); P(sx + 1, sy + 2, '#ff9a38'); P(sx + 2, sy + 2, '#ffd08a'); P(sx + 3, sy + 2, '#ff9a38'); P(sx + 2, sy + 3, '#ff9a38');
  } else if (ch.k === 'RESEARCH') {
    const a = t * 2.4; P(cx, -4, '#ffffff'); for (let i = 0; i < 2; i++) { const q = a + i * Math.PI; P(cx + Math.round(Math.cos(q) * 4), -4 + Math.round(Math.sin(q) * 2), i ? '#ff9bd5' : '#8ffff0'); }
    P(cx - 4, -4, 'rgba(172,112,255,.35)'); P(cx + 4, -4, 'rgba(172,112,255,.35)');
  }
  if (ex.hands) { c.fillStyle = rgb(b.hi); const k2 = ((t * 9) | 0) & 1; c.fillRect(ox + 1, fy - 3 - k2, 2, 1); c.fillRect(ox + b.w - 3, fy - 4 + k2, 2, 1); }
  if (ex.carry) { const px = ox + b.w - 1, py = oy + 1 + (ex.walk ? fr : 0); c.fillStyle = '#10131e'; c.fillRect(px, py, 6, 7); c.fillStyle = '#f2f5ff'; c.fillRect(px + 1, py + 1, 4, 5); c.fillStyle = '#7a86a8'; c.fillRect(px + 1, py + 2, 3, 1); c.fillRect(px + 1, py + 4, 2, 1); c.fillStyle = '#2bf59a'; c.fillRect(px + 4, py + 5, 1, 1); }
  return {ox, oy};
}
function bubble(c, x, y, g, col) {
  x = Math.round(x); y = Math.round(y);
  c.fillStyle = '#0a0d16'; c.fillRect(x - 5, y - 5, 11, 11); c.fillRect(x - 1, y + 6, 3, 1);
  c.fillStyle = '#f4f6ff'; c.fillRect(x - 4, y - 4, 9, 9); c.fillRect(x - 1, y + 5, 3, 1); c.fillRect(x, y + 6, 1, 1);
  if (g === '♥') { const H = ['01010', '11111', '11111', '01110', '00100']; c.fillStyle = '#ff3d6e'; for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) if (H[j][i] === '1') c.fillRect(x - 2 + i, y - 2 + j, 1, 1); }
  else { c.fillStyle = col; const gg = FONT[g] || FONT['?']; for (let i = 0; i < 15; i++) if (gg[i]) c.fillRect(x - 1 + (i % 3), y - 2 + ((i / 3) | 0), 1, 1); }
}

function Office(cv, onAct) {
  const LW = 176, LH = 120, ctx = cv.getContext('2d'); cv.width = LW; cv.height = LH;
  const mk = () => { const c = document.createElement('canvas'); c.width = LW; c.height = LH; return c; };
  const bgc = mk(), fgc = mk(), bg = bgc.getContext('2d'), fg = fgc.getContext('2d');
  const MY = [50, 50, 50, 80, 80, 80, 50], DX = [48, 86, 124, 48, 86, 124, 158], GAPS = [31, 67, 105, 141];
  const SEAT = {SENTINEL: [48, 75, 1], TRADER: [86, 75, 1], RESEARCH: [48, 105, 2], SCOUT: [144, 105, 2], ORION: [158, 75, 1]};
  const LANE = r => r === 1 ? 77 : 108;
  let t = 0, running = false, raf = 0, last = 0, fps = 0, fpsN = 0, fpsT = 0, W = 0;
  let tip = null, floats = [], emotes = [], errs = [], cool = 2.2, lastE = -1, hl = null, hlT = 0, nextFloat = 3, hits = [], dpos = [];
  const actors = CHARS.map(ch => { const s = SEAT[ch.k]; return {ch, b: BODY[ch.k], k: ch.k, hx: s[0], hy: s[1], hr: s[2], x: s[0], fy: s[1], row: s[2], path: null, walk: false, look: 0, lookT: 0, lookNext: 1 + rnd() * 3, blink: 0, blinkNext: 1.5 + rnd() * 3, happy: 0, carry: false, hands: ch.k !== 'SCOUT', emoteNext: 5 + rnd() * 8}; });
  const A = k => actors.find(a => a.k === k);
  /* ---------- décor statique ---------- */
  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  function plant(c, x, y) { R(c, x - 3, y + 6, 7, 5, '#1a2236'); R(c, x - 3, y + 6, 7, 1, '#2d3b5c'); R(c, x - 2, y + 10, 5, 1, '#0c111c'); const L = ['#1f6b3a', '#2f9a52', '#3fbf6a']; for (const [dx, dy, w, h, i] of [[-4, 2, 3, 2, 0], [2, 2, 3, 2, 0], [-1, -4, 3, 6, 1], [-3, -1, 2, 5, 1], [2, -1, 2, 5, 1], [0, -6, 1, 3, 2], [-2, -3, 1, 2, 2], [1, 0, 1, 3, 2]]) R(c, x + dx, y + dy, w, h, L[i]); }
  function wallScreen(c) {
    const X0 = 40, Y0 = 13, W2 = 92, H2 = 33; R(c, X0 - 1, Y0 - 1, W2 + 2, H2 + 2, '#2a3753'); R(c, X0, Y0, W2, H2, '#05080f'); R(c, X0, Y0, W2, 7, '#0a0f1a');
    ptxt(c, 'EQUITE', X0 + 3, Y0 + 1, '#6c7c9c');
    const cu = D.curve, base = D.base; const cx0 = X0 + 20, cy0 = Y0 + 10, cw = W2 - 24, ch2 = H2 - 14;
    c.fillStyle = 'rgba(120,140,190,.08)'; for (let i = 0; i <= 3; i++) c.fillRect(cx0, cy0 + Math.round(i * (ch2 - 1) / 3), cw, 1);
    if (cu.length >= 2) {
      const vs = cu.map(q => q.equity), lo = Math.min(...vs, base ?? Infinity), hi = Math.max(...vs, base ?? -Infinity), span = (hi - lo) || 1, t0 = cu[0].ts, t1 = cu[cu.length - 1].ts;
      const up = base === null || vs[vs.length - 1] >= base, col = up ? '#2bf59a' : '#ff5470', fil = up ? 'rgba(43,245,154,.14)' : 'rgba(255,84,112,.14)';
      const val = x => { let v = vs[0]; const tt = t0 + x / (cw - 1) * (t1 - t0); for (let i = 0; i < cu.length; i++) { if (cu[i].ts <= tt) v = vs[i]; else break; } return v; };
      const yy = v => cy0 + ch2 - 1 - Math.round((v - lo) / span * (ch2 - 3)) - 1;
      let py = yy(val(0));
      for (let x = 0; x < cw; x++) { const y = yy(val(x)); c.fillStyle = fil; c.fillRect(cx0 + x, y, 1, cy0 + ch2 - y); c.fillStyle = col; c.fillRect(cx0 + x, Math.min(y, py), 1, Math.abs(y - py) + 1); py = y; }
      if (base !== null) { c.fillStyle = 'rgba(190,205,240,.45)'; const by = yy(base); for (let x = 0; x < cw; x += 4) c.fillRect(cx0 + x, by, 2, 1); }
      ptxt(c, String(Math.round(hi)), X0 + 3, cy0, '#5f6f90'); ptxt(c, String(Math.round(lo)), X0 + 3, cy0 + ch2 - 6, '#5f6f90');
      const v = vs[vs.length - 1], s = nf({minimumFractionDigits: 2, maximumFractionDigits: 2}).format(v).replace(/\s/g, ' ').replace(/ /g, ''); ptxt(c, s + '€', X0 + W2 - 3 - tw(s + '€'), Y0 + 1, col);
      dpos = [cx0 + cw - 1, yy(vs[vs.length - 1]), col];
    } else { ptxt(c, '-', cx0 + cw / 2, cy0 + ch2 / 2 - 2, '#5f6f90'); dpos = []; }
  }
  function monitor(c, i, p) {
    const x = DX[i], my = MY[i];
    R(c, x - 9, my, 18, 11, '#06090f'); R(c, x - 9, my, 18, 1, '#35456a'); R(c, x - 9, my + 10, 18, 1, '#222d48'); R(c, x - 9, my, 1, 11, '#2a3858'); R(c, x + 8, my, 1, 11, '#222d48');
    R(c, x - 8, my + 1, 16, 9, '#0a1424'); R(c, x - 1, my + 11, 2, 2, '#1c2540');
    if (p) {
      const col = p.pnl === null ? '#7a88a8' : p.pnl >= 0 ? '#2bf59a' : '#ff5470', dim = p.pnl === null ? 'rgba(122,136,168,.25)' : p.pnl >= 0 ? 'rgba(43,245,154,.2)' : 'rgba(255,84,112,.2)';
      ptxt(c, p.s.slice(0, 4), x - 7, my + 2, '#dbe6ff');
      const v = p.pnl === null ? '-' : (p.pnl > 0 ? '+' : p.pnl < 0 ? '-' : '') + Math.abs(p.pnl).toFixed(1).replace('.', ','); ptxt(c, v, x - 7, my + 8 - 1, col);
      R(c, x - 8, my + 1, 16, 1, dim);
    } else { ptxt(c, '-', x - 1, my + 4, '#3a4764'); }
  }
  function desk(c, i) {
    const x = DX[i], my = MY[i];
    R(c, x - 5, my + 15, 10, 9, '#0b101a'); R(c, x - 5, my + 15, 10, 1, '#1b2438');             // dossier de chaise
    R(c, x - 12, my + 11, 24, 5, '#1a2236'); R(c, x - 12, my + 11, 24, 1, '#34456b'); R(c, x - 12, my + 15, 24, 1, '#0b0f19');
    R(c, x - 11, my + 16, 2, 5, '#10162a'); R(c, x + 9, my + 16, 2, 5, '#10162a');
    R(c, x - 4, my + 12, 8, 1, '#4a5a82'); R(c, x + 6, my + 12, 3, 2, '#2a3858');
  }
  function paintBG() {
    const c = bg; c.clearRect(0, 0, LW, LH);
    R(c, 0, 0, LW, LH, '#080b13'); R(c, 0, 0, LW, 48, '#0b101c'); R(c, 0, 47, LW, 1, '#1a2540');
    for (let y = 48; y < LH; y += 8) R(c, 0, y, LW, 1, 'rgba(110,130,190,.045)'); for (let x = 0; x < LW; x += 16) R(c, x, 48, 1, LH - 48, 'rgba(110,130,190,.035)');
    R(c, 0, 0, LW, 1, '#1b2640'); R(c, 0, LH - 1, LW, 1, '#1b2640'); R(c, 0, 0, 1, LH, '#1b2640'); R(c, LW - 1, 0, 1, LH, '#1b2640');
    /* bandeau de stats (réel) */
    const eq = D.curve.length ? D.curve[D.curve.length - 1].equity : null, net = eq !== null && D.base !== null ? eq - D.base : null;
    const sline = 'ULTRA 1.2 · ' + (D.pos ? D.pos.length : '-') + ' OUV. · ' + (D.nClos === null ? '-' : D.nClos) + ' CLOS';
    ptxt(c, sline, 5, 3, '#4e7f88');
    /* logo + radar (mur gauche) */
    R(c, 4, 12, 27, 22, '#0d1426'); R(c, 4, 12, 27, 1, '#26365a'); R(c, 4, 33, 27, 1, '#0a0f1c');
    ptxt(c, 'ORION', 6, 15, '#e8efff'); ptxt(c, 'ULTRA', 6, 21, '#ff2d75'); ptxt(c, '1.2', 6, 27, '#2ee6d6');
    /* bannières */
    for (const bx of [33, 135]) { R(c, bx - 1, 15, 7, 1, '#2a3753'); R(c, bx, 16, 5, 18, '#14203e'); R(c, bx + 1, 34, 3, 1, '#14203e'); R(c, bx + 2, 35, 1, 1, '#14203e'); R(c, bx + 1, 20, 3, 1, '#ff2d75'); R(c, bx, 21, 1, 3, '#ff2d75'); R(c, bx + 4, 21, 1, 3, '#ff2d75'); R(c, bx + 1, 24, 3, 1, '#ff2d75'); R(c, bx + 2, 22, 1, 1, '#2ee6d6'); }
    wallScreen(c);
    /* panneau de notes (droite) : chiffres réels */
    R(c, 142, 14, 30, 32, '#0b1020'); R(c, 142, 14, 30, 1, '#2a3858'); R(c, 142, 45, 30, 1, '#080c16'); R(c, 142, 14, 1, 32, '#1f2a47'); R(c, 171, 14, 1, 32, '#1f2a47');
    ptxt(c, 'OPEN', 145, 17, '#6c7c9c'); ptxt(c, D.pos ? String(D.pos.length) : '-', 145, 23, '#e8efff', 2);
    const known = (D.pos || []).filter(r => r.pnl !== null), lat = known.length ? known.reduce((a, r) => a + r.pnl, 0) : null;
    ptxt(c, 'LATENT', 145, 34, '#6c7c9c'); ptxt(c, lat === null ? '-' : (lat > 0 ? '+' : lat < 0 ? '-' : '') + Math.abs(lat).toFixed(2).replace('.', ','), 145, 40, lat === null ? '#7a88a8' : lat >= 0 ? '#2bf59a' : '#ff5470');
    /* mobilier */
    for (let i = 0; i < 7; i++) desk(c, i);
    for (let i = 0; i < 6; i++) monitor(c, i, (D.pos || [])[i]);
    monitor(c, 6, null); { const x = DX[6], my = MY[6], e = D.curve.length ? D.curve[D.curve.length - 1].equity : null; R(c, x - 8, my + 1, 16, 9, '#1a0a18'); ptxt(c, 'ORION', x - 7, my + 2, '#ff5d98'); ptxt(c, e === null ? '-' : String(Math.round(e)), x - 7, my + 7, '#e8efff'); }
    /* console radar de Scout */
    R(c, 153, 92, 21, 12, '#0f1628'); R(c, 153, 92, 21, 1, '#34456b'); R(c, 153, 103, 21, 1, '#080c16');
    R(c, 163, 86, 3, 7, '#26365a'); R(c, 159, 82, 11, 5, '#0f1628'); R(c, 160, 81, 9, 1, '#34456b'); R(c, 158, 83, 1, 3, '#34456b'); R(c, 170, 83, 1, 3, '#34456b'); R(c, 164, 78, 1, 4, '#34456b'); R(c, 163, 77, 3, 1, '#2ee6d6');
    ptxt(c, 'RADAR', 154, 96, '#2ee6d6');
    /* plantes, classeur, caisse */
    plant(c, 15, 68); plant(c, 66, 108); plant(c, 108, 108); plant(c, 10, 88); plant(c, 136, 108);
    R(c, 4, 99, 26, 17, '#101729'); R(c, 4, 99, 26, 1, '#34456b'); R(c, 5, 107, 24, 1, '#080c16'); R(c, 15, 102, 4, 1, '#4a5a82'); ptxt(c, 'PAPERS', 6, 109, '#4e5e82');
    /* avatars (haut droite) */
    CHARS.forEach((ch, i) => { const b = BODY[ch.k], ax = 122 + i * 10, ay = 2; R(c, ax - 1, ay - 1, 11, 11, '#0a0e18'); R(c, ax, ay, 9, 9, rgb(mix(ch.c, INK, .55))); c.save(); c.beginPath(); c.rect(ax, ay, 9, 9); c.clip(); c.drawImage(b.cv, ax + 4 - (b.w >> 1) - 1, ay + 6 - b.h + (ch.k === 'SENTINEL' ? 2 : 0) + 2); c.restore(); const [l, r] = eyeXs(b.w); c.fillStyle = EYE; c.fillRect(ax + 4 - (b.w >> 1) + l, ay + 6 - b.h + 2 + ch.eyeY, 1, 2); c.fillRect(ax + 4 - (b.w >> 1) + r, ay + 6 - b.h + 2 + ch.eyeY, 1, 2); });
    fg.clearRect(0, 0, LW, LH);
  }
  /* ---------- logique ---------- */
  const near = (x, arr) => arr.reduce((b, g) => Math.abs(g - x) < Math.abs(b - x) ? g : b, arr[0]);
  function route(a, tx, ty, trow) {
    const p = []; let x = a.x;
    if (a.row === trow) { p.push([x, LANE(a.row)], [tx, LANE(a.row)]); }
    else { const g = near((x + tx) / 2, GAPS); p.push([x, LANE(a.row)], [g, LANE(a.row)], [g, LANE(trow)], [tx, LANE(trow)]); }
    p.push([tx, ty]); return p;
  }
  const ERR = [['SCOUT', 'TRADER', 1, '!'], ['TRADER', 'ORION', 1, '$'], ['SENTINEL', 'TRADER', 0, '!'], ['RESEARCH', 'SENTINEL', 1, '?'], ['ORION', 'SCOUT', 0, '♥'], ['SENTINEL', 'RESEARCH', 0, '?'], ['RESEARCH', 'TRADER', 1, '$'], ['ORION', 'SENTINEL', 0, '!'], ['TRADER', 'RESEARCH', 0, '$']];
  function setHl(k, d) { hl = k; hlT = t + d; if (onAct) onAct(k); }
  function startErrand() {
    const busy = errs.map(e => e.a.k), tbusy = errs.map(e => e.to.k);
    let i, n = 0; do { i = (rnd() * ERR.length) | 0; n++; } while (n < 20 && (i === lastE || busy.includes(ERR[i][0]) || busy.includes(ERR[i][1]) || tbusy.includes(ERR[i][0])));
    if (n >= 20) return; lastE = i; const [w, to, carry, em] = ERR[i], a = A(w), T = A(to), dir = a.x < T.hx ? -1 : 1, sx = Math.max(10, Math.min(LW - 10, T.hx + dir * 14)), sr = T.hr;
    a.path = route(a, sx, LANE(sr) - (sr === 1 ? 2 : 3), sr); a.path.push(null); errs.push({a, to: T, phase: 'out', carry: !!carry, em, dwell: 0, sx, sr}); setHl(a.k, 12);
  }
  function stepA(dt) {
    for (const a of actors) {
      a.lookNext -= dt; a.blinkNext -= dt; a.happy = Math.max(0, a.happy - dt);
      if (a.lookNext <= 0 && !a.walk) { a.lookT = [-1, 0, 1, 0][(rnd() * 4) | 0]; a.lookNext = 1.4 + rnd() * 3.2; }
      if (a.blinkNext <= 0) { a.blink = .16; a.blinkNext = 2 + rnd() * 3.5; } a.blink = Math.max(0, a.blink - dt);
      if (!a.walk) a.look += (a.lookT - a.look) * Math.min(1, dt * 8);
      a.emoteNext -= dt; if (a.emoteNext <= 0 && !RM) { a.emoteNext = 9 + rnd() * 9; if (!errs.some(e => e.a === a)) emotes.push({a, g: {ORION: '♥', SCOUT: '!', TRADER: '$', SENTINEL: '!', RESEARCH: '?'}[a.k], u: t + 1.7}); }
    }
    if (RM) return;
    for (let i = errs.length - 1; i >= 0; i--) {
      const e = errs[i], a = e.a; a.walk = false;
      const go = (speed) => {                                                          // marche le long du chemin
        let pt = a.path[0]; if (!pt) return true; let step = speed * dt;
        while (pt && step > 0) { const dx = pt[0] - a.x, dy = pt[1] - a.fy, d = Math.hypot(dx, dy); a.walk = true; if (Math.abs(dx) > .3) a.lookT = a.look = dx > 0 ? 1 : -1;
          if (d <= step) { a.x = pt[0]; a.fy = pt[1]; step -= d; a.path.shift(); pt = a.path[0]; if (pt === null) { a.path.shift(); return true; } } else { a.x += dx / d * step; a.fy += dy / d * step; step = 0; } }
        return false; };
      if (e.phase === 'out') { a.carryNow = e.carry; if (go(24)) { e.phase = 'dwell'; e.dwell = 2.1; a.walk = false; a.carryNow = false; a.lookT = a.look = e.to.hx > a.x ? 1 : -1; e.to.happy = 1.4; e.to.lookT = e.to.look = a.x > e.to.hx ? 1 : -1; emotes.push({a, g: e.em, u: t + 1.9}); setHl(e.to.k, 4); if (e.carry) a.carryNow = false; } }
      else if (e.phase === 'dwell') { a.walk = false; e.dwell -= dt; if (e.dwell <= 0) { e.phase = 'back'; a.path = route(a, a.hx, a.hy, a.hr); a.path.push(null); } }
      else { if (go(24)) { a.x = a.hx; a.fy = a.hy; a.row = a.hr; a.walk = false; a.lookT = 0; errs.splice(i, 1); if (!errs.length) { cool = 2.5 + rnd() * 3; setHl(null, 0); } } else { a.row = a.fy > 90 ? 2 : 1; } }
      if (e.phase !== 'back' && e.phase !== 'out') {} else if (e.phase === 'out') { a.row = a.fy > 90 ? 2 : 1; }
    }
    cool -= dt; if (cool <= 0 && errs.length < 2) { startErrand(); cool = 3 + rnd() * 4; }
    nextFloat -= dt; if (nextFloat <= 0) { nextFloat = 4 + rnd() * 5; const ks = (D.pos || []).map((p, i) => [p, i]).filter(q => q[0].pnl !== null); if (ks.length) { const [p, i] = ks[(rnd() * ks.length) | 0]; floats.push({x: DX[i], y: MY[i] - 2, p, u: 0}); } }
  }
  /* ---------- rendu ---------- */
  function drawDyn() {
    const c = ctx; c.clearRect(0, 0, LW, LH); c.drawImage(bgc, 0, 0);
    /* clignotements décoratifs : point de l'équité, radar de gauche, LED */
    if (dpos.length && ((t * 1.6) | 0) % 2 === 0) { c.fillStyle = '#ffffff'; c.fillRect(dpos[0] - 1, dpos[1] - 1, 3, 3); c.fillStyle = dpos[2]; c.fillRect(dpos[0], dpos[1], 1, 1); }
    { const rx = 17, ry = 46; c.fillStyle = '#06101a'; c.fillRect(rx - 11, ry - 9, 22, 22); c.fillStyle = '#26365a'; c.fillRect(rx - 12, ry - 10, 24, 1); c.fillRect(rx - 12, ry + 13, 24, 1); c.fillRect(rx - 12, ry - 10, 1, 24); c.fillRect(rx + 11, ry - 10, 1, 24);
      c.fillStyle = 'rgba(46,230,214,.22)'; for (let i = 0; i < 360; i += 6) { const a = i * Math.PI / 180, r = 8; c.fillRect(Math.round(rx + Math.cos(a) * r), Math.round(ry + 2 + Math.sin(a) * r), 1, 1); } for (let i = 0; i < 360; i += 12) { const a = i * Math.PI / 180; c.fillRect(Math.round(rx + Math.cos(a) * 4), Math.round(ry + 2 + Math.sin(a) * 4), 1, 1); }
      const sw = RM ? 1 : t * 1.6; for (let k2 = 0; k2 < 8; k2++) { const a = sw - k2 * .09; c.fillStyle = 'rgba(46,230,214,' + (.8 - k2 * .1) + ')'; for (let r = 1; r <= 9; r++) c.fillRect(Math.round(rx + Math.cos(a) * r), Math.round(ry + 2 + Math.sin(a) * r), 1, 1); } }
    c.fillStyle = ((t * 1.3) | 0) % 2 ? '#ff2d75' : '#4a1a30'; 
    /* tri par profondeur, personnages */
    hits = []; const order = actors.slice().sort((p, q) => p.fy - q.fy); let post = [];
    for (const a of order) {
      const r = drawChar(c, a.b, a.x, Math.round(a.fy), t, {walk: a.walk, look: a.look, blink: a.blink > 0, happy: a.happy > 0, carry: !!a.carryNow, hands: a.hands && !a.walk && !errs.some(e => e.a === a && e.phase === 'dwell')});
      hits.push({k: a.k, cap: a.ch.cap, col: a.ch.c, x0: r.ox - 2, x1: r.ox + a.b.w + 2, y0: r.oy - 6, y1: Math.round(a.fy) + 3, cx: a.x, top: r.oy});
    }
    c.drawImage(fgc, 0, 0);
    /* anneau de l'avatar actif */
    if (hl) { const i = CHARS.findIndex(q => q.k === hl); if (i >= 0) { c.strokeStyle = '#2bf59a'; c.lineWidth = 1; c.strokeRect(121.5 + i * 10, 2.5, 10, 10); } }
    /* bulles d'émotes */
    for (let i = emotes.length - 1; i >= 0; i--) { const e = emotes[i]; if (t > e.u) { emotes.splice(i, 1); continue; } const h = hits.find(q => q.k === e.a.k); if (h) bubble(c, h.cx + 7, h.top - 7 - Math.min(2, (e.u - t) < .3 ? 0 : 0), e.g, rgb(e.a.ch.c)); }
    /* chiffres flottants (P&L latent réel) */
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; if (f.u >= 1.5) { floats.splice(i, 1); continue; } const s = (f.p.pnl > 0 ? '+' : f.p.pnl < 0 ? '-' : '') + Math.abs(f.p.pnl).toFixed(2).replace('.', ','); c.globalAlpha = f.u > 1.1 ? Math.max(0, (1.5 - f.u) / .4) : 1; ptxt(c, s, f.x - tw(s) / 2, f.y - Math.floor(f.u * 7), f.p.pnl >= 0 ? '#2bf59a' : '#ff5470'); c.globalAlpha = 1; }
    if (tip && t < tip.u) { const h = tip.h, s = h.k + ' · ' + h.cap, w = tw(s) + 6, x = Math.max(2, Math.min(LW - w - 2, Math.round(h.cx - w / 2))), y = Math.max(2, h.top - 11); c.fillStyle = '#05070d'; c.fillRect(x - 1, y - 1, w + 2, 9); c.fillStyle = rgb(h.col); c.fillRect(x - 1, y - 1, w + 2, 1); c.fillRect(x - 1, y + 7, w + 2, 1); c.fillRect(x - 1, y - 1, 1, 9); c.fillRect(x + w, y - 1, 1, 9); c.fillStyle = '#05070d'; c.fillRect(x, y, w, 7); ptxt(c, s, x + 3, y + 1, rgb(mix(h.col, WHITE, .35))); }
  }
  function loop(ts) {
    if (!running) return; raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts; t += dt; for (const f of floats) f.u += dt;
    stepA(dt); drawDyn();
    fpsN++; if (ts - fpsT > 1000) { fps = fpsN * 1000 / (ts - fpsT); fpsN = 0; fpsT = ts; }
  }
  function still() { t = 3; actors.forEach(a => { a.blink = 0; a.look = a.lookT = 0; a.happy = 0; a.walk = false; }); emotes = []; floats = []; drawDyn(); }
  function start() { if (RM || running) return; running = true; last = performance.now(); fpsT = last; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function fit() { const w = Math.max(LW, cv.parentElement.clientWidth), s = Math.max(1, Math.floor(w / LW)); cv.style.width = LW * s + 'px'; cv.style.height = LH * s + 'px'; if (RM) still(); }
  new ResizeObserver(fit).observe(cv.parentElement);
  cv.addEventListener('pointerdown', e => {
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * LW, y = (e.clientY - r.top) / r.height * LH;
    const h = hits.find(q => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1);
    if (h) { tip = {h, u: t + 2.4}; if (RM) still(); }
  });
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : (vis && start()); });
  let vis = true; if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; vis && !document.hidden ? start() : stop(); }).observe(cv);
  paintBG(); fit(); drawDyn(); start();
  return {refresh() { paintBG(); if (RM) still(); else drawDyn(); }, fps: () => fps, count: () => actors.length};
}
function agentIcon(cv, k) {
  const b = BODY[k], c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, 16, 16);
  const ox = 8 - (b.w >> 1), oy = 14 - b.h; c.drawImage(b.cv, ox - 1, oy - 1); const [l, r] = eyeXs(b.w); c.fillStyle = EYE; c.fillRect(ox + l, oy + b.ch.eyeY, 1, 2); c.fillRect(ox + r, oy + b.ch.eyeY, 1, 2);
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
    const n = Math.max(4, Math.floor((H - 30) / 16)), top = 16, lh = (H - top - 10) / n; beamX = bX(t); pbeam = beamX;
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


/* ===================== chargement + démarrage ===================== */
async function load() {
  const [p, ui, st, team, wide, ultra] = await Promise.all([get('paper10'), get('ui'), get('status'), get('team'), get('wide'), get('ultra')]);
  const safe = f => { try { f(); } catch (e) { console.error(e); } };
  const rows = openRows(p, ui); D.pos = rows;
  safe(() => renderTop(p, st)); safe(() => renderKpi(p, ui, rows)); safe(() => renderBal()); safe(() => renderPos(rows));
  safe(() => renderLog(p, team)); safe(() => renderAgents(team)); safe(() => renderFoot(ui)); safe(() => renderScan(wide, ultra, ui));
  if (office) safe(() => office.refresh());
}
try {
  document.querySelectorAll('.ag canvas').forEach(c => agentIcon(c, c.closest('.ag').dataset.k));
  office = Office($('cv'), k => document.querySelectorAll('.ag').forEach(el => el.classList.toggle('on', el.dataset.k === k)));
  scanner = Scanner($('cv3'));
  window.__spr = {BODY, CHARS, drawChar, bubble};
  window.__orion = {fps: () => office.fps(), fps3: () => scanner.fps(), n: () => office.count(), pool: () => scanner.pool()};
} catch (e) { console.error(e); }
load();
setInterval(() => { if (!document.hidden) load(); }, 5 * 60e3);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
