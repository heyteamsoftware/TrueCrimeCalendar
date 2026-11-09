// Comprueba los guiones en formato de cintas (v3): assets/podcast/<id>.json. Ver docs/GUIA_CINTAS.md.
// Uso: node tools/validar_cintas.js [id1 id2 ...]   (sin ids: todos los que tengan cintas)
const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");
const dir = path.join(raiz, "app", "src", "main", "assets", "podcast");
const nuevosPath = path.join(raiz, "web", "datos", "casos_nuevos.json");
const nuevos = new Set(fs.existsSync(nuevosPath) ? JSON.parse(fs.readFileSync(nuevosPath, "utf8")).map(c => c.id) : []);

const TIPOS = ["hallazgo", "notas", "declaraciones", "hemeroteca", "juicio", "epilogo", "expediente"];
const NUM = ["uno", "dos", "tres", "cuatro", "cinco"];  // «Cinta uno.», «Cinta dos.»…
const palabras = s => s.trim().split(/\s+/).filter(Boolean).length;
const minutos = (w, bloques) => ((w / 160) * 60 + bloques * 0.7 + 1.5) / 60;   // minutos (incluye pausas, clics y siseo)

let ids = process.argv.slice(2);
if (!ids.length) ids = fs.readdirSync(dir).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5))
  .filter(id => { try { return Array.isArray(JSON.parse(fs.readFileSync(path.join(dir, id + ".json"), "utf8")).cintas); } catch { return false; } });

let malos = 0;
for (const id of ids) {
  const p = [];
  let g;
  try { g = JSON.parse(fs.readFileSync(path.join(dir, id + ".json"), "utf8")); }
  catch (e) { console.log(`✗ ${id}: ${e.message}`); malos++; continue; }
  const estrella = !nuevos.has(id);
  // Estrella: 2 cintas de ~5 min; nuevo: 1 cinta de ~5 min (docs/GUIA_CINTAS.md, sección 5)
  const [minC, maxC] = estrella ? [2, 2] : [1, 1];
  const [minT, maxT] = estrella ? [1400, 1600] : [700, 800];
  const [minW, maxW] = [700, 800];

  if (g.id !== id) p.push(`id "${g.id}" no coincide`);
  if (g.version !== 3) p.push("falta version: 3");
  const cintas = Array.isArray(g.cintas) ? g.cintas : [];
  if (cintas.length < minC || cintas.length > maxC) p.push(`${cintas.length} cintas (debe tener ${minC}-${maxC})`);
  const pron = g.pronunciacion || {};
  if (!pron["TRUE CRIME CALENDAR"]) p.push('falta "TRUE CRIME CALENDAR" en pronunciacion');

  let total = 0, todo = "";
  const resumen = [];
  cintas.forEach((c, i) => {
    const et = `cinta ${i + 1}`;
    if (c.n !== i + 1) p.push(`${et}: n=${c.n}`);
    if (!c.titulo) p.push(`${et}: sin titulo`);
    if (!TIPOS.includes(c.tipo)) p.push(`${et}: tipo "${c.tipo}"`);
    const b = Array.isArray(c.bloques) ? c.bloques : [];
    if (b.length < 16 || b.length > 30) p.push(`${et}: ${b.length} bloques (16-30)`);
    let w = 0, wa = 0;
    b.forEach((x, j) => {
      if (!["ximena", "alvaro"].includes(x.voz)) p.push(`${et} bloque ${j}: voz "${x.voz}"`);
      if (!x.texto || typeof x.texto !== "string") { p.push(`${et} bloque ${j}: sin texto`); return; }
      const n = palabras(x.texto);
      w += n; if (x.voz === "alvaro") wa += n;
      if (x.voz === "ximena" && n > 70) p.push(`${et} bloque ${j}: ${n} palabras (Ximena, máx. 70)`);
      if (x.voz === "alvaro" && n > 60) p.push(`${et} bloque ${j}: ${n} palabras (inspector, máx. 60)`);
      todo += " " + x.texto;
    });
    if (w < minW || w > maxW) p.push(`${et}: ${w} palabras (${minW}-${maxW})`);
    const cuota = w ? wa / w : 0;
    if (cuota < 0.2 || cuota > 0.4) p.push(`${et}: inspector ${Math.round(cuota * 100)} % (20-40 %)`);
    const inicio = b.slice(0, 2).map(x => x.texto || "");
    if (i === 0) {
      if (!/^Archivo de TRUE CRIME CALENDAR\. Expediente: .+reconstrucción basada en documentos públicos\. Las voces pertenecen al archivo, no a los protagonistas\.$/s.test((b[0] || {}).texto || ""))
        p.push("cinta 1: el primer bloque no es el aviso literal de la guía");
    }
    if (!inicio.some(t => new RegExp(`^Cinta ${NUM[i]}\\b`, "i").test(t))) p.push(`${et}: falta la etiqueta «Cinta ${NUM[i]}. …» al principio`);
    total += w;
    resumen.push(`${i + 1}:${w}p/${minutos(w, b.length).toFixed(1)}′/${c.tipo}`);
  });
  const ultima = cintas[cintas.length - 1];
  if (ultima && !/Fin del expediente/.test((ultima.bloques || []).map(x => x.texto).join(" "))) p.push("la última cinta no cierra con «Fin del expediente…»");
  if (total < minT || total > maxT) p.push(`${total} palabras en total (${minT}-${maxT})`);
  for (const k of Object.keys(pron)) if (!todo.includes(k)) p.push(`clave de pronunciación sin usar: "${k}"`);

  const mins = cintas.reduce((s, c) => s + minutos(c.bloques.reduce((a, x) => a + palabras(x.texto || ""), 0), c.bloques.length), 0);
  const cab = `${id} (${estrella ? "estrella" : "nuevo"}): ${cintas.length} cintas, ${total} palabras, ~${mins.toFixed(1)} min [${resumen.join("  ")}]`;
  if (p.length) { malos++; console.log(`✗ ${cab}\n   - ${p.join("\n   - ")}`); }
  else console.log(`✓ ${cab}`);
}
console.log(`\n${ids.length - malos}/${ids.length} correctos`);
process.exitCode = malos ? 1 : 0;
