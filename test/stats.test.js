import assert from "node:assert/strict";
import {
  anno,
  cerca,
  giorni,
  paese,
  perAnno,
  perContinente,
  riepilogo,
  riepilogoViaggi,
  visitati,
} from "../src/stats.js";

const d = {
  v: 1,
  paesi: ["IT", "GL"],
  viaggi: [
    { id: "a", paesi: ["FR", "IT"], dal: "2021-06-12", al: "2021-06-20" },
    { id: "b", paesi: ["JP"], anno: 2024 },
    { id: "c", paesi: ["FR"] },
    { id: "d", paesi: ["FR"], dal: "2024-03-01" },
  ],
};

Deno.test("visitati = paesi ∪ paesi dei viaggi", () => {
  assert.deepEqual([...visitati(d)].sort(), ["FR", "GL", "IT", "JP"]);
});

Deno.test("percentuale solo sugli Stati, territori a parte", () => {
  assert.deepEqual(riepilogo(visitati(d)), { totale: 4, stati: 3, territori: 1, pct: 3 / 195 });
});

Deno.test("continenti: Stati visitati su Stati totali, territori in lista, vuoti in fondo", () => {
  const cs = perContinente(visitati(d));
  assert.deepEqual(cs.map((c) => c.k), ["EU", "AS", "NA", "AF", "SA", "OC"]);
  assert.deepEqual(cs[0], { k: "EU", paesi: ["FR", "IT"], n: 2, tot: 44 });
  assert.deepEqual(cs[2], { k: "NA", paesi: ["GL"], n: 0, tot: 23 });
});

Deno.test("anno e giorni di un viaggio", () => {
  assert.equal(anno(d.viaggi[0]), 2021);
  assert.equal(anno(d.viaggi[1]), 2024);
  assert.equal(anno(d.viaggi[2]), null);
  assert.equal(giorni(d.viaggi[0]), 9);
  assert.equal(giorni(d.viaggi[1]), 0); // solo anno
  assert.equal(giorni(d.viaggi[3]), 0); // solo dal
  assert.equal(giorni({ dal: "2024-03-30", al: "2024-04-01" }), 3); // attraverso il cambio dell'ora
  assert.equal(giorni({ dal: "2024-05-01", al: "2024-05-01" }), 1);
});

Deno.test("scheda paese: viaggi dal più recente, giorni, prima volta", () => {
  const p = paese(d, "FR");
  assert.deepEqual(p.viaggi.map((v) => v.id), ["d", "a", "c"]);
  assert.equal(p.giorni, 9);
  assert.equal(p.prima, 2021);
  assert.deepEqual(paese(d, "GL"), { viaggi: [], giorni: 0, prima: null });
});

Deno.test("viaggi per anno, dal più recente, Senza data in fondo", () => {
  const g = perAnno(d.viaggi);
  assert.deepEqual(g.map((x) => [x.anno, x.viaggi.map((v) => v.id)]), [[2024, ["d", "b"]], [2021, ["a"]], [null, [
    "c",
  ]]]);
  assert.deepEqual(perAnno([]), []);
});

Deno.test("riepilogo viaggi", () => {
  assert.deepEqual(riepilogoViaggi(d.viaggi), { n: 4, giorni: 9, ppv: 5 / 4 });
  assert.deepEqual(riepilogoViaggi([]), { n: 0, giorni: 0, ppv: 0 });
});

Deno.test("ricerca: maiuscole, accenti, apostrofi; prima chi inizia con la query", () => {
  const nomi = { CI: "Costa d’Avorio", ST: "São Tomé e Príncipe", IT: "Italia", HT: "Haiti", CR: "Costa Rica" };
  const n = (c) => nomi[c];
  const tutti = Object.keys(nomi);
  assert.deepEqual(cerca("SAO tome", tutti, n), ["ST"]);
  assert.deepEqual(cerca("costa d'avorio", tutti, n), ["CI"]);
  assert.deepEqual(cerca("it", tutti, n), ["IT", "HT"]);
  assert.deepEqual(cerca("  ", tutti, n), ["CI", "CR", "HT", "IT", "ST"]);
});
