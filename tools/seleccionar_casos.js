// Fase 1, paso 2: elige un caso por día libre entre los candidatos, cumpliendo las cuotas del año.
// Lee web/datos/candidatos/<mm>.json y escribe web/datos/candidatos/seleccion.json y docs/SELECCION_CASOS.md.
// Uso: node tools/seleccionar_casos.js
const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");
const dir = path.join(raiz, "web", "datos", "candidatos");
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// ---------- candidatos ----------
const dias = [];   // [{m, d, cands:[…]}]
for (let m = 1; m <= 12; m++) {
  const f = path.join(dir, String(m).padStart(2, "0") + ".json");
  if (!fs.existsSync(f)) continue;
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const x of j.dias || []) {
    const cands = (x.candidatos || []).filter(c => c && c.titulo_caso && c.fecha).map(c => ({
      ...c, m, d: x.dia, anio: +String(c.fecha).slice(0, 4), clave: norm(c.titulo_caso), clave2: norm(c.protagonista),
    }));
    if (cands.length) dias.push({ m, d: x.dia, cands });
  }
}
if (!dias.length) { console.log("No hay candidatos todavía."); process.exit(0); }
const N = dias.length;

// ---------- cuotas (docs/FASE1_INVESTIGACION.md) ----------
const esHisp = c => c.region === "espana" || c.region === "hispanoamerica";
const cuotas = [
  { nombre: "España e Hispanoamérica ≥ 30 %", min: Math.ceil(0.30 * N), f: esHisp, peso: 3 },
  { nombre: "Resto de Europa ≥ 25 %", min: Math.ceil(0.25 * N), f: c => c.region === "europa", peso: 2 },
  { nombre: "EE. UU. y Canadá ≤ 30 %", max: Math.floor(0.30 * N), f: c => c.region === "eeuu_canada", peso: 2 },
  { nombre: "Asia, África, Oceanía y Oriente Medio ≥ 15", min: Math.min(15, N), f: c => ["asia", "africa", "oceania", "oriente_medio"].includes(c.region), peso: 2 },
  { nombre: "Asesinos en serie ≤ 35 %", max: Math.floor(0.35 * N), f: c => c.tipo_caso === "asesino_en_serie", peso: 2 },
  { nombre: "Sin resolver y desapariciones ≥ 15 %", min: Math.ceil(0.15 * N), f: c => ["sin_resolver", "desaparicion"].includes(c.tipo_caso), peso: 1.5 },
  { nombre: "Golpes, estafas y secuestros ≥ 10 %", min: Math.ceil(0.10 * N), f: c => ["golpe", "estafa", "secuestro"].includes(c.tipo_caso), peso: 1.5 },
  { nombre: "Errores judiciales ≥ 8", min: Math.min(8, N), f: c => c.tipo_caso === "error_judicial", peso: 1 },
  { nombre: "Antes de 1900 ≥ 10 %", min: Math.ceil(0.10 * N), f: c => c.anio < 1900, peso: 1 },
];

function coste(sel) {
  let p = 0;
  for (const q of cuotas) {
    const n = sel.filter(q.f).length;
    if (q.min != null && n < q.min) p += (q.min - n) * q.peso;
    if (q.max != null && n > q.max) p += (n - q.max) * q.peso;
  }
  // el mismo caso en dos días: prohibido en la práctica
  const vistos = new Map();
  for (const c of sel) for (const k of [c.clave, c.clave2]) { if (!k) continue; vistos.set(k, (vistos.get(k) || 0) + 1); }
  for (const v of vistos.values()) if (v > 1) p += 100 * (v - 1);
  // preferir candidatos sin riesgos señalados
  p += sel.filter(c => (c.riesgos || "").trim()).length * 0.15;
  return p;
}

// ---------- selección: voraz + mejora local ----------
const eleccion = dias.map(x => 0);
const sel = () => dias.map((x, i) => x.cands[eleccion[i]]);
let mejor = coste(sel()), mejoro = true, vueltas = 0;
while (mejoro && vueltas < 50) {
  mejoro = false; vueltas++;
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < dias[i].cands.length; k++) {
      if (k === eleccion[i]) continue;
      const antes = eleccion[i]; eleccion[i] = k;
      const c = coste(sel());
      if (c < mejor - 1e-9) { mejor = c; mejoro = true; } else eleccion[i] = antes;
    }
  }
}
const final = sel();

// ---------- salida ----------
const out = final.map(c => ({ m: c.m, d: c.d, ...Object.fromEntries(Object.entries(c).filter(([k]) => !["m", "d", "clave", "clave2", "anio"].includes(k))) }));
fs.writeFileSync(path.join(dir, "seleccion.json"), JSON.stringify(out, null, 1));

let md = `# Selección de casos nuevos (fase 1, paso 2)\n\nGenerada con \`node tools/validar_candidatos.js\` y \`node tools/seleccionar_casos.js\`. Hay ${N} días con candidatos.\n\n## Cuotas\n\n| Cuota | Resultado | |\n|---|---|---|\n`;
for (const q of cuotas) {
  const n = final.filter(q.f).length;
  const ok = (q.min == null || n >= q.min) && (q.max == null || n <= q.max);
  md += `| ${q.nombre} | ${n} de ${N} (${Math.round(100 * n / N)} %) | ${ok ? "✓" : "✗"} |\n`;
}
const dup = new Map(); final.forEach(c => dup.set(c.clave, (dup.get(c.clave) || 0) + 1));
const repes = [...dup].filter(([, v]) => v > 1).map(([k]) => k);
md += `\nCasos repetidos en dos días: ${repes.length ? repes.join(", ") : "ninguno"}.\n`;
for (let m = 1; m <= 12; m++) {
  const delMes = final.filter(c => c.m === m).sort((a, b) => a.d - b.d);
  if (!delMes.length) continue;
  md += `\n## ${MESES[m - 1][0].toUpperCase() + MESES[m - 1].slice(1)}\n\n| Día | Caso | Fecha clave | País | Tipo | Por qué | Riesgos |\n|---|---|---|---|---|---|---|\n`;
  for (const c of delMes) {
    md += `| ${c.d} | **${c.titulo_caso}** (${c.protagonista}) | ${c.tipo_efemeride}, ${c.fecha.slice(0, 4)} | ${c.pais} | ${c.tipo_caso.replace(/_/g, " ")} | ${String(c.por_que).replace(/\|/g, "/")} | ${String(c.riesgos || "").replace(/\|/g, "/")} |\n`;
  }
}
fs.writeFileSync(path.join(raiz, "docs", "SELECCION_CASOS.md"), md);
console.log(md.split("\n## Enero")[0]);
