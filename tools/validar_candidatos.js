// Comprueba los candidatos de la fase 1 (web/datos/candidatos/<mm>.json). Ver docs/FASE1_INVESTIGACION.md.
// Uso: node tools/validar_candidatos.js [mes1 mes2 ...]   (sin meses: todos los que existan)
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "web", "datos", "candidatos");
const libres = JSON.parse(fs.readFileSync(path.join(dir, "dias_libres.json"), "utf8"));
const existentes = JSON.parse(fs.readFileSync(path.join(dir, "casos_existentes.json"), "utf8"));
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const yaEnArchivo = new Set(existentes.flatMap(e => [norm(e.nombre), norm(e.caso)].filter(Boolean)));

const TIPOS_EF = ["nacimiento", "crimen", "detencion", "condena", "hallazgo", "desaparicion", "golpe"];
const TIPOS_CASO = ["asesino_en_serie", "asesinato", "sin_resolver", "desaparicion", "envenenamiento", "golpe", "estafa",
  "secuestro", "secta", "error_judicial", "magnicidio", "historico", "otro"];
const REGIONES = ["espana", "hispanoamerica", "europa", "eeuu_canada", "asia", "africa", "oceania", "oriente_medio"];
const LIMITE = new Date().getFullYear() - 10;

let meses = process.argv.slice(2).map(Number);
if (!meses.length) meses = fs.readdirSync(dir).filter(f => /^\d\d\.json$/.test(f)).map(f => +f.slice(0, 2));
let malos = 0;
for (const m of meses) {
  const f = path.join(dir, String(m).padStart(2, "0") + ".json");
  if (!fs.existsSync(f)) { console.log(`✗ mes ${m}: no existe ${path.basename(f)}`); malos++; continue; }
  let j; try { j = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.log(`✗ mes ${m}: JSON inválido: ${e.message}`); malos++; continue; }
  const p = [];
  const esperados = libres[m] || [];
  const dias = new Map((j.dias || []).map(d => [d.dia, d]));
  for (const d of esperados) {
    const e = dias.get(d);
    if (!e) { p.push(`día ${d}: falta`); continue; }
    const cs = e.candidatos || [];
    if (cs.length < 2) p.push(`día ${d}: ${cs.length} candidatos (mínimo 2, ideal 3)`);
    cs.forEach((c, i) => {
      const k = `día ${d} cand. ${i + 1}`;
      ["titulo_caso", "protagonista", "fecha", "tipo_efemeride", "pais", "region", "tipo_caso", "resumen", "por_que"].forEach(x => { if (!c[x]) p.push(`${k}: falta ${x}`); });
      const fm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(c.fecha || "");
      if (!fm) p.push(`${k}: fecha "${c.fecha}" (AAAA-MM-DD)`);
      else {
        if (+fm[2] !== m || +fm[3] !== d) p.push(`${k}: la fecha ${c.fecha} no es el ${d}/${m}`);
        if (+fm[1] > LIMITE) p.push(`${k}: hechos de ${fm[1]} (deben tener más de 10 años)`);
      }
      if (!TIPOS_EF.includes(c.tipo_efemeride)) p.push(`${k}: tipo_efemeride "${c.tipo_efemeride}"`);
      if (!TIPOS_CASO.includes(c.tipo_caso)) p.push(`${k}: tipo_caso "${c.tipo_caso}"`);
      if (!REGIONES.includes(c.region)) p.push(`${k}: region "${c.region}"`);
      const urls = (c.fuentes_fecha || []).filter(u => /^https?:\/\//.test(u));
      if (urls.length < 2) p.push(`${k}: ${urls.length} fuentes de la fecha (mínimo 2)`);
      if (yaEnArchivo.has(norm(c.protagonista)) || yaEnArchivo.has(norm(c.titulo_caso))) p.push(`${k}: ya está en el archivo (${c.protagonista})`);
    });
  }
  for (const d of dias.keys()) if (!esperados.includes(d)) p.push(`día ${d}: no es un día libre`);
  const n = [...dias.values()].reduce((s, d) => s + (d.candidatos || []).length, 0);
  if (p.length) { malos++; console.log(`✗ mes ${m} (${n} candidatos para ${esperados.length} días):\n   - ${p.slice(0, 40).join("\n   - ")}${p.length > 40 ? `\n   … y ${p.length - 40} más` : ""}`); }
  else console.log(`✓ mes ${m}: ${n} candidatos para ${esperados.length} días`);
}
process.exitCode = malos ? 1 : 0;
