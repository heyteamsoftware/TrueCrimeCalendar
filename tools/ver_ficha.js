// Muestra la ficha de un caso estrella (de web/base/calendario_v3.html) o de un caso nuevo (casos_nuevos.json y fichas/).
// Uso: node tools/ver_ficha.js <id> [<id> …]
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const raiz = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(raiz, "web", "base", "calendario_v3.html"), "utf8");
const ctx = {};
vm.runInNewContext(html.slice(html.indexOf("const D = [];"), html.indexOf("const MESES")) + "\nthis.D=D;", ctx);
let todos = ctx.D.map(e => ({ ...e, estrella: true }));
const nuevosPath = path.join(raiz, "web", "datos", "casos_nuevos.json");
if (fs.existsSync(nuevosPath)) todos = todos.concat(JSON.parse(fs.readFileSync(nuevosPath, "utf8")));
const dirF = path.join(raiz, "web", "datos", "fichas");
if (fs.existsSync(dirF)) for (const f of fs.readdirSync(dirF).filter(f => /^\d\d\.json$/.test(f))) {
  try { const x = JSON.parse(fs.readFileSync(path.join(dirF, f), "utf8")); todos = todos.concat(Array.isArray(x) ? x : (x.casos || [])); } catch { /* a medio escribir */ }
}
for (const id of process.argv.slice(2)) {
  const c = todos.find(e => e.id === id);
  console.log(c ? JSON.stringify(c, null, 2) : `No existe el caso "${id}".`);
}
