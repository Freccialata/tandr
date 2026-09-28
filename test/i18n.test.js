import assert from "node:assert/strict";
import { bandiera, fa, lang, nome, pct, perNome, t, tp } from "../src/i18n.js";

Deno.test("lingua: ripiego sull'italiano", () => assert.equal(lang, "it"));

Deno.test("t: parametri e chiavi mancanti", () => {
  assert.equal(t("rimuovi", { nome: "Francia" }), "Rimuovi Francia");
  assert.equal(t("chiave.inesistente"), "chiave.inesistente");
});

Deno.test("tp: plurali, anche con la forma 'many' dell'italiano", () => {
  assert.equal(tp("paesi", 1), "1 paese");
  assert.equal(tp("paesi", 0), "0 paesi");
  assert.equal(tp("viaggi", 1000000), "1.000.000 viaggi");
});

Deno.test("numeri, bandiere, nomi, tempi", () => {
  assert.equal(pct(3 / 195), "1,5%");
  assert.equal(pct(0.46), "46%");
  assert.equal(bandiera("IT"), "🇮🇹");
  assert.equal(nome("CI"), "Costa d’Avorio");
  assert.deepEqual(perNome(["DE", "AT", "IT"]), ["AT", "DE", "IT"]); // Austria, Germania, Italia
  assert.equal(fa(0), "oggi");
  assert.equal(fa(3), "3 giorni fa");
});
