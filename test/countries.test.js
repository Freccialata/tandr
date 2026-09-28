import assert from "node:assert/strict";
import { COUNTRIES } from "../data/countries.js";
import { DOTS, SHAPES } from "../data/world.js";

const codici = COUNTRIES.map((x) => x[0]);
const stati = (k) => COUNTRIES.filter((x) => x[1] === k && x[2] === 1).length;

Deno.test("195 Stati: 193 ONU + VA + PS", () => {
  assert.equal(COUNTRIES.filter((x) => x[2] === 1).length, 195);
  assert.ok(codici.includes("VA") && codici.includes("PS"));
});

Deno.test("Stati per continente, somma 195", () => {
  assert.deepEqual(["EU", "AS", "AF", "NA", "SA", "OC"].map(stati), [44, 48, 54, 23, 12, 14]);
});

Deno.test("codici unici, solo i 6 continenti, territori noti", () => {
  assert.equal(new Set(codici).size, codici.length);
  assert.ok(COUNTRIES.every(([, k]) => ["EU", "AS", "AF", "NA", "SA", "OC"].includes(k)));
  for (const c of ["GL", "PR", "HK", "TW", "XK"]) assert.equal(COUNTRIES.find((x) => x[0] === c)[2], 0, c);
});

Deno.test("ogni codice ha una forma o un punto sulla mappa, e viceversa", () => {
  const mappa = [...Object.keys(SHAPES), ...Object.keys(DOTS)];
  assert.deepEqual(mappa.toSorted(), codici.toSorted());
});
