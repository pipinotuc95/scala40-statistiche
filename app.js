"use strict";
const MESI = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
const SEMI = ["♠", "♥", "♦", "♣"];
const rosso = s => s === "♥" || s === "♦";
const ALL = (window.PARTITE || []).slice()
  .sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));

// Il colore segue il giocatore (ordine di prima apparizione), mai la posizione in classifica.
const PLAYERS = [];
ALL.forEach(g => g.giocatori.forEach(p => { if (!PLAYERS.includes(p)) PLAYERS.push(p); }));
const col = p => { const i = PLAYERS.indexOf(p); return i >= 0 && i < 8 ? `var(--s${i + 1})` : "var(--muted)"; };
const seme = p => SEMI[Math.max(0, PLAYERS.indexOf(p)) % 4];

const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nome = s => (window.NOMI || {})[s] || s;
const nomi = list => list.map(nome).join(", ");
const NON_APERTA = 100;
const fmtDate = d => { const [y, m, g] = d.split("-"); return `${+g} ${MESI[+m - 1]} ${y}`; };
const shortDate = d => { const [y, m, g] = d.split("-"); return `${+g}/${+m}/${y.slice(2)}`; };
// "totali" (facoltativo) = punteggio finale scritto sul foglio, per le partite di cui non si hanno tutte le mani
const totals = g => g.totali ? g.totali.slice() : g.giocatori.map((_, i) => g.mani.reduce((s, m) => s + (Number(m[i]) || 0), 0));
const winners = g => { const t = totals(g), mn = Math.min(...t); return g.giocatori.filter((_, i) => t[i] === mn); };
const pct = (a, b) => b ? Math.round(a * 100 / b) + "%" : "–";
const num = (x, d = 1) => x.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });
const who = p => `<span class="who"><span class="dot" style="background:${col(p)}"></span>${esc(nome(p))}</span>`;

/* ---------------- statistiche ---------------- */
function stats(games) {
  const S = {};
  const get = p => S[p] || (S[p] = { p, partite: 0, vinte: 0, mani: 0, zeri: 0, punti: 0, peggio: 0, cento: 0, tot: 0 });
  games.forEach(g => {
    const w = winners(g), t = totals(g);
    g.giocatori.forEach((p, i) => {
      const s = get(p);
      s.partite++; s.tot += t[i]; if (w.includes(p)) s.vinte++;
      g.mani.forEach(m => {
        if (m[i] === null || m[i] === undefined) return; // mano non giocata
        const v = Number(m[i]) || 0;
        s.mani++; s.punti += v; if (v === 0) s.zeri++;
        if (v === NON_APERTA) s.cento++; else if (v > s.peggio) s.peggio = v;
      });
    });
  });
  return Object.values(S).sort((a, b) =>
    (b.vinte / b.partite) - (a.vinte / a.partite) || b.vinte - a.vinte || (a.punti / a.mani) - (b.punti / b.mani));
}

/* ---------------- grafici (SVG fatto a mano) ---------------- */
const NS = "http://www.w3.org/2000/svg";
function niceScale(max, ticks = 4) {
  max = Math.max(max, 1);
  const raw = max / ticks, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map(f => f * p).find(s => s >= raw)); // punti e vittorie sono interi
  return { step, max: Math.ceil(max / step) * step };
}
function tipBox(el) {
  let t = el.querySelector(".tip");
  if (!t) { t = document.createElement("div"); t.className = "tip"; el.appendChild(t); }
  return t;
}
function placeTip(el, tip, x, y) {
  tip.style.display = "block";
  const w = tip.offsetWidth, h = tip.offsetHeight, W = el.clientWidth;
  let left = x + 14; if (left + w > W) left = x - w - 14; if (left < 0) left = 0;
  tip.style.left = left + "px"; tip.style.top = Math.max(0, y - h / 2) + "px";
}

// Barre orizzontali: una per giocatore, estremità arrotondata solo dal lato del dato.
function barChart(el, rows, { fmt = v => v, tip = r => "" } = {}) {
  el.innerHTML = "";
  if (!rows.length) { el.innerHTML = '<p class="empty">Nessun dato</p>'; return; }
  const W = el.clientWidth || 400, bh = 22, gap = 12, L = 84, R = 44;
  const H = rows.length * (bh + gap) - gap + 4;
  const max = Math.max(...rows.map(r => r.v), 0) || 1;
  const iw = W - L - R;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("height", H);
  svg.setAttribute("role", "img");
  let html = `<line x1="${L}" x2="${L}" y1="0" y2="${H}" stroke="var(--axis)"/>`;
  rows.forEach((r, i) => {
    const y = i * (bh + gap), w = Math.max(0, r.v / max * iw), x0 = L + 1, x1 = x0 + w, rr = Math.min(4, w);
    const d = w > 0 ? `M${x0},${y}H${x1 - rr}A${rr},${rr} 0 0 1 ${x1},${y + rr}V${y + bh - rr}A${rr},${rr} 0 0 1 ${x1 - rr},${y + bh}H${x0}Z` : "";
    html += `<text class="lab" x="${L - 10}" y="${y + bh / 2 + 4}" text-anchor="end">${esc(nome(r.p))}</text>`;
    if (d) html += `<path d="${d}" fill="${col(r.p)}"/>`;
    html += `<text class="val" x="${x1 + 6}" y="${y + bh / 2 + 4}">${fmt(r.v)}</text>`;
    html += `<rect data-i="${i}" x="0" y="${y - gap / 2}" width="${W}" height="${bh + gap}" fill="transparent"/>`;
  });
  svg.innerHTML = html; el.appendChild(svg);
  const t = tipBox(el);
  svg.addEventListener("pointermove", e => {
    const i = e.target.dataset && e.target.dataset.i; if (i === undefined) { t.style.display = "none"; return; }
    const r = rows[+i]; const b = el.getBoundingClientRect();
    t.innerHTML = `<b>${esc(nome(r.p))}</b>${tip(r)}`;
    placeTip(el, t, e.clientX - b.left, e.clientY - b.top);
  });
  svg.addEventListener("pointerleave", () => t.style.display = "none");
}

// Linee: una per giocatore, crosshair e tooltip al passaggio del mouse/dito.
function lineChart(el, { x, xTitle = i => x[i], series, unit = "" }) {
  el.innerHTML = "";
  if (!x.length) { el.innerHTML = '<p class="empty">Nessun dato</p>'; return; }
  const W = el.clientWidth || 600, H = 250, m = { t: 10, r: 104, b: 28, l: 40 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b, n = x.length;
  const sc = niceScale(Math.max(...series.flatMap(s => s.values)));
  const X = i => m.l + (n <= 1 ? iw / 2 : i * iw / (n - 1));
  const Y = v => m.t + ih - v / sc.max * ih;

  const leg = document.createElement("div"); leg.className = "legend";
  leg.innerHTML = series.map(s => `<span><i style="background:${col(s.name)}"></i>${esc(nome(s.name))}</span>`).join("");
  el.appendChild(leg);

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("height", H);
  let h = "";
  for (let v = 0; v <= sc.max + 1e-9; v += sc.step) {
    h += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? "var(--axis)" : "var(--grid)"}"/>`;
    h += `<text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
  }
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 46))));
  x.forEach((lab, i) => {
    if (i % every === 0 || i === n - 1)
      h += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle">${esc(lab)}</text>`;
  });
  series.forEach(s => {
    const d = s.values.map((v, i) => `${i ? "L" : "M"}${X(i)},${Y(v)}`).join("");
    h += `<path d="${d}" fill="none" stroke="${col(s.name)}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  });
  // etichette dirette a fine linea, distanziate per non sovrapporsi
  if (series.length <= 4) {
    const ends = series.map(s => ({ s, y: Y(s.values[n - 1]) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
    ends.forEach(e => {
      h += `<circle cx="${X(n - 1)}" cy="${Y(e.s.values[n - 1])}" r="4" fill="${col(e.s.name)}" stroke="var(--surface)" stroke-width="2"/>`;
      h += `<text class="lab" x="${X(n - 1) + 10}" y="${e.y + 4}">${esc(nome(e.s.name))} ${e.s.values[n - 1]}</text>`;
    });
  }
  h += `<g class="hover" style="display:none"><line y1="${m.t}" y2="${m.t + ih}" stroke="var(--axis)"/>` +
    series.map(s => `<circle r="4" fill="${col(s.name)}" stroke="var(--surface)" stroke-width="2"/>`).join("") + `</g>`;
  h += `<rect x="${m.l - 10}" y="0" width="${iw + 20}" height="${H}" fill="transparent"/>`;
  svg.innerHTML = h; el.appendChild(svg);

  const hov = svg.querySelector(".hover"), line = hov.querySelector("line"), dots = hov.querySelectorAll("circle");
  const t = tipBox(el);
  svg.addEventListener("pointermove", e => {
    const b = svg.getBoundingClientRect(), sx = (e.clientX - b.left) * W / b.width;
    const i = n <= 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round((sx - m.l) / iw * (n - 1))));
    hov.style.display = ""; line.setAttribute("x1", X(i)); line.setAttribute("x2", X(i));
    series.forEach((s, k) => { dots[k].setAttribute("cx", X(i)); dots[k].setAttribute("cy", Y(s.values[i])); });
    const rows = series.map(s => ({ s, v: s.values[i] })).sort((a, b) => a.v - b.v);
    t.innerHTML = `<b>${esc(xTitle(i))}</b>` + rows.map(r =>
      `<div class="row"><span class="dot" style="background:${col(r.s.name)}"></span><span>${esc(nome(r.s.name))}</span><span>${r.v}${unit}</span></div>`).join("");
    const eb = el.getBoundingClientRect();
    placeTip(el, t, X(i) * b.width / W + (b.left - eb.left), e.clientY - eb.top);
  });
  svg.addEventListener("pointerleave", () => { hov.style.display = "none"; t.style.display = "none"; });
}

/* ---------------- pagina ---------------- */
// Lo stesso script serve tutte e tre le pagine: ogni funzione disegna solo se il suo riquadro esiste.
let GAMES = ALL;
const $ = id => document.getElementById(id);
const rank = (g, p) => { const t = totals(g), v = t[g.giocatori.indexOf(p)]; return 1 + t.filter(x => x < v).length; };

function renderTiles() {
  if (!$("tiles")) return;
  const mani = GAMES.reduce((s, g) => s + g.mani.length, 0);
  const pl = new Set(GAMES.flatMap(g => g.giocatori));
  const last = GAMES[GAMES.length - 1];
  const T = [
    ["♠", GAMES.length, "Partite", GAMES.length ? `dal ${fmtDate(GAMES[0].data)}` : ""],
    ["♥", mani, "Mani giocate", GAMES.length ? `${num(mani / Math.max(1, GAMES.filter(g => g.mani.length).length))} a partita` : ""],
    ["♣", pl.size, "Giocatori", "al tavolo finora"],
    ["♦", last ? fmtDate(last.data) : "–", "Ultima partita", last ? `vinta da ${nomi(winners(last))}` : ""]
  ];
  document.getElementById("tiles").innerHTML = T.map(([s, v, k, d]) => {
    const ix = `${s}`;
    return `<div class="tile${rosso(s) ? " r" : ""}"><span class="ix tl">${ix}</span><span class="ix br">${ix}</span>
      <div class="v${String(v).length > 6 ? " small" : ""}">${esc(v)}</div><div class="k">${k}</div><div class="d">${esc(d)}</div></div>`;
  }).join("");
}

function renderGiocatori(S) {
  if (!$("giocatori")) return;
  const pos = ["1° posto", "2° posto", "3° posto"];
  document.getElementById("giocatori").innerHTML = S.length ? S.map((s, i) => {
    const sm = seme(s.p), sig = esc(s.p);
    return `<a href="#g-${sig}" class="player${rosso(sm) ? " r" : ""}${i === 0 ? " first" : ""}">
      <span class="frame"></span>
      ${i < 3 ? `<span class="pos">${pos[i]}</span>` : ""}
      <span class="ix tl">${sig}<small>${sm}</small></span><span class="ix br">${sig}<small>${sm}</small></span>
      <div class="mono" style="background:${col(s.p)}">${esc(nome(s.p).charAt(0))}</div>
      <div class="nm">${esc(nome(s.p))}</div>
      <div class="st">${s.vinte} ${s.vinte === 1 ? "vittoria" : "vittorie"} · ${pct(s.vinte, s.partite)}</div>
      <div class="st">${s.partite} ${s.partite === 1 ? "partita" : "partite"}</div>
    </a>`;
  }).join("") : '<p class="empty" style="color:var(--cream)">Nessuna partita</p>';
}

// Scheda di ogni giocatore: numeri principali, anno per anno, contro gli altri, ultime partite.
function renderSchede(S) {
  const el = $("schede"); if (!el) return;
  el.innerHTML = S.map(s => {
    const p = s.p, sm = seme(p), mine = GAMES.filter(g => g.giocatori.includes(p));
    // serie di vittorie più lunga e vittoria con meno punti
    let run = 0, best = 0, minWin = null;
    mine.forEach(g => {
      const won = winners(g).includes(p); run = won ? run + 1 : 0; best = Math.max(best, run);
      const v = totals(g)[g.giocatori.indexOf(p)]; if (won && (minWin === null || v < minWin)) minWin = v;
    });
    const nums = [
      ["Partite", s.partite], ["Vinte", `${s.vinte} (${pct(s.vinte, s.partite)})`],
      ["Punti medi a partita", num(s.tot / s.partite)], ["Punti medi a mano", s.mani ? num(s.punti / s.mani) : "–"],
      ["Chiusure", `${s.zeri} (${pct(s.zeri, s.mani)})`], ["Non aperte", s.cento],
      ["Mano peggiore", s.peggio], ["Vittorie di fila", best], ["Vittoria con meno punti", minWin === null ? "–" : minWin]
    ];
    const anni = [...new Set(mine.map(g => g.data.slice(0, 4)))].sort();
    const perAnno = anni.map(a => { const gs = mine.filter(g => g.data.startsWith(a)), v = gs.filter(g => winners(g).includes(p)).length;
      return `<tr><td>${a}</td><td>${gs.length}</td><td>${v}</td><td>${pct(v, gs.length)}</td></tr>`; }).join("");
    const avv = PLAYERS.filter(o => o !== p).map(o => {
      let d = 0, t = 0; mine.filter(g => g.giocatori.includes(o)).forEach(g => {
        const tt = totals(g), a = tt[g.giocatori.indexOf(p)], b = tt[g.giocatori.indexOf(o)];
        if (a < b) d++; else if (a > b) t++; });
      return { o, d, t };
    }).filter(r => r.d + r.t).sort((a, b) => (b.d + b.t) - (a.d + a.t));
    const ultime = mine.slice(-6).reverse().map(g => {
      const r = rank(g, p), w = winners(g).includes(p);
      return `<tr><td><a href="partite.html#${esc(g.id)}">${fmtDate(g.data)}</a></td><td>${g.giocatori.length} giocatori</td>
        <td>${totals(g)[g.giocatori.indexOf(p)]} punti</td><td>${w ? "🏆 vinta" : `${r}° posto`}</td></tr>`; }).join("");
    return `<section class="card${rosso(sm) ? " r" : ""}" data-suit="${sm}" id="g-${esc(p)}">
      <div class="scheda-head"><div class="mono" style="background:${col(p)}">${esc(nome(p).charAt(0))}</div>
        <div><h2>${esc(nome(p))}</h2><p class="hint" style="margin:0">Sigla sul foglio: ${esc(p)}</p></div></div>
      <div class="records">${nums.map(([k, v]) => `<div class="rec"><div class="k">${k}</div><div class="v">${esc(v)}</div></div>`).join("")}</div>
      <div class="grid3">
        <div><h3>Anno per anno</h3><div class="scroll"><table><thead><tr><th>Anno</th><th>Partite</th><th>Vinte</th><th>%</th></tr></thead><tbody>${perAnno}</tbody></table></div></div>
        <div><h3>Contro gli altri</h3><p class="hint">Partite finite davanti–dietro</p><div class="scroll"><table><tbody>${avv.map(r =>
          `<tr><td>${who(r.o)}</td><td${r.d > r.t ? ' class="win"' : ""}>${r.d}–${r.t}</td></tr>`).join("")}</tbody></table></div></div>
        <div><h3>Ultime partite</h3><div class="scroll"><table><tbody>${ultime}</tbody></table></div></div>
      </div>
    </section>`;
  }).join("") || '<p class="empty" style="color:var(--cream)">Nessuna partita</p>';
}

function renderClassifica(S) {
  if (!$("classifica")) return;
  const medal = ["🥇", "🥈", "🥉"];
  document.getElementById("classifica").innerHTML = `<thead><tr>
    <th>Giocatore</th><th>Partite</th><th>Vinte</th><th>% vittorie</th><th>Punti medi a partita</th>
    <th>Punti medi a mano</th><th>Chiusure</th><th>Non aperte</th><th>Mano peggiore</th></tr></thead><tbody>` +
    (S.length ? S.map((s, i) => `<tr><td>${who(s.p)}${i < 3 ? ` <span class="medal">${medal[i]}</span>` : ""}</td><td>${s.partite}</td><td>${s.vinte}</td><td>${pct(s.vinte, s.partite)}</td>
      <td>${num(s.tot / s.partite)}</td><td>${s.mani ? num(s.punti / s.mani) : "–"}</td><td>${s.zeri} <span style="color:var(--muted)">(${pct(s.zeri, s.mani)})</span></td>
      <td>${s.cento}</td><td>${s.peggio}</td></tr>`).join("") : `<tr><td colspan="9" class="empty">Nessuna partita</td></tr>`) + "</tbody>";
}

function renderCharts(S) {
  if (!$("chVittorie")) return;
  barChart(document.getElementById("chVittorie"),
    S.map(s => ({ p: s.p, v: s.vinte, s })).sort((a, b) => b.v - a.v),
    { tip: r => `${r.s.vinte} vinte su ${r.s.partite} (${pct(r.s.vinte, r.s.partite)})` });
  barChart(document.getElementById("chMedia"),
    S.filter(s => s.mani).map(s => ({ p: s.p, v: s.punti / s.mani, s })).sort((a, b) => a.v - b.v),
    { fmt: v => num(v), tip: r => `${num(r.v)} punti a mano su ${r.s.mani} mani` });

  const pl = PLAYERS.filter(p => GAMES.some(g => g.giocatori.includes(p)));
  const acc = Object.fromEntries(pl.map(p => [p, 0]));
  const series = pl.map(p => ({ name: p, values: [0] }));
  GAMES.forEach(g => {
    winners(g).forEach(p => acc[p]++);
    series.forEach(s => s.values.push(acc[s.name]));
  });
  lineChart(document.getElementById("chTempo"), {
    x: GAMES.length ? ["inizio", ...GAMES.map(g => shortDate(g.data))] : [],
    xTitle: i => i ? `Partita del ${fmtDate(GAMES[i - 1].data)} · vince ${nomi(winners(GAMES[i - 1]))}` : "Inizio",
    series
  });
}

function renderRecords() {
  const el = document.getElementById("records");
  if (!el) return;
  if (!GAMES.length) { el.innerHTML = '<p class="empty">Nessuna partita</p>'; return; }
  let peggio = null, migliore = null, lunga = null, chiusure = null;
  GAMES.forEach(g => {
    const t = totals(g), w = winners(g);
    g.mani.forEach((m, k) => g.giocatori.forEach((p, i) => {
      const v = Number(m[i]) || 0;
      if (v !== NON_APERTA && (!peggio || v > peggio.v)) peggio = { v, p, g, k };
    }));
    w.forEach(p => { const v = t[g.giocatori.indexOf(p)]; if (!migliore || v < migliore.v) migliore = { v, p, g }; });
    if (!lunga || g.mani.length > lunga.v) lunga = { v: g.mani.length, g };
    g.giocatori.forEach((p, i) => {
      const z = g.mani.filter(m => m[i] !== null && m[i] !== undefined && Number(m[i]) === 0).length;
      if (!chiusure || z > chiusure.v) chiusure = { v: z, p, g };
    });
  });
  // serie di vittorie consecutive (tra le partite giocate da ciascuno)
  let serie = null; const cur = {};
  GAMES.forEach(g => { const w = winners(g); g.giocatori.forEach(p => {
    cur[p] = w.includes(p) ? (cur[p] || 0) + 1 : 0;
    if (!serie || cur[p] > serie.v) serie = { v: cur[p], p };
  }); });
  // chi è rimasto più volte senza aprire (mani da 100)
  const ca = {};
  GAMES.forEach(g => g.mani.forEach(m => g.giocatori.forEach((p, i) => {
    if ((Number(m[i]) || 0) === NON_APERTA) ca[p] = (ca[p] || 0) + 1;
  })));
  const caMax = Math.max(0, ...Object.values(ca));
  const caChi = Object.keys(ca).filter(p => ca[p] === caMax);
  const R = [
    ["♠", "Mano più pesante (aperta)", peggio ? peggio.v : "–", peggio ? `${nome(peggio.p)} · mano ${peggio.k + 1} del ${fmtDate(peggio.g.data)}` : ""],
    ["♥", "Vittoria con meno punti", migliore.v, `${nome(migliore.p)} · ${fmtDate(migliore.g.data)}`],
    ["♦", "Più chiusure in una partita", chiusure.v, `${nome(chiusure.p)} · ${fmtDate(chiusure.g.data)}`],
    ["♣", "Partita più lunga", `${lunga.v} mani`, fmtDate(lunga.g.data)],
    ["♠", "Vittorie di fila", serie.v, serie.v ? nome(serie.p) : "–"],
    ["♥", "Più volte senza aprire", caMax, caMax ? nomi(caChi) : "nessuno finora"]
  ];
  el.innerHTML = R.map(([s, k, v, d]) => `<div class="rec"><div class="k"><b style="color:${rosso(s) ? "var(--red)" : "var(--black)"}">${s}</b>${k}</div><div class="v">${esc(v)}</div><div class="d">${esc(d)}</div></div>`).join("");
}

function renderH2H() {
  if (!$("h2h")) return;
  const pl = PLAYERS.filter(p => GAMES.some(g => g.giocatori.includes(p)));
  const M = {};
  GAMES.forEach(g => { const t = totals(g); g.giocatori.forEach((a, i) => g.giocatori.forEach((b, j) => {
    if (a === b) return; const k = a + "|" + b; M[k] = M[k] || [0, 0];
    if (t[i] < t[j]) M[k][0]++; else if (t[i] > t[j]) M[k][1]++;
  })); });
  document.getElementById("h2h").innerHTML = `<thead><tr><th></th>${pl.map(p => `<th>${who(p)}</th>`).join("")}</tr></thead><tbody>` +
    pl.map(a => `<tr><td>${who(a)}</td>${pl.map(b => {
      if (a === b) return `<td style="color:var(--muted)">–</td>`;
      const r = M[a + "|" + b]; if (!r) return `<td style="color:var(--muted)">·</td>`;
      return `<td${r[0] > r[1] ? ' class="win"' : ""}>${r[0]}–${r[1]}</td>`;
    }).join("")}</tr>`).join("") + "</tbody>";
}

function renderPartite() {
  const el = document.getElementById("partite");
  if (!el) return;
  const chi = $("filtroGiocatore") ? $("filtroGiocatore").value : "";
  const list = chi ? GAMES.filter(g => g.giocatori.includes(chi)) : GAMES;
  if ($("contaPartite")) $("contaPartite").textContent = `${list.length} ${list.length === 1 ? "partita" : "partite"}, dalla più recente. Apri una partita per vedere mano per mano.`;
  if (!list.length) { el.innerHTML = '<p class="empty" style="color:var(--cream)">Nessuna partita</p>'; return; }
  el.innerHTML = list.slice().reverse().map(g => {
    const t = totals(g), mn = Math.min(...t), w = winners(g);
    const score = g.giocatori.map((p, i) => `<span${t[i] === mn ? ' class="w"' : ""}>${esc(nome(p))} ${t[i]}</span>`).join(" · ");
    const rows = g.mani.map((m, k) => `<tr><td>${k + 1}</td>${g.giocatori.map((_, i) => {
      if (m[i] === null || m[i] === undefined) return `<td style="color:var(--muted)" title="Non ha giocato questa mano">—</td>`;
      const v = Number(m[i]) || 0;
      if (v === NON_APERTA) return `<td class="cento" title="Non ha aperto">${v} <small>non aperto</small></td>`;
      return `<td${v === 0 ? ' class="zero"' : ""}>${v}</td>`; }).join("")}</tr>`).join("");
    return `<details class="game" data-id="${esc(g.id)}" id="${esc(g.id)}"><summary>
      <span class="gdate">${fmtDate(g.data)}</span><span class="gscore">${score}</span>
      <span class="badge">🏆 ${esc(nomi(w))}</span><span class="gscore" style="margin-left:auto">${g.mani.length ? `${g.mani.length} mani` : "solo risultato"}</span></summary>
      <div class="gbody">${g.note ? `<p class="hint">${esc(g.note)}</p>` : ""}<div class="grid2">
        <div class="scroll"><table><thead><tr><th>Mano</th>${g.giocatori.map(p => `<th>${who(p)}</th>`).join("")}</tr></thead>
        <tbody>${rows}<tr class="tot"><td>Totale</td>${t.map(v => `<td${v === mn ? ' class="win"' : ""}>${v}</td>`).join("")}</tr></tbody></table></div>
        <div><p class="hint" style="margin-bottom:6px">Punteggio accumulato mano per mano</p><div class="chart"></div></div>
      </div></div></details>`;
  }).join("");
  el.querySelectorAll("details.game").forEach(d => d.addEventListener("toggle", () => {
    if (d.open) drawGame(d);
  }));
}
function drawGame(d) {
  const g = ALL.find(x => x.id === d.dataset.id);
  if (!g.mani.length) { d.querySelector(".chart").innerHTML = '<p class="empty">Mani non trascritte</p>'; return; }
  const series = g.giocatori.map((p, i) => {
    let s = 0; return { name: p, values: [0, ...g.mani.map(m => (s += Number(m[i]) || 0))] };
  });
  lineChart(d.querySelector(".chart"), {
    x: ["0", ...g.mani.map((_, k) => String(k + 1))],
    xTitle: i => i ? `Dopo la mano ${i}` : "Inizio",
    series, unit: " pt"
  });
}

function render() {
  const S = stats(GAMES);
  renderTiles(); renderGiocatori(S); renderSchede(S); renderClassifica(S); renderCharts(S); renderRecords(); renderH2H(); renderPartite();
}

// Il periodo scelto resta lo stesso passando da una pagina all'altra.
const sel = document.getElementById("anno");
const anni = [...new Set(ALL.map(g => g.data.slice(0, 4)))].sort().reverse();
sel.innerHTML = `<option value="">Tutti gli anni</option>` + anni.map(a => `<option>${a}</option>`).join("");
const applyAnno = () => { GAMES = sel.value ? ALL.filter(g => g.data.startsWith(sel.value)) : ALL; };
try { const a = localStorage.getItem("scala40-anno"); if (a && anni.includes(a)) { sel.value = a; applyAnno(); } } catch (e) {}
sel.addEventListener("change", () => {
  try { localStorage.setItem("scala40-anno", sel.value); } catch (e) {}
  applyAnno(); render();
});
if ($("filtroGiocatore")) {
  $("filtroGiocatore").innerHTML = `<option value="">Tutti i giocatori</option>` +
    PLAYERS.slice().sort((a, b) => nome(a).localeCompare(nome(b))).map(p => `<option value="${esc(p)}">${esc(nome(p))}</option>`).join("");
  $("filtroGiocatore").addEventListener("change", renderPartite);
}

let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => {
  renderCharts(stats(GAMES)); document.querySelectorAll("details.game[open]").forEach(drawGame);
}, 150); });
render();
// Arrivando da un link (es. dalla scheda di un giocatore) apre la partita indicata.
if (location.hash && $("partite")) {
  const d = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (d && d.tagName === "DETAILS") { d.open = true; d.scrollIntoView(); }
}
