// Avvio, stato corrente, viste (Mappa, Paesi, Viaggi) e pannelli.
import { bandiera, fa, nome, num, pct, perNome, t, tp } from "./i18n.js";
import { mappa } from "./map.js";
import * as S from "./stats.js";
import * as store from "./store.js";
import { barra, flag, gruppo, h, lista, meta, pannello, ricerca, riga } from "./ui.js";

let { d, err, raw } = store.carica();
let vista = "mappa";
const app = document.getElementById("app");
const tip = h("div", { class: "tip" });
const m = mappa(mostraTip);

// ogni modifica passa di qui: salva tutto, ridisegna la vista e i pannelli aperti
function aggiorna(f) {
  d = f(d);
  store.salva(d);
  render();
  for (const x of document.querySelectorAll("dialog")) x.ridisegna();
}

const ICONE = { mappa: "◐", paesi: "☰", viaggi: "✈︎" };
const btn = (cls, label, onclick, testo) => h("button", { class: `btn ${cls}`, "aria-label": label, onclick }, testo);
const menu = () => btn("", t("menu"), apriMenu, "⋯");
const kv = (...coppie) =>
  h("div", { class: "kv" }, coppie.map(([n, l]) => h("div", {}, h("b", {}, n), h("span", {}, l))));

function render() {
  const vis = S.visitati(d);
  const [titolo, azioni, corpo] = VISTE[vista](vis);
  app.className = vista;
  app.replaceChildren(
    h("header", {}, h("h1", {}, titolo), azioni),
    ...(err
      ? [h("div", { class: "avviso" }, t(err), raw && h("button", { onclick: esportaGrezzo }, t("esportaTesto")))]
      : []),
    h("main", {}, corpo),
    h(
      "nav",
      {},
      Object.keys(VISTE).map((k) =>
        h(
          "button",
          { class: k === vista ? "on" : "", onclick: () => ((vista = k), render()) },
          h("b", {}, ICONE[k]),
          t(k),
        )
      ),
    ),
  );
  if (vista === "mappa") m.adatta(vis);
}

const VISTE = {
  mappa(vis) {
    const r = S.riepilogo(vis);
    m.colora(vis);
    tip.replaceChildren();
    return ["tandr", [menu()], [
      m.svg,
      h("div", { class: "chip" }, tp("paesi", r.totale), " · ", t("delMondo", { p: pct(r.pct) })),
      tip,
      btn("reset", t("mondo"), m.mondo, "⤢"),
    ]];
  },
  paesi(vis) {
    const r = S.riepilogo(vis);
    return [t("paesi"), [menu(), btn("add", t("aggiungi"), apriAggiungi, "+")], [
      h(
        "div",
        { class: "hero" },
        h("span", { class: "n" }, num(r.stati)),
        h("span", { class: "of" }, t("diStati", { n: S.STATI })),
        h("span", { class: "pct" }, pct(r.pct)),
      ),
      barra(r.pct),
      h("p", { class: "note" }, tp("territori", r.territori)),
      S.perContinente(vis).map((g, i) =>
        gruppo(
          g.k,
          i === 0 && vis.size > 0,
          t(`c.${g.k}`),
          g.n / g.tot,
          `${g.n}/${g.tot}`,
          perNome(g.paesi).map((c) => riga(() => apriPaese(c), flag(c), nome(c), meta(dettaglio(c)))),
        )
      ),
      !vis.size && h("p", { class: "empty" }, t("vuoto.paesi")),
    ]];
  },
  viaggi() {
    const r = S.riepilogoViaggi(d.viaggi), gs = S.perAnno(d.viaggi);
    const max = Math.max(...gs.map((g) => g.viaggi.length));
    return [t("viaggi"), [menu(), btn("add", t("nuovoViaggio"), () => apriViaggio({ paesi: [] }), "+")], [
      kv([num(r.n), t("k.viaggi")], [num(r.giorni), t("k.giorni")], [
        num(r.ppv, { maximumFractionDigits: 1 }),
        t("k.ppv"),
      ]),
      gs.map((g, i) =>
        gruppo(
          `a${g.anno}`,
          i === 0,
          g.anno === null ? t("senzaData") : String(g.anno),
          g.viaggi.length / max,
          num(g.viaggi.length),
          g.viaggi.map((v) => rigaViaggio(v, v.paesi.map(bandiera).join(""))),
        )
      ),
      !d.viaggi.length && h("p", { class: "empty" }, t("vuoto.viaggi")),
    ]];
  },
};

// dettaglio nella lista dei paesi: "—", l'anno dell'unico viaggio, oppure "N viaggi"
function dettaglio(c) {
  const vs = S.paese(d, c).viaggi;
  return vs.length === 1 && S.anno(vs[0]) !== null ? String(S.anno(vs[0])) : vs.length ? tp("viaggi", vs.length) : "—";
}
const rigaViaggio = (v, sopra) =>
  riga(
    () => apriViaggio(v),
    v.titolo || v.paesi.map(nome).join(", "),
    meta(sopra, S.giorni(v) ? tp("giorni", S.giorni(v)) : null),
  );

function mostraTip(c, x, y) {
  if (!c) return tip.replaceChildren();
  const n = S.paese(d, c).viaggi.length, b = tip.parentNode.getBoundingClientRect();
  const stato = !S.visitati(d).has(c) ? t("nonVisitato") : n ? `${t("visitato")} · ${tp("viaggi", n)}` : t("visitato");
  tip.replaceChildren(`${bandiera(c)} ${nome(c)}`, h("small", {}, stato));
  tip.style.left = `${Math.min(Math.max(x - b.left, 90), b.width - 90)}px`;
  tip.style.top = `${y - b.top}px`;
}

// togliere un paese presente nei viaggi chiede conferma e lo toglie anche da lì
function togli(c) {
  const n = S.paese(d, c).viaggi.length;
  if (n && !confirm(t("conferma.rimuovi", { nome: nome(c), viaggi: tp("viaggi", n) }))) return false;
  aggiorna((d) => store.rimuovi(d, c));
  return true;
}

function apriAggiungi() {
  const r = ricerca(
    (c) => S.visitati(d).has(c),
    (c) => S.visitati(d).has(c) ? togli(c) : aggiorna((d) => store.segna(d, c)),
  );
  pannello(t("aggiungi"), t("fine"), [r.input], r.lista);
}

function apriPaese(c) {
  const dlg = pannello([flag(c), nome(c)], t("chiudi"), [], () => {
    const p = S.paese(d, c);
    return [
      kv([num(p.viaggi.length), t("k.viaggi")], [num(p.giorni), t("k.giorni")], [
        p.prima === null ? "—" : String(p.prima),
        t("k.prima"),
      ]),
      p.viaggi.length > 0 &&
      [
        h("p", { class: "lbl" }, t("viaggi")),
        lista(p.viaggi.map((v) => rigaViaggio(v, S.anno(v) === null ? "" : String(S.anno(v))))),
      ],
      h("button", { class: "ghost", onclick: () => apriViaggio({ paesi: [c] }) }, t("aggiungiViaggio")),
      h("button", { class: "danger", onclick: () => togli(c) && dlg.close() }, t("rimuovi", { nome: nome(c) })),
    ];
  });
}

// form del viaggio: la bozza resta locale finché non si salva
function apriViaggio(v) {
  let paesi = [...v.paesi];
  const campo = (label, input, cls = "", tag = "label") =>
    h(tag, { class: `field ${cls}` }, h("small", {}, label), input);
  const chips = h("div", { class: "chips" });
  const disegna = () =>
    chips.replaceChildren(
      ...paesi.map((c) =>
        h("button", {
          type: "button",
          onclick: () => ((paesi = paesi.filter((x) => x !== c)), disegna()),
        }, `${bandiera(c)} ${nome(c)} ✕`)
      ),
      h("button", { type: "button", class: "mut", onclick: scegli }, t("f.aggiungi")),
    );
  const scegli = () => {
    const r = ricerca((c) => paesi.includes(c), (c) => {
      paesi = paesi.includes(c) ? paesi.filter((x) => x !== c) : [...paesi, c];
      disegna();
      r.lista();
    });
    pannello(t("scegli"), t("fine"), [r.input, r.lista()]);
  };
  const modo = (x) => h("button", { type: "button", onclick: () => (form.dataset.modo = x) }, t(`modo.${x}`));
  const errore = h("p", { class: "err" });
  const form = h(
    "form",
    { "data-modo": v.dal ? "date" : "anno", onsubmit: salva },
    campo(t("f.titolo"), h("input", { name: "titolo", value: v.titolo ?? "" })),
    campo(t("f.paesi"), chips, "", "div"), // div: in una label il tocco finirebbe sul primo chip
    h("div", { class: "seg" }, modo("anno"), modo("date")),
    campo(
      t("f.anno"),
      h("input", {
        name: "anno",
        type: "number",
        inputmode: "numeric",
        placeholder: new Date().getFullYear(),
        value: v.anno ?? "",
      }),
      "anno",
    ),
    h(
      "div",
      { class: "two date" },
      campo(t("f.dal"), h("input", { name: "dal", type: "date", value: v.dal ?? "" })),
      campo(t("f.al"), h("input", { name: "al", type: "date", value: v.al ?? "" })),
    ),
    campo(t("f.note"), h("textarea", { name: "note", rows: 3 }, v.note ?? "")),
    errore,
    h("button", { class: "save" }, t("salva")),
    v.id && h("button", { type: "button", class: "danger", onclick: elimina }, t("elimina")),
  );
  disegna();
  const dlg = pannello(t(v.id ? "modificaViaggio" : "nuovoViaggio"), t("annulla"), [form]);

  function salva(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const date = form.dataset.modo === "date"
      ? { dal: f.dal, al: f.al }
      : { anno: f.anno ? Number(f.anno) : undefined };
    const nv = store.viaggio({
      id: v.id ?? store.nuovoId(),
      paesi,
      titolo: f.titolo.trim(),
      ...date,
      note: f.note.trim(),
    });
    const x = store.validaViaggio(nv);
    if (x) return (errore.textContent = t(x.e, x));
    aggiorna((d) => store.salvaViaggio(d, nv));
    dlg.close();
  }
  function elimina() {
    if (!confirm(t("conferma.elimina"))) return;
    aggiorna((d) => store.eliminaViaggio(d, v.id));
    dlg.close();
  }
}

function apriMenu() {
  const file = h("input", { type: "file", accept: ".json,application/json", hidden: true, onchange: importa });
  pannello(t("menu"), t("chiudi"), [file], () =>
    lista([
      riga(
        esporta,
        t("esporta"),
        meta(t("backup", { quando: d.backup ? fa(S.trascorsi(d.backup, store.oggi())) : t("mai") })),
      ),
      riga(() => file.click(), t("importa")),
    ]));
}

async function esporta() {
  try {
    if (await store.condividi(JSON.stringify(d), `tandr-${store.oggi()}.json`)) {
      aggiorna((d) => ({ ...d, backup: store.oggi() }));
    }
  } catch (e) {
    alert(t("err.condividi", { m: e.message }));
  }
}

async function esportaGrezzo() {
  if (!(await store.condividi(raw, `tandr-illeggibile-${store.oggi()}.json`))) return;
  store.sblocca();
  err = raw = null;
  render();
}

async function importa(e) {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  const r = store.analizza(await file.text());
  if (r.err) return alert(t(r.err.e, r.err));
  if (
    !confirm(
      t("conferma.importa", { paesi: tp("paesi", S.visitati(r.d).size), viaggi: tp("viaggi", r.d.viaggi.length) }),
    )
  ) return;
  store.sblocca();
  err = raw = null;
  aggiorna(() => r.d);
}

render();
navigator.storage?.persist?.();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
