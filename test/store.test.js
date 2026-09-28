import assert from "node:assert/strict";
import {
  analizza,
  carica,
  eliminaViaggio,
  migrate,
  nuovo,
  rimuovi,
  salva,
  salvaViaggio,
  sblocca,
  segna,
  valida,
  validaViaggio,
  viaggio,
} from "../src/store.js";

const ok = { v: 1, paesi: ["IT"], viaggi: [{ id: "a", paesi: ["FR", "IT"], dal: "2021-06-12", al: "2021-06-20" }] };
const conViaggio = (v) => ({ ...ok, viaggi: [{ id: "x", paesi: ["FR"], ...v }] });
const errore = (d) => valida(d)?.e;

Deno.test("valida: dati corretti", () => {
  assert.equal(valida(ok), null);
  assert.equal(valida(nuovo()), null);
  assert.equal(valida({ ...ok, backup: "2026-09-28" }), null);
  assert.equal(valida(conViaggio({ anno: 2020, titolo: "T", note: "" })), null);
  assert.equal(valida(conViaggio({ dal: "2021-01-01" })), null);
});

Deno.test("analizza: file che non sono un backup di tandr", () => {
  assert.equal(analizza("{rotto").err.e, "err.json");
  for (const t of ["null", "[]", "{}", "42", '"ciao"', '{"v":1}', '{"v":1,"paesi":{},"viaggi":[]}']) {
    assert.equal(analizza(t).err.e, "err.formato", t);
  }
  assert.equal(analizza('{"v":2,"paesi":[],"viaggi":[]}').err.e, "err.versione");
  assert.deepEqual(analizza(JSON.stringify(ok)).d, ok);
});

Deno.test("valida: codici sconosciuti", () => {
  assert.deepEqual(valida({ ...ok, paesi: ["IT", "ZZ"] }), { e: "err.codice", x: "ZZ" });
  assert.equal(errore({ ...ok, paesi: ["constructor"] }), "err.codice");
  assert.equal(errore({ ...ok, paesi: [7] }), "err.codice");
  assert.equal(errore(conViaggio({ paesi: ["FR", "XX"] })), "err.codice");
});

Deno.test("valida: viaggi senza paesi o con campi sbagliati", () => {
  assert.equal(errore(conViaggio({ paesi: [] })), "err.paesi");
  assert.equal(errore({ ...ok, viaggi: [{ paesi: ["FR"] }] }), "err.formato");
  assert.equal(errore(conViaggio({ titolo: 3 })), "err.formato");
});

Deno.test("valida: anno e date", () => {
  for (
    const v of [
      { anno: 2020, dal: "2020-01-01" }, // anno e date insieme
      { dal: "2021-06-20", al: "2021-06-12" }, // fine prima dell'inizio
      { al: "2021-06-12" }, // fine senza inizio
      { dal: "2021-02-30" }, // giorno inesistente
      { dal: "12/06/2021" },
      { anno: "2020" },
      { anno: 20.5 },
      { anno: 1492 },
    ]
  ) assert.equal(errore(conViaggio(v)), "err.data", JSON.stringify(v));
  assert.equal(validaViaggio({ id: "x", paesi: ["FR"], dal: "2024-02-29", al: "2024-02-29" }), null);
});

Deno.test("rimuovi: toglie il paese anche dai viaggi, cancella i viaggi rimasti vuoti", () => {
  const d = { v: 1, paesi: ["IT"], viaggi: [{ id: "a", paesi: ["FR", "IT"] }, { id: "b", paesi: ["FR"] }] };
  assert.deepEqual(rimuovi(d, "FR"), { v: 1, paesi: ["IT"], viaggi: [{ id: "a", paesi: ["IT"] }] });
  assert.deepEqual(rimuovi(d, "IT"), {
    v: 1,
    paesi: [],
    viaggi: [{ id: "a", paesi: ["FR"] }, { id: "b", paesi: ["FR"] }],
  });
  assert.equal(d.paesi.length, 1); // l'originale non cambia
});

Deno.test("segna, salvaViaggio, eliminaViaggio, viaggio", () => {
  const d = nuovo();
  assert.deepEqual(segna(segna(d, "IT"), "IT").paesi, ["IT"]);
  const a = salvaViaggio(d, { id: "a", paesi: ["FR"] });
  assert.deepEqual(salvaViaggio(a, { id: "a", paesi: ["ES"] }).viaggi, [{ id: "a", paesi: ["ES"] }]);
  assert.deepEqual(eliminaViaggio(a, "a").viaggi, []);
  assert.deepEqual(viaggio({ id: "a", paesi: ["FR"], titolo: "", note: "", anno: undefined }), {
    id: "a",
    paesi: ["FR"],
  });
});

Deno.test("migrate: la v1 resta com'è", () => assert.deepEqual(migrate(ok), ok));

Deno.test("carica: dati salvati illeggibili non vengono sovrascritti", () => {
  localStorage.setItem("tandr", "{rotto");
  const r = carica();
  assert.equal(r.err, "err.corrotti");
  assert.equal(r.raw, "{rotto");
  salva(ok);
  assert.equal(localStorage.getItem("tandr"), "{rotto");
  sblocca();
  salva(ok);
  assert.deepEqual(carica(), { d: ok });
  localStorage.removeItem("tandr");
  assert.deepEqual(carica(), { d: nuovo() });
});
