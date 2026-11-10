// Une las fuentes de los casos estrella (web/datos/fuentes/<id>.json, una lista por caso) en web/datos/fuentes.json.
// Uso: node tools/unir_fuentes.js
const fs = require("fs");
const path = require("path");
const raiz = path.join(__dirname, "..");
const dir = path.join(raiz, "web", "datos", "fuentes");
const destino = path.join(raiz, "web", "datos", "fuentes.json");
const todo = fs.existsSync(destino) ? JSON.parse(fs.readFileSync(destino, "utf8")) : {};
const TIPOS = ["hemeroteca", "libro", "judicial", "policial", "enciclopedia", "documental"];
let n = 0, malos = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort()) {
  const id = f.slice(0, -5);
  const lista = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const p = [];
  if (!Array.isArray(lista) || lista.length < 4 || lista.length > 10) p.push(`${Array.isArray(lista) ? lista.length : 0} fuentes (4-10)`);
  (Array.isArray(lista) ? lista : []).forEach((x, i) => {
    if (!x.titulo || !/^https?:\/\//.test(x.url || "")) p.push(`fuente ${i} sin título o URL`);
    if (!TIPOS.includes(x.tipo)) p.push(`fuente ${i} tipo "${x.tipo}"`);
  });
  if (p.length) { malos++; console.log(`✗ ${id}: ${p.join("; ")}`); continue; }
  todo[id] = lista; n++;
}
fs.writeFileSync(destino, JSON.stringify(todo, null, 2) + "\n");
console.log(`${n} casos unidos; ${Object.keys(todo).length} casos estrella con fuentes.${malos ? " Con errores: " + malos : ""}`);
process.exitCode = malos ? 1 : 0;
