// Comprueba los guiones del podcast (assets/podcast/<id>.json).
// Uso: node tools/validar_guiones.js [id1 id2 ...]   (sin ids: todos)
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "app", "src", "main", "assets", "podcast");
const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(dir).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5));

const MIN_WORDS = 700, MAX_WORDS = 830;
let bad = 0;
for (const id of ids) {
  const file = path.join(dir, id + ".json");
  const problems = [];
  let g;
  try { g = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { console.log(`✗ ${id}: ${fs.existsSync(file) ? "JSON inválido: " + e.message : "no existe"}`); bad++; continue; }

  if (g.id !== id) problems.push(`id "${g.id}" no coincide con el archivo`);
  if (!g.titulo) problems.push("falta titulo");
  if (!Array.isArray(g.bloques) || !g.bloques.length) problems.push("faltan bloques");
  if (g.pronunciacion && typeof g.pronunciacion !== "object") problems.push("pronunciacion debe ser un objeto");
  const bloques = g.bloques || [];
  let words = 0, alvaro = 0;
  bloques.forEach((b, i) => {
    if (!["ximena", "alvaro"].includes(b.voz)) problems.push(`bloque ${i}: voz "${b.voz}"`);
    if (!b.texto || typeof b.texto !== "string") { problems.push(`bloque ${i}: sin texto`); return; }
    const w = b.texto.trim().split(/\s+/).length;
    words += w;
    if (b.voz === "alvaro") { alvaro++; if (w > 30) problems.push(`bloque ${i} (álvaro) largo: ${w} palabras`); }
    else if (w > 80) problems.push(`bloque ${i} (ximena) largo: ${w} palabras`);
  });
  if (words < MIN_WORDS || words > MAX_WORDS) problems.push(`${words} palabras (objetivo ${MIN_WORDS}-${MAX_WORDS})`);
  if (bloques.length < 18 || bloques.length > 34) problems.push(`${bloques.length} bloques (objetivo 18-34)`);
  if (alvaro < 3) problems.push(`solo ${alvaro} intervenciones de Álvaro (mínimo 3)`);
  const all = bloques.map(b => b.texto).join(" ");
  if (!/TRUE CRIME CALENDAR/.test(all)) problems.push('no menciona "TRUE CRIME CALENDAR"');

  const min = ((words / 161) * 60 + bloques.length * 0.7) / 60;
  if (problems.length) { bad++; console.log(`✗ ${id}: ${problems.join("; ")}`); }
  else console.log(`✓ ${id}: ${words} palabras, ${bloques.length} bloques, ~${min.toFixed(1)} min`);
}
console.log(`\n${ids.length - bad}/${ids.length} correctos`);
process.exitCode = bad ? 1 : 0;
