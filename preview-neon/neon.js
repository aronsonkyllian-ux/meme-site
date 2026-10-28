/* ORION — aperçu néon. Lit uniquement ../data/{paper10,ui,status,team,wide,ghosts}.json (publiés par le cycle)
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

/* ===================== THE ORION FLOOR ===================== */
/* Coordonnées logiques 1024×768 (image de la salle). Chaque écran = parallélogramme [haut-gauche, haut-droite, bas-gauche]. */
const MON = {
  scL: [[145, 268], [222, 241], [149, 320]], scC: [[227, 240.5], [333.6, 240.5], [228, 292]], scR: [[338.5, 241], [406.5, 264], [339, 293]],
  seL: [[618, 266], [686, 240.5], [619, 315]], seC: [[691, 240.5], [797, 240.5], [691, 292]], seR: [[803, 242.5], [878.6, 267], [803, 296]],
  arL: [[102, 433], [194, 405], [104, 495]], arC: [[199.6, 405], [319, 405], [200, 465]], arR: [[324.6, 410.5], [399, 437], [325, 468]],
  reL: [[624.5, 439], [699, 407], [626.6, 494.6]], reC: [[703.6, 405], [824, 405], [703.6, 464]], reR: [[829.5, 407.7], [922.5, 439], [828, 465]],
  trL: [[424, 532], [506, 528], [424, 581]], trR: [[516, 528], [600, 532], [516, 578]],
  wall: [[331, 54], [694, 54], [331, 223]], wL: [[190, 86], [288, 86], [190, 186]], wR: [[738, 86], [836, 86], [738, 186]]};
const LW = {wall: 300, wL: 120, wR: 120};
function mkQuad(q, lw) {
  const [tl, tr, bl] = q, u0 = .03, v0 = .05, uw = .94, vh = .9;
  const ex = [(tr[0] - tl[0]) * uw, (tr[1] - tl[1]) * uw], ey = [(bl[0] - tl[0]) * vh, (bl[1] - tl[1]) * vh];
  const ox = tl[0] + (tr[0] - tl[0]) * u0 + (bl[0] - tl[0]) * v0, oy = tl[1] + (tr[1] - tl[1]) * u0 + (bl[1] - tl[1]) * v0;
  const w = Math.hypot(ex[0], ex[1]), h = Math.hypot(ey[0], ey[1]), lh = Math.round(lw * h / w);
  return {m: [ex[0] / lw, ex[1] / lw, ey[0] / lh, ey[1] / lh, ox, oy], lw, lh};
}
const QUADS = {}; for (const k in MON) QUADS[k] = mkQuad(MON[k], LW[k] || 150);
const FONT = (n, w = 600) => w + ' ' + n + 'px ui-sans-serif,system-ui,sans-serif';
const CH = {
  scout: {c: COL.cy, name: 'SCOUT', home: [262, 372], s: 150, d: '0s'}, trader: {c: COL.mg, name: 'TRADER', home: [512, 322], s: 150, d: '-1.1s'},
  sentinel: {c: COL.li, name: 'SENTINEL', home: [762, 372], s: 150, d: '-2.2s'}, research: {c: COL.vi, name: 'RESEARCH', home: [772, 590], s: 150, d: '-.6s'}, arbitre: {c: COL.go, name: 'ARBITRE', home: [252, 590], s: 150, d: '-1.7s'}};
const SPOT = {scout: [372, 382], sentinel: [654, 382], trader: [512, 650], arbitre: [428, 484], research: [598, 484]};
const LIVE = {price: {}, ts: 0};

function Floor() {
  const room = $('room'), cv = $('fc'), ctx = cv.getContext('2d'), layer = $('chars'), bub = $('bub'), stage = $('stage');
  let S = 1, dpr = 1, running = false, raf = 0, last = 0, T = 0, pool = [], cyc = null, seen = 0, queue = [], qi = 0, nextAt = 3, replayAt = 0, tag = 'rejoue le dernier cycle', infoUntil = 0;
  const actors = {}; let kf = 1;
  for (const k in CH) {
    const c = CH[k], el = document.createElement('div'); el.className = 'ch'; el.dataset.k = k; el.style.setProperty('--c', c.c); el.style.setProperty('--d', c.d);
    el.innerHTML = '<div class="sh"></div><div class="bb"><div class="ring"></div><div class="tl"><img alt="" src="img/' + k + '.webp?v=3" decoding="async"></div></div><div class="tg2">—</div>';
    layer.appendChild(el); actors[k] = {k, el, tl: el.querySelector('.tl'), x: c.home[0], y: c.home[1], tx: c.home[0], ty: c.home[1], c: c.c, task: null, tilt: 0, vx: 0, vy: 0, mv: false, ph: Math.random() * 6, pulseAt: 2 + Math.random() * 5, pulseOff: 0, spark: 0, trail: 0, wob: 0};
    el.addEventListener('pointerdown', ev => { ev.stopPropagation(); info(k); });
  }
  function layoutF() {
    const w = room.clientWidth; if (!w) return; S = w / 1024; dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 700 ? 1.6 : 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(w * 0.75 * dpr);
    kf = innerWidth < 700 ? 1.28 : 1; for (const k in CH) { actors[k].el.style.setProperty('--s', CH[k].s * S * kf + 'px'); }
    place(); if (!running) drawF(T);
  }
  function place() { for (const k in actors) { const a = actors[k]; a.el.style.transform = 'translate3d(' + (a.x * S).toFixed(1) + 'px,' + ((a.y + a.wob) * S).toFixed(1) + 'px,0)'; a.el.style.zIndex = Math.round(a.y); a.tl.style.transform = 'rotate(' + a.tilt.toFixed(1) + 'deg) scale(' + (1 + (a.task ? .06 : .015 * Math.sin(T * 3.3 + a.ph))).toFixed(3) + ')'; } }
  const ro = new ResizeObserver(layoutF); ro.observe(room);

  /* ---- données pour les écrans ---- */
  function buildPool() {
    cyc = latestCycle(); const m = new Map(), put = (s, o) => { if (s && !m.has(s)) m.set(s, o); };
    if (cyc && cyc.verdicts_F) for (const [mk, v] of Object.entries(cyc.verdicts_F)) put(sym(mk), {kind: v === 'selectionner' ? 'keep' : v === 'rejeter' ? 'drop' : 'watch'});
    const th = D.wide && Array.isArray(D.wide.top_hausse_24h) ? D.wide.top_hausse_24h : [];
    th.slice(0, 14).forEach(x => put(sym(x.market), {kind: 'sig', chg: ok(x.last) && ok(x.open) && x.open > 0 ? (x.last - x.open) / x.open : null}));
    pool = [...m].map(([s, o]) => Object.assign({s}, o));
  }
  const KC = {keep: COL.li, watch: COL.go, drop: COL.mg, sig: COL.cy};
  const risk = () => { const e = lastEv('SENTINEL', 'risque_agrege'); return e ? e.payload : null; };
  const SCR = {sc: 'scout', se: 'sentinel', ar: 'arbitre', re: 'research', tr: 'trader'};
  function screen(key, fn) {
    const q = QUADS[key]; ctx.save(); ctx.transform(...q.m); ctx.beginPath(); ctx.rect(0, 0, q.lw, q.lh); ctx.clip(); ctx.fillStyle = 'rgba(2,6,16,.96)'; ctx.fillRect(0, 0, q.lw, q.lh); fn(ctx, q.lw, q.lh, T);
    const g = ctx.createLinearGradient(0, 0, q.lw, q.lh); g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(.35, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, q.lw, q.lh);
    const r = SCR[key.slice(0, 2)]; if (r) { const al = Math.max(roleFlash[r], actors[r].task ? .22 : .08 + .05 * Math.sin(T * 2 + actors[r].ph)); ctx.globalAlpha = al; ctx.fillStyle = CH[r].c; ctx.fillRect(0, 0, q.lw, q.lh * .5); ctx.globalAlpha = Math.min(1, al * 1.6); ctx.strokeStyle = CH[r].c; ctx.lineWidth = 2.5; ctx.strokeRect(1.2, 1.2, q.lw - 2.4, q.lh - 2.4); ctx.globalAlpha = 1; }
    ctx.restore();
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
  /* mur : BTC (bougies 1 h réelles) en alternance avec l'équité */
  function dWall(c, w, h, t) {
    const ph = (t % 18) / 18, showBtc = D.btcC && D.btcC.length > 2 && ph < .55, a = RM ? 1 : (ph < .5 ? 1 : ph < .55 ? 1 - (ph - .5) / .05 : ph < .95 ? 1 : (ph - .95) / .05);
    c.globalAlpha = showBtc || !(D.btcC && D.btcC.length > 2) ? (D.btcC && D.btcC.length > 2 ? Math.min(1, a) : 1) : Math.min(1, a);
    for (let i = 1; i < 4; i++) { c.fillStyle = 'rgba(120,160,255,.08)'; c.fillRect(0, h * i / 4, w, 1); }
    if (showBtc) {
      const cs = D.btcC, lo = Math.min(...cs.map(k => k[3])), hi = Math.max(...cs.map(k => k[2])), Y = v => 22 + (1 - (v - lo) / (hi - lo)) * (h - 30), bw = (w - 10) / cs.length;
      cs.forEach((k, i) => { const up = k[4] >= k[1], cc = up ? COL.cy : COL.mg, x = 6 + i * bw + bw / 2; c.strokeStyle = cc; c.fillStyle = cc; c.lineWidth = .8; c.beginPath(); c.moveTo(x, Y(k[2])); c.lineTo(x, Y(k[3])); c.stroke(); c.fillRect(x - bw * .3, Math.min(Y(k[1]), Y(k[4])), bw * .6, Math.max(1, Math.abs(Y(k[1]) - Y(k[4])))); });
      lbl(c, 'BTC / EUR · 7 j · 1 h', 6, 4, '#c7d4f5', 10); const lastC = cs[cs.length - 1]; lbl(c, nf({maximumFractionDigits: 0}).format(lastC[4]) + ' €', w - 6, 4, COL.cy, 11, 'right');
    } else { lbl(c, 'ÉQUITÉ · carnet ULTRA 1.2', 6, 4, '#c7d4f5', 10); lbl(c, eur(lastEq()), w - 6, 4, COL.g, 11, 'right'); eqLine(c, 6, 20, w - 12, h - 28, t); }
    c.globalAlpha = 1;
  }
  function dTarget(c, w, h, t) {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 6; c.strokeStyle = COL.cy; c.shadowColor = COL.cy; c.shadowBlur = 8; c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cy, R, t, t + 4.2); c.stroke(); c.beginPath(); c.arc(cx, cy, R * .68, -t * 1.4, -t * 1.4 + 3.6); c.stroke(); c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, R * .36, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.stroke(); c.shadowBlur = 0; c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, 2.5, 0, TAU); c.fill();
    const q = (t * .9) % TAU, ang = (Math.floor(t * .9 / TAU) * 1.7) % TAU; void ang; void q;
  }
  function dExpo(c, w, h, t) {
    const pf = D.team && D.team.resume && D.team.resume.performance, f = pf && ok(pf.cash) && ok(pf.equite) && pf.equite > 0 ? clamp(1 - pf.cash / pf.equite, 0, 1) : null, cx = w / 2, cy = h / 2 - 2, R = Math.min(w, h) / 2 - 12;
    c.lineWidth = 9; c.lineCap = 'round'; c.strokeStyle = 'rgba(255,255,255,.08)'; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
    if (f !== null) { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, COL.li); g.addColorStop(1, COL.cy); c.strokeStyle = g; c.shadowColor = COL.li; c.shadowBlur = 8; c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * f); c.stroke(); c.shadowBlur = 0; }
    lbl(c, f === null ? '—' : Math.round(f * 100) + ' %', cx, cy - 8, '#fff', 15, 'center'); lbl(c, 'investi', cx, cy + 8, COL.mut, 8, 'center');
  }
  /* ---- vie : effets, tâches, collisions ---- */
  let lowQ = false, fpsN = 0, fpsT = 0, slow = 0;
  const roleFlash = {scout: 0, sentinel: 0, arbitre: 0, research: 0, trader: 0};
  let ringFlash = 0, popAt = 1.5, popI = 0;
  const parts = [], fx = [], pops = [], tasks = [];
  const dust = Array.from({length: innerWidth < 700 ? 30 : 55}, () => ({x: Math.random() * 1024, y: 130 + Math.random() * 600, sp: 6 + Math.random() * 14, ph: Math.random() * 6, r: .9 + Math.random() * 1.5, c: Math.random() < .5 ? '39,230,255' : '255,61,216'}));
  const FS = () => Math.max(13, 11.5 / S);
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const pnlTxt = p => p.pnl === null || p.pnl === undefined ? '—' : (p.pnl > 0 ? '+' : p.pnl < 0 ? '−' : '') + Math.abs(p.pnl).toFixed(1).replace('.', ',') + ' €';
  const pnlCol = p => p.pnl === null || p.pnl === undefined ? COL.mut : p.pnl >= 0 ? COL.g : COL.r;
  function chip(txt, x, y, col, k, al) {
    const f = FS() * k; ctx.font = FONT(f, 700); const w = ctx.measureText(txt).width + f * 1, h = f * 1.5;
    ctx.save(); ctx.globalAlpha = al; rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(5,8,22,.88)'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + f * .06); ctx.restore();
  }
  const quad = (a, b, c, u) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
  const spark = (x, y, col, up) => { if (parts.length < 90) parts.push({x, y, vx: (Math.random() - .5) * 26, vy: up ? -18 - Math.random() * 26 : (Math.random() - .5) * 18, l: 1, c: col, r: 1.4 + Math.random() * 1.6}); };
  const ringFx = (x, y, col, big) => { if (fx.length < 12) fx.push({x, y, t: T, c: col, big}); };

  function drawDust(t) {
    if (lowQ && !dust._cut) { dust.length = Math.min(dust.length, 12); dust._cut = 1; }
    for (const d of dust) { const y = 730 - ((730 - d.y + t * d.sp) % 600), x = d.x + Math.sin(t * .5 + d.ph) * 14; ctx.globalAlpha = .12 + .3 * (.5 + .5 * Math.sin(t * 1.7 + d.ph)); ctx.fillStyle = 'rgb(' + d.c + ')'; ctx.fillRect(x, y, d.r * 2, d.r * 2); }
    ctx.globalAlpha = 1;
  }
  const STREAMS = [['scout', [330, 345], [400, 430], [462, 428]], ['sentinel', [700, 345], [630, 430], [565, 428]], ['arbitre', [330, 520], [400, 478], [460, 460]], ['research', [700, 520], [630, 478], [565, 460]], ['trader', [512, 530], [512, 500], [512, 470]]];
  function streams(t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    STREAMS.forEach(([k, a, m, b], i) => {
      const c = k === 'trader' ? COL.mg : CH[k].c, busy = !!actors[k].task, sp = busy ? .55 : .26;
      ctx.globalAlpha = .13; ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0], m[1], b[0], b[1]); ctx.stroke();
      for (let j = 0; j < 2; j++) {
        const u0 = (t * sp + i * .23 + j * .5) % 1;
        for (let q = 0; q < 4; q++) { const u = Math.max(0, u0 - q * .035), x = quad(a[0], m[0], b[0], u), y = quad(a[1], m[1], b[1], u); ctx.globalAlpha = (1 - q * .24) * (busy ? .95 : .7); ctx.fillStyle = q ? c : '#fff'; ctx.beginPath(); ctx.arc(x, y, 3.4 - q * .6, 0, TAU); ctx.fill(); }
      }
    });
    ctx.restore();
  }
  function orbit(t, front) {
    const P = D.pos || []; if (!P.length) return;
    P.forEach((p, i) => { const a = t * .32 + i * TAU / P.length, f = Math.sin(a) > 0; if (f !== front) return; const x = 512 + Math.cos(a) * 118, y = 398 + Math.sin(a) * 38, col = pnlCol(p); chip(p.s + ' ' + pnlTxt(p), x, y, col, .7, f ? .96 : .5); });
  }
  function holo(t) {
    const x = 512, y = 408; orbit(t, false); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const k = ((t * .5 + i / 3) % 1); ctx.strokeStyle = 'rgba(' + (i % 2 ? '255,61,216' : '39,230,255') + ',' + (.55 * (1 - k)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - k * 70, 64 - k * 18, 21 - k * 6, 0, 0, TAU); ctx.stroke(); }
    const g = ctx.createLinearGradient(0, y - 90, 0, y); g.addColorStop(0, 'rgba(39,230,255,0)'); g.addColorStop(1, 'rgba(39,230,255,.22)'); ctx.fillStyle = g; ctx.fillRect(x - 40, y - 90, 80, 90);
    ctx.lineWidth = 2.5; ctx.setLineDash([16, 12]); ctx.lineDashOffset = -t * 34; ctx.strokeStyle = 'rgba(39,230,255,.7)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 80, 26, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([4, 12]); ctx.lineDashOffset = t * 24; ctx.strokeStyle = 'rgba(255,61,216,.6)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 100, 33, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (ringFlash > .02) { ctx.globalAlpha = ringFlash; ctx.strokeStyle = COL.go; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y + 4, 90 + (1 - ringFlash) * 30, 29 + (1 - ringFlash) * 10, 0, 0, TAU); ctx.stroke(); }
    ctx.restore(); orbit(t, true);
  }
  function beams(t) {
    for (const s of tasks) if (s.real && s.beam && s.ph === 'dwell') {
      const A = actors[s.who], B = actors[s.beam]; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = A.c; ctx.lineWidth = 2.4; ctx.shadowColor = A.c; ctx.shadowBlur = 12; ctx.setLineDash([6, 7]); ctx.lineDashOffset = -t * 40;
      const mx = (A.x + B.x) / 2, my = Math.min(A.y, B.y) - 40; ctx.beginPath(); ctx.moveTo(A.x, A.y - 10); ctx.quadraticCurveTo(mx, my, B.x, B.y - 10); ctx.stroke(); ctx.setLineDash([]);
      const k = clamp((t - s.t0) / 1.1, 0, 1), bx = quad(A.x, mx, B.x, k), by = quad(A.y - 10, my, B.y - 10, k);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, 5, 0, TAU); ctx.fill(); ctx.fillStyle = A.c; ctx.globalAlpha = .6; ctx.beginPath(); ctx.arc(bx, by, 11, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  function links(t) {
    const cx = 512, cy = 412; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    Object.keys(actors).forEach((k, i) => {
      const a = actors[k], ax = a.x, ay = a.y + 28, mx = (ax + cx) / 2 + (ax < cx ? -1 : 1) * 18, my = (ay + cy) / 2 + 26;
      ctx.strokeStyle = a.c; ctx.shadowColor = a.c; ctx.shadowBlur = 8; ctx.lineWidth = 1.5; ctx.globalAlpha = .45; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, cx, cy); ctx.stroke(); ctx.shadowBlur = 0;
      for (let j = 1; j <= 3; j++) { const u = j / 4, x = quad(ax, mx, cx, u), y = quad(ay, my, cy, u), tw = .55 + .45 * Math.sin(t * 2.2 + i * 1.7 + j * 2.3); ctx.globalAlpha = tw; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 2.1, 0, TAU); ctx.fill(); }
      const u = ((t * .22 + i * .2) % 1); ctx.globalAlpha = .9; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(quad(ax, mx, cx, u), quad(ay, my, cy, u), 2.6, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = .2; ctx.lineWidth = 1; ctx.strokeStyle = '#9fb4ff'; ctx.setLineDash([2, 6]);
    [['scout', 'trader'], ['trader', 'sentinel'], ['scout', 'arbitre'], ['sentinel', 'research'], ['arbitre', 'research']].forEach(([p, q]) => { ctx.beginPath(); ctx.moveTo(actors[p].x, actors[p].y + 28); ctx.lineTo(actors[q].x, actors[q].y + 28); ctx.stroke(); });
    ctx.restore();
  }
  function fxDraw(t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i], k = (t - f.t) / (f.big ? 1.3 : .9); if (k >= 1) { fx.splice(i, 1); continue; } ctx.globalAlpha = (1 - k) * .85; ctx.strokeStyle = f.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x, f.y + 40, 20 + k * (f.big ? 95 : 60), 7 + k * (f.big ? 32 : 20), 0, 0, TAU); ctx.stroke(); }
    for (const k in actors) { const a = actors[k], tk = a.task; if (tk && tk.orb) { const x = a.x + 46, y = a.y - 4 + Math.sin(t * 6) * 4, g = ctx.createRadialGradient(x, y, 0, x, y, 20); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.35, CH[k].c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = .95; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 20, 0, TAU); ctx.fill(); } }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; if (p.l <= 0) { parts.splice(i, 1); continue; } ctx.globalAlpha = Math.min(1, p.l) * .9; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (.5 + p.l * .5), 0, TAU); ctx.fill(); }
    ctx.restore();
    for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i], age = t - p.t; if (age > 2.6) { pops.splice(i, 1); continue; } chip(p.txt, p.x, p.y - age * 42, p.c, .95, Math.min(1, age * 4) * (1 - age / 2.6)); }
  }
  function stepFx(dt) {
    for (const k in roleFlash) roleFlash[k] = Math.max(0, roleFlash[k] - dt * .8);
    ringFlash = Math.max(0, ringFlash - dt * .9);
    for (const p of parts) { p.l -= dt * 1.5; p.x += p.vx * dt; p.y += p.vy * dt; }
    const P = D.pos || [];
    if (T >= popAt && P.length) { popAt = T + 2.3; const p = P[popI++ % P.length]; if (p.pnl !== null && p.pnl !== undefined) pops.push({t: T, txt: p.s + ' ' + pnlTxt(p), c: pnlCol(p), x: 512 + (Math.random() - .5) * 50, y: 520}); if (pops.length > 4) pops.shift(); }
  }
  function drawF(t) {
    const k = cv.width / 1024; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, 1024, 768);
    screen('scC', dRadar); screen('scL', dFunnel); screen('scR', dTop);
    screen('seC', dGauge); screen('seL', dStops); screen('seR', dSlots);
    screen('arC', dEqui); screen('arL', dBilan); screen('arR', dClos);
    screen('reC', dGhostBars); screen('reL', dDonut); screen('reR', dGhostPnl);
    screen('trL', dPosChart); screen('trR', dPosPnl);
    screen('wall', dWall); screen('wL', dTarget); screen('wR', dExpo);
    streams(t); links(t); holo(t); beams(t); fxDraw(t); drawDust(t);
  }

  /* ---- tâches des esprits : trajets réels (rejeu du journal) ou ambiants (sans texte) ---- */
  const ROLE_WHO = {SCANNER: 'scout', SCOUT: 'scout', SENTINEL: 'sentinel', TRADER: 'trader', ARBITRE: 'arbitre', RESEARCH: 'research'};
  const ORD = {SCANNER: 0, SCOUT: 1, SENTINEL: 2, ARBITRE: 3, TRADER: 4, RESEARCH: 5};
  function msg(e) {
    const p = e.payload || {}, s = sym(e.market), k = e.role + '.' + e.kind;
    switch (k) {
      case 'SCANNER.opportunites_detectees': return ok(p.n) ? p.n + ' opportunité' + (p.n > 1 ? 's' : '') + ' détectée' + (p.n > 1 ? 's' : '') + (p.marches ? ' : ' + p.marches.map(sym).join(', ') : '') : 'scan terminé';
      case 'SCOUT.analyse': return s + ' : ' + (p.verdict || 'analysé') + (ok(p.rank) ? ' (rang ' + p.rank + ')' : '');
      case 'SCOUT.fantome_cree': return s + ' suivi en fantôme (' + String(p.statut || '').replace(/_/g, ' ') + ')';
      case 'SENTINEL.controle_entree': return s + ' : entrée ' + (p.autorise ? 'autorisée' : 'refusée');
      case 'ARBITRE.decision_entree': return s + ' : entrée ' + (p.statut || '—');
      case 'ARBITRE.decision_verrou': return s + ' : ' + String(p.raison || p.statut || '').replace(/\s*\(.*$/, '');
      case 'TRADER.verrou_propose': return s + ' : verrou de profit' + (ok(p.garanti_net_eur) ? ', ' + eur(p.garanti_net_eur) + ' garantis' : '');
      case 'TRADER.reevaluation': return s + ' : ' + String(p.raison || 'réévaluation');
      case 'TRADER.evaluation_positions': return ok(p.n) ? p.n + ' positions évaluées' : 'positions évaluées';
      case 'SENTINEL.risque_agrege': return 'risque ouvert ' + num(p.pct_equite) + ' % de l\'équité';
      case 'SENTINEL.controle_coherence': return 'cohérence des données ' + (p.sain ? 'OK' : 'à vérifier');
      case 'SENTINEL.news_passage': return ok(p.articles) ? p.articles + ' articles lus · ' + (p.alertes || 0) + ' alerte' + (p.alertes > 1 ? 's' : '') : 'veille actus';
      case 'SENTINEL.alerte_news': return 'alerte ' + (p.categorie || '') + ' : ' + s;
      case 'SENTINEL.decouverte': return s + ' : découverte (' + (p.signaux || []).join(', ') + ')';
      case 'ARBITRE.tick_termine': return 'tick terminé · ' + (ok(p.n_open) ? p.n_open + ' positions' : '') + (ok(p.duree_s) ? ' · ' + p.duree_s + ' s' : '');
      case 'RESEARCH.bras_signal': return (p.bras || 'carnet') + ' ' + s + ' : ' + (p.statut || '');
      case 'RESEARCH.bras_fantomes': return 'carnets fantômes mis à jour';
      case 'RESEARCH.fantomes_avances': return ok(p.actifs) ? p.actifs + ' carnets actifs avancés' : 'fantômes avancés';
      case 'RESEARCH.i3_fantomes': case 'RESEARCH.i3_signal': return 'carnet I3 ' + (e.market ? s : 'mis à jour');
      default: return String(e.kind || '').replace(/_/g, ' ') + (s ? ' ' + s : '');
    }
  }
  function buildQueue() {
    const j = D.team && Array.isArray(D.team.journal) ? D.team.journal : []; if (!j.length) { queue = []; return; }
    const mx = Math.max(...j.map(e => e.ts)), cur = j.filter(e => e.ts >= mx - 90e3); D.lastTick = mx;
    const seenK = new Set(), pick = [];
    for (const e of cur.slice().sort((a, z) => (ORD[a.role] ?? 9) - (ORD[z.role] ?? 9))) { const k = e.role + '.' + e.kind; if (seenK.has(k) || !ROLE_WHO[e.role]) continue; if (e.kind === 'bras_signal' && pick.some(x => x.e.kind === 'bras_signal')) continue; seenK.add(k); pick.push({e}); }
    queue = pick.slice(0, 9).map(({e}) => { const who = ROLE_WHO[e.role], beam = who === 'trader' ? 'arbitre' : 'trader'; return {who, beam, txt: msg(e), carry: who === 'scout', ts: e.ts, role: e.role}; });
    qi = 0;
  }
  const home = k => CH[k].home;
  function mkTask(who, wps, o) { return Object.assign({who, wps, i: 0, ph: 'go', t0: T, real: false}, o || {}); }
  function gotoWp(tk) { const w = tk.wps[tk.i], a = actors[tk.who]; a.tx = w.x; a.ty = w.y; tk.ph = 'go'; tk.t0 = T; }
  function startTask(tk) { const a = actors[tk.who]; a.task = tk; tasks.push(tk); gotoWp(tk); if (tk.real) { a.el.classList.add('act'); say(tk.who, tk.txt, tk.ts, false); } }
  function endTask(tk) { const a = actors[tk.who]; a.tx = home(tk.who)[0]; a.ty = home(tk.who)[1]; tk.ph = 'home'; tk.t0 = T; tk.orb = false; a.el.classList.remove('act'); }
  function dropTask(tk) { const i = tasks.indexOf(tk); if (i >= 0) tasks.splice(i, 1); const a = actors[tk.who]; if (a.task === tk) a.task = null; }
  function arrive(tk) {
    const a = actors[tk.who], w = tk.wps[tk.i]; ringFx(a.x, a.y, a.c, false);
    if (tk.real) { roleFlash[tk.who] = 1; if (tk.beam) roleFlash[tk.beam] = .85; }
    if (w.fl) roleFlash[w.fl] = 1;
    if (w.ring) ringFlash = 1;
    if (w.shield) ringFx(a.x, a.y, a.c, true);
    if (w.drop && tk.orb) { tk.orb = false; for (let i = 0; i < 14; i++) spark(a.x + 46, a.y, a.c, false); roleFlash.trader = 1; }
  }
  const AMB = {
    scout: () => ({wps: [{x: 372, y: 378, d: .3}, {x: 424, y: 362, d: .9, drop: 1, fl: 'trader'}], orb: true}),
    sentinel: () => ({wps: [{x: 660, y: 418, d: .4, shield: 1}, {x: 592, y: 506, d: .9, shield: 1}, {x: 668, y: 432, d: .4}]}),
    research: () => ({wps: [{x: 604, y: 506, d: 1, fl: 'research'}, {x: 452, y: 548, d: 1.1}]}),
    arbitre: () => ({wps: [{x: 456, y: 470, d: 1.1, ring: 1, fl: 'arbitre'}, {x: 380, y: 528, d: .6}]}),
    trader: () => ({wps: [{x: 604, y: 428, d: .8, fl: 'trader'}, {x: 424, y: 430, d: .9, ring: 1}]})
  };
  let ambAt = 3.5, ambLast = '';
  function ambient() {
    if (tasks.length >= (kf > 1 ? 2 : 3)) return; const idle = Object.keys(actors).filter(k => !actors[k].task && k !== ambLast); if (!idle.length) return;
    const k = idle[Math.floor(Math.random() * idle.length)], d = AMB[k](); ambLast = k; startTask(mkTask(k, d.wps, {orb: !!d.orb}));
  }
  function startScene(sc) {
    const sp = SPOT[sc.who] || home(sc.who); startTask(mkTask(sc.who, [{x: sp[0], y: sp[1], d: 2.5}], {real: true, txt: sc.txt, ts: sc.ts, beam: sc.beam, orb: sc.who === 'scout'})); nextAt = T + 3;
  }
  function say(who, txt, ts, force) {
    const c = CH[who];
    $('tkWho').textContent = c.name; $('tkWho').style.color = c.c; document.querySelector('#ticker .dot').style.background = c.c; document.querySelector('#ticker .dot').style.boxShadow = '0 0 10px ' + c.c;
    $('tkTxt').textContent = txt; $('tkTag').textContent = ts ? (tag + ' · ' + fmtH(ts) + ' (Paris)') : '';
    document.querySelectorAll('.ag').forEach(el => el.classList.toggle('on', el.dataset.k === who));
    bub.style.setProperty('--c', c.c); bub.textContent = txt; bub.who = who; bub.classList.add('on'); bub.hidden = false; bubT = T + (force ? 4.5 : 2.8);
  }
  let bubT = 0;
  function info(k) { const el = document.querySelector('[data-st="' + k + '"]'); infoUntil = T + 6; nextAt = Math.max(nextAt, T + 5); say(k, el ? el.textContent : '—', 0, true); actors[k].el.classList.add('act'); ringFx(actors[k].x, actors[k].y, actors[k].c, true); setTimeout(() => { if (!actors[k].task) actors[k].el.classList.remove('act'); }, 2500); }
  /* bulle : choisit le côté (haut / gauche / droite / bas) qui recouvre le moins les autres esprits et reste visible */
  function posBub() {
    if (!bub.who || bub.hidden) return; const a = actors[bub.who], sr = stage.getBoundingClientRect(), rb = room.getBoundingClientRect(), vl = sr.left - rb.left, vr = vl + sr.width, vt = 0, vb = sr.height;
    const bw = bub.offsetWidth || 120, bh = bub.offsetHeight || 30, half = CH[bub.who].s * kf * S / 2, ax = a.x * S, ay = (a.y + a.wob) * S, g = 6;
    const C = [[ax, ay - half * .9 - g, -50, -100, 'u'], [ax - half * .75 - g, ay - half * .35, -100, -50, 'l'], [ax + half * .75 + g, ay - half * .35, 0, -50, 'r'], [ax, ay + half * .8 + 28, -50, 0, 'd']];
    let best = null, bs = 1e9;
    C.forEach((c, i) => {
      const x = c[0] + c[2] / 100 * bw, y = c[1] + c[3] / 100 * bh; let sc = i * 40;
      const ox = Math.max(0, vl + 2 - x) + Math.max(0, x + bw - vr + 2), oy = Math.max(0, vt + 2 - y) + Math.max(0, y + bh - vb + 2); sc += (ox + oy) * 30;
      for (const k in actors) { if (k === bub.who) continue; const o = actors[k], oh = CH[k].s * kf * S / 2, l = o.x * S - oh * .7, t = (o.y + o.wob) * S - oh * .85, w = oh * 1.4, h = oh * 1.55, iw = Math.min(x + bw, l + w) - Math.max(x, l), ih = Math.min(y + bh, t + h) - Math.max(y, t); if (iw > 0 && ih > 0) sc += iw * ih; const tl = o.el.lastChild, tw = (tl.textContent.length * 6.4 + 18), tx = o.x * S - tw / 2, ty = (o.y + o.wob) * S + oh * .8, tiw = Math.min(x + bw, tx + tw) - Math.max(x, tx), tih = Math.min(y + bh, ty + 20) - Math.max(y, ty); if (tiw > 0 && tih > 0) sc += tiw * tih * 1.5; }
      if (sc < bs) { bs = sc; best = c; }
    });
    const c = best, px = clamp(c[0] + c[2] / 100 * bw, vl + 2, vr - bw - 2) - c[2] / 100 * bw; bub.style.left = px.toFixed(1) + 'px'; bub.style.top = c[1].toFixed(1) + 'px'; bub.style.transform = 'translate(' + c[2] + '%,' + c[3] + '%)'; bub.dataset.side = c[4];
  }
  function stepActors(dt) {
    const ks = Object.keys(actors);
    for (const k of ks) {
      const a = actors[k], ox = a.x, oy = a.y, f = 1 - Math.exp(-dt * (a.task ? 2.5 : 2));
      a.x += (a.tx - a.x) * f; a.y += (a.ty - a.y) * f;
      a._ox = ox; a._oy = oy;
    }
    /* évitement doux : ellipse ~120 x 95 autour de chaque esprit */
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
      const A = actors[ks[i]], B = actors[ks[j]]; const RX = 124 * (1 + (kf - 1) * .9), RY = 98 * (1 + (kf - 1) * .9); let dx = (A.x - B.x) / RX, dy = (A.y - B.y) / RY, d = Math.hypot(dx, dy);
      if (d < 1) { if (d < .01) { dx = Math.random() - .5; dy = Math.random() - .5; d = Math.hypot(dx, dy); } const push = (1 - d) * Math.min(1, dt * 6) * .5; A.x += dx / d * RX * push; A.y += dy / d * RY * push; B.x -= dx / d * RX * push; B.y -= dy / d * RY * push; }
    }
    for (const k of ks) {
      const a = actors[k], vx = (a.x - a._ox) / dt, vy = (a.y - a._oy) / dt, sp = Math.hypot(vx, vy); a.mv = sp > 22;
      const work = !a.task, dw = a.task && a.task.ph === 'dwell';
      const tt = clamp(vx * .06, -10, 10) + (a.mv ? 0 : work ? Math.sin(T * 1.3 + a.ph) * 1.6 : dw ? Math.sin(T * 9) * 1.4 : 0);
      a.tilt += (tt - a.tilt) * Math.min(1, dt * 8); a.wob += ((a.mv ? Math.sin(T * 7 + a.ph) * 3 : 0) - a.wob) * Math.min(1, dt * 8);
      /* étincelles : « frappe » au poste, traînée en déplacement */
      a.spark -= dt; if (a.spark <= 0) { a.spark = dw ? .09 : work ? .3 : 1e3; if (!a.mv) { spark(a.x + (Math.random() - .5) * 52, a.y + 30, a.c, true); } }
      a.trail -= dt; if (a.mv && a.trail <= 0 && sp > 40) { a.trail = .045; spark(a.x - vx * .02 + (Math.random() - .5) * 18, a.y + 46, a.c, false); }
      if (work && T > a.pulseAt) { a.el.classList.add('act'); a.pulseOff = T + 1.5; a.pulseAt = T + 5 + Math.random() * 6; }
      if (a.pulseOff && T > a.pulseOff && !a.task) { a.el.classList.remove('act'); a.pulseOff = 0; }
    }
  }
  function stepScenes(dt) {
    stepActors(dt); stepFx(dt);
    for (let i = tasks.length - 1; i >= 0; i--) {
      const tk = tasks[i], a = actors[tk.who], d = Math.hypot(a.tx - a.x, a.ty - a.y);
      if (tk.ph === 'go' && (d < 12 || T - tk.t0 > 3.6)) { tk.ph = 'dwell'; tk.t0 = T; arrive(tk); }
      else if (tk.ph === 'dwell' && T - tk.t0 > (tk.wps[tk.i].d || 1)) { if (tk.i + 1 < tk.wps.length) { tk.i++; gotoWp(tk); } else endTask(tk); }
      else if (tk.ph === 'home' && (d < 9 || T - tk.t0 > 3.6)) dropTask(tk);
    }
    if (bub.who && T > bubT && T > infoUntil) { bub.classList.remove('on'); }
    if (RM) return;
    if (T >= nextAt && queue.length) {
      if (qi < queue.length) {
        const sc = queue[qi], a = actors[sc.who];
        if (a.task && a.task.real) nextAt = T + .8;
        else { if (a.task) { dropTask(a.task); a.el.classList.remove('act'); } qi++; startScene(sc); }
      } else if (!tasks.some(t => t.real) && !replayAt) replayAt = T + 9;
      else if (replayAt && T >= replayAt && !tasks.some(t => t.real)) { replayAt = 0; qi = 0; tag = 'rejoue le dernier cycle'; nextAt = T; }
    }
    if (T >= ambAt) { ambAt = T + 1.2 + Math.random() * 1.8; ambient(); }
  }
  function loop(ts) {
    if (!running) return; raf = requestAnimationFrame(loop); const dt = Math.min(.1, (ts - last) / 1000); if (dt < .028) return; last = ts; T += dt;
    stepScenes(dt); place(); posBub(); drawF(T);
    /* qualité adaptative : si la fluidité tombe, on coupe les halos et on réduit les particules */
    fpsN++; fpsT += dt; if (fpsT >= 2.5) { const f = fpsN / fpsT; fpsN = 0; fpsT = 0; if (T > 4 && f < 21) { if (++slow >= 2 && !lowQ) { lowQ = true; Object.defineProperty(ctx, 'shadowBlur', {get() { return 0; }, set() {}, configurable: true}); } } else slow = 0; }
  }
  function start() { if (RM || running) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  let vis = true; if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; vis && !document.hidden ? start() : stop(); }).observe(room);
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : (vis && start()); });
  layoutF();
  return {
    refresh(isNew) {
      buildPool(); const prev = D.lastTick; buildQueue();
      if (!RM && queue.length && (isNew || D.lastTick !== prev)) { tag = prev && D.lastTick !== prev ? 'nouveau cycle' : 'rejoue le dernier cycle'; replayAt = 0; nextAt = Math.min(nextAt, T + 1.2); if (!tasks.some(t => t.real)) qi = 0; }
      if (RM || !queue.length) { const q = queue[queue.length - 1]; if (q) say(q.who, q.txt, q.ts, false); else $('tkTxt').textContent = 'en attente de données'; }
      if (!running) { drawF(T); } layoutF();
    },
    start, info, T: () => T, actors, tasks, setQ(i) { qi = i; nextAt = T; }
  };
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
