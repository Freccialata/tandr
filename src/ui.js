// Componenti DOM condivisi: h, barra, gruppo, riga, pannello, ricerca dei paesi.
import { COUNTRIES } from "../data/countries.js";
import { bandiera, nome, t } from "./i18n.js";
import { cerca, INFO } from "./stats.js";

export function h(tag, attrs, ...figli) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else if (v != null && v !== false) el.setAttribute(k, v);
  }
  el.append(...figli.flat(Infinity).filter((x) => x != null && x !== false));
  return el;
}

export const barra = (x) => h("div", { class: "bar" }, h("i", { style: `width:${x * 100}%` }));
export const flag = (c) => h("span", { class: "f" }, bandiera(c));
export const meta = (a, b) => h("span", { class: "m" }, a, b && h("small", {}, b));
export const riga = (onclick, ...figli) => h("button", { class: "row", onclick }, ...figli);
export const lista = (righe) => h("div", { class: "list" }, righe);

// gruppo collassabile (continenti e anni); ricorda aperto/chiuso tra un render e l'altro
const aperti = new Map();
export const gruppo = (key, primo, titolo, x, conta, righe) =>
  h(
    "details",
    { open: aperti.get(key) ?? primo, ontoggle: (e) => aperti.set(key, e.target.open) },
    h("summary", {}, h("span", {}, titolo), barra(x), h("span", {}, conta)),
    righe,
  );

// pannello dal basso: fissi non cambia mai, corpo() viene ridisegnato dopo ogni modifica ai dati
export function pannello(titolo, azione, fissi, corpo = () => []) {
  const body = h("div");
  const dlg = h(
    "dialog",
    { class: "sheet", onclose: () => dlg.remove() },
    h("h4", {}, titolo, h("button", { class: "x", onclick: () => dlg.close() }, azione)),
    fissi,
    body,
  );
  dlg.ridisegna = () => body.replaceChildren(...[corpo()].flat(Infinity).filter(Boolean));
  dlg.ridisegna();
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

// ricerca su tutti gli Stati e territori; on(c) dice se è spuntato, tocca(c) reagisce al tocco
export function ricerca(on, tocca) {
  const codici = COUNTRIES.map(([c]) => c);
  const risultati = h("div", { class: "list" });
  const input = h("input", {
    type: "search",
    class: "search",
    placeholder: t("cerca"),
    autofocus: true,
    oninput: () => mostra(),
  });
  const mostra = () =>
    risultati.replaceChildren(
      ...cerca(input.value, codici, nome).map((c) =>
        riga(
          () => tocca(c),
          flag(c),
          nome(c),
          !INFO.get(c).s && h("span", { class: "tag" }, t("territorio")),
          h("span", { class: on(c) ? "check on" : "check" }, on(c) ? "✓" : ""),
        )
      ),
    );
  return { input, lista: () => (mostra(), risultati) };
}
