// Genera data/countries.js e data/world.js da Natural Earth v5.1.2. Uso: deno task map
import { geoArea, geoEqualEarth, geoPath } from "d3-geo";

const NE = "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_";
const get = async (scala: string) => (await (await fetch(`${NE}${scala}_admin_0_countries.geojson`)).json()).features;
const [f110, f50] = await Promise.all([get("110m"), get("50m")]);

// 193 membri ONU + Vaticano + Palestina
const STATI = new Set(
  "AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VE VN YE ZM ZW VA PS"
    .split(" "),
);
const CONT: Record<string, string> = {
  Europe: "EU",
  Asia: "AS",
  Africa: "AF",
  "North America": "NA",
  "South America": "SA",
  Oceania: "OC",
};
// Natural Earth mette queste isole in "Seven seas (open ocean)"
const FIX: Record<string, string> = { SC: "AF", MU: "AF", MV: "AS", IO: "AS", SH: "AF", TF: "AF", GS: "SA", HM: "OC" };
const iso = (f: any) => f.properties.ISO_A2_EH;
const valido = (c: string) => c !== "-99" && c !== "AQ";

// 1:50m: elenco dei codici e continenti. Se un codice compare più volte (AU con le isole
// dell'Oceano Indiano), vale la feature del paese sovrano.
const props = new Map<string, any>();
for (const { properties: p } of f50) {
  if (valido(p.ISO_A2_EH) && (!props.has(p.ISO_A2_EH) || p.NAME === p.SOVEREIGNT)) props.set(p.ISO_A2_EH, p);
}
const mancanti = [...STATI].filter((c) => !props.has(c));
if (mancanti.length) throw new Error(`Stati mancanti in Natural Earth: ${mancanti}`);
const countries = [...props].sort(([a], [b]) => (a < b ? -1 : 1)).map(([c, p]) => {
  const k = FIX[c] ?? CONT[p.CONTINENT];
  if (!k) throw new Error(`Continente sconosciuto per ${c}: ${p.CONTINENT}`);
  return [c, k, STATI.has(c) ? 1 : 0];
});

// 1:110m: forme proiettate. Le feature senza codice (-99) diventano terra neutra.
const terra = f110.filter((f: any) => iso(f) !== "AQ");
const proj = geoEqualEarth().fitWidth(1000, { type: "FeatureCollection", features: terra });
const path = geoPath(proj).digits(1);
const r = (n: number) => Math.round(n * 10) / 10;
const H = Math.ceil(path.bounds({ type: "FeatureCollection", features: terra })[1][1]);
// riquadro del poligono più grande: la Francia senza la Guyana, gli USA senza l'Alaska
const principale = (g: any) =>
  g.type === "Polygon" ? g : {
    type: "Polygon",
    coordinates: g.coordinates.reduce((a: any, b: any) =>
      geoArea({ type: "Polygon", coordinates: b }) > geoArea({ type: "Polygon", coordinates: a }) ? b : a
    ),
  };
let land = "";
const shapes: Record<string, [string, number[]]> = {};
for (const f of terra) {
  const c = iso(f);
  if (!valido(c)) land += path(f);
  else if (shapes[c]) throw new Error(`Codice doppio nella 1:110m: ${c}`);
  else shapes[c] = [path(f)!, path.bounds(principale(f.geometry)).flat().map(r)];
}
// i codici troppo piccoli per la 1:110m diventano un punto
const dots: Record<string, number[]> = {};
for (const [c, p] of props) if (!shapes[c]) dots[c] = proj([p.LABEL_X, p.LABEL_Y])!.map(r);
const ignoti = Object.keys(shapes).filter((c) => !props.has(c));
if (ignoti.length) throw new Error(`Codici della 1:110m assenti dalla 1:50m: ${ignoti}`);

const HEAD = "// Generato da tools/build-map.ts: non modificare a mano.\n";
await Deno.writeTextFile(
  "data/countries.js",
  `${HEAD}// [codice ISO 3166-1 alfa-2, continente, 1 = Stato (ONU + VA + PS) | 0 = territorio]\nexport const COUNTRIES = [\n${
    countries.map((x) => JSON.stringify(x)).join(",\n")
  },\n];\n`,
);
await Deno.writeTextFile(
  "data/world.js",
  `${HEAD}export const W = 1000, H = ${H};\nexport const LAND = ${JSON.stringify(land)};\n` +
    `export const SHAPES = {\n${
      Object.entries(shapes).map(([c, s]) => `${c}: ${JSON.stringify(s)}`).join(",\n")
    },\n};\n` +
    `export const DOTS = {\n${Object.entries(dots).map(([c, p]) => `${c}: ${JSON.stringify(p)}`).join(",\n")},\n};\n`,
);
console.log(
  `${countries.length} codici, ${STATI.size} Stati, ${Object.keys(shapes).length} forme, ${
    Object.keys(dots).length
  } punti`,
);
