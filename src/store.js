// Stato dell'app: modifiche pure, validazione, salvataggio in localStorage, esportazione.
import { INFO } from "./stats.js";

const KEY = "tandr";
export const V = 1;
let bloccato = false; // dati salvati illeggibili: non vanno sovrascritti finché non li esporti

export const nuovo = () => ({ v: V, paesi: [], viaggi: [] });
export const migrate = (d) => d; // v1 è l'unica versione: qui andranno le conversioni future
export const oggi = () => new Date().toLocaleDateString("sv"); // AAAA-MM-GG, fuso locale
export const nuovoId = () => Math.random().toString(36).slice(2, 8);

// modifiche: ricevono i dati e ne restituiscono una copia aggiornata
export const segna = (d, c) => (d.paesi.includes(c) ? d : { ...d, paesi: [...d.paesi, c] });
export const rimuovi = (d, c) => ({
  ...d,
  paesi: d.paesi.filter((x) => x !== c),
  viaggi: d.viaggi.map((v) => ({ ...v, paesi: v.paesi.filter((x) => x !== c) })).filter((v) => v.paesi.length),
});
export const salvaViaggio = (d, v) => ({
  ...d,
  viaggi: d.viaggi.some((x) => x.id === v.id) ? d.viaggi.map((x) => (x.id === v.id ? v : x)) : [...d.viaggi, v],
});
export const eliminaViaggio = (d, id) => ({ ...d, viaggi: d.viaggi.filter((v) => v.id !== id) });
// toglie i campi vuoti del form
export const viaggio = (campi) =>
  Object.fromEntries(Object.entries(campi).filter(([, x]) => x !== "" && x !== undefined));

// validazione: null se va bene, altrimenti { e: chiave del messaggio, x: dettaglio }
const data = (s) =>
  s === undefined || (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s));
const codice = (cs) => {
  const x = cs.find((c) => !INFO.has(c));
  return x === undefined ? null : { e: "err.codice", x: String(x) };
};

export function validaViaggio(v) {
  if (!v || typeof v !== "object" || typeof v.id !== "string") return { e: "err.formato" };
  if (![v.titolo, v.note].every((s) => s === undefined || typeof s === "string")) return { e: "err.formato" };
  if (!Array.isArray(v.paesi) || !v.paesi.length) return { e: "err.paesi" };
  const anno = v.anno === undefined || (Number.isInteger(v.anno) && v.anno >= 1900 && v.anno <= 2100);
  const date = data(v.dal) && data(v.al) && !(v.al && !v.dal) && !(v.al < v.dal);
  if (!anno || !date || (v.anno !== undefined && v.dal)) return { e: "err.data" };
  return codice(v.paesi);
}

export function valida(d) {
  if (!d || typeof d !== "object") return { e: "err.formato" };
  if (d.v > V) return { e: "err.versione" };
  if (d.v !== V || !Array.isArray(d.paesi) || !Array.isArray(d.viaggi) || !data(d.backup)) return { e: "err.formato" };
  for (const v of d.viaggi) {
    const e = validaViaggio(v);
    if (e) return e;
  }
  return codice(d.paesi);
}

export function analizza(testo) {
  let d;
  try {
    d = migrate(JSON.parse(testo));
  } catch {
    return { err: { e: "err.json" } };
  }
  const err = valida(d);
  return err ? { err } : { d };
}

// salvataggio
export function carica() {
  let raw;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { d: nuovo(), err: "err.storage" };
  }
  if (raw === null) return { d: nuovo() };
  const { d } = analizza(raw);
  if (d) return { d };
  bloccato = true;
  return { d: nuovo(), err: "err.corrotti", raw };
}
export function salva(d) {
  if (bloccato) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch { /* già segnalato da carica() */ }
}
export const sblocca = () => (bloccato = false);

// esportazione: condivisione di sistema se c'è, altrimenti download. false = annullata.
// .txt perché Chrome su Android rifiuta i .json (NotAllowedError anche se canShare dice sì);
// se un browser rifiuta comunque, si ripiega sul download.
export async function condividi(testo, nome) {
  const f = new File([testo], nome, { type: "text/plain" });
  if (navigator.canShare?.({ files: [f] })) {
    try {
      await navigator.share({ files: [f] });
      return true;
    } catch (e) {
      if (e.name === "AbortError") return false;
      if (e.name !== "NotAllowedError") throw e;
    }
  }
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(f), download: nome });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}
