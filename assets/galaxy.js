/* MEME AUTONOME — interface « galaxie » (statique, GitHub Pages). Lit uniquement data/*.json publiés par le cycle.
   Aucune donnée inventée : toute valeur absente est affichée comme telle. Les animations rejouent le DERNIER cycle enregistré. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const TZ = 'Europe/Paris', H = 3600e3, CAPITAL = 1000;
const ABS = (t = 'donnée absente') => `<span class="abs">${t}</span>`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const nf = (x, d = 2) => Number(x).toLocaleString('fr-FR', {minimumFractionDigits: d, maximumFractionDigits: d});
const ok = x => x !== null && x !== undefined && !Number.isNaN(x);
const eur = (x, d = 2) => ok(x) ? nf(x, d) + ' €' : ABS();
const sgn = (x, f) => (x > 0 ? '+' : x < 0 ? '−' : '') + f(Math.abs(x));
const pct = (x, d = 2) => ok(x) ? sgn(x * 100, v => nf(v, d)) + ' %' : ABS();
const cls = x => !ok(x) ? '' : x > 0 ? 'g' : x < 0 ? 'r' : '';
const px = x => !ok(x) ? ABS() : x >= 1000 ? nf(x, 2) : x >= 1 ? nf(x, 4) : Number(x).toLocaleString('fr-FR', {maximumSignificantDigits: 5});
const hm = ms => ok(ms) ? new Date(ms).toLocaleTimeString('fr-FR', {timeZone: TZ, hour: '2-digit', minute: '2-digit'}) : '—';
const dhm = ms => ok(ms) ? new Date(ms).toLocaleString('fr-FR', {timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}) : '—';
const dur = s => s < 3600 ? Math.max(0, Math.round(s / 60)) + ' min' : Math.floor(s / 3600) + ' h ' + String(Math.round(s % 3600 / 60)).padStart(2, '0');
const base = m => String(m || '').replace(/-EUR$/, '');
const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const coin = m => `<span class="coin" style="background:hsl(${hue(m)} 85% 60%)">${esc(base(m).slice(0, 2))}</span>`;
const BOOKLBL = {'ultra-1.0': ['ULTRA 1.0', 'ul'], 'ultra-1.1': ['ULTRA 1.1', 'u11'], 'S3': ['S3 réf.', 'ref'], 'S2': ['S2 réf.', 'ref'], 'btc_hold': ['BTC réf.', 'ref']};
const U10 = 'ultra-1.0', U11 = 'ultra-1.1', REFS = ['S3', 'S2', 'btc_hold'];
const BCOL = {[U10]: '#22f08a', [U11]: '#b26bff'};
const grp = b => b === U10 ? 'u10' : b === U11 ? 'u11' : 'ref';                 // groupe pour les filtres de carnet
const pass = (f, g) => f === 'all' || f === g;
// motif de rejet ENREGISTRÉ par le moteur (ui.json, carnets[b].ordres_rejetes) ; jamais déduit
const rejWhy = (b, m, ts) => { const c = D.ui && D.ui.carnets && D.ui.carnets[b]; if (!c || !c.ordres_rejetes) return null;
  const r = c.ordres_rejetes.find(x => x.market === m && x.created_ts === ts); return r ? (r.raison || r.raison_absente || null) : null; };
const book = b => { const [t, c] = BOOKLBL[b] || [b, 'ref']; return `<span class="badge ${c}">${esc(t)}</span>`; };
const STEPS = [
  {k: 'SCAN', c: '#38b6ff', img: 'scan'}, {k: 'ANALYSE', c: '#b26bff', img: 'analyse'}, {k: 'VÉRIFICATION', c: '#ffd23f', img: 'verification'},
  {k: 'SÉLECTION', c: '#22f08a', img: 'selection'}, {k: 'EXÉCUTION', c: '#ff4d5e', img: 'execution'}, {k: 'SUIVI', c: '#e9f2ff', img: 'suivi'}];
// positions dans la scène (ordre du pipeline, sens horaire) : [x%, y%] large / carré (mobile)
const POS_W = [[17, 33], [48, 21], [80, 33], [83, 68], [56, 78], [24, 70]];
const POS_S = [[19, 29], [50, 18], [81, 29], [81, 60], [50, 73], [19, 60]];

let D = {}, eqWin = 24, mktTab = 'TOUS', evFilter = 'all', capBk = U10, ordFilter = 'all', posFilter = 'all';

async function J(f) {
  try { const r = await fetch('data/' + f + '.json?' + Date.now(), {cache: 'no-store'}); if (!r.ok) return null; return await r.json(); }
  catch (e) { return null; }
}

function nextCycle(now = Date.now()) {          // cron « 7 */2 * * * » UTC
  const d = new Date(now); let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours() - d.getUTCHours() % 2, 7);
  while (t <= now) t += 2 * H; return t;
}

/* ---------------- données dérivées (aucune invention) ---------------- */
function derive() {
  const u = D.ultra10, p = D.paper10, w = D.wide, ui = D.ui;
  const c0 = u && u.cycles && u.cycles[0] || null;
  const jr = (u && u.journal) || [];
  const byM = {}; jr.forEach(r => { (byM[r.market] = byM[r.market] || {})[r.fn] = r; });
  const ub = p && p.carnets && p.carnets[U10] || null, u11 = p && p.carnets && p.carnets[U11] || null;
  const retenu = w && (w.exclusions || []).find(x => x.k === 'retenu');
  const inst = w && w.instantanes && w.instantanes[0];
  const eRows = jr.filter(r => r.fn === 'U-E'), dRows = jr.filter(r => r.fn === 'U-D');
  const verif = c0 ? new Set([...eRows, ...dRows].map(r => r.market)).size : null;
  const objections = eRows.filter(r => r.verdict === 'objection').length;
  const ordOpen = ub ? ub.ordres.filter(o => o.status === 'ouvert') : null;
  const posOpen = ub ? ub.positions.filter(x => x.status === 'ouverte') : null;
  const refPos = p ? Object.entries(p.carnets).filter(([k]) => REFS.includes(k)).reduce((n, [, b]) => n + b.positions.filter(x => x.status === 'ouverte').length, 0) : null;
  const ord11 = u11 ? u11.ordres.filter(o => o.status === 'ouvert') : null, pos11 = u11 ? u11.positions.filter(x => x.status === 'ouverte') : null;
  return {c0, byM, ub, u11, retenu: retenu ? retenu.n : null, nEur: inst ? inst.n_eur : null, verif, objections, ordOpen, posOpen, refPos, ord11, pos11,
          uiBook: ui && ui.carnets && ui.carnets[U10] || null, ui11: ui && ui.carnets && ui.carnets[U11] || null};
}

function stepFigures(X) {
  const c = X.c0;
  return [
    X.retenu != null ? [`${X.retenu} marchés`, c ? `${c.n_anomalies} anomalies` : 'anomalies : absent'] : ['donnée absente', ''],
    c ? [`${c.n_deep} analysés`, 'flux B · carnet C'] : ['donnée absente', ''],
    c && X.verif != null ? [`${X.verif} vérifiés`, `${X.objections} objection${X.objections > 1 ? 's' : ''} (E)`] : ['donnée absente', ''],
    c ? [`${c.selected.length} sélectionné${c.selected.length > 1 ? 's' : ''}`, `${c.watched.length} surveillé${c.watched.length > 1 ? 's' : ''}`] : ['donnée absente', ''],
    X.ordOpen ? [`${X.ordOpen.length} ordre${X.ordOpen.length > 1 ? 's' : ''} ouvert${X.ordOpen.length > 1 ? 's' : ''}`, X.ord11 ? `Ultra 1.0 · 1.1 : ${X.ord11.length}` : 'carnet Ultra 1.0'] : ['donnée absente', ''],
    X.posOpen ? [`${X.posOpen.length} position${X.posOpen.length > 1 ? 's' : ''} Ultra 1.0`, (X.pos11 ? `1.1 : ${X.pos11.length}` : '') + (X.refPos ? `${X.pos11 ? ' · ' : '+ '}${X.refPos} réf.` : '')] : ['donnée absente', '']];
}

/* ---------------- rendu des panneaux ---------------- */
function renderFresh() {
  const st = D.status;
  const f = $('fresh');
  if (!st) { f.textContent = 'aucune donnée'; f.className = 'pill bad'; return; }
  const a = (Date.now() - st.genere) / 1000;
  f.textContent = 'données : il y a ' + dur(a); f.className = 'pill ' + (a < 3 * 3600 ? 'ok' : 'bad');
  f.title = a < 3 * 3600 ? 'Données récentes' : 'Plus de 3 h : un cycle a été retardé ou sauté (GitHub ne garantit pas l\'heure)';
}

function svgLine(pts, Xp, Yp) { return pts.map(q => Xp(q.ts).toFixed(1) + ',' + Yp(q.equity).toFixed(1)).join(' '); }
function renderCmp(X) {
  const A = X.ub, B = X.u11;
  $('capT').textContent = 'CAPITAL FICTIF ULTRA 1.0 vs 1.1';
  if (!A || !A.courbe.length || !B || !B.courbe.length) {
    $('capV').innerHTML = ABS(B ? 'courbe 1.0 absente' : 'carnet ULTRA 1.1 non publié'); $('capD').innerHTML = ''; $('eq').innerHTML = '';
    $('capNote').textContent = B ? '' : 'Le carnet ULTRA 1.1 apparaît à partir de son premier cycle (aucun rattrapage rétroactif).'; return;
  }
  const la = A.courbe[A.courbe.length - 1], lb = B.courbe[B.courbe.length - 1];
  const na = la.equity - CAPITAL, nb = lb.equity - CAPITAL, d = lb.equity - la.equity;
  $('capV').innerHTML = `<span class="cmpv"><span style="color:${BCOL[U10]}">${nf(la.equity, 2)} €</span> <span class="mut" style="font-size:.45em">vs</span> <span style="color:${BCOL[U11]}">${nf(lb.equity, 2)} €</span></span>`;
  $('capD').innerHTML = `1.0 <span class="${cls(na)}">${pct(na / CAPITAL, 3)}</span> · 1.1 <span class="${cls(nb)}">${pct(nb / CAPITAL, 3)}</span> · écart 1.1 − 1.0 <span class="${cls(d)}">${sgn(d, v => nf(v, 2))} €</span>`;
  const t1 = Math.max(la.ts, lb.ts), lo = t1 - eqWin * H;
  const pa = A.courbe.filter(q => q.ts >= lo), pb = B.courbe.filter(q => q.ts >= lo), all = [...pa, ...pb];
  if (all.length < 2) { $('eq').innerHTML = `<div class="empty">courbe non significative (${all.length} point dans la fenêtre)</div>`; }
  else {
    const t0 = Math.min(...all.map(q => q.ts)), vs = all.map(q => q.equity), v0 = Math.min(...vs, CAPITAL) - 0.5, v1 = Math.max(...vs, CAPITAL) + 0.5;
    const Xp = t => (t - t0) / ((t1 - t0) || 1) * 296 + 2, Yp = v => 104 - (v - v0) / ((v1 - v0) || 1) * 98;
    const ln = (pts, c, dash) => pts.length > 1 ? `<polyline points="${svgLine(pts, Xp, Yp)}" fill="none" stroke="${c}" stroke-width="2" ${dash ? 'stroke-dasharray="5 3"' : ''} vector-effect="non-scaling-stroke"/>`
      : pts.length ? `<circle cx="${Xp(pts[0].ts)}" cy="${Yp(pts[0].equity)}" r="3.5" fill="${c}"/>` : '';
    $('eq').innerHTML = `<svg viewBox="0 0 300 110" preserveAspectRatio="none"><line x1="0" x2="300" y1="${Yp(CAPITAL)}" y2="${Yp(CAPITAL)}" stroke="#3a4656" stroke-dasharray="4"/>${ln(pa, BCOL[U10])}${ln(pb, BCOL[U11], 1)}</svg>`;
  }
  const s10 = X.uiBook && X.uiBook.stats_clos, s11 = X.ui11 && X.ui11.stats_clos;
  const nOpen = c => c.positions.filter(x => x.status === 'ouverte').length, nRej = b => (D.ui && D.ui.carnets && D.ui.carnets[b] && D.ui.carnets[b].ordres_rejetes || []).length;
  const row = (t, a, b) => `<tr><td class="l">${t}</td><td>${a}</td><td>${b}</td></tr>`;
  $('capNote').innerHTML = `<table class="cmp"><tr><th class="l"></th><th>${book(U10)}</th><th>${book(U11)}</th></tr>` +
    row('Positions max', '3', '5') + row('Positions ouvertes', nOpen(A), nOpen(B)) +
    row('Trades clos', s10 ? s10.n_clos : ABS('non publié'), s11 ? s11.n_clos : ABS('non publié')) +
    row('Frais cumulés', eur(la.fees_cum), eur(lb.fees_cum)) + row('Ordres rejetés publiés', D.ui ? nRej(U10) : ABS('non publié'), D.ui ? nRej(U11) : ABS('non publié')) +
    row('Départ', dhm(A.depart), dhm(B.depart)) + `</table>` +
    `<div>Même sélection Ultra v1.0, mêmes stops, taille, frais et reconstitution ; seule différence : 5 positions simultanées au lieu de 3. 1.1 a démarré à son premier cycle (pas de rattrapage) : comparer seulement depuis son départ. n &lt; 30 trades : aucune conclusion. Trait plein = 1.0, pointillé violet = 1.1.</div>`;
}
function renderCap(X) {
  if (capBk === 'cmp') return renderCmp(X);
  const ub = capBk === U11 ? X.u11 : X.ub;
  $('capT').textContent = capBk === U11 ? 'CAPITAL FICTIF ULTRA 1.1' : 'CAPITAL FICTIF ULTRA 1.0';
  if (capBk === U11 && !ub) {
    $('capV').innerHTML = ABS('carnet non publié'); $('capD').innerHTML = ''; $('eq').innerHTML = '';
    $('capNote').textContent = 'Le carnet ULTRA 1.1 apparaît à partir de son premier cycle (aucun rattrapage rétroactif).'; return;
  }
  const col = BCOL[capBk] || BCOL[U10];
  if (!ub || !ub.courbe.length) {
    $('capV').innerHTML = ABS(); $('capD').innerHTML = ''; $('eq').innerHTML = `<div class="empty">courbe : donnée absente</div>`;
    $('capNote').textContent = 'Carnet fictif Ultra non publié (paper10.json absent).'; return;
  }
  const l = ub.courbe[ub.courbe.length - 1], net = l.equity - CAPITAL;
  $('capV').textContent = nf(l.equity, 2) + ' €';
  $('capD').innerHTML = `<span class="${cls(net)}">${pct(net / CAPITAL, 3)}</span> &nbsp; <span class="${cls(net)}">${sgn(net, v => nf(v, 2))} €</span> <span class="mut">vs 1 000 € fictifs</span>`;
  const pts = ub.courbe.filter(q => q.ts >= l.ts - eqWin * H);
  if (pts.length < 2) {
    $('eq').innerHTML = `<svg viewBox="0 0 300 110" preserveAspectRatio="none"><line x1="0" x2="300" y1="55" y2="55" stroke="#3a4656" stroke-dasharray="4"/><circle cx="296" cy="55" r="4" fill="${col}"/></svg>
      <div class="empty">courbe non significative (${pts.length} point${pts.length > 1 ? 's' : ''} dans la fenêtre ; ${ub.courbe.length} au total) — un point par cycle de 2 h</div>`;
  } else {
    const t0 = pts[0].ts, t1 = pts[pts.length - 1].ts, vs = pts.map(q => q.equity);
    const v0 = Math.min(...vs, CAPITAL) - 0.5, v1 = Math.max(...vs, CAPITAL) + 0.5;
    const Xp = t => (t - t0) / ((t1 - t0) || 1) * 296 + 2, Yp = v => 104 - (v - v0) / ((v1 - v0) || 1) * 98;
    const line = pts.map(q => Xp(q.ts).toFixed(1) + ',' + Yp(q.equity).toFixed(1)).join(' ');
    $('eq').innerHTML = `<svg viewBox="0 0 300 110" preserveAspectRatio="none"><defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".45"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
      <line x1="0" x2="300" y1="${Yp(CAPITAL)}" y2="${Yp(CAPITAL)}" stroke="#3a4656" stroke-dasharray="4"/>
      <polygon points="${Xp(t0)},108 ${line} ${Xp(t1)},108" fill="url(#eqg)"/><polyline points="${line}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  }
  $('capNote').innerHTML = `Liquide ${eur(l.cash)} · engagé (ordres/positions) ${eur(l.equity - l.cash)} · frais cumulés ${eur(l.fees_cum)} · ${ub.courbe.length} point(s) depuis le ${dhm(ub.depart)} · pointillé = 1 000 €${capBk === U11 ? ' · 5 positions max (1.0 : 3), même sélection Ultra v1.0' : ''}`;
}

function curveDD(courbe) {
  if (!courbe || courbe.length < 2) return null;
  let pk = courbe[0].equity, m = 0; for (const q of courbe) { pk = Math.max(pk, q.equity); m = Math.min(m, q.equity / pk - 1); } return m;
}

function renderKPI(X) {
  const is11 = capBk === U11, ub = is11 ? X.u11 : X.ub, uB = is11 ? X.ui11 : X.uiBook, st = uB && uB.stats_clos, hasUi = !!D.ui && !!D.ui.carnets, bl = is11 ? 'Ultra 1.1' : 'Ultra 1.0';
  const k = (t, v, i = '') => `<div class="k"><span>${t}</span>${v}${i ? `<i>${i}</i>` : ''}</div>`;
  const reason = f => st && st.raisons && st.raisons[f] ? st.raisons[f] : hasUi ? 'non calculable' : 'non publié';
  const closedPub = ub ? ub.positions.filter(x => x.status === 'fermee').length : null;
  let h = '';
  h += k('Trades clos', st ? `<b>${st.n_clos}</b>` : closedPub != null ? `<b>${closedPub}</b>` : `<b class="abs">donnée absente</b>`,
         st ? (st.n_clos < (D.ui.n_min_conclusion || 30) ? `n &lt; ${D.ui.n_min_conclusion || 30} : non concluant` : 'descriptif') : `carnet ${bl} (30 derniers publiés)`);
  h += k('Win rate', st && ok(st.taux_reussite) ? `<b>${nf(st.taux_reussite * 100, 0)} %</b>` : `<b class="abs">${esc(reason('taux_reussite'))}</b>`);
  h += k('Profit factor', st && ok(st.profit_factor) ? `<b>${nf(st.profit_factor, 2)}</b>` : `<b class="abs">${esc(reason('profit_factor'))}</b>`);
  const fees = st && ok(st.frais_totaux) ? st.frais_totaux : ub && ub.courbe.length ? ub.courbe[ub.courbe.length - 1].fees_cum : null;
  h += k('Frais', ok(fees) ? `<b>${nf(fees, 2)} €</b>` : `<b class="abs">donnée absente</b>`, `payés (fictifs), carnet ${bl}`);
  let dd = st ? st.max_baisse : curveDD(ub && ub.courbe), ddWhy = st ? reason('max_baisse') : ub ? `non significatif (${ub.courbe.length} point${ub.courbe.length > 1 ? 's' : ''})` : 'donnée absente';
  const npts = st ? st.n_points_courbe : ub ? ub.courbe.length : 0;
  h += k('Max drawdown', ok(dd) ? `<b class="${dd < 0 ? 'r' : ''}">${pct(dd)}</b>` : `<b class="abs">${esc(ddWhy)}</b>`, ok(dd) && npts < 12 ? `${npts} points de courbe : peu significatif` : 'sur la courbe d\'équité');
  const bt = st && st.meilleur_trade;
  h += k('Meilleur trade', bt ? `<b class="${cls(bt.pnl)}">${sgn(bt.pnl, v => nf(v, 2))} €</b>` : `<b class="abs">${esc(reason('meilleur_trade'))}</b>`, bt ? esc(bt.market) : '');
  $('kpi').innerHTML = h;
}

function renderNext() {
  const now = Date.now(), n = nextCycle(now), s = Math.max(0, Math.round((n - now) / 1000));
  $('cd').textContent = [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(x => String(x).padStart(2, '0')).join(':');
  const lr = D.status && D.status.derniers_cycles && D.status.derniers_cycles[0];
  $('nxNote').innerHTML = `Prévu à ${hm(n)} (Paris) — prévu (cron), GitHub peut retarder ou sauter.<br>Dernier cycle : ${lr ? `${dhm(lr.debut)} · ${nf(lr.duree_s, 0)} s · ${lr.erreurs.length} erreur(s)` : ABS()}`;
  $('clock').textContent = new Date(now).toLocaleTimeString('fr-FR', {timeZone: TZ, hour: '2-digit', minute: '2-digit'});
}

function renderMkt(X) {
  $('mktCnt').textContent = X.retenu != null ? `${X.retenu} retenus / ${X.nEur ?? '?'} EUR` : '';
  const sel = new Set(X.c0 ? X.c0.selected : []);
  let h = '';
  if (mktTab === 'TOUS') {
    const top = D.wide && D.wide.top_hausse_24h;
    if (!top) { $('mkt').innerHTML = ABS(); return; }
    const mx = Math.max(...top.map(t => t.last / t.open - 1), 0.01);
    h = `<div class="mrow hd"><span>SYMBOLE</span><span class="n">VAR. 24 H</span><span class="n">SCORE A</span></div>` + top.map(t => {
      const ch = t.last / t.open - 1, a = (X.byM[t.market] || {})['U-A'];
      return `<div class="mrow ${sel.has(t.market) ? 'sel' : ''}"><span class="sym">${coin(t.market)}${esc(base(t.market))}${sel.has(t.market) ? ' <span class="badge ul">SÉL.</span>' : ''}</span>
        <span class="n ${cls(ch)}"><span class="bar" style="width:${Math.max(4, ch / mx * 26)}px;background:${ch >= 0 ? '#22f08a' : '#ff4d5e'}"></span>${pct(ch)}</span>
        <span class="n">${a && ok(a.obs.score) ? nf(a.obs.score, 1) : '<span class="mut" title="analysé uniquement pour les marchés retenus en profondeur">—</span>'}</span></div>`;
    }).join('') + `<div class="note">Top 15 hausses 24 h publiées (ticker du ${dhm(D.wide.instantanes[0] && D.wide.instantanes[0].ts)}). Score A = score de détection Ultra, publié seulement pour les ${X.c0 ? X.c0.n_deep : '?'} marchés analysés en profondeur (— = non publié). Pas d'historique de prix publié : pas de mini-courbe.</div>`;
  } else {
    const e = D.signals && D.signals.evaluations && D.signals.evaluations[0];
    if (!e) { $('mkt').innerHTML = ABS('aucune évaluation publiée'); return; }
    const L = e.selections[mktTab] || [];
    h = `<div class="mrow hd"><span>SÉLECTION ${esc(mktTab.replace('_liquidite', ''))}</span><span class="n">1 H BRUT</span><span class="n">EXCÈS 1 H</span></div>` +
      (L.length ? L.map(s => { const o = s.suite && s.suite['1h']; return `<div class="mrow"><span class="sym">${coin(s.market)}${esc(base(s.market))}${s.nouveau ? ' <span class="badge ul">NOUV.</span>' : ''}</span>
        <span class="n ${o ? cls(o.ret) : ''}">${o ? pct(o.ret) : '<span class="mut">en attente</span>'}</span><span class="n ${o ? cls(o.excess) : ''}">${o ? pct(o.excess) : '<span class="mut">—</span>'}</span></div>`; }).join('')
        : `<div class="note">abstention (aucune sélection)</div>`) +
      `<div class="note">Bougie du ${dhm(e.t)} · statut ${esc(e.statut)} · ${e.n_marches} marchés, ${e.n_eligibles} éligibles. Rendements à terme prospectifs, n ≪ 30 : non concluant.</div>`;
  }
  $('mkt').innerHTML = h;
}

const VORD = {selectionner: 0, surveiller: 1, rejeter: 2, non_evaluable: 3};
const VLBL = {selectionner: 'SÉLECTIONNÉ', surveiller: 'SURVEILLER', rejeter: 'REJETÉ', non_evaluable: 'NON ÉVALUABLE'};
function renderOpp(X) {
  const ms = Object.entries(X.byM).filter(([m, f]) => m !== '*cycle*' && f['U-F']);
  if (!X.c0) { $('opp').innerHTML = ABS('aucune passe Ultra publiée'); return; }
  if (!ms.length) { $('opp').innerHTML = `<div class="note">Aucun marché analysé en profondeur au dernier cycle (${X.c0.n_anomalies} anomalie(s)).</div>`; return; }
  const SEL = new Set(X.c0.selected), vk = ([m, f]) => f['U-F'].verdict === 'selectionner' ? (SEL.has(m) ? 0 : 0.5) : (VORD[f['U-F'].verdict] ?? 9);
  ms.sort((a, b) => vk(a) - vk(b) || ((b[1]['U-A'] || {}).obs || {}).score - ((a[1]['U-A'] || {}).obs || {}).score);
  $('opp').innerHTML = ms.map(([m, f]) => {
    const a = (f['U-A'] || {}).obs || {}, v = f['U-F'].verdict, e = ((f['U-E'] || {}).obs || {}).objections || [], hors = v === 'selectionner' && !SEL.has(m);
    return `<div class="oc">${coin(m)}<div><div class="nm">${esc(base(m))}</div><div class="sm">z 24 h ${ok(a.z24) ? nf(a.z24, 1) : '—'} · vol. ${ok(a.vq) ? nf(a.vq, 0) + ' €' : '—'}${e.length ? ` · ${e.length} objection(s) E` : ''}</div></div>
      <div class="rt"><div class="pc ${cls(a.chg24)}">${ok(a.chg24) ? pct(a.chg24) : '—'}</div>${hors ? '<span class="badge horssel" title="Verdict F favorable mais hors sélection finale : plafond de sélections du cycle atteint">F OK · HORS SÉL.</span>' : `<span class="badge ${esc(v)}">${VLBL[v] || esc(v)}</span>`}</div></div>`;
  }).join('') + `<div class="note">Verdicts de la synthèse F du cycle de ${hm(X.c0.ts)} (Paris) ; « hors sél. » = verdict F favorable mais au-delà du plafond de sélections du cycle. Une sélection n'est pas une recommandation ; aucun avantage démontré.</div>`;
}

const SLBL = {ouvert: ['Ouvert', ''], rempli: ['Rempli (maker)', 'okk'], rempli_taker: ['Rempli (taker)', 'okk'], rejete: ['Rejeté', 'bad'],
  partiel_puis_abandon: ['Partiel puis abandonné', 'part'], non_rempli: ['Non rempli, abandonné', 'bad']};
const stLbl = s => SLBL[s] || [String(s).replace(/_/g, ' '), 'part'];
function renderOrders() {
  const p = D.paper10;
  if (!p) { $('ord').innerHTML = `<tr><td>${ABS()}</td></tr>`; $('ordCnt').textContent = ''; $('ordNote').textContent = ''; return; }
  const rows = Object.entries(p.carnets).filter(([b]) => pass(ordFilter, grp(b))).flatMap(([b, c]) => c.ordres.map(o => ({b, ...o})));
  rows.sort((a, b) => (a.status !== 'ouvert') - (b.status !== 'ouvert') || b.created_ts - a.created_ts);
  const open = rows.filter(r => r.status === 'ouvert');
  $('ordCnt').textContent = `(${open.length} ouvert${open.length > 1 ? 's' : ''})`;
  $('ord').innerHTML = `<tr><th>Symbole</th><th class="l hm">Carnet</th><th class="l">Statut</th><th>Rempli</th><th>Prix limite</th><th class="hm">Montant</th><th class="hm">Âge</th><th class="hm">Type</th></tr>` +
    (rows.slice(0, 12).map(o => { const [t, c] = stLbl(o.status), age = o.status === 'ouvert' ? dur((Date.now() - o.created_ts) / 1000) : '<span class="mut" title="ordre clos">clos</span>';
      const why = o.status === 'rejete' ? rejWhy(o.b, o.market, o.created_ts) : null;
      const exp = D.ui && D.ui.carnets && D.ui.carnets[o.b] && Array.isArray(D.ui.carnets[o.b].ordres_rejetes);   // export du motif présent dans ce cycle ?
      const whyH = o.status === 'rejete' ? `<div class="why">${why ? 'rejeté : ' + esc(why) : exp ? 'motif non enregistré' : 'motif non publié (ui.json sans motifs de rejet)'}</div>` : '';
      return `<tr><td><span class="sym">${coin(o.market)}${esc(base(o.market))}</span><div class="sm-only">${book(o.b)}</div></td><td class="l hm">${book(o.b)}</td>
      <td class="l"><span class="st ${c}">${esc(t)}</span>${whyH}<div class="sm-only mut sub">${o.status === 'ouvert' ? 'âge ' + age : age}</div></td><td>${o.qty ? nf(o.filled_qty / o.qty * 100, 0) + ' %' : '—'}</td><td>${px(o.limit_px)}</td><td class="hm">${eur(o.qty * o.limit_px)}</td>
      <td class="hm">${age}</td><td class="g hm">Achat limite</td></tr>`; }).join('')
    || `<tr><td colspan="8" class="mut">aucun ordre fictif${ordFilter !== 'all' ? ' pour ce filtre' : ''}</td></tr>`);
  $('ordNote').textContent = 'Statut constaté au dernier cycle (pas de suivi en direct entre deux cycles) ; remplissages reconstruits après coup à partir des transactions publiques. Âge = depuis la création, ordres ouverts seulement. Montant = quantité demandée × prix limite, hors frais ; Rempli = part exécutée. Motif d\'un rejet = texte enregistré par le moteur au moment de l\'ordre (rien n\'est déduit). ULTRA 1.1 = même sélection qu\'ULTRA 1.0, 5 positions max au lieu de 3. BTC réf. = carnet de référence « achat et conservation », pas Ultra.';
}

function renderPos(X) {
  const p = D.paper10, ui = D.ui && D.ui.carnets;
  if (!p) { $('pos').innerHTML = `<tr><td>${ABS()}</td></tr>`; $('posCnt').textContent = ''; $('posNote').textContent = ''; return; }
  const rows = Object.entries(p.carnets).filter(([b]) => pass(posFilter, grp(b))).flatMap(([b, c]) => c.positions.filter(x => x.status === 'ouverte').map(x => ({b, ...x})));
  $('posCnt').textContent = `(${rows.length})`;
  const mk = (b, m) => ui && ui[b] ? (ui[b].positions_ouvertes || []).find(q => q.market === m) : null;
  $('pos').innerHTML = `<tr><th>Symbole</th><th class="l hm">Carnet</th><th>Entrée</th><th>Marquage</th><th>P&amp;L net</th><th class="hm">P&amp;L %</th><th class="hm">Statut</th></tr>` +
    (rows.map(x => { const q = mk(x.b, x.market);
      const mp = q ? (ok(q.marquage.prix) ? `${px(q.marquage.prix)}<div class="mut" style="font-size:9.5px">${q.marquage.source === 'bougie_1h_close' ? 'clôture 1 h' : 'ticker'} ${hm(q.marquage.ts)}</div>` : ABS('prix absent')) : ABS('non publié');
      return `<tr><td><span class="sym">${coin(x.market)}${esc(base(x.market))}</span><div class="sm-only">${book(x.b)}</div>${x.label ? `<div class="mut sub">${esc(x.label)}</div>` : ''}</td><td class="l hm">${book(x.b)}</td><td>${px(x.entry_px)}<div class="mut" style="font-size:9.5px">${dhm(x.entry_ts)}</div></td><td>${mp}</td>
        <td class="${q ? cls(q.pnl_latent_net) : ''}">${q ? (ok(q.pnl_latent_net) ? sgn(q.pnl_latent_net, v => nf(v, 2)) + ' €' : ABS('non calculable')) : ABS('non publié')}${q && ok(q.pnl_latent_net_pct) ? `<div class="sm-only" style="font-size:9.5px">${pct(q.pnl_latent_net_pct)}</div>` : ''}</td>
        <td class="hm ${q ? cls(q.pnl_latent_net_pct) : ''}">${q && ok(q.pnl_latent_net_pct) ? pct(q.pnl_latent_net_pct) : '—'}</td><td class="hm"><span class="st okk">Ouverte</span></td></tr>`; }).join('')
    || `<tr><td colspan="7" class="mut">aucune position ouverte${posFilter !== 'all' ? ' pour ce filtre' : ''}</td></tr>`);
  const nU = Object.values(p.carnets[U10] ? [p.carnets[U10]] : []).reduce((n, c) => n + c.positions.filter(x => x.status === 'ouverte').length, 0);
  const bh = p.carnets.btc_hold && p.carnets.btc_hold.courbe.slice(-1)[0];
  $('posNote').innerHTML = `${nU ? '' : '<b>Ultra 1.0 : aucune position ouverte.</b> '}P&amp;L net latent = estimation au prix de marquage, après frais d'entrée réels et frais de sortie taker estimés (${D.ui && D.ui.frais_sortie_estimes ? nf(D.ui.frais_sortie_estimes.taux * 100, 2) + ' %' : 'non publié'}).` +
    (bh ? ` Équité du carnet BTC réf. au cycle : ${eur(bh.equity)} (${sgn(bh.equity - CAPITAL, v => nf(v, 2))} €, sans frais de sortie).` : '');
}

const KIND = {ordre_ouvert: [4, 'ordre fictif ouvert'], ordre_rempli: [4, 'ordre rempli (maker)'], ordre_rempli_taker: [4, 'ordre rempli (taker)'],
  ordre_rejete: [4, 'ordre rejeté'], ordre_partiel_puis_abandon: [4, 'ordre partiellement rempli puis abandonné'], ordre_non_rempli: [4, 'ordre non rempli, abandonné'], achat_reference: [4, 'achat de référence'], position_ouverte: [5, 'position ouverte'], position_fermee: [5, 'position fermée'],
  signal_perime: [4, 'signal périmé'], cycle_manque: [-1, 'cycle manqué'], trou_bougies: [-1, 'trou de bougies'], carnet_indisponible: [-1, 'carnet indisponible'],
  incertain_donnees_absentes: [5, 'incertain : données absentes'], sortie_reportee_carnet_indisponible: [5, 'sortie reportée']};
function events(X) {
  const L = [], u = D.ultra10;
  const hist = D.ui && D.ui.journal_ultra && D.ui.journal_ultra.cycles || [];
  (u && u.cycles || []).forEach((c, i) => {
    const hj = hist.find(h => h.ts === c.ts), e = i === 0 ? {n: X.verif, o: X.objections} : hj && hj.verdicts_par_fonction && hj.verdicts_par_fonction['U-E'] ? {n: Object.values(hj.verdicts_par_fonction['U-E']).reduce((a, b) => a + b, 0), o: hj.verdicts_par_fonction['U-E'].objection || 0} : null;
    L.push({ts: c.snapshot_ts, s: 0, b: 'ultra', t: `${i === 0 && X.retenu != null ? X.retenu + ' marchés retenus, ' : ''}${c.n_anomalies} anomalie(s) détectée(s)`});
    L.push({ts: c.ts, s: 1, b: 'ultra', t: `${c.n_deep} marché(s) analysé(s) en profondeur`});
    if (e) L.push({ts: c.ts + 1, s: 2, b: 'ultra', t: `${e.n} vérifié(s), ${e.o} objection(s)`});
    L.push({ts: c.ts + 2, s: 3, b: 'ultra', t: c.selected.length ? `${c.selected.map(base).join(', ')} sélectionné(s)` : 'aucune sélection'});
  });
  const pev = [...(D.paper10 && D.paper10.evenements || []), ...(D.paper10 && D.paper10.carnets && D.paper10.carnets[U11] && D.paper10.carnets[U11].evenements || [])];
  pev.forEach(e => { const [s, t] = KIND[e.kind] || (e.kind.startsWith('ordre_') ? [4, e.kind.replace(/_/g, ' ')] : e.kind.startsWith('position_') ? [5, e.kind.replace(/_/g, ' ')] : [-1, e.kind.replace(/_/g, ' ')]);
    const why = e.kind === 'ordre_rejete' ? rejWhy(e.book, e.market, e.ts) : null;
    L.push({ts: e.ts + 3, s, b: grp(e.book), t: `${t}${e.market ? ' ' + base(e.market) : ''} (${(BOOKLBL[e.book] || [e.book])[0]})${why ? ' — ' + why : ''}${/reconstruit après coup/.test(e.detail || '') ? ' · reconstruit après coup' : ''}`}); });
  (D.status && D.status.derniers_cycles || []).forEach(r => L.push({ts: r.debut, s: -1, b: 'sys', t: `cycle GitHub : ${nf(r.duree_s, 0)} s, ${r.appels_api} appels API, ${r.erreurs.length} erreur(s)`}));
  return L.sort((a, b) => b.ts - a.ts);
}
function renderEv(X) {
  // les étapes de la passe Ultra (sélection commune) apparaissent sous ULTRA 1.0 et ULTRA 1.1
  const L = events(X).filter(e => evFilter === 'all' || e.b === evFilter || (e.b === 'ultra' && (evFilter === 'u10' || evFilter === 'u11')));
  $('ev').innerHTML = L.slice(0, 40).map(e => { const S = STEPS[e.s] || {k: 'SYSTÈME', c: '#8a97ad'};
    return `<div class="evr"><span class="t">${hm(e.ts)}</span><span class="s" style="color:${S.c}">● ${S.k}</span><span>${esc(e.t)}</span></div>`; }).join('')
    || `<div class="note">${D.status ? 'aucun événement' : 'donnée absente — en attente du premier cycle'}</div>`;
}

/* ---------------- scène : nœuds + galaxie ---------------- */
let NODES = [], replay = {t0: 0, active: false, label: ''};
function wide() { const s = $('scene'); return s.clientWidth / Math.max(1, s.clientHeight) > 1.15; }
function buildNodes() {
  const wrap = $('nodes'); wrap.innerHTML = '';
  NODES = STEPS.map((s, i) => { const d = document.createElement('div'); d.className = 'node';
    d.style.setProperty('--c', s.c); d.style.setProperty('--d', (-i * 0.7) + 's');
    d.innerHTML = `<img src="assets/${s.img}.webp" alt="${s.k}" width="206" height="313" decoding="async"><div class="lbl"><b style="color:${s.c}">${s.k}</b><span class="f1">…</span><span class="f2"></span></div>`;
    wrap.appendChild(d); return d; });
  placeNodes();
}
function placeNodes() {
  const w = wide(), P = w ? POS_W : POS_S, sc = $('scene');
  const sz = w ? Math.min(sc.clientWidth * 0.13, sc.clientHeight * 0.2) : sc.clientWidth * 0.19;
  NODES.forEach((d, i) => { d.style.left = P[i][0] + '%'; d.style.top = P[i][1] + '%'; d.style.setProperty('--sz', sz + 'px'); });
}
let FIG = STEPS.map(() => ['…', '']);
function setFigures(X) {
  const F = FIG = stepFigures(X);
  NODES.forEach((d, i) => { d.querySelector('.f1').textContent = F[i][0]; d.querySelector('.f2').textContent = F[i][1]; });
}
function startReplay() {
  const c0 = D.ultra10 && D.ultra10.cycles && D.ultra10.cycles[0];
  const el = $('replay');
  if (!c0) { replay.active = false; NODES.forEach(n => n.className = 'node'); el.className = 'replay'; el.textContent = 'Aucun cycle enregistré — rien à rejouer'; return; }
  const lc = D.status && D.status.derniers_cycles && D.status.derniers_cycles[0], lt = lc ? lc.debut : c0.ts;
  replay.when = `${hm(lt)} (Paris)` + (Math.abs(c0.ts - lt) > 10 * 60e3 ? ` · dernière passe Ultra ${hm(c0.ts)}` : '');
  replay.label = `Rejeu du dernier cycle — ${replay.when}`;
  if (RM) { replay.active = false; el.className = 'replay'; el.textContent = `Dernier cycle — ${replay.when} · animations réduites`; return; }
  replay.t0 = performance.now(); replay.active = true; replay.pending = !G.run; el.className = 'replay live'; el.textContent = replay.label;
}
const STEP_MS = 1700;
function replayTick(now) {
  if (!replay.active) return -1;
  if (replay.pending) { replay.pending = false; replay.t0 = now; }     // le rejeu démarre quand la scène devient visible
  const ph = Math.max(0, (now - replay.t0) / STEP_MS);
  if (ph >= STEPS.length + 0.4) {
    replay.active = false; NODES.forEach(n => n.className = 'node');
    const c0 = D.ultra10.cycles[0]; $('replay').className = 'replay';
    $('replay').textContent = `Au repos · dernier cycle ${replay.when} · aucune activité en direct entre deux cycles`; return -1;
  }
  const cur = Math.max(0, Math.min(STEPS.length - 1, Math.floor(ph)));
  NODES.forEach((n, i) => n.className = 'node' + (i === cur ? ' on' : i > cur ? ' dim' : ''));
  const F = FIG;
  $('replay').textContent = `${replay.label} · ${STEPS[cur].k} : ${F[cur][0]}`;
  return ph;
}

const G = {cv: null, ctx: null, w: 0, h: 0, dpr: 1, spr: null, glow: null, planets: [], rot: 0, last: 0, run: false, vis: true, frames: 0, fpsT: 0, fps: 0, mobile: false};
function rnd(a, b) { return a + Math.random() * (b - a); }
function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
function sprite(R, n) {           // galaxie spirale pré-rendue (une fois) : dessinée ensuite par rotation, très peu coûteux
  const c = document.createElement('canvas'); c.width = c.height = Math.ceil(R * 2); const x = c.getContext('2d');
  x.globalCompositeOperation = 'lighter';
  const arms = 3;
  for (let i = 0; i < n * 0.08; i++) {       // nuages de poussière lumineuse
    const r = Math.pow(Math.random(), 0.7) * R * 0.9, a = (i % arms) * 2 * Math.PI / arms + r / R * 3.6 + gauss() * 0.3;
    const X = R + Math.cos(a) * r, Y = R + Math.sin(a) * r, s = rnd(R * 0.05, R * 0.14);
    const g = x.createRadialGradient(X, Y, 0, X, Y, s); const hue = r < R * 0.3 ? 32 : r < R * 0.6 ? 290 : 220;
    g.addColorStop(0, `hsla(${hue},95%,60%,0.10)`); g.addColorStop(1, `hsla(${hue},95%,50%,0)`); x.fillStyle = g; x.fillRect(X - s, Y - s, s * 2, s * 2);
  }
  for (let i = 0; i < n; i++) {
    const r = Math.pow(Math.random(), 0.55) * R * 0.96, a = (i % arms) * 2 * Math.PI / arms + r / R * 3.6 + gauss() * (0.25 + 0.25 * (1 - r / R));
    const X = R + Math.cos(a) * r, Y = R + Math.sin(a) * r, q = r / R;
    const hue = q < 0.22 ? rnd(28, 48) : q < 0.5 ? rnd(300, 330) : q < 0.75 ? rnd(260, 290) : rnd(195, 225);
    x.fillStyle = `hsla(${hue},100%,${rnd(62, 85)}%,${rnd(0.35, 0.95)})`; const s = rnd(0.5, 1.7) * G.dpr;
    x.fillRect(X, Y, s, s);
  }
  // anneau d'accrétion chaud autour du cœur (comme la maquette)
  for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(R, R, R * (0.17 + k * 0.035), 0, Math.PI * 2); x.strokeStyle = `hsla(${30 + k * 8},100%,60%,${0.22 - k * 0.05})`; x.lineWidth = R * 0.03; x.stroke(); }
  return c;
}
function planetSprite(r, hue) {
  const c = document.createElement('canvas'); c.width = c.height = Math.ceil(r * 2 + 4); const x = c.getContext('2d'), m = r + 2;
  const g = x.createRadialGradient(m - r * 0.35, m - r * 0.35, r * 0.1, m, m, r);
  g.addColorStop(0, `hsl(${hue},70%,72%)`); g.addColorStop(0.55, `hsl(${hue},55%,38%)`); g.addColorStop(1, `hsl(${hue},60%,8%)`);
  x.fillStyle = g; x.beginPath(); x.arc(m, m, r, 0, 7); x.fill();
  x.strokeStyle = `hsla(${hue},100%,75%,.55)`; x.lineWidth = Math.max(1, r * 0.08); x.beginPath(); x.arc(m, m, r, -2.2, -0.6); x.stroke();
  return c;
}
function sizeGal() {
  const cv = G.cv, sc = $('scene'); G.mobile = innerWidth < 760;
  G.dpr = Math.min(window.devicePixelRatio || 1, G.mobile ? 1.5 : 2);   // téléphone : 1,5 suffit pour une galaxie floue, divise le nombre de pixels par ~1,8
  G.w = Math.round(sc.clientWidth * G.dpr); G.h = Math.round(sc.clientHeight * G.dpr); cv.width = G.w; cv.height = G.h;
  const R = Math.min(G.w, G.h) * (wide() ? 0.62 : 0.5);
  G.R = R; G.spr = sprite(R, G.mobile ? 2200 : 5200);
  const gl = document.createElement('canvas'); gl.width = gl.height = Math.ceil(R * 0.8); const x = gl.getContext('2d'), m = gl.width / 2;
  const g = x.createRadialGradient(m, m, 0, m, m, m); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.12, 'rgba(255,200,90,.85)');
  g.addColorStop(0.35, 'rgba(255,120,40,.28)'); g.addColorStop(1, 'rgba(120,40,160,0)'); x.fillStyle = g; x.fillRect(0, 0, gl.width, gl.width); G.glow = gl;
  const hues = [210, 25, 280, 160, 330, 45, 190, 0];
  G.planets = hues.slice(0, G.mobile ? 5 : 8).map((h, i) => ({spr: planetSprite(Math.min(G.w, G.h) * rnd(0.012, 0.03), h), a: rnd(0, 7), rx: rnd(0.3, 0.52), ry: rnd(0.18, 0.4), sp: rnd(0.01, 0.03) * (i % 2 ? 1 : -1)}));
  placeNodes();
}
function nodeXY(i) { const P = wide() ? POS_W : POS_S; return [P[i][0] / 100 * G.w, P[i][1] / 100 * G.h]; }
function curve(i, j) {
  const [x1, y1] = nodeXY(i), [x2, y2] = nodeXY(j), cx = G.w / 2, cy = G.h / 2, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return [x1, y1, mx + (mx - cx) * 0.28, my + (my - cy) * 0.28, x2, y2];
}
const qpt = (c, t) => [(1 - t) * (1 - t) * c[0] + 2 * (1 - t) * t * c[2] + t * t * c[4], (1 - t) * (1 - t) * c[1] + 2 * (1 - t) * t * c[3] + t * t * c[5]];
function drawLink(x, i, j, alpha, prog) {
  const c = curve(i, j), d = G.dpr, g = x.createLinearGradient(c[0], c[1], c[4], c[5]);
  g.addColorStop(0, STEPS[i].c); g.addColorStop(1, STEPS[j].c);
  x.strokeStyle = g; x.globalAlpha = alpha * 0.35; x.lineWidth = 6 * d; x.beginPath(); x.moveTo(c[0], c[1]); x.quadraticCurveTo(c[2], c[3], c[4], c[5]); x.stroke();
  x.globalAlpha = alpha; x.lineWidth = 1.6 * d; x.stroke();
  const [ax, ay] = qpt(c, 0.56), [bx, by] = qpt(c, 0.6), an = Math.atan2(by - ay, bx - ax);      // flèche
  x.fillStyle = STEPS[j].c; x.beginPath(); x.moveTo(bx + Math.cos(an) * 6 * d, by + Math.sin(an) * 6 * d);
  x.lineTo(bx + Math.cos(an + 2.5) * 6 * d, by + Math.sin(an + 2.5) * 6 * d); x.lineTo(bx + Math.cos(an - 2.5) * 6 * d, by + Math.sin(an - 2.5) * 6 * d); x.fill();
  if (prog != null) for (let k = 0; k < 8; k++) {            // impulsion lumineuse qui parcourt le lien pendant le rejeu
    const t = prog - k * 0.03; if (t < 0 || t > 1) continue; const [px2, py2] = qpt(c, t);
    x.globalAlpha = (1 - k / 8) * alpha; x.fillStyle = k ? STEPS[j].c : '#fff'; x.beginPath(); x.arc(px2, py2, (4 - k * 0.35) * d, 0, 7); x.fill();
  }
  x.globalAlpha = 1;
}
function frame(now) {
  if (!G.run) return;
  requestAnimationFrame(frame);
  const dt = now - G.last; if (dt < 31) return;          // plafond ~30 i/s (rotation lente : suffisant, divise le coût CPU par 2)
  G.last = now; G.frames++; if (now - G.fpsT > 1000) { G.fps = G.frames * 1000 / (now - G.fpsT); G.frames = 0; G.fpsT = now; window.__fps = Math.round(G.fps); }
  draw(now, Math.min(dt, 100) / 1000);
}
function draw(now, dts) {
  const x = G.ctx, w = G.w, h = G.h, cx = w / 2, cy = h / 2;
  x.clearRect(0, 0, w, h);
  G.rot += dts * 0.035;
  x.save(); x.translate(cx, cy); x.scale(1, wide() ? 0.62 : 0.7); x.rotate(G.rot); x.drawImage(G.spr, -G.R, -G.R); x.restore();
  const gs = G.glow.width * (1 + 0.04 * Math.sin(now / 1500)); x.globalCompositeOperation = 'lighter'; x.drawImage(G.glow, cx - gs / 2, cy - gs / 2, gs, gs); x.globalCompositeOperation = 'source-over';
  G.planets.forEach(p => { p.a += p.sp * dts; const X = cx + Math.cos(p.a) * p.rx * w, Y = cy + Math.sin(p.a) * p.ry * h; x.drawImage(p.spr, X - p.spr.width / 2, Y - p.spr.height / 2); });
  const ph = replayTick(now);
  for (let i = 0; i < STEPS.length; i++) {
    const j = (i + 1) % STEPS.length, closing = j === 0;
    let a = closing ? 0.22 : 0.4, prog = null;
    if (ph >= 0) { if (ph > i + 1) a = closing ? 0.22 : 0.75; const f = ph - i - 0.45; if (!closing && f >= 0 && f <= 0.75) { prog = f / 0.75; a = 1; } }
    drawLink(x, i, j, a, prog);
  }
}
function startLoop() { if (G.run || RM || !G.vis || document.hidden) return; G.run = true; G.last = performance.now(); G.fpsT = G.last; G.frames = 0; requestAnimationFrame(frame); }
function stopLoop() { G.run = false; if (replay.active) replay.pending = true; }
function initGal() {
  G.cv = $('gal'); G.ctx = G.cv.getContext('2d'); sizeGal();
  if (RM) { draw(performance.now(), 0); }
  document.addEventListener('visibilitychange', () => document.hidden ? stopLoop() : startLoop());
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { G.vis = es[0].isIntersecting; G.vis ? startLoop() : stopLoop(); }).observe($('scene'));
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { sizeGal(); sky(); if (RM) draw(performance.now(), 0); }, 200); });
  startLoop();
}
function sky() {            // fond étoilé statique (dessiné une fois, aucune animation)
  const c = $('sky'), d = Math.min(window.devicePixelRatio || 1, 2), w = c.width = innerWidth * d, h = c.height = innerHeight * d, x = c.getContext('2d');
  x.fillStyle = '#03040a'; x.fillRect(0, 0, w, h);
  [[0.15, 0.2, '80,40,160'], [0.85, 0.75, '20,90,160'], [0.6, 0.1, '150,30,120']].forEach(([a, b, col]) => {
    const g = x.createRadialGradient(a * w, b * h, 0, a * w, b * h, Math.max(w, h) * 0.45); g.addColorStop(0, `rgba(${col},.22)`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const n = Math.min(900, (w * h) / (d * d) / 1600);
  for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${200 + Math.random() * 55},${210 + Math.random() * 45},255,${Math.random() * 0.8 + 0.1})`; const s = Math.random() < 0.06 ? 2 * d : d; x.fillRect(Math.random() * w, Math.random() * h, s, s); }
}

/* ---------------- chargement ---------------- */
async function load() {
  const names = ['status', 'wide', 'ultra10', 'paper10', 'signals', 'ui'];
  const r = await Promise.all(names.map(J)); names.forEach((n, i) => D[n] = r[i]);
  // ui.json n'est valable que s'il vient du même cycle que status.json (sinon : périmé, traité comme non publié)
  if (D.ui && (!D.status || !D.ui.genere || Math.abs(D.ui.genere - D.status.genere) > 15 * 60e3 || D.ui.erreur)) D.ui = null;
  const X = derive();
  const g = document.querySelector('.grid');
  let wb = $('waitBanner');
  if (!D.status) { if (!wb) { wb = document.createElement('div'); wb.id = 'waitBanner'; wb.className = 'wait'; wb.innerHTML = '<b>En attente du premier cycle GitHub.</b> Aucune donnée publiée : rien n\'est affiché tant que le cycle n\'a pas écrit ses propres données.'; g.parentNode.insertBefore(wb, g); } }
  else if (wb) wb.remove();
  const safe = (f, id) => { try { f(X); } catch (e) { if (id) $(id).innerHTML = ABS('erreur d\'affichage'); console.error(e); } };
  safe(renderFresh); safe(renderCap, 'capV'); safe(renderKPI, 'kpi'); safe(renderNext); safe(renderMkt, 'mkt'); safe(renderOpp, 'opp');
  safe(renderOrders, 'ord'); safe(renderPos, 'pos'); safe(renderEv, 'ev'); setFigures(X); startReplay();
  if (RM) draw(performance.now(), 0);
}
function tabs(id, attr, set) { $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
  [...$(id).children].forEach(c => c.classList.toggle('on', c === b)); set(b.dataset[attr]); }); }
tabs('eqTabs', 'w', v => { eqWin = +v; renderCap(derive()); });
tabs('mktTabs', 'k', v => { mktTab = v; renderMkt(derive()); });
$('evF').addEventListener('change', e => { evFilter = e.target.value; renderEv(derive()); });
$('ordF').addEventListener('change', e => { ordFilter = e.target.value; renderOrders(); });
$('posF').addEventListener('change', e => { posFilter = e.target.value; renderPos(derive()); });
tabs('capTabs', 'b', v => { capBk = v; const X = derive(); renderCap(X); renderKPI(X); });
sky(); buildNodes(); initGal(); load();
setInterval(() => { renderNext(); renderFresh(); }, 1000);
setInterval(load, 300000);
})();
