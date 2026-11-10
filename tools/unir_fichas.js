// Une las fichas de cada mes (web/datos/fichas/<mm>.json) en web/datos/casos_nuevos.json.
// Las fichas que ya estaban (por ejemplo, la Dalia Negra del piloto) se conservan si ningún mes trae el mismo id.
// Uso: node tools/unir_fichas.js
const fs = require("fs");
const path = require("path");
const raiz = path.join(__dirname, "..");
const dir = path.join(raiz, "web", "datos", "fichas");
const destino = path.join(raiz, "web", "datos", "casos_nuevos.json");
let todas = fs.existsSync(destino) ? JSON.parse(fs.readFileSync(destino, "utf8")) : [];
let n = 0;
for (const f of fs.readdirSync(dir).filter(f => /^\d\d\.json$/.test(f)).sort()) {
  const x = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const lista = Array.isArray(x) ? x : (x.casos || []);
  todas = todas.filter(c => !lista.some(o => o.id === c.id)).concat(lista);
  n += lista.length;
}
todas.sort((a, b) => a.m - b.m || a.d - b.d);
fs.writeFileSync(destino, JSON.stringify(todas, null, 2) + "\n");
console.log(`${n} fichas de los meses; ${todas.length} casos nuevos en total.`);
