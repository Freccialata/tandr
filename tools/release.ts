// Scrive in sw.js la versione della cache (hash dei file) e controlla che FILES elenchi
// esattamente i file dell'app. Uso: deno task release
const sw = await Deno.readTextFile("sw.js");
const files = [...sw.match(/const FILES = \[([^\]]*)\]/)![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

// file dell'app: html/css/manifest/icone nella radice, tutto in src/, data/, vendor/
const app = (p: string) => /^(src|data|vendor)\/|^[^/]+\.(html|css|webmanifest|svg|png)$/.test(p);
const presenti: string[] = [];
const visita = async (dir: string) => {
  for await (const e of Deno.readDir(dir || ".")) {
    const p = dir + e.name;
    if (e.isDirectory && !p.startsWith(".")) await visita(p + "/");
    else if (e.isFile && app(p)) presenti.push(p);
  }
};
await visita("");

const elencati = files.filter((f) => f !== "./");
const mancano = presenti.filter((f) => !elencati.includes(f)), inutili = elencati.filter((f) => !presenti.includes(f));
if (mancano.length || inutili.length) {
  console.error(
    `FILES in sw.js non corrisponde.\n  da aggiungere: ${mancano.join(" ") || "-"}\n  da togliere: ${
      inutili.join(" ") || "-"
    }`,
  );
  Deno.exit(1);
}

const dati = await new Blob(await Promise.all(elencati.toSorted().map((f) => Deno.readFile(f)))).arrayBuffer();
const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", dati))].slice(0, 4)
  .map((b) => b.toString(16).padStart(2, "0")).join("");
await Deno.writeTextFile("sw.js", sw.replace(/const V = ".*?";/, `const V = "${hash}";`));
console.log(`sw.js: versione ${hash}, ${elencati.length} file`);
