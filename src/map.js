// Mappa SVG: disegno, zoom e spostamento via viewBox, adattamento ai visitati, tocco su un paese.
import { DOTS, H, LAND, SHAPES, W } from "../data/world.js";

const lim = (x, a, b) => Math.min(Math.max(x, a), b);

export function mappa(tocca) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.innerHTML = `<path d="${LAND}"/>` +
    Object.entries(SHAPES).map(([c, [d]]) => `<path data-c="${c}" d="${d}"/>`).join("") +
    Object.entries(DOTS).map(([c, [x, y]]) => `<circle data-c="${c}" cx="${x}" cy="${y}"/>`).join("");
  const el = [...svg.querySelectorAll("[data-c]")];
  let vb = [0, 0, W, H];

  // cx, cy: centro; w: larghezza. L'altezza segue le proporzioni dello schermo.
  const rapporto = () => svg.clientHeight / svg.clientWidth || H / W;
  const imposta = (cx, cy, w) => {
    w = lim(w, W / 40, W);
    const h = w * rapporto();
    vb = [lim(cx, 0, W) - w / 2, lim(cy, 0, H) - h / 2, w, h];
    svg.setAttribute("viewBox", vb.join(" "));
    for (const c of svg.querySelectorAll("circle")) c.setAttribute("r", w / 250);
  };
  const riquadro = ([x0, y0, x1, y1]) =>
    imposta((x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, (y1 - y0) / rapporto()) * 1.3 + W / 25);

  // pan e pinch con i pointer event; un tocco senza movimento è un tap
  const punti = new Map();
  let mosso = 0;
  const centro = () => {
    const p = [...punti.values()];
    const c = p.reduce(([x, y], [a, b]) => [x + a / p.length, y + b / p.length], [0, 0]);
    return [c, p.length > 1 ? Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) : 0];
  };
  const sposta = ([cx0, cy0], [cx1, cy1], s) => {
    const b = svg.getBoundingClientRect(), k = vb[2] / b.width;
    const w = lim(vb[2] * s, W / 40, W), k2 = w / b.width;
    // il punto sotto le dita resta sotto le dita
    imposta(
      vb[0] + (cx0 - b.left) * k + (b.width / 2 - cx1 + b.left) * k2,
      vb[1] + (cy0 - b.top) * k + (b.height / 2 - cy1 + b.top) * k2,
      w,
    );
  };
  svg.addEventListener("pointerdown", (e) => {
    punti.set(e.pointerId, [e.clientX, e.clientY]);
    mosso = 0;
  });
  svg.addEventListener("pointermove", (e) => {
    if (!punti.has(e.pointerId)) return;
    const [c0, d0] = centro();
    punti.set(e.pointerId, [e.clientX, e.clientY]);
    const [c1, d1] = centro();
    mosso += Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) + Math.abs(d1 - d0);
    sposta(c0, c1, d0 && d1 ? d0 / d1 : 1);
  });
  const fine = (e) => {
    if (e.type === "pointerup" && punti.size === 1 && mosso < 6) {
      const c = document.elementFromPoint(e.clientX, e.clientY)?.closest?.("[data-c]")?.dataset.c;
      tocca(c ?? null, e.clientX, e.clientY);
    } else if (mosso >= 6) tocca(null);
    punti.delete(e.pointerId);
  };
  svg.addEventListener("pointerup", fine);
  svg.addEventListener("pointercancel", fine);
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const c = [e.clientX, e.clientY];
    sposta(c, c, Math.exp(e.deltaY * 0.002));
  }, { passive: false });

  const mondo = () => riquadro([0, 0, W, H]);
  return {
    svg,
    mondo,
    colora: (vis) => el.forEach((p) => p.classList.toggle("v", vis.has(p.dataset.c))),
    // avvicina ai paesi visitati (riquadro del loro poligono più grande), o mostra il mondo
    adatta(vis) {
      const bs = [...vis].map((c) => SHAPES[c]?.[1] ?? [...DOTS[c], ...DOTS[c]]);
      if (!bs.length) return mondo();
      riquadro([0, 1, 2, 3].map((i) => (i < 2 ? Math.min : Math.max)(...bs.map((b) => b[i]))));
    },
  };
}
