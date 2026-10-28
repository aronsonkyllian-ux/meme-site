/* ORION — THE ORION FLOOR. Lit uniquement data/{paper10,ui,status,team,wide,ghosts}.json (publiés par le cycle)
   + bougies publiques Bitvavo (1 h, sans clé) pour les graphiques de prix. Donnée absente = « — ». Aucune valeur inventée. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const BOOK = 'ultra-1.2-test';
const DATA = new URL('data/', document.currentScript.src).href;
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
const LIVE = {price: {}, ts: 0};

function Floor() {
  const room = $('room'), cv = $('fc'), ctx = cv.getContext('2d'), stage = $('stage');
  let S = 1, dpr = 1, running = false, raf = 0, last = 0, T = 0, pool = [], cyc = null, queue = [], qi = 0, nextAt = 3, replayAt = 0, tag = 'rejoue le dernier cycle', visL = 0, visR = 1024, kf = 1;
  const actors = {};
  function layoutF() {
    const w = room.clientWidth; if (!w) return; S = w / 1024; dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 700 ? 1.6 : 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(w * 0.75 * dpr);
    const sr = stage.getBoundingClientRect(), rb = room.getBoundingClientRect(); visL = Math.max(0, (sr.left - rb.left) / S); visR = Math.min(1024, visL + sr.width / S);
    kf = innerWidth < 700 ? 1.3 : 1; if (!running) drawF(T);
  }

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
    const r = SCR[key.slice(0, 2)]; if (r) { const al = Math.max(roleFlash[r], actors[r].state === 'work' ? .2 + .05 * Math.sin(T * 3 + actors[r].ph) : .05); ctx.globalAlpha = al; ctx.fillStyle = CH[r].c; ctx.fillRect(0, 0, q.lw, q.lh * .5); ctx.globalAlpha = Math.min(1, al * 1.6); ctx.strokeStyle = CH[r].c; ctx.lineWidth = 2.5; ctx.strokeRect(1.2, 1.2, q.lw - 2.4, q.lh - 2.4); ctx.globalAlpha = 1; }
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
  /* ===================== vie : personnages procéduraux qui marchent ===================== */
  let lowQ = false, fpsN = 0, fpsT = 0, slow = 0, ringFlash = 0;
  const roleFlash = {scout: 0, sentinel: 0, arbitre: 0, research: 0, trader: 0};
  const parts = [], fx = [], bubs = [];
  const dust = Array.from({length: innerWidth < 700 ? 30 : 55}, () => ({x: Math.random() * 1024, y: 130 + Math.random() * 600, sp: 6 + Math.random() * 14, ph: Math.random() * 6, r: .9 + Math.random() * 1.5, c: Math.random() < .5 ? '39,230,255' : '255,61,216'}));
  const quad = (a, b, c, u) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  for (const k in CH) CH[k].rgb = hexRGB(CH[k].c);
  const rgba = (k, a, mul = 1) => { const c = CH[k].rgb; return 'rgba(' + Math.round(c[0] * mul) + ',' + Math.round(c[1] * mul) + ',' + Math.round(c[2] * mul) + ',' + a + ')'; };
  const spark = (x, y, col, up) => { if (parts.length < 70) parts.push({x, y, vx: (Math.random() - .5) * 24, vy: up ? -16 - Math.random() * 20 : (Math.random() - .5) * 14, l: 1, c: col, r: 1.3 + Math.random() * 1.5}); };
  const ringFx = (x, y, col) => { if (fx.length < 10) fx.push({x, y, t: T, c: col}); };

  /* ---- plan du sol : zones interdites (bureaux, piédestal) et graphe de points de passage couvrant tout le sol libre ---- */
  const BLK = [[129, 236, 413, 400], [613, 236, 893, 400], [93, 408, 399, 580], [617, 408, 935, 598], [410, 531, 611, 668], [440, 340, 584, 492]];
  const NODES = {
    n1: [446, 288], n2: [512, 292], n3: [578, 288], n10: [512, 322],
    n4: [424, 352], n5: [424, 404], n6: [424, 470], n7: [602, 352], n8: [602, 404], n9: [602, 470],
    n11: [470, 512], n12: [554, 512],
    n13: [404, 524], n14: [404, 558], n15: [404, 604], n16: [614, 524], n17: [614, 558], n18: [614, 606],
    h1: [270, 404], s1: [340, 404], s2: [390, 404], h2: [760, 404], s3: [690, 404], s4: [645, 404],
    b1: [110, 606], b2: [180, 606], h3: [250, 600], b3: [330, 608],
    d1: [150, 652], d2: [290, 654], d3: [398, 652],
    r1: [690, 608], h4: [775, 608], r2: [860, 608], r3: [930, 612],
    d4: [700, 652], d5: [810, 652], d6: [920, 654],
    c1: [120, 694], c2: [230, 696], c3: [340, 698], c4: [440, 696], h5: [512, 688], c6: [584, 696], c7: [690, 698], c8: [800, 696], c9: [910, 692]
  };
  const HOME = {scout: 'h1', sentinel: 'h2', arbitre: 'h3', research: 'h4', trader: 'h5'};
  const CHOKE = new Set(['n13', 'n14', 'n15', 'n16', 'n17', 'n18']);
  const ids = Object.keys(NODES), ADJ = {}; ids.forEach(i => { ADJ[i] = []; });
  const clear = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.ceil(Math.hypot(dx, dy) / 6); for (let i = 0; i <= n; i++) { const x = a[0] + dx * i / n, y = a[1] + dy * i / n; for (const r of BLK) if (x > r[0] && x < r[2] && y > r[1] && y < r[3]) return false; } return true; };
  ids.forEach(i => ids.forEach(j => { if (i < j) { const a = NODES[i], b = NODES[j], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d <= 165 && clear(a, b)) { ADJ[i].push([j, d]); ADJ[j].push([i, d]); } } }));
  const DIST = {}, NEXT = {}; ids.forEach(i => { DIST[i] = {}; NEXT[i] = {}; ids.forEach(j => { DIST[i][j] = i === j ? 0 : Infinity; }); ADJ[i].forEach(([j, d]) => { DIST[i][j] = d; NEXT[i][j] = j; }); });
  ids.forEach(m => ids.forEach(i => ids.forEach(j => { const v = DIST[i][m] + DIST[m][j]; if (v < DIST[i][j]) { DIST[i][j] = v; NEXT[i][j] = NEXT[i][m]; } })));
  const route = (a, b) => { const out = []; let c = a; while (c !== b) { c = NEXT[c][b]; if (!c) return []; out.push(c); } return out; };
  const PAIRS = []; ids.forEach(i => ids.forEach(j => { if (i < j && !CHOKE.has(i) && !CHOKE.has(j)) { const d = Math.hypot(NODES[i][0] - NODES[j][0], NODES[i][1] - NODES[j][1]); if (d > 62 && d < 140 && DIST[i][j] < 200) PAIRS.push([i, j]); } }));
  const visit = {}; ids.forEach(i => { visit[i] = -99; });
  const nearest = (x, y) => { let b = 'h1', bd = 1e9; for (const i of ids) { const d = Math.hypot(NODES[i][0] - x, NODES[i][1] - y); if (d < bd) { bd = d; b = i; } } return b; };
  const vis = i => NODES[i][0] > visL + 36 && NODES[i][0] < visR - 36;

  /* ---- acteurs ---- */
  for (const k in CH) { const h = NODES[HOME[k]]; actors[k] = {k, c: CH[k].c, x: h[0], y: h[1], ox: 0, oy: 0, node: HOME[k], route: [], rid: [], state: 'work', until: rnd(1, 3.5) + Object.keys(actors).length * .9, face: 1, look: 0, ph: Math.random() * 6, phase: Math.random() * 6, wk: 0, speed: rnd(70, 84), chat: null, claim: null, cb: null, trip: 0, blink: rnd(1, 4), lift: 0, spark: 0, trail: 0, mood: 0, partnerLast: ''}; }

  /* ---- dessin d'un personnage (petite mascotte Grok-style avec jambes) en unités de 100 de haut, pieds en (0,0) ---- */
  const SHP = {
    scout: {h: 101, hipY: -22, hipX: 9, sh: [29, -50], face: [-19, -67, 38, 26, 11], ey: -54, ex: 9, my: -46},
    trader: {h: 93, hipY: -26, hipX: 9, sh: [21, -56], face: [-15, -81, 30, 25, 10], ey: -69, ex: 7.5, my: -61},
    sentinel: {h: 78, hipY: -22, hipX: 14, sh: [31, -52], face: [-24, -68, 48, 25, 9], ey: -56, ex: 12, my: -48},
    research: {h: 94, hipY: -20, hipX: 10, sh: [30, -40], face: [-13, -79, 26, 21, 8], ey: -69, ex: 8, my: -62},
    arbitre: {h: 106, hipY: -25, hipX: 12, sh: [31, -52], face: [-20, -68, 40, 26, 10], ey: -56, ex: 10, my: -48}
  };
  function bodyPath(g, k) {
    switch (k) {
      case 'scout': g.beginPath(); g.arc(0, -52, 30, 0, TAU); break;
      case 'trader': rr(g, -21, -92, 42, 68, 21); break;
      case 'sentinel': rr(g, -31, -76, 62, 54, 10); break;
      case 'research': g.beginPath(); g.moveTo(0, -93); g.bezierCurveTo(16, -93, 22, -81, 22, -69); g.bezierCurveTo(22, -57, 35, -52, 35, -38); g.bezierCurveTo(35, -26, 22, -19, 0, -19); g.bezierCurveTo(-22, -19, -35, -26, -35, -38); g.bezierCurveTo(-35, -52, -22, -57, -22, -69); g.bezierCurveTo(-22, -81, -16, -93, 0, -93); g.closePath(); break;
      default: g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, x = Math.cos(a) * 33, y = -52 + Math.sin(a) * 31; g[i ? 'lineTo' : 'moveTo'](x, y); } g.closePath();
    }
  }
  function drawChar(g, k, x, y, u, p) {
    const col = CH[k].c, t = p.t, wk = p.wk, wo = p.work, sx = p.fl, ph = p.ph, sp = SHP[k];
    g.save(); g.translate(x, y);
    g.save(); g.scale(1, .26); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(0, 0, 28 * u * (1 - p.lift * .12), 0, TAU); g.fill();
    const fg = g.createRadialGradient(0, 0, 2, 0, 0, 46 * u); fg.addColorStop(0, rgba(k, .4)); fg.addColorStop(1, rgba(k, 0)); g.fillStyle = fg; g.beginPath(); g.arc(0, 0, 46 * u, 0, TAU); g.fill(); g.restore();
    if (p.sel) { g.strokeStyle = col; g.globalAlpha = .6 + .4 * Math.sin(t * 8); g.lineWidth = 2.2; g.beginPath(); g.ellipse(0, 0, 38 * u, 11 * u, 0, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    g.scale(sx * u, u); g.lineCap = 'round'; g.lineJoin = 'round';
    const bob = (1 - wk) * (Math.sin(t * 2.1 + ph) * 1.1 + 1.1) * (wo ? .5 : 1) + wk * Math.abs(Math.sin(ph)) * 3.4;
    /* jambes : fines, sombres, bottes à semelle colorée */
    for (let i = 0; i < 2; i++) {
      const hx = i ? sp.hipX : -sp.hipX, a = ph + (i ? Math.PI : 0), sw = Math.sin(a) * wk, lf = Math.max(0, Math.cos(a)) * 6 * wk, fx_ = hx + sw * 12, fy = -3 - lf;
      g.strokeStyle = rgba(k, .85); g.lineWidth = 9; g.beginPath(); g.moveTo(hx, sp.hipY + 2); g.lineTo(fx_, fy - 3); g.stroke();
      g.strokeStyle = '#1a2150'; g.lineWidth = 6; g.beginPath(); g.moveTo(hx, sp.hipY + 2); g.lineTo(fx_, fy - 3); g.stroke();
      g.fillStyle = '#1a2150'; g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.ellipse(fx_ + 1.5, fy, 9, 4.8, 0, 0, TAU); g.fill(); g.stroke();
    }
    g.translate(0, -bob); g.rotate(p.lean + (wk ? Math.sin(ph) * .03 : 0));
    /* éléments derrière le corps */
    if (k === 'scout') { g.strokeStyle = '#0b0f2c'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -80); g.lineTo(0, -92); g.stroke(); g.strokeStyle = col; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0.8, -80); g.lineTo(0.8, -92); g.stroke(); }
    const hg = g.createRadialGradient(0, -52, 8, 0, -52, 66); hg.addColorStop(0, rgba(k, .24)); hg.addColorStop(1, rgba(k, 0)); g.fillStyle = hg; g.beginPath(); g.arc(0, -52, 66, 0, TAU); g.fill();
    /* corps sombre et brillant, liseré de couleur */
    bodyPath(g, k); const bg = g.createLinearGradient(-30, -92, 24, -20); bg.addColorStop(0, '#323a72'); bg.addColorStop(.45, '#121634'); bg.addColorStop(1, '#070918'); g.fillStyle = bg; g.fill();
    g.save(); bodyPath(g, k); g.clip();
    const cg = g.createRadialGradient(0, -20, 4, 0, -20, 46); cg.addColorStop(0, rgba(k, .5)); cg.addColorStop(1, rgba(k, 0)); g.fillStyle = cg; g.fillRect(-45, -100, 90, 90);
    g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.ellipse(-14, -73, 17, 7, -.5, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.ellipse(-24, -52, 3.5, 12, -.1, 0, TAU); g.fill();
    g.restore();
    bodyPath(g, k); g.strokeStyle = rgba(k, .3); g.lineWidth = 6; g.stroke(); g.strokeStyle = col; g.lineWidth = 2.2; g.stroke();
    /* bras */
    for (let i = 0; i < 2; i++) {
      const d = i ? 1 : -1, sh = [d * sp.sh[0] * .94, sp.sh[1]]; let hx, hy;
      if (p.gest && i === 1) { const w = Math.sin(t * 7) * .35; hx = sh[0] + Math.sin(.7 + w) * 17; hy = sh[1] - Math.cos(.7 + w) * 14; }
      else if (wo) { hx = d * 13 + d * Math.sin(t * 19 + i * 3.1) * 1.5; hy = sp.hipY - 6 + Math.sin(t * 20 + i * Math.PI) * 2.6; }
      else { hx = sh[0] + d * (6 + Math.sin(ph + (i ? 0 : Math.PI)) * 3 * wk); hy = sh[1] + 14 + Math.cos(ph + (i ? 0 : Math.PI)) * 4 * wk; }
      g.strokeStyle = rgba(k, .8); g.lineWidth = 7.6; g.beginPath(); g.moveTo(sh[0], sh[1]); g.lineTo(hx, hy); g.stroke(); g.strokeStyle = '#1a2150'; g.lineWidth = 5; g.beginPath(); g.moveTo(sh[0], sh[1]); g.lineTo(hx, hy); g.stroke();
      g.fillStyle = col; g.beginPath(); g.arc(hx, hy, 4.4, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(hx - 1, hy - 1.2, 1.3, 0, TAU); g.fill();
    }
    /* écran-visage lumineux */
    const f = sp.face; rr(g, f[0], f[1], f[2], f[3], f[4]); g.fillStyle = '#03051a'; g.fill(); g.strokeStyle = rgba(k, .55); g.lineWidth = 1.5; g.stroke();
    const gz = p.gaze * 2.6, bl = p.blink ? .12 : 1, fgl = g.createLinearGradient(0, f[1], 0, f[1] + f[3]); fgl.addColorStop(0, rgba(k, .16)); fgl.addColorStop(1, rgba(k, 0)); g.fillStyle = fgl; rr(g, f[0], f[1], f[2], f[3], f[4]); g.fill();
    for (let i = -1; i <= 1; i += 2) {
      const ex = i * sp.ex + gz, ey = sp.ey;
      g.fillStyle = rgba(k, .28); g.beginPath(); g.ellipse(ex, ey, 7.2, 9 * bl, 0, 0, TAU); g.fill();
      g.fillStyle = col; g.beginPath(); g.ellipse(ex, ey, 4.6, 6.4 * bl, 0, 0, TAU); g.fill();
      if (bl > .5) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex - .8 + p.gaze * .6, ey - 1.8, 1.8, 2.6, 0, 0, TAU); g.fill(); }
    }
    g.strokeStyle = col; g.lineWidth = 2.2;
    if (p.talk) { const o = 1.4 + 2.6 * Math.abs(Math.sin(t * 13)); g.fillStyle = rgba(k, .9); g.beginPath(); g.ellipse(gz * .5, sp.my, 3.6, o, 0, 0, TAU); g.fill(); }
    else { g.beginPath(); g.arc(gz * .5, sp.my - 2.5, 4.6, .15 * Math.PI, .85 * Math.PI); g.stroke(); }
    /* emblèmes propres à chacun */
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2;
    if (k === 'scout') { const bx = 0, by = -96 + Math.sin(t * 5) * .6; g.fillStyle = col; g.beginPath(); g.arc(bx, by, 4, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(bx - .8, by - .9, 1.4, 0, TAU); g.fill(); g.strokeStyle = col; g.lineWidth = 1.7; g.beginPath(); g.arc(0, -31, 6, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(-9, -31); g.lineTo(-4, -31); g.moveTo(9, -31); g.lineTo(4, -31); g.moveTo(0, -40); g.lineTo(0, -35.5); g.stroke(); g.beginPath(); g.arc(0, -31, 1.4, 0, TAU); g.fill(); }
    else if (k === 'trader') {
      g.lineWidth = 3; g.beginPath(); g.arc(0, -70, 25, Math.PI * 1.04, Math.PI * 1.96); g.stroke(); g.fillStyle = '#0b0f2c'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 23, -69, 5.2, 9, 0, 0, TAU); g.fill(); g.lineWidth = 2; g.stroke(); }
      g.lineWidth = 2; g.beginPath(); g.moveTo(-23, -60); g.quadraticCurveTo(-21, -52, -11, -54); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-11, -54, 2.4, 0, TAU); g.fill();
      g.strokeStyle = col; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-9, -33); g.lineTo(-4, -39); g.lineTo(1, -35); g.lineTo(9, -45); g.stroke();
    } else if (k === 'sentinel') {
      g.lineWidth = 1.8; g.beginPath(); g.moveTo(-8, -39); g.lineTo(8, -39); g.lineTo(8, -31); g.quadraticCurveTo(8, -25, 0, -22.5); g.quadraticCurveTo(-8, -25, -8, -31); g.closePath(); g.globalAlpha = .35; g.fill(); g.globalAlpha = 1; g.stroke(); g.beginPath(); g.moveTo(0, -36); g.lineTo(0, -27); g.stroke();
      g.fillStyle = col; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 25, -29, 2.1, 0, TAU); g.fill(); g.beginPath(); g.arc(s * 25, -70, 2.1, 0, TAU); g.fill(); }
    } else if (k === 'research') {
      g.lineWidth = 2.3; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * sp.ex + gz, sp.ey, 9.4, 0, TAU); g.stroke(); } g.beginPath(); g.moveTo(-1 + gz, sp.ey - 1); g.lineTo(1 + gz, sp.ey - 1); g.stroke();
      g.lineWidth = 1.8; g.beginPath(); g.moveTo(-17.4 + gz, sp.ey - 1); g.lineTo(-21, sp.ey - 3); g.moveTo(17.4 + gz, sp.ey - 1); g.lineTo(21, sp.ey - 3); g.stroke();
      g.lineWidth = 1.7; g.beginPath(); g.moveTo(0, -42); g.lineTo(-8, -40); g.lineTo(-8, -29); g.lineTo(0, -31); g.lineTo(8, -29); g.lineTo(8, -40); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(0, -42); g.lineTo(0, -31); g.stroke();
    } else {
      g.fillStyle = '#ffcf3a'; g.strokeStyle = '#fff3b0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-14, -79); g.lineTo(-15, -94); g.lineTo(-7, -87); g.lineTo(0, -99); g.lineTo(7, -87); g.lineTo(15, -94); g.lineTo(14, -79); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#ff3dd8'; g.beginPath(); g.arc(0, -85, 2.2, 0, TAU); g.fill();
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.8; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4 : 9; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, -31 + Math.sin(a) * r); } g.closePath(); g.globalAlpha = .4; g.fill(); g.globalAlpha = 1; g.stroke();
    }
    g.restore();
  }

  /* ---- icônes de « langue » : glyphes vectoriels (aucun mot) ---- */
  const ICO = {
    star(g, r) { g.beginPath(); for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, q = i % 2 ? r * .32 : r; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill(); },
    diamond(g, r) { g.beginPath(); g.moveTo(0, -r); g.lineTo(r * .75, 0); g.lineTo(0, r); g.lineTo(-r * .75, 0); g.closePath(); g.stroke(); },
    target(g, r) { g.beginPath(); g.arc(0, 0, r * .85, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, r * .35, 0, TAU); g.fill(); },
    tri(g, r) { g.beginPath(); g.moveTo(0, -r); g.lineTo(r * .9, r * .75); g.lineTo(-r * .9, r * .75); g.closePath(); g.stroke(); },
    spiral(g, r) { g.beginPath(); for (let i = 0; i <= 26; i++) { const a = i * .5, q = r * i / 26; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * q, Math.sin(a) * q); } g.stroke(); },
    wave(g, r) { g.beginPath(); for (let i = 0; i <= 12; i++) { const x = -r + i * r / 6; g[i ? 'lineTo' : 'moveTo'](x, Math.sin(i * .95) * r * .4); } g.stroke(); },
    moon(g, r) { g.beginPath(); g.arc(0, 0, r * .85, Math.PI * .35, Math.PI * 1.65); g.arc(r * .35, 0, r * .62, Math.PI * 1.55, Math.PI * .45, true); g.closePath(); g.fill(); },
    cons(g, r) { const q = [[-r * .8, r * .4], [-r * .1, -r * .6], [r * .8, r * .1]]; g.beginPath(); q.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1])); g.stroke(); q.forEach(p => { g.beginPath(); g.arc(p[0], p[1], r * .2, 0, TAU); g.fill(); }); },
    bolt(g, r) { g.beginPath(); g.moveTo(r * .2, -r); g.lineTo(-r * .55, r * .1); g.lineTo(0, r * .1); g.lineTo(-r * .2, r); g.lineTo(r * .55, -r * .2); g.lineTo(0, -r * .2); g.closePath(); g.fill(); },
    smile(g, r) { g.beginPath(); g.arc(0, 0, r * .85, 0, TAU); g.stroke(); g.beginPath(); g.arc(-r * .3, -r * .15, r * .1, 0, TAU); g.arc(r * .3, -r * .15, r * .1, 0, TAU); g.fill(); g.beginPath(); g.arc(0, r * .05, r * .45, .15 * Math.PI, .85 * Math.PI); g.stroke(); },
    plus(g, r) { g.beginPath(); g.moveTo(0, -r); g.lineTo(0, r); g.moveTo(-r, 0); g.lineTo(r, 0); g.stroke(); g.beginPath(); g.moveTo(-r * .55, -r * .55); g.lineTo(r * .55, r * .55); g.moveTo(r * .55, -r * .55); g.lineTo(-r * .55, r * .55); g.stroke(); },
    eye(g, r) { g.beginPath(); g.moveTo(-r, 0); g.quadraticCurveTo(0, -r * .95, r, 0); g.quadraticCurveTo(0, r * .95, -r, 0); g.stroke(); g.beginPath(); g.arc(0, 0, r * .3, 0, TAU); g.fill(); },
    up(g, r) { g.beginPath(); g.moveTo(-r, r * .6); g.lineTo(-r * .3, -r * .1); g.lineTo(r * .15, r * .3); g.lineTo(r, -r * .7); g.stroke(); g.beginPath(); g.moveTo(r * .35, -r * .7); g.lineTo(r, -r * .7); g.lineTo(r, -r * .05); g.stroke(); },
    coin(g, r) { g.beginPath(); g.arc(0, 0, r * .85, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(-r * .3, 0); g.lineTo(r * .3, 0); g.moveTo(0, -r * .4); g.lineTo(0, r * .4); g.stroke(); },
    shield(g, r) { g.beginPath(); g.moveTo(-r * .7, -r * .8); g.lineTo(r * .7, -r * .8); g.lineTo(r * .7, 0); g.quadraticCurveTo(r * .7, r * .6, 0, r); g.quadraticCurveTo(-r * .7, r * .6, -r * .7, 0); g.closePath(); g.stroke(); },
    crown(g, r) { g.beginPath(); g.moveTo(-r * .85, r * .6); g.lineTo(-r * .9, -r * .5); g.lineTo(-r * .4, 0); g.lineTo(0, -r * .8); g.lineTo(r * .4, 0); g.lineTo(r * .9, -r * .5); g.lineTo(r * .85, r * .6); g.closePath(); g.stroke(); },
    ring(g, r) { g.beginPath(); g.ellipse(0, 0, r, r * .45, 0, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, r * .18, 0, TAU); g.fill(); }
  };
  const ICOK = Object.keys(ICO), EMB = {scout: 'target', trader: 'coin', sentinel: 'shield', research: 'eye', arbitre: 'crown'};
  const KIND_ICO = [[/opportun|analyse|scanner|decouverte/i, 'cons'], [/risque|controle|alerte|coherence|news/i, 'shield'], [/decision|tick|entree/i, 'crown'], [/verrou|evaluation|reevaluation/i, 'up'], [/fantome|bras|carnet|i3/i, 'eye']];
  const pickIcons = (k, n, hint) => { const a = [EMB[k]]; if (hint) a.push(hint); while (a.length < n) { const c = ICOK[Math.floor(Math.random() * ICOK.length)]; if (!a.includes(c)) a.push(c); } return a.slice(0, n).sort(() => Math.random() - .5 + .35); };
  function speak(k, dur, hint) { for (let i = bubs.length - 1; i >= 0; i--) if (bubs[i].k === k) bubs.splice(i, 1); if (bubs.length >= 3) bubs.shift(); bubs.push({k, t0: T, dur, n: 2 + Math.floor(Math.random() * 3), ic: null, hint, rr: T}); }
  function drawBubbles(t) {
    for (let i = bubs.length - 1; i >= 0; i--) {
      const b = bubs[i], age = t - b.t0; if (age > b.dur) { bubs.splice(i, 1); continue; }
      const a = actors[b.k], gu = clamp(15 / S, 18, 30), top = (a.y + a.oy) - SHP[b.k].h * US() - 8;
      if (!b.ic || t - b.rr > .42) { b.ic = pickIcons(b.k, b.n, b.hint ? KIND_ICO.find(([re]) => re.test(b.hint)) ? KIND_ICO.find(([re]) => re.test(b.hint))[1] : null : null); b.rr = t; }
      const sc = Math.min(1, age / .16), ov = sc < 1 ? 1 + .18 * Math.sin(sc * Math.PI) : 1, fo = age > b.dur - .25 ? (b.dur - age) / .25 : 1, w = b.n * gu * 1.12 + gu * .7, h = gu * 1.55;
      let cx = clamp(a.x + a.ox, visL + w / 2 + 6, visR - w / 2 - 6), cy = Math.max(h + 6, top);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc * ov, sc * ov); ctx.globalAlpha = Math.max(0, fo);
      rr(ctx, -w / 2, -h, w, h, h * .38); ctx.fillStyle = 'rgba(5,8,22,.92)'; ctx.fill(); ctx.strokeStyle = CH[b.k].c; ctx.lineWidth = 2.2; ctx.stroke();
      const tx = clamp(a.x + a.ox - cx, -w / 2 + 12, w / 2 - 12); ctx.beginPath(); ctx.moveTo(tx - 6, -1); ctx.lineTo(tx, 8); ctx.lineTo(tx + 6, -1); ctx.fillStyle = 'rgba(5,8,22,.96)'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = CH[b.k].c; ctx.fillStyle = CH[b.k].c; ctx.lineWidth = 2; ctx.lineCap = 'round';
      b.ic.forEach((n, j) => { ctx.save(); ctx.translate(-w / 2 + gu * .35 + gu * .56 + j * gu * 1.12, -h / 2); ctx.rotate(Math.sin(t * 5 + j) * .09); ICO[n](ctx, gu * .46); ctx.restore(); });
      ctx.restore();
    }
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const US = () => (kf > 1 ? 1.5 : 1.28);

  function drawActors(t) {
    const list = Object.values(actors).sort((a, b) => (a.y + a.oy) - (b.y + b.oy));
    for (const a of list) {
      const moving = a.state === 'walk', talk = !!bubs.find(b => b.k === a.k && t - b.t0 < b.dur - .2);
      drawChar(ctx, a.k, a.x + a.ox, a.y + a.oy, US(), {t, wk: a.wk, ph: a.phase, work: a.state === 'work' && a.wk < .1, fl: a.face, lean: a.lean || 0, gaze: a.look, blink: a.blink < 0, talk, gest: talk && a.state === 'chat', lift: moving ? Math.abs(Math.sin(a.phase)) : 0, sel: a.sel > t});
    }
  }
  function drawIcon(cvn) {
    const k = cvn.dataset.k, g = cvn.getContext('2d'), w = cvn.width; g.clearRect(0, 0, w, w); g.setTransform(1, 0, 0, 1, 0, 0);
    drawChar(g, k, w / 2, w - 8, (w - 12) / 110, {t: 1.3, wk: 0, ph: 0, work: false, fl: 1, lean: 0, gaze: 0, blink: false, talk: false, gest: false, lift: 0, sel: 0});
  }

  /* ---- effets de salle ---- */
  function drawDust(t) {
    if (lowQ && !dust._cut) { dust.length = Math.min(dust.length, 12); dust._cut = 1; }
    for (const d of dust) { const y = 730 - ((730 - d.y + t * d.sp) % 600), x = d.x + Math.sin(t * .5 + d.ph) * 14; ctx.globalAlpha = .12 + .3 * (.5 + .5 * Math.sin(t * 1.7 + d.ph)); ctx.fillStyle = 'rgb(' + d.c + ')'; ctx.fillRect(x, y, d.r * 2, d.r * 2); }
    ctx.globalAlpha = 1;
  }
  const STREAMS = [['scout', [330, 345], [400, 430], [462, 428]], ['sentinel', [700, 345], [630, 430], [565, 428]], ['arbitre', [330, 520], [400, 478], [460, 460]], ['research', [700, 520], [630, 478], [565, 460]], ['trader', [512, 530], [512, 500], [512, 470]]];
  function streams(t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    STREAMS.forEach(([k, a, m, b], i) => {
      const c = k === 'trader' ? COL.mg : CH[k].c, busy = actors[k].state === 'work', sp = busy ? .5 : .22;
      ctx.globalAlpha = .12; ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0], m[1], b[0], b[1]); ctx.stroke();
      for (let j = 0; j < 2; j++) { const u0 = (t * sp + i * .23 + j * .5) % 1; for (let q = 0; q < 4; q++) { const u = Math.max(0, u0 - q * .035), x = quad(a[0], m[0], b[0], u), y = quad(a[1], m[1], b[1], u); ctx.globalAlpha = (1 - q * .24) * (busy ? .95 : .55); ctx.fillStyle = q ? c : '#fff'; ctx.beginPath(); ctx.arc(x, y, 3.2 - q * .55, 0, TAU); ctx.fill(); } }
    });
    ctx.restore();
  }
  function holo(t) {
    const x = 512, y = 408; ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const k = ((t * .5 + i / 3) % 1); ctx.strokeStyle = 'rgba(' + (i % 2 ? '255,61,216' : '39,230,255') + ',' + (.55 * (1 - k)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - k * 70, 64 - k * 18, 21 - k * 6, 0, 0, TAU); ctx.stroke(); }
    const g = ctx.createLinearGradient(0, y - 90, 0, y); g.addColorStop(0, 'rgba(39,230,255,0)'); g.addColorStop(1, 'rgba(39,230,255,.22)'); ctx.fillStyle = g; ctx.fillRect(x - 40, y - 90, 80, 90);
    ctx.lineWidth = 2.5; ctx.setLineDash([16, 12]); ctx.lineDashOffset = -t * 34; ctx.strokeStyle = 'rgba(39,230,255,.7)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 80, 26, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([4, 12]); ctx.lineDashOffset = t * 24; ctx.strokeStyle = 'rgba(255,61,216,.6)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 100, 33, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (ringFlash > .02) { ctx.globalAlpha = ringFlash; ctx.strokeStyle = COL.go; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y + 4, 90 + (1 - ringFlash) * 30, 29 + (1 - ringFlash) * 10, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
  function fxDraw(t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i], k = (t - f.t) / 1; if (k >= 1) { fx.splice(i, 1); continue; } ctx.globalAlpha = (1 - k) * .8; ctx.strokeStyle = f.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x, f.y, 14 + k * 50, 5 + k * 17, 0, 0, TAU); ctx.stroke(); }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; if (p.l <= 0) { parts.splice(i, 1); continue; } ctx.globalAlpha = Math.min(1, p.l) * .85; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (.5 + p.l * .5), 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawF(t) {
    const k = cv.width / 1024; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, 1024, 768);
    screen('scC', dRadar); screen('scL', dFunnel); screen('scR', dTop);
    screen('seC', dGauge); screen('seL', dStops); screen('seR', dSlots);
    screen('arC', dEqui); screen('arL', dBilan); screen('arR', dClos);
    screen('reC', dGhostBars); screen('reL', dDonut); screen('reR', dGhostPnl);
    screen('trL', dPosChart); screen('trR', dPosPnl);
    screen('wall', dWall); screen('wL', dTarget); screen('wR', dExpo);
    streams(t); holo(t); fxDraw(t); drawActors(t); drawBubbles(t); drawDust(t);
  }

  /* ---- comportement : travail au bureau, balades sur tout le sol, discussions en glyphes ---- */
  const ROLE_WHO = {SCANNER: 'scout', SCOUT: 'scout', SENTINEL: 'sentinel', TRADER: 'trader', ARBITRE: 'arbitre', RESEARCH: 'research'};
  const PARTNER = {scout: 'trader', trader: 'sentinel', sentinel: 'arbitre', arbitre: 'trader', research: 'arbitre'};
  const ORD = {SCANNER: 0, SCOUT: 1, SENTINEL: 2, ARBITRE: 3, TRADER: 4, RESEARCH: 5};
  function buildQueue() {
    const j = D.team && Array.isArray(D.team.journal) ? D.team.journal : []; if (!j.length) { queue = []; return; }
    const mx = Math.max(...j.map(e => e.ts)), cur = j.filter(e => e.ts >= mx - 90e3); D.lastTick = mx;
    const seenK = new Set(), pick = [];
    for (const e of cur.slice().sort((a, z) => (ORD[a.role] ?? 9) - (ORD[z.role] ?? 9))) { const k = e.role + '.' + e.kind; if (seenK.has(k) || !ROLE_WHO[e.role]) continue; seenK.add(k); pick.push(e); }
    queue = pick.slice(0, 8).map(e => { const who = ROLE_WHO[e.role]; return {who, partner: PARTNER[who], kind: String(e.kind || ''), ts: e.ts, role: e.role}; });
    qi = 0;
  }
  function say(who, kind, ts) {
    const c = CH[who];
    $('tkWho').textContent = c.name; $('tkWho').style.color = c.c; document.querySelector('#ticker .dot').style.background = c.c; document.querySelector('#ticker .dot').style.boxShadow = '0 0 10px ' + c.c;
    $('tkTxt').textContent = kind.replace(/_/g, ' '); $('tkTag').textContent = ts ? (tag + ' · ' + fmtH(ts) + ' (Paris)') : '';
    document.querySelectorAll('.ag').forEach(el => el.classList.toggle('on', el.dataset.k === who));
  }
  function info(k) {
    const el = document.querySelector('[data-st="' + k + '"]'), c = CH[k]; actors[k].sel = T + 2.6; speak(k, 2.6, null); ringFx(actors[k].x, actors[k].y, c.c);
    $('tkWho').textContent = c.name; $('tkWho').style.color = c.c; $('tkTxt').textContent = el ? el.textContent : '—'; $('tkTag').textContent = '';
    document.querySelectorAll('.ag').forEach(e => e.classList.toggle('on', e.dataset.k === k)); nextAt = Math.max(nextAt, T + 4);
  }
  function walkTo(a, id, cb) {
    const from = a.node || nearest(a.x, a.y), r = route(from, id);
    a.rid = r.slice(); a.route = r.map(i => NODES[i]); a.cb = cb || null; a.chatReady = false;
    if (!r.length) { a.state = 'idle'; a.until = T + .01; if (cb) cb(a); return; }
    a.state = 'walk';
  }
  function goHome(a, cb) { walkTo(a, HOME[a.k], cb || (x => { x.state = 'work'; x.until = T + rnd(2.8, 5.5); x.face = 1; x.look = 0; })); }
  function roam(a) {
    const cand = ids.filter(i => !CHOKE.has(i) && i !== a.node && vis(i)), pickN = []; for (let q = 0; q < 4; q++) pickN.push(cand[Math.floor(Math.random() * cand.length)]);
    const cr = i => Object.values(actors).filter(o => o !== a && Math.hypot(o.x - NODES[i][0], o.y - NODES[i][1]) < 110).length * 40; pickN.sort((p, q) => visit[p] + cr(p) - visit[q] - cr(q)); const id = pickN[0]; visit[id] = T;
    walkTo(a, id, x => { x.state = 'idle'; x.until = T + rnd(.9, 2.4); x.look = Math.random() < .5 ? -1 : 1; const n = NODES[id]; if (Math.abs(n[0] - 512) < 110 && n[1] > 430) { x.look = n[0] < 512 ? 1 : -1; ringFlash = Math.max(ringFlash, .5); } x.face = x.look || x.face; });
  }
  function freeActors() { return Object.values(actors).filter(a => !a.chat && (a.state === 'idle' || a.state === 'work' || a.state === 'walk') && !a.real); }
  function decide(a) {
    if (a.chat || a.real) return;
    const r = Math.random(), others = Object.values(actors).filter(o => o !== a && !o.chat && !o.real && o.k !== a.partnerLast && (o.state === 'idle' || o.state === 'work'));
    if (a.state === 'work' || a.trip <= 0) {
      if (r < .34 && others.length && chats < 2) { const o = others[Math.floor(Math.random() * others.length)]; startChat(a, o, {}); return; }
      a.trip = 1 + Math.floor(Math.random() * 3); roam(a); return;
    }
    a.trip--; if (a.trip <= 0 && Math.random() < .55) { goHome(a); return; }
    if (Math.random() < .2 && others.length && chats < 2) { startChat(a, others[Math.floor(Math.random() * others.length)], {}); return; }
    roam(a);
  }
  let chats = 0; const chatList = [];
  function pickPair(A, B, real) {
    const posA = A.node || nearest(A.x, A.y), posB = B.node || nearest(B.x, B.y), used = new Set(); chatList.forEach(c => { used.add(c.pa); used.add(c.pb); });
    const sc = [];
    for (const [i, j] of PAIRS) { if (used.has(i) || used.has(j) || !vis(i) || !vis(j)) continue; const d1 = DIST[posA][i] + DIST[posB][j], d2 = DIST[posA][j] + DIST[posB][i]; const mx = (NODES[i][0] + NODES[j][0]) / 2, my = (NODES[i][1] + NODES[j][1]) / 2, crowd = Object.values(actors).filter(o => o !== A && o !== B && Math.hypot(o.x - mx, o.y - my) < 190).length; sc.push(d1 <= d2 ? [d1 + crowd * 170, i, j] : [d2 + crowd * 170, j, i]); }
    sc.sort((x, y) => x[0] - y[0]); const top = sc.slice(0, real ? 3 : 14); if (!top.length) return null; const p = top[Math.floor(Math.random() * top.length)]; return [p[1], p[2]];
  }
  function startChat(A, B, o) {
    const pr = pickPair(A, B, !!o.real); if (!pr) return false;
    const ch = {A, B, pa: pr[0], pb: pr[1], state: 'gather', t0: T, ready: 0, real: !!o.real, sc: o.sc || null, dur: o.real ? 3.4 : rnd(2.8, 4.6), spk: 0, nx: 0}; chatList.push(ch); chats++;
    [[A, pr[0]], [B, pr[1]]].forEach(([a, spot]) => {
      a.chat = ch; a.trip = 0; a.partnerLast = (a === A ? B : A).k; if (o.real) a.real = true; a.sel = 0;
      const go = x => walkTo(x, spot, y => { y.state = 'chat'; y.face = NODES[spot][0] < (spot === ch.pa ? NODES[ch.pb][0] : NODES[ch.pa][0]) ? 1 : -1; y.look = y.face; ch.ready++; if (ch.ready >= 2) { ch.state = 'talk'; ch.t0 = T; ch.nx = T; } });
      if (a.state === 'walk') a.claim = go; else go(a);
    });
    return true;
  }
  function endChat(ch) {
    const i = chatList.indexOf(ch); if (i >= 0) chatList.splice(i, 1); chats = Math.max(0, chats - 1);
    [ch.A, ch.B].forEach(a => { a.chat = null; a.real = false; a.state = 'idle'; a.until = T + rnd(.3, 1); a.look = 0; });
    if (ch.real) { const a = ch.A, ring = a.x < 512 ? 'n11' : 'n12'; a.real = true; a.trip = 0; walkTo(a, ring, x => { x.state = 'idle'; x.until = T + 1.4; x.look = x.x < 512 ? 1 : -1; x.face = x.look; ringFlash = 1; roleFlash[x.k] = 1; ringFx(512, 420, x.c); x.real = false; }); }
  }
  function stepChats() {
    for (let i = chatList.length - 1; i >= 0; i--) {
      const ch = chatList[i];
      if (ch.state === 'gather') { if (T - ch.t0 > 14) endChat(ch); continue; }
      if (T >= ch.nx) { const sp = ch.spk ? ch.B : ch.A; ch.spk ^= 1; ch.nx = T + rnd(1.0, 1.5); const hint = ch.sc && ch.spk === 1 ? ch.sc.kind : null; speak(sp.k, 1.15, hint); if (ch.real && ch.spk === 1) { roleFlash[ch.A.k] = 1; roleFlash[ch.B.k] = .85; } }
      if (T - ch.t0 > ch.dur) endChat(ch);
    }
  }
  function stepActor(a, dt) {
    const mv = a.state === 'walk'; let tw = 0;
    if (mv) {
      const p = a.route[0]; if (!p) { a.state = 'idle'; a.until = T + .4; return; }
      const dx = p[0] - a.x, dy = p[1] - a.y, d = Math.hypot(dx, dy), st = a.speed * dt; tw = 1;
      if (d <= st) { a.x = p[0]; a.y = p[1]; a.node = a.rid.shift(); a.route.shift(); visit[a.node] = T; a.phase += st / 44 * TAU;
        if (a.claim) { const c = a.claim; a.claim = null; a.route = []; a.rid = []; c(a); }
        else if (!a.route.length) { const cb = a.cb; a.cb = null; a.state = 'idle'; a.until = T + .01; if (cb) cb(a); } }
      else { a.x += dx / d * st; a.y += dy / d * st; a.phase += st / 44 * TAU; if (Math.abs(dx) > 2) { a.face = dx > 0 ? 1 : -1; } a.look = dx > 0 ? 1 : -1; a.lean = (a.lean || 0) + ((dx > 0 ? .06 : -.06) - (a.lean || 0)) * Math.min(1, dt * 6); }
    } else a.lean = (a.lean || 0) * (1 - Math.min(1, dt * 8));
    a.wk += (tw - a.wk) * Math.min(1, dt * 9);
    a.blink -= dt; if (a.blink < -.14) a.blink = rnd(1.8, 4.5);
    if (a.state === 'work') { a.spark -= dt; if (a.spark <= 0) { a.spark = .16; spark(a.x + rnd(-14, 14), a.y - 22, a.c, true); } roleFlash[a.k] = Math.max(roleFlash[a.k], .1); }
    if (mv && Math.abs(a.wk) > .5) { a.trail -= dt; if (a.trail <= 0) { a.trail = .07; spark(a.x + rnd(-8, 8), a.y - 2, a.c, false); } }
    if ((a.state === 'idle' || a.state === 'work') && T >= a.until && !a.chat) decide(a);
  }
  function separate(dt) {
    const L = Object.values(actors);
    for (const a of L) { a.tx = 0; a.ty = 0; }
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const A = L[i], B = L[j]; if (A.chat && A.chat === B.chat) continue;
      const dx = A.x + A.ox - B.x - B.ox, dy = (A.y + A.oy - B.y - B.oy) * 1.6, d = Math.hypot(dx, dy), R = 70 * US();
      if (d < R) { const n = d < 1 ? [1, 0] : [dx / d, dy / d], push = (R - d) * .55, sa = A.state === 'walk' ? 1 : .15, sb = B.state === 'walk' ? 1 : .15, tot = sa + sb; A.tx += n[0] * push * sa / tot * 2; A.ty += n[1] * push * sa / tot * 1.2; B.tx -= n[0] * push * sb / tot * 2; B.ty -= n[1] * push * sb / tot * 1.2; }
    }
    for (const a of L) { a.ox += (clamp(a.tx, -26, 26) - a.ox) * Math.min(1, dt * 5); a.oy += (clamp(a.ty, -12, 12) - a.oy) * Math.min(1, dt * 5); }
  }
  function stepScenes(dt) {
    for (const k in actors) stepActor(actors[k], dt);
    separate(dt); stepChats();
    for (const k in roleFlash) roleFlash[k] = Math.max(0, roleFlash[k] - dt * .8); ringFlash = Math.max(0, ringFlash - dt * .9);
    for (const p of parts) { p.l -= dt * 1.5; p.x += p.vx * dt; p.y += p.vy * dt; }
    if (RM) return;
    if (T >= nextAt && queue.length) {
      if (qi < queue.length) {
        const sc = queue[qi], A = actors[sc.who], B = actors[sc.partner];
        if (A.real || B.real) nextAt = T + .8;
        else { [A, B].forEach(a => { if (a.chat) { const c = a.chat; endChat(c); } }); if (startChat(A, B, {real: true, sc})) { qi++; say(sc.who, sc.kind, sc.ts); nextAt = T + 4.4; } else nextAt = T + 1; }
      } else if (!chatList.some(c => c.real) && !replayAt) replayAt = T + 8;
      else if (replayAt && T >= replayAt && !chatList.some(c => c.real)) { replayAt = 0; qi = 0; tag = 'rejoue le dernier cycle'; nextAt = T; }
    }
  }
  function loop(ts) {
    if (!running) return; raf = requestAnimationFrame(loop); const dt = Math.min(.1, (ts - last) / 1000); if (dt < .028) return; last = ts; T += dt;
    stepScenes(dt); drawF(T);
    fpsN++; fpsT += dt; if (fpsT >= 2.5) { const f = fpsN / fpsT; fpsN = 0; fpsT = 0; if (T > 4 && f < 21) { if (++slow >= 2 && !lowQ) { lowQ = true; Object.defineProperty(ctx, 'shadowBlur', {get() { return 0; }, set() {}, configurable: true}); } } else slow = 0; }
  }
  function start() { if (RM || running) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  let vis_ = true; if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis_ = es[0].isIntersecting; vis_ && !document.hidden ? start() : stop(); }).observe(room);
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : (vis_ && start()); });
  room.addEventListener('pointerdown', ev => {
    const r = room.getBoundingClientRect(), x = (ev.clientX - r.left) / S, y = (ev.clientY - r.top) / S; let best = null, bd = 1e9;
    for (const k in actors) { const a = actors[k], cx = a.x + a.ox, cy = a.y + a.oy - 48 * US(), d = Math.hypot(x - cx, (y - cy) / 1.25); if (d < 44 * US() && d < bd) { bd = d; best = k; } }
    if (best) info(best);
  });
  layoutF(); document.querySelectorAll('canvas.ico').forEach(drawIcon);
  return {
    refresh(isNew) {
      buildPool(); const prev = D.lastTick; buildQueue();
      if (!RM && queue.length && (isNew || D.lastTick !== prev)) { tag = prev && D.lastTick !== prev ? 'nouveau cycle' : 'rejoue le dernier cycle'; replayAt = 0; nextAt = Math.min(nextAt, T + 1.2); if (!chatList.some(c => c.real)) qi = 0; }
      if (RM || !queue.length) { const q = queue[queue.length - 1]; if (q) say(q.who, q.kind, q.ts); else $('tkTxt').textContent = 'en attente de données'; }
      if (!running) { drawF(T); } layoutF(); document.querySelectorAll('canvas.ico').forEach(drawIcon);
    },
    start, info, T: () => T, actors, chats: chatList, nodes: NODES, setQ(i) { qi = i; nextAt = T; }
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
