// Busca casos que podrían estar repetidos: dos fichas (o una ficha y un caso estrella) que comparten
// un nombre propio poco común en el nombre, el título, el apodo o el autor. No todo lo que sale es un
// repetido (puede ser un vínculo), pero hay que mirarlo.
// Uso: node tools/buscar_repetidos.js [palabra …]   (con palabras: solo busca esas)
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const raiz = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(raiz, "web", "base", "calendario_v3.html"), "utf8");
const ctx = {};
vm.runInNewContext(html.slice(html.indexOf("const D = [];"), html.indexOf("const MESES")) + "\nthis.D=D;", ctx);
let casos = ctx.D.map(e => ({ ...e, origen: "estrella" }));
const nuevosPath = path.join(raiz, "web", "datos", "casos_nuevos.json");
if (fs.existsSync(nuevosPath)) casos = casos.concat(JSON.parse(fs.readFileSync(nuevosPath, "utf8")).map(c => ({ ...c, origen: "nuevo" })));
const dirF = path.join(raiz, "web", "datos", "fichas");
for (const f of fs.readdirSync(dirF).filter(f => /^\d\d\.json$/.test(f))) {
  try {
    const x = JSON.parse(fs.readFileSync(path.join(dirF, f), "utf8"));
    for (const c of Array.isArray(x) ? x : (x.casos || [])) { casos = casos.filter(o => o.id !== c.id); casos.push({ ...c, origen: "fichas/" + f }); }
  } catch { console.log(`(${f} está a medio escribir)`); }
}
const sinT = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const COMUNES = new Set(sinT(`el la los las del de una caso asesinato crimen secuestro robo atentado banda masacre matanza atraco muerte
 desaparicion detencion condena juicio nace captura hallazgo fuga gran gran presidente rey reina general padre san santa
 banco museo tren vuelo hotel calle plaza nueva york londres madrid barcelona paris mexico buenos aires estados unidos
 juan jose maria luis carlos antonio francisco manuel pedro miguel rafael john william james charles george robert thomas
 henry mary anna joseph jean paul david michael richard edward martin peter jack frank albert louis desconocido atribuido
 condenado acusado absuelto policia guardia ejercito comando grupo operacion cartel fraccion movimiento organizacion
 hermanos familia asesino ladron estafa estafador misterio misteriosa tragedia ejecucion incendio bomba`).split(/\s+/));
const fichaDe = c => `${c.d}/${c.m} ${c.id} (${c.origen})`;
const idx = new Map();
for (const c of casos) {
  const texto = [c.n, c.a, c.titulo_caso, c.autor].filter(Boolean).join(" ");
  const palabras = new Set((texto.match(/[A-ZÁÉÍÓÚÑÜ][\wáéíóúñüÁÉÍÓÚÑÜ'-]{3,}/g) || []).map(sinT).filter(p => !COMUNES.has(p)));
  for (const p of palabras) { if (!idx.has(p)) idx.set(p, []); idx.get(p).push(c); }
}
const buscar = process.argv.slice(2).map(sinT);
let n = 0;
for (const [p, lista] of [...idx].sort()) {
  if (buscar.length ? !buscar.includes(p) : lista.length < 2) continue;
  const nuevos = lista.filter(c => c.origen !== "estrella");
  if (!buscar.length && !nuevos.length) continue;
  console.log(`${p}: ${lista.map(fichaDe).join(" · ")}`); n++;
}
console.log(`\n${n} coincidencias en ${casos.length} casos.`);
