// Testi da lang/<lingua>.js; nomi dei paesi, numeri, plurali e tempi dalle API Intl.
import it from "./lang/it.js";

const LINGUE = { it };
const pref = navigator.language?.slice(0, 2);
export const lang = pref in LINGUE ? pref : "it";
const dict = LINGUE[lang];
const plur = new Intl.PluralRules(lang);
const nomi = new Intl.DisplayNames([lang], { type: "region" });
const rel = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });

export const t = (k, p = {}) => (dict[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => p[x]);
export const num = (n, o) => n.toLocaleString(lang, o);
export const pct = (x) => num(x, { style: "percent", maximumFractionDigits: x < 0.1 ? 1 : 0 });
// plurali: "paesi.one", "paesi.other"… con ripiego su .other
export const tp = (k, n) => t(dict[`${k}.${plur.select(n)}`] ? `${k}.${plur.select(n)}` : `${k}.other`, { n: num(n) });
export const fa = (giorni) => rel.format(-Math.round(giorni), "day");
export const nome = (c) => nomi.of(c);
export const bandiera = (c) => String.fromCodePoint(...[...c].map((x) => 0x1f1a5 + x.charCodeAt(0)));
export const perNome = (cs) => [...cs].sort((a, b) => nome(a).localeCompare(nome(b), lang));
