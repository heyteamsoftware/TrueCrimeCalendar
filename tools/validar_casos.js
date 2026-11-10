// Comprueba las fichas de los casos nuevos (web/datos/casos_nuevos.json) y la cobertura del calendario.
// Uso: node tools/validar_casos.js [--dias-libres] [web/datos/fichas/<mm>.json …]
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const raiz = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(raiz, "web", "base", "calendario_v3.html"), "utf8");
const ctx = {};
vm.runInNewContext(html.slice(html.indexOf("const D = [];"), html.indexOf("const MESES")) + "\nthis.D=D;this.GROUPS=GROUPS;", ctx);
const estrellas = ctx.D;
const nuevosPath = path.join(raiz, "web", "datos", "casos_nuevos.json");
let nuevos = fs.existsSync(nuevosPath) ? JSON.parse(fs.readFileSync(nuevosPath, "utf8")) : [];
// node tools/validar_casos.js web/datos/fichas/01.json …: añade esas fichas (de un mes) a las ya unidas
const extras = process.argv.slice(2).filter(a => a.endsWith(".json"));
for (const f of extras) {
  const x = JSON.parse(fs.readFileSync(path.resolve(f), "utf8"));
  const lista = Array.isArray(x) ? x : (x.casos || []);
  nuevos = nuevos.filter(c => !lista.some(o => o.id === c.id)).concat(lista);
}

const TIPOS = ["nacimiento", "crimen", "detencion", "condena", "hallazgo", "desaparicion", "golpe"];
const FUENTES = ["hemeroteca", "libro", "judicial", "policial", "enciclopedia", "documental"];
const GRUPOS = new Set([...Object.keys(ctx.GROUPS), "sin_resolver", "golpes", "estafas", "desapariciones",
  "sectas", "errores_judiciales", "hispanoamerica"]);
const DIM = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

let malos = 0;
const ids = new Set(estrellas.map(e => e.id));
const nombres = new Map(estrellas.map(e => [norm(e.n), e.id]));
for (const c of nuevos) {
  const p = [];
  const req = ["id", "m", "d", "y", "n", "a", "v", "p", "f", "per", "st", "c", "mo", "loc", "g", "tipo_efemeride", "titulo_caso", "autor", "fuentes"];
  req.forEach(k => { if (c[k] === undefined || c[k] === "") p.push(`falta ${k}`); });
  if (ids.has(c.id)) p.push(`id repetido: ${c.id}`);
  ids.add(c.id);
  if (nombres.has(norm(c.n))) p.push(`mismo nombre que el caso estrella ${nombres.get(norm(c.n))}`);
  if (!(c.m >= 1 && c.m <= 12) || !(c.d >= 1 && c.d <= DIM[c.m - 1])) p.push(`fecha imposible ${c.d}/${c.m}`);
  if (!(c.y >= 1500 && c.y <= new Date().getFullYear() - 10)) p.push(`año ${c.y} fuera de rango (hechos de hace más de 10 años)`);
  if (!TIPOS.includes(c.tipo_efemeride)) p.push(`tipo_efemeride "${c.tipo_efemeride}"`);
  if (c.estrella !== false) p.push("estrella debe ser false");
  if (!Array.isArray(c.loc) || !c.loc.length) p.push("sin lugares");
  else c.loc.forEach((l, i) => { if (!(Math.abs(l[0]) <= 90 && Math.abs(l[1]) <= 180 && l[2])) p.push(`lugar ${i} no válido`); });
  (c.g || []).forEach(g => { if (!GRUPOS.has(g)) p.push(`grupo desconocido "${g}"`); });
  (c.vin || []).forEach(v => { if (!ids.has(v[0]) && !nuevos.some(o => o.id === v[0])) p.push(`vínculo a caso inexistente "${v[0]}"`); });
  const f = c.fuentes || [];
  if (f.length < 2) p.push(`solo ${f.length} fuentes (mínimo 2)`);
  f.forEach((x, i) => {
    if (!x.titulo || !/^https?:\/\//.test(x.url || "")) p.push(`fuente ${i} sin título o URL`);
    if (!FUENTES.includes(x.tipo)) p.push(`fuente ${i} tipo "${x.tipo}"`);
  });
  if ((c.c || "").split(/\s+/).length < 25) p.push("resumen demasiado corto");
  if (p.length) { malos++; console.log(`✗ ${c.id}: ${p.join("; ")}`); }
  else console.log(`✓ ${c.id}: ${c.d}/${c.m}/${c.y} · ${c.tipo_efemeride} · ${c.titulo_caso} · ${f.length} fuentes`);
}

// cobertura del calendario
const ocupado = new Map();
[...estrellas, ...nuevos].forEach(e => { const k = `${e.m}-${e.d}`; ocupado.set(k, (ocupado.get(k) || 0) + 1); });
const libres = [];
for (let m = 1; m <= 12; m++) for (let d = 1; d <= DIM[m - 1]; d++) if (!ocupado.has(`${m}-${d}`)) libres.push(`${d}/${m}`);
const paises = {};
nuevos.forEach(c => paises[c.p] = (paises[c.p] || 0) + 1);
console.log(`\nCasos: ${estrellas.length} estrella + ${nuevos.length} nuevos. Días cubiertos: ${366 - libres.length}/366. Libres: ${libres.length}.`);
if (nuevos.length) console.log("Países de los casos nuevos:", Object.entries(paises).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p} ${n}`).join(", "));
if (process.argv.includes("--dias-libres")) console.log("Días libres:", libres.join(" "));
console.log(`${nuevos.length - malos}/${nuevos.length} fichas correctas`);
process.exitCode = malos ? 1 : 0;
