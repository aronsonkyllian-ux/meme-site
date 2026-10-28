/* ORION — THE ORION FLOOR. Lit uniquement data/{paper10,ui,status,team,wide,ghosts}.json (publiés par le cycle)
   + bougies publiques Bitvavo (1 h, sans clé) pour les graphiques de prix. Donnée absente = « — ». Aucune valeur inventée. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const BOOK = 'ultra-1.2-test';
const DATA = new URL('../data/', document.currentScript.src).href;
const ok = x => typeof x === 'number' && isFinite(x);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const nf = o => new Intl.NumberFormat('fr-FR', o);
const eur = (x, sign) => ok(x) ? nf({style: 'currency', currency: 'EUR', signDisplay: sign ? 'exceptZero' : 'auto'}).format(x).replace('-', '−') : '—';
const pct = x => ok(x) ? nf({style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero'}).format(x).replace('-', '−') : '—';
const pct1 = x => ok(x) ? nf({style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero'}).format(x).replace('-', '−') : '—';
const num = (x, d = 2) => ok(x) ? nf({minimumFractionDigits: d, maximumFractionDigits: d}).format(x).replace('-', '−') : '—';
const px = x => ok(x) ? nf({maximumSignificantDigits: 4}).format(x) : '—';
const cls = x => !ok(x) ? 'z' : x > 0.004 ? 'g' : x < -0.004 ? 'r' : 'z';
const get = async f => { try { const r = await fetch(DATA + f + '.json?' + Date.now(), {cache: 'no-store'}); return r.ok ? await r.json() : null; } catch (e) { return null; } };
const parisF = o => new Intl.DateTimeFormat('fr-FR', Object.assign({timeZone: 'Europe/Paris'}, o));
const fmtDT = ts => ok(ts) ? parisF({day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(ts).replace(',', '') : '—';
const fmtD = ts => parisF({day: '2-digit', month: '2-digit'}).format(ts);
const fmtH = ts => parisF({hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(ts);
const ageStr = ms => { if (!ok(ms) || ms < 0) return '—'; const m = Math.floor(ms / 60e3); return m < 60 ? m + ' min' : m < 1440 ? Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') : Math.floor(m / 1440) + ' j'; };
const sym = m => String(m || '').replace(/-EUR$/, '');
const TAU = Math.PI * 2;
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const COL = {cy: '#27e6ff', mg: '#ff3dd8', li: '#8dff3a', vi: '#a86bff', go: '#ffcf3a', g: '#3dff9a', r: '#ff4d7a', mut: '#6d7ba0'};
const D = {p: null, ui: null, st: null, team: null, wide: null, ghosts: null, curve: [], base: null, pos: [], closed: [], nClos: null, candles: {}, btcC: null, lastTick: 0};
const bookOf = p => p && p.carnets && p.carnets[BOOK];
let eq = null, floor = null;

/* ===================== PANNEAUX ===================== */
function buildPositions(p, ui) {
  const b = bookOf(p); if (!b || !Array.isArray(b.positions)) return null;
  const uiPos = (ui && ui.carnets && ui.carnets[BOOK] && ui.carnets[BOOK].positions_ouvertes) || [];
  return b.positions.filter(x => x.status === 'ouverte').map(x => {
    const q = uiPos.find(u => u.market === x.market) || {};
    return {m: String(x.market || ''), s: sym(x.market), amt: ok(q.cout) ? q.cout : null, pnl: ok(q.pnl_latent_net) ? q.pnl_latent_net : null, pc: ok(q.pnl_latent_net_pct) ? q.pnl_latent_net_pct : null,
      entry: x.entry_px, entry_ts: x.entry_ts, sl: ok(x.sl) && x.sl > 0 ? x.sl : null, mark: q.marquage && ok(q.marquage.prix) ? q.marquage.prix : null};
  }).sort((a, z) => (z.amt ?? -1) - (a.amt ?? -1));
}
function renderTop() {
  const {p, st} = D, g = (st && ok(st.genere)) ? st.genere : (p && ok(p.genere)) ? p.genere : null, live = $('live'), age = g === null ? null : Date.now() - g;
  live.className = 'live' + (age === null ? ' na' : age > 4 * 3600e3 ? ' stale' : '');
  live.querySelector('span').textContent = age === null ? 'NO DATA' : age > 4 * 3600e3 ? 'STALE' : 'LIVE';
  $('s_age').textContent = age === null ? '—' : ageStr(age);
  const b = bookOf(p), dep = b && ok(b.depart) ? b.depart : null;
  $('s_day').textContent = dep === null ? '—' : String(Math.floor((Date.now() - dep) / 864e5) + 1);
}
const lastEq = () => D.curve.length ? D.curve[D.curve.length - 1].equity : null;
const latent = () => { const k = (D.pos || []).filter(r => r.pnl !== null); return k.length ? k.reduce((a, r) => a + r.pnl, 0) : null; };
const stats = () => { const u = D.ui; return u && u.carnets && u.carnets[BOOK] && u.carnets[BOOK].stats_clos; };
function renderKpi() {
  const {p, ui} = D, b = bookOf(p), base = p && ok(p.capital) ? p.capital : null;
  const c = b && Array.isArray(b.courbe) ? b.courbe.filter(q => ok(q.equity) && ok(q.ts)) : [];
  D.curve = c; D.base = base;
  const last = c.length ? c[c.length - 1] : null, net = last && base !== null ? last.equity - base : null;
  $('k_cap').textContent = last ? eur(last.equity) : '—'; $('k_capS').textContent = base !== null ? 'départ ' + eur(base) + ' · capital fictif' : '—';
  $('k_pl').className = 'kbig ' + cls(net); $('k_pl').textContent = eur(net, true); $('k_plS').textContent = net !== null && base ? pct(net / base) + ' depuis le départ (après frais)' : '—';
  const st = stats(); D.nClos = st && ok(st.n_clos) ? st.n_clos : null;
  $('s_cl').textContent = D.nClos === null ? '—' : String(D.nClos);
  $('s_op').textContent = D.pos ? String(D.pos.length) : '—';
}
function renderStrip() {
  const t = D.team && D.team.resume && D.team.resume.performance, st = stats(), lat = latent(), eqv = lastEq();
  const cell = (l, v, c) => `<div><small>${l}</small><b class="${c || ''}">${v}</b></div>`;
  const d24 = t && ok(t.variation_24h_eur) ? t.variation_24h_eur : null;
  $('strip').innerHTML = cell('CAPITAL', eur(eqv)) + cell('P&amp;L 24 H', eur(d24, true), cls(d24)) + cell('RÉALISÉ', st && ok(st.pnl_realise) ? eur(st.pnl_realise, true) : '—', cls(st && st.pnl_realise)) + cell('LATENT', eur(lat, true), cls(lat));
}
function renderPos() {
  const rows = D.pos, list = $('plist'), cnt = $('posCnt');
  if (!rows) { list.innerHTML = '<div class="empty">—</div>'; cnt.textContent = '—'; return; }
  cnt.textContent = rows.length + ' OUVERTE' + (rows.length > 1 ? 'S' : '');
  if (!rows.length) { list.innerHTML = '<div class="empty">Aucune position ouverte</div>'; return; }
  list.innerHTML = rows.map(r => `<div class="pr"><b>${esc(r.s)}</b><span class="mu">${r.amt === null ? '—' : eur(r.amt)}</span><span class="${cls(r.pnl)}">${eur(r.pnl, true)}</span><small class="${cls(r.pnl)}">${pct(r.pc)}</small></div>`).join('');
}
const TG = {position_ouverte: ['ENTRÉE', 'g'], position_fermee: ['SORTIE', 'p'], ordre_ouvert: ['ORDRE', 'c'], stop_releve_programme: ['STOP ↑', 'a'], ordre_rejete: ['REJET', 'm'], deja_detenu: ['DÉJÀ', 'm'], cycle_manque: ['CYCLE', 'a'], ordre_partiel_puis_abandon: ['PARTIEL', 'a']};
const short = (s, n) => { s = String(s || '').replace(/\s*\(reconstruit après coup\)/, '').replace(/ultra\d+/, '').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
function renderLog() {
  const {p, team} = D, b = bookOf(p), el = $('lines'), meta = $('logMeta');
  if (!b || !Array.isArray(b.evenements)) { el.innerHTML = '<div class="empty">—</div>'; meta.textContent = '—'; return; }
  const pos = Array.isArray(b.positions) ? b.positions : [];
  D.closed = pos.filter(x => x.status === 'fermee' && ok(x.pnl));
  const evs = []; let rej = 0;
  for (const e of b.evenements.slice().sort((a, z) => z.ts - a.ts)) {
    const tg = TG[e.kind]; if (!tg) continue; if (e.kind === 'ordre_rejete' && ++rej > 5) continue;
    let am = null, tx = short(e.detail, 46), c = tg[1];
    const near = list => list.filter(x => x.market === e.market).sort((a, z) => Math.abs((a.entry_ts || 0) - e.ts) - Math.abs((z.entry_ts || 0) - e.ts))[0];
    if (e.kind === 'position_ouverte') { const x = near(pos); if (x && ok(x.entry_px) && ok(x.qty)) am = {v: x.entry_px * x.qty, c: 'z', s: false}; tx = x && ok(x.entry_px) ? 'entrée @ ' + px(x.entry_px) : ''; }
    if (e.kind === 'position_fermee') { const x = D.closed.filter(q => q.market === e.market).sort((a, z) => Math.abs((a.exit_ts || 0) - e.ts) - Math.abs((z.exit_ts || 0) - e.ts))[0]; if (x) { am = {v: x.pnl, c: cls(x.pnl), s: true}; tx = String(x.reason || '').replace(/_/g, ' ').toUpperCase(); c = x.pnl >= 0 ? 'g' : 'r'; } }
    if (e.kind === 'ordre_rejete') tx = /âge/.test(e.detail || '') ? 'signal périmé / qté nulle' : tx;
    evs.push({ts: e.ts, s: sym(e.market), tag: tg[0], c, am, tx});
  }
  const jr = team && Array.isArray(team.journal) ? team.journal : [], seen = new Set();
  for (const e of jr.slice().sort((a, z) => z.ts - a.ts)) {
    const k = e.role + '.' + e.kind, pl = e.payload || {}; if (seen.has(k)) continue;
    let tx = null, c = 'c';
    if (k === 'ARBITRE.tick_termine') tx = 'tick terminé · ' + (ok(pl.n_open) ? pl.n_open + ' pos.' : '—') + (ok(pl.duree_s) ? ' · ' + pl.duree_s + ' s' : '');
    else if (k === 'SENTINEL.risque_agrege') { tx = 'risque ouvert ' + (ok(pl.pct_equite) ? num(pl.pct_equite) + ' % équité' : '—'); c = 'l'; }
    else if (k === 'TRADER.evaluation_positions') { tx = ok(pl.n) ? pl.n + ' positions évaluées' : 'évaluation'; c = 'p'; }
    else if (k === 'RESEARCH.fantomes_avances') { tx = 'fantômes avancés'; c = 'v'; }
    if (tx) { seen.add(k); evs.push({ts: e.ts, s: '', tag: e.role, c, am: null, tx}); }
  }
  evs.sort((a, z) => z.ts - a.ts); const rows = evs.slice(0, 24);
  meta.textContent = rows.length + ' ÉVÉNEMENTS';
  el.innerHTML = rows.length ? rows.map(r => `<div class="ev"><time>${fmtDT(r.ts)}</time><b>${esc(r.s)}</b><i class="tg ${r.c}">${esc(r.tag)}</i><span class="am ${r.am ? r.am.c : ''}">${r.am ? eur(r.am.v, r.am.s) : ''}</span><span class="tx">${esc(r.tx)}</span></div>`).join('') : '<div class="empty">—</div>';
}
function latestCycle() { const u = D.ui; return u && u.journal_ultra && Array.isArray(u.journal_ultra.cycles) && u.journal_ultra.cycles.length ? u.journal_ultra.cycles.reduce((a, z) => (z.ts > a.ts ? z : a)) : null; }
function latestWide() { const w = D.wide; return w && Array.isArray(w.instantanes) && w.instantanes.length ? w.instantanes.reduce((a, z) => (z.ts > a.ts ? z : a)) : null; }
const lastEv = (role, kind) => { const j = D.team && D.team.journal; if (!Array.isArray(j)) return null; let b = null; for (const e of j) if (e.role === role && e.kind === kind && (!b || e.ts > b.ts)) b = e; return b; };
function renderAgents() {
  const now = Date.now(), r = D.team && D.team.resume, ex = r && r.derniere_execution_reelle, age = k => ex && ex[k] && ok(ex[k].ts) ? ' · il y a ' + ageStr(now - ex[k].ts) : '';
  const inst = latestWide(), cyc = latestCycle(), ex2 = D.wide && Array.isArray(D.wide.exclusions) ? D.wide.exclusions : [], kept = (ex2.find(e => e.k === 'retenu') || {}).n;
  const set = (k, t) => { document.querySelectorAll('[data-st="' + k + '"]').forEach(el => { el.textContent = t; }); };
  set('scout', [inst && ok(inst.n_eur) ? inst.n_eur + ' marchés analysés' : null, ok(kept) ? kept + ' retenus' : null, cyc && ok(cyc.n_anomalies) ? cyc.n_anomalies + ' anomalies' : null].filter(Boolean).join(' · ') + age('SCOUT') || '—');
  const lat = latent();
  set('trader', D.pos ? D.pos.length + ' position' + (D.pos.length > 1 ? 's' : '') + ' ouverte' + (D.pos.length > 1 ? 's' : '') + ' · latent ' + eur(lat, true) + age('TRADER') : '—');
  const rk = lastEv('SENTINEL', 'risque_agrege'), rp = rk && rk.payload || {}, co = lastEv('SENTINEL', 'controle_coherence');
  set('sentinel', rk ? 'risque ouvert ' + num(rp.pct_equite) + ' % de l\'équité (plafond d\'observation ' + num(rp.plafond_observation_pct, 0) + ' %)' + (co ? ' · cohérence ' + (co.payload && co.payload.sain ? 'OK' : 'à vérifier') : '') : '—');
  const g = D.ghosts, n = g && ok(g.seuil_lecture) ? g.seuil_lecture : 30;
  set('research', g && Array.isArray(g.carnets) ? g.carnets.length + ' carnets fantômes · ' + g.carnets.reduce((a, c) => a + (c.clos || 0), 0) + ' trades clos sur ' + n + ' requis · non concluant' + age('RESEARCH') : '—');
  const nP = D.pos ? D.pos.length : null, nCar = g && Array.isArray(g.carnets) ? g.carnets.length : null, nClos = g && Array.isArray(g.carnets) ? g.carnets.reduce((a, c) => a + (c.clos || 0), 0) : 0;
  const KV = {scout: [cyc && ok(cyc.n_anomalies) ? String(cyc.n_anomalies) : '—', 'candidats'], trader: [nP === null ? '—' : String(nP), 'positions'], sentinel: [rk && ok(rp.pct_equite) ? num(rp.pct_equite) + ' %' : '—', 'risque'], research: [nCar === null ? '—' : String(nCar), 'carnets · ' + nClos + ' clos'], arbitre: [ok(lastEq()) ? nf({style: 'currency', currency: 'EUR', maximumFractionDigits: 0}).format(lastEq()) : '—', 'capital']};
  for (const k in KV) { document.querySelectorAll('[data-kv="' + k + '"]').forEach(e => { e.textContent = KV[k][0]; }); document.querySelectorAll('[data-ku="' + k + '"]').forEach(e => { e.textContent = KV[k][1]; }); document.querySelectorAll('.ch[data-k="' + k + '"] .tg2').forEach(e => { e.textContent = KV[k][0] + ' ' + KV[k][1].split(' · ')[0]; }); }
  const dv = lastEv('ARBITRE', 'decision_verrou'), de = lastEv('ARBITRE', 'decision_entree');
  const dd = [dv, de].filter(Boolean).sort((a, z) => z.ts - a.ts)[0];
  set('arbitre', dd ? 'dernière décision : ' + (dd.kind === 'decision_verrou' ? 'verrou de profit ' + sym(dd.market) + ' (' + (dd.payload.statut || '—') + ')' : 'entrée ' + sym(dd.market) + ' ' + (dd.payload.statut || '—')) + ' · il y a ' + ageStr(now - dd.ts) : 'aucune décision récente');
}
function renderFoot() {
  const b = stats(), nmin = D.ui && ok(D.ui.n_min_conclusion) ? D.ui.n_min_conclusion : 30;
  $('badge').textContent = 'Paper trading · capital fictif · aucun ordre réel' + (b && ok(b.n_clos) ? ` · ${b.n_clos} trade${b.n_clos > 1 ? 's' : ''} clos` + (b.n_clos < nmin ? ' : rien de prouvé' : '') : '');
  $('floorMeta').textContent = '5 AGENTS · ' + (b && ok(b.n_clos) ? b.n_clos + ' TRADES CLOS' : '— TRADES CLOS');
}
function renderGhosts() {
  const g = D.ghosts, list = $('ghList'), meta = $('ghMeta');
  if (!g || !Array.isArray(g.carnets)) { list.innerHTML = '<div class="empty">—</div>'; meta.textContent = '—'; return; }
  const n = ok(g.seuil_lecture) ? g.seuil_lecture : 30;
  meta.textContent = 'HYPOTHÉTIQUES · PAPIER · ' + (ok(g.genere) ? fmtDT(g.genere) : '—');
  if (g.avertissement) $('ghNote').textContent = g.avertissement;
  list.innerHTML = g.carnets.map(c => {
    const cl = ok(c.clos) ? c.clos : null, pc = cl === null ? 0 : Math.min(100, Math.round(100 * cl / n));
    return `<div class="gx"><div class="gt"><b>${esc(c.id)}</b><em>${esc(c.nom)}</em><span class="gp">${cl === null ? '—' : cl}/${n}${cl !== null && cl < n ? ' · non concluant' : ''}</span></div>
      <div class="gd">${esc(c.description)}</div>
      <div class="gs"><span><i>PRIS</i>${ok(c.pris) ? c.pris : '—'}</span><span><i>ATTENTE</i>${ok(c.attente) ? c.attente : '—'}</span><span><i>OUVERTS</i>${ok(c.ouverts) ? c.ouverts : '—'}</span><span><i>CLOS</i>${cl === null ? '—' : cl} (${ok(c.gagnants) ? c.gagnants : '—'}G / ${ok(c.perdants) ? c.perdants : '—'}P)</span><span class="${cls(c.pnl_realise_eur)}"><i>RÉALISÉ</i>${eur(c.pnl_realise_eur, true)}</span><span class="${cls(c.pnl_latent_eur)}"><i>LATENT</i>${eur(c.pnl_latent_eur, true)}</span></div>
      <div class="gb"><u style="width:${pc}%"></u></div></div>`;
  }).join('');
}
const EXCL = {volume24h_lt_10k_eur: 'volume 24 h < 10 k€', stablecoin: 'stablecoin', spread_gt_2pct: 'spread > 2 %'};
function renderScan() {
  const {wide, ui} = D, inst = latestWide(), cyc = latestCycle();
  const ex = wide && Array.isArray(wide.exclusions) ? wide.exclusions : [], kept = (ex.find(e => e.k === 'retenu') || {}).n;
  const F = [{n: inst && inst.n_eur, l: 'MARCHÉS EUR<br>ANALYSÉS'}, {n: kept, l: 'RETENUS<br>UNIVERS LIQUIDE'}, {n: cyc && cyc.n_anomalies, l: 'ANOMALIES<br>DÉTECTÉES'}, {n: cyc && cyc.n_deep, l: 'ANALYSE<br>APPROFONDIE'}, {n: cyc && Array.isArray(cyc.selected) ? cyc.selected.length : null, l: 'RETENU<br>POUR TRADE', k: 1}];
  $('funnel').innerHTML = F.map(f => `<div class="fn ${f.k ? 'k' : ''}"><b>${ok(f.n) ? f.n : '—'}</b><small>${f.l}</small></div>`).join('');
  const vf = cyc && cyc.verdicts_F ? Object.values(cyc.verdicts_F) : null, cnt = v => vf ? vf.filter(x => x === v).length : '—';
  const why = ex.filter(e => e.k !== 'retenu');
  const ex2 = inst && ok(inst.n_excluded) ? `<span><b>${inst.n_excluded}</b> écartés</span>` : '';
  $('why').innerHTML = ex2 + why.map(e => `<span>${esc(EXCL[e.k] || e.k)} <b>×${e.n}</b></span>`).join('') + (vf ? `<span class="k">retenu <b>×${cnt('selectionner')}</b></span><span class="w">surveillé <b>×${cnt('surveiller')}</b></span><span class="d">écarté <b>×${cnt('rejeter')}</b></span>` : '');
  const ts = inst ? inst.ts : cyc ? cyc.ts : null;
  $('scanMeta').textContent = [inst && ok(inst.n_eur) ? inst.n_eur + ' ANALYSÉES' : null, ok(ts) ? 'DERNIER SCAN IL Y A ' + ageStr(Date.now() - ts).toUpperCase() : null].filter(Boolean).join(' · ') || '—';
}

/* ===================== COURBE DU CAPITAL ===================== */
function EquityChart() {
  const cv = $('eqc'), wrap = $('chw'), tip = $('tip'), ctx = cv.getContext('2d');
  let range = '7J', W = 0, H = 0, dpr = 1, hover = null, prog = RM ? 1 : 0, t0 = performance.now(), geo = null, raf = 0;
  const PAD = {l: 8, r: 8, t: 14, b: 22};
  /* série BTC « garder » rebasée sur le capital au début de la fenêtre (btc_hold du cycle : BTC-EUR acheté au départ) */
  const stepAt = (arr, t) => { if (!arr.length || t < arr[0].ts) return null; let lo = 0, hi = arr.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (arr[m].ts <= t) lo = m; else hi = m - 1; } return arr[lo]; };
  const eqAt = t => { const c = D.curve; if (!c.length) return null; if (t <= c[0].ts) return c[0].equity; if (t >= c[c.length - 1].ts) return c[c.length - 1].equity; let lo = 0, hi = c.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m].ts <= t) lo = m; else hi = m; } const a = c[lo], b = c[hi], k = (t - a.ts) / (b.ts - a.ts || 1); return a.equity + (b.equity - a.equity) * k; };
  function visible() {
    const c = D.curve; if (!c.length) return [];
    const last = c[c.length - 1].ts, from = range === '24H' ? last - 864e5 : range === '7J' ? last - 7 * 864e5 : 0;
    let v = c.filter(q => q.ts >= from);
    if (v.length < 2 && c.length >= 2) v = c.slice(-2);
    return v;
  }
  function layout() {
    const r = wrap.getBoundingClientRect(); W = Math.max(200, r.width); H = Math.max(140, r.height); dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
  }
  function spline(pts) {                       // courbe monotone (Fritsch–Carlson) : lisse, sans dépassement
    const n = pts.length, d = [], m = []; if (n < 3) return pts.map(() => 0);
    for (let i = 0; i < n - 1; i++) d[i] = (pts[i + 1][1] - pts[i][1]) / ((pts[i + 1][0] - pts[i][0]) || 1);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
    return m;
  }
  function path(c, pts, m, upto) {
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < pts.length - 1 && i < upto; i++) { const dx = (pts[i + 1][0] - pts[i][0]) / 3; c.bezierCurveTo(pts[i][0] + dx, pts[i][1] + m[i] * dx, pts[i + 1][0] - dx, pts[i + 1][1] - m[i + 1] * dx, pts[i + 1][0], pts[i + 1][1]); }
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const v = visible(), base = D.base;
    if (v.length < 2) { ctx.fillStyle = COL.mut; ctx.font = '12px ' + getComputedStyle(document.body).fontFamily; ctx.textAlign = 'center'; ctx.fillText(D.curve.length ? 'Pas assez de points sur cette période' : '—', W / 2, H / 2); geo = null; return; }
    const t0v = v[0].ts, t1v = v[v.length - 1].ts;
    const vals = v.map(q => q.equity).concat(base !== null ? [base] : []);
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * .14 || 1; lo -= pad; hi += pad;
    const X = t => PAD.l + (t - t0v) / ((t1v - t0v) || 1) * (W - PAD.l - PAD.r), Y = y => PAD.t + (1 - (y - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
    geo = {X, Y, t0v, t1v, v};
    /* grille + axes */
    ctx.font = '10px ' + getComputedStyle(document.body).fontFamily; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 3; i++) { const yy = PAD.t + i * (H - PAD.t - PAD.b) / 3, val = hi - i * (hi - lo) / 3; ctx.strokeStyle = 'rgba(120,160,255,.09)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PAD.l, yy); ctx.lineTo(W - PAD.r, yy); ctx.stroke(); ctx.fillStyle = 'rgba(150,170,220,.55)'; ctx.textAlign = 'left'; ctx.fillText(nf({maximumFractionDigits: 0}).format(val) + ' €', PAD.l + 2, yy - 7); }
    ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgba(150,170,220,.55)';
    [[0, 'left'], [.5, 'center'], [1, 'right']].forEach(([f, al]) => { const t = t0v + (t1v - t0v) * f; ctx.textAlign = al; ctx.fillText(range === '24H' ? fmtH(t) : fmtD(t), PAD.l + f * (W - PAD.l - PAD.r) + (al === 'left' ? 2 : al === 'right' ? -2 : 0), H - 6); });
    if (base !== null && base > lo && base < hi) { ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(200,215,255,.35)'; ctx.beginPath(); ctx.moveTo(PAD.l, Y(base)); ctx.lineTo(W - PAD.r, Y(base)); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(200,215,255,.55)'; ctx.textAlign = 'right'; ctx.fillText('départ ' + nf({maximumFractionDigits: 0}).format(base) + ' €', W - PAD.r - 2, Y(base) - 4); }
    const upto = Math.ceil(prog * (v.length - 1)), part = prog * (v.length - 1) - Math.floor(prog * (v.length - 1));
    /* équité */
    const pts = v.map(q => [X(q.ts), Y(q.equity)]), m = spline(pts), endX = prog >= 1 ? pts[pts.length - 1][0] : pts[Math.max(0, upto - 1)][0] + (pts[Math.min(pts.length - 1, upto)][0] - pts[Math.max(0, upto - 1)][0]) * part;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, endX + 1, H); ctx.clip();
    const gr = ctx.createLinearGradient(0, PAD.t, 0, H - PAD.b); gr.addColorStop(0, 'rgba(61,255,154,.34)'); gr.addColorStop(.6, 'rgba(61,255,154,.09)'); gr.addColorStop(1, 'rgba(61,255,154,0)');
    ctx.beginPath(); path(ctx, pts, m, pts.length); ctx.lineTo(pts[pts.length - 1][0], H - PAD.b); ctx.lineTo(pts[0][0], H - PAD.b); ctx.closePath(); ctx.fillStyle = gr; ctx.fill();
    const lg = ctx.createLinearGradient(PAD.l, 0, W - PAD.r, 0); lg.addColorStop(0, '#2fd98a'); lg.addColorStop(1, '#8dffc4');
    ctx.shadowColor = COL.g; ctx.shadowBlur = 9; ctx.strokeStyle = lg; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.beginPath(); path(ctx, pts, m, pts.length); ctx.stroke(); ctx.restore();
    /* repères achats / ventes (trades réels du carnet) */
    geo.marks = [];
    const b = bookOf(D.p), P = b && Array.isArray(b.positions) ? b.positions : [];
    for (const x of P) {
      if (ok(x.entry_ts) && x.entry_ts >= t0v && x.entry_ts <= t1v) geo.marks.push({t: x.entry_ts, kind: 'buy', x});
      if (x.status === 'fermee' && ok(x.exit_ts) && x.exit_ts >= t0v && x.exit_ts <= t1v) geo.marks.push({t: x.exit_ts, kind: 'sell', x});
    }
    for (const mk of geo.marks) {
      if (X(mk.t) > endX + 2) continue; const mx = X(mk.t), my = Y(eqAt(mk.t)), win = mk.kind === 'sell' ? mk.x.pnl >= 0 : true, c = mk.kind === 'buy' ? COL.li : win ? COL.g : COL.r;
      mk.px = mx; mk.py = my;
      ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = 9; ctx.fillStyle = c; ctx.strokeStyle = '#05060f'; ctx.lineWidth = 1.5; ctx.beginPath();
      if (mk.kind === 'buy') { ctx.moveTo(mx, my - 7); ctx.lineTo(mx + 5.5, my + 3); ctx.lineTo(mx - 5.5, my + 3); } else { ctx.moveTo(mx, my + 7); ctx.lineTo(mx + 5.5, my - 3); ctx.lineTo(mx - 5.5, my - 3); }
      ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
    }
    /* point final pulsant */
    if (prog >= 1) { const lx = pts[pts.length - 1][0], ly = pts[pts.length - 1][1], k = RM ? 0 : (performance.now() % 1800) / 1800; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(lx, ly, 3.2, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(61,255,154,' + (1 - k) * .8 + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(lx, ly, 3 + k * 10, 0, TAU); ctx.stroke(); }
    /* curseur */
    if (hover !== null) {
      const q = v[hover.i], hx = X(q.ts), hy = Y(q.equity);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(hx, PAD.t); ctx.lineTo(hx, H - PAD.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.shadowColor = COL.g; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    }
  }
  function loop() { raf = 0; const t = performance.now(); prog = RM ? 1 : Math.min(1, (t - t0) / 900); draw(); if (!document.hidden && visibleNow) raf = requestAnimationFrame(loop); }
  let visibleNow = true; const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visibleNow = es[0].isIntersecting; if (visibleNow) kick(); }).observe(cv);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  function showTip(i, ex, ey) {
    const v = geo.v, q = v[i], base = D.base; let html = `<time>${fmtDT(q.ts)} (Paris)</time><b>${eur(q.equity)}</b>` + (base !== null ? ` <span class="${cls(q.equity - base)}">${eur(q.equity - base, true)}</span>` : '');
    const near = (geo.marks || []).filter(mk => mk.px !== undefined && Math.abs(mk.px - ex) < 16 && Math.abs(mk.py - ey) < 22).sort((a, z) => Math.abs(a.px - ex) - Math.abs(z.px - ex))[0];
    if (near) { const x = near.x; html += `<span class="mk"><b style="color:${near.kind === 'buy' ? COL.li : (x.pnl >= 0 ? COL.g : COL.r)}">${near.kind === 'buy' ? 'ACHAT' : 'VENTE'} ${esc(sym(x.market))}</b> · ${fmtDT(near.t)}<br>${near.kind === 'buy' ? '@ ' + px(x.entry_px) : '@ ' + px(x.exit_px) + ' · ' + eur(x.pnl, true) + ' · ' + esc(String(x.reason || '').replace(/_/g, ' '))}</span>`; }
    tip.innerHTML = html; tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight; let l = ex + 14; if (l + w > W - 4) l = ex - w - 14; tip.style.left = Math.max(4, l) + 'px'; tip.style.top = clamp(ey - h - 10, 4, H - h - 4) + 'px';
  }
  function onMove(e) {
    if (!geo) return; const r = cv.getBoundingClientRect(), ex = e.clientX - r.left, ey = e.clientY - r.top, v = geo.v;
    let bi = 0, bd = 1e9; for (let i = 0; i < v.length; i++) { const d = Math.abs(geo.X(v[i].ts) - ex); if (d < bd) { bd = d; bi = i; } }
    hover = {i: bi}; showTip(bi, ex, ey); if (!raf) draw();
  }
  cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerdown', onMove);
  const leave = () => { hover = null; tip.hidden = true; if (!raf) draw(); };
  cv.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') leave(); }); cv.addEventListener('pointercancel', e => { if (e.pointerType !== 'touch') leave(); });
  document.addEventListener('pointerdown', e => { if (!wrap.contains(e.target)) leave(); });
  $('rng').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; range = b.dataset.r; $('rng').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); hover = null; tip.hidden = true; prog = RM ? 1 : 0; t0 = performance.now(); legend(); kick(); });
  new ResizeObserver(layout).observe(wrap);
  function legend() {
    $('leg').innerHTML = `<span><i class="d" style="background:${COL.li}"></i>achat</span><span><i class="d" style="background:${COL.g}"></i>vente gagnante</span><span><i class="d" style="background:${COL.r}"></i>vente perdante</span><span><i style="background:${COL.g}"></i>capital (€, après frais)</span>`;
  }
  return {refresh() { legend(); t0 = performance.now(); prog = RM ? 1 : (prog >= 1 ? 1 : prog); layout(); kick(); }};
}

/* ===================== SALLE (aperçu) : la salle est dessinée par salle.js ; colonne de gauche + chargement des données = identiques au site ===================== */
const LIVE = {price: {}, ts: 0};
function Floor() {
  return window.SalleFloor({$, D, LIVE, COL, ok, eur, fmtH, sym, hash, clamp, TAU, RM, latestCycle, lastEq});
}
/* ===================== bougies publiques Bitvavo (prix réels, sans clé) ===================== */
async function candles(market, limit) {
  try { const r = await fetch('https://api.bitvavo.com/v2/' + market + '/candles?interval=1h&limit=' + limit); if (!r.ok) return null; const a = await r.json(); if (!Array.isArray(a)) return null; return a.map(k => [k[0], +k[1], +k[2], +k[3], +k[4]]).reverse(); } catch (e) { return null; }
}
async function loadCandles() {
  const P = D.pos || [], jobs = P.map(async p => { const lim = clamp(Math.ceil((Date.now() - p.entry_ts) / 3.6e6) + 10, 30, 200), c = await candles(p.m, lim); if (c) D.candles[p.m] = c; });
  jobs.push((async () => { const c = await candles('BTC-EUR', 168); if (c) D.btcC = c; })());
  jobs.push((async () => { const c = await candles('ETH-EUR', 30); if (c) D.ethC = c; })());
  await Promise.all(jobs); renderMq(); if (floor) floor.refresh(false);
}
/* prix en direct (API publique Bitvavo, sans clé) : bandeau défilant + dernière bougie des écrans */
async function pullLive() {
  if (document.hidden) return;
  try {
    const r = await fetch('https://api.bitvavo.com/v2/ticker/price'); if (!r.ok) return; const a = await r.json(); if (!Array.isArray(a)) return;
    const want = new Set(['BTC-EUR', 'ETH-EUR'].concat((D.pos || []).map(p => p.m)));
    a.forEach(x => { if (want.has(x.market) && +x.price > 0) LIVE.price[x.market] = +x.price; }); LIVE.ts = Date.now(); renderMq();
  } catch (e) { /* on garde les derniers prix connus */ }
}
function mqItems() {
  const out = [], chg = (cs, px) => { if (!cs || cs.length < 26 || !ok(px)) return null; const ref = cs[cs.length - 25][4]; return ref > 0 ? px / ref - 1 : null; };
  const bp = ok(LIVE.price['BTC-EUR']) ? LIVE.price['BTC-EUR'] : D.btcC && D.btcC.length ? D.btcC[D.btcC.length - 1][4] : null;
  const ep = ok(LIVE.price['ETH-EUR']) ? LIVE.price['ETH-EUR'] : D.ethC && D.ethC.length ? D.ethC[D.ethC.length - 1][4] : null;
  out.push({k: 'BTC', px: bp, ch: chg(D.btcC, bp), lab: '24 h'}); out.push({k: 'ETH', px: ep, ch: chg(D.ethC, ep), lab: '24 h'});
  (D.pos || []).forEach(p => { const cs = D.candles[p.m], px = ok(LIVE.price[p.m]) ? LIVE.price[p.m] : cs && cs.length ? cs[cs.length - 1][4] : p.mark; out.push({k: p.s, px, ch: ok(px) && p.entry > 0 ? px / p.entry - 1 : null, lab: 'vs entrée', pos: 1}); });
  return out;
}
const fmtPx = v => !ok(v) ? '—' : nf({minimumFractionDigits: v >= 1000 ? 0 : v >= 1 ? 2 : v >= .1 ? 4 : 5, maximumFractionDigits: v >= 1000 ? 0 : v >= 1 ? 2 : v >= .1 ? 4 : 5}).format(v) + ' €';
let mqKey = '';
function renderMq() {
  const box = $('mqt'); if (!box) return; const it = mqItems(), key = it.map(x => x.k).join('|');
  if (key !== mqKey) {
    mqKey = key; const one = it.map((x, i) => '<span class="mi' + (x.pos ? ' po' : '') + '" data-i="' + i + '"><b>' + x.k + '</b><em class="px"></em><i class="cg"></i><small>' + x.lab + '</small></span>').join('');
    box.innerHTML = '<div class="mr">' + one + '</div><div class="mr" aria-hidden="true">' + one + '</div>';
  }
  it.forEach((x, i) => box.querySelectorAll('[data-i="' + i + '"]').forEach(el => {
    el.querySelector('.px').textContent = fmtPx(x.px); const c = el.querySelector('.cg'); c.textContent = x.ch === null ? '' : (x.ch >= 0 ? '▲ +' : '▼ −') + Math.abs(x.ch * 100).toFixed(1).replace('.', ',') + ' %'; c.className = 'cg ' + (x.ch === null ? '' : x.ch >= 0 ? 'up' : 'dn');
  }));
  const w = box.firstChild ? box.firstChild.scrollWidth : 0; if (w) box.style.setProperty('--mqd', Math.max(20, w / 48).toFixed(0) + 's');
}

/* ===================== chargement + démarrage ===================== */
let firstLoad = true;
async function load() {
  const [p, ui, st, team, wide, ghosts] = await Promise.all([get('paper10'), get('ui'), get('status'), get('team'), get('wide'), get('ghosts')]);
  Object.assign(D, {p, ui, st, team, wide, ghosts});
  const safe = f => { try { f(); } catch (e) { console.error(e); } };
  D.pos = buildPositions(p, ui);
  safe(renderTop); safe(renderKpi); safe(renderStrip); safe(renderPos); safe(renderLog); safe(renderAgents); safe(renderFoot); safe(renderScan); safe(renderGhosts);
  if (eq) safe(() => eq.refresh());
  if (floor) safe(() => floor.refresh(!firstLoad));
  firstLoad = false;
  loadCandles(); pullLive();
}
try { eq = EquityChart(); floor = Floor(); floor.start(); window.__neon = {floor, D}; document.querySelectorAll('.ag').forEach(el => el.addEventListener('click', () => floor.info(el.dataset.k))); } catch (e) { console.error(e); }
load();
setInterval(() => { if (!document.hidden) load(); }, 5 * 60e3);
setInterval(pullLive, 30e3);
if ('IntersectionObserver' in window && $('mq')) new IntersectionObserver(es => $('mq').classList.toggle('paused', !es[0].isIntersecting)).observe($('mq'));
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
