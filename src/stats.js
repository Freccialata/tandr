// Statistiche: funzioni pure sui dati, senza DOM né localStorage.
import { COUNTRIES } from "../data/countries.js";

export const INFO = new Map(COUNTRIES.map(([c, k, s]) => [c, { k, s: s === 1 }]));
export const CONTINENTI = ["EU", "AS", "AF", "NA", "SA", "OC"];
export const STATI = COUNTRIES.filter((x) => x[2]).length;

const somma = (xs, f) => xs.reduce((s, x) => s + f(x), 0);
export const trascorsi = (da, a) => (Date.parse(a) - Date.parse(da)) / 864e5;

export const visitati = (d) => new Set([...d.paesi, ...d.viaggi.flatMap((v) => v.paesi)]);
export const anno = (v) => v.anno ?? (v.dal ? +v.dal.slice(0, 4) : null);
export const giorni = (v) => (v.dal && v.al ? trascorsi(v.dal, v.al) + 1 : 0);

// dal più recente; i viaggi senza anno né date in fondo
const chiave = (v) => v.dal ?? (v.anno ? String(v.anno) : "");
export const ordina = (vs) => [...vs].sort((a, b) => chiave(b).localeCompare(chiave(a)));

export function riepilogo(vis) {
  const stati = [...vis].filter((c) => INFO.get(c).s).length;
  return { totale: vis.size, stati, territori: vis.size - stati, pct: stati / STATI };
}

// n e tot contano solo gli Stati; paesi elenca anche i territori visitati
export const perContinente = (vis) =>
  CONTINENTI.map((k) => {
    const tutti = COUNTRIES.filter((x) => x[1] === k);
    const paesi = tutti.filter(([c]) => vis.has(c)).map(([c]) => c);
    return { k, paesi, n: paesi.filter((c) => INFO.get(c).s).length, tot: tutti.filter((x) => x[2]).length };
  }).sort((a, b) => b.paesi.length - a.paesi.length);

export function paese(d, c) {
  const viaggi = ordina(d.viaggi.filter((v) => v.paesi.includes(c)));
  const anni = viaggi.map(anno).filter((a) => a !== null);
  return { viaggi, giorni: somma(viaggi, giorni), prima: anni.length ? Math.min(...anni) : null };
}

export function perAnno(viaggi) {
  const gruppi = new Map();
  for (const v of ordina(viaggi)) gruppi.set(anno(v), [...(gruppi.get(anno(v)) ?? []), v]);
  return [...gruppi].map(([anno, viaggi]) => ({ anno, viaggi }));
}

export const riepilogoViaggi = (vs) => ({
  n: vs.length,
  giorni: somma(vs, giorni),
  ppv: vs.length ? somma(vs, (v) => v.paesi.length) / vs.length : 0,
});

// ricerca che ignora maiuscole, accenti e tipo di apostrofo; prima chi inizia con la query
export const norm = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/[’‘]/g, "'").toLowerCase().trim();
export function cerca(q, codici, nome) {
  const n = norm(q);
  return codici.map((c) => [c, norm(nome(c))]).filter(([, x]) => x.includes(n))
    .sort(([, a], [, b]) => b.startsWith(n) - a.startsWith(n) || a.localeCompare(b)).map(([c]) => c);
}
