// Genera un corto vertical (1080x1920, MP4) de un caso para YouTube Shorts, TikTok e Instagram Reels,
// a partir de su guion corto (tools/cortos/guiones/<id>.json), más la portada y los textos para cada red.
//
// Uso: node tools/cortos/generar_corto.js <id> [--fecha AAAA-MM-DD] [--hilos 3] [--rehacer-voz]
//   --fecha: día de publicación (por defecto, el próximo aniversario del caso).
// Resultado: cortos/<MM-DD>_<id>/corto.mp4, portada.jpg y textos.txt (la carpeta cortos/ no va en git).
// Cómo: tools/cortos/voz_corto.py hace la voz y el sonido; Edge sin ventana pinta cada fotograma con
// tools/cortos/plantilla.html (varios Edge a la vez) y ffmpeg une los fotogramas con el audio.
const fs = require("fs"), path = require("path"), vm = require("vm"), os = require("os");
const { spawn, spawnSync } = require("child_process");

const RAIZ = path.resolve(__dirname, "..", "..");
const ASSETS = path.join(RAIZ, "app", "src", "main", "assets");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PLAY = "https://play.google.com/store/apps/details?id=com.heyteamsoftware.truecrimecalendar";
const WEB = "https://myappsserver.duckdns.org/truecrimescalendar/truecrime.html";
const FPS = 30;
const LAMP = ["#f2a43c", "#ee8fa6", "#a6d06a", "#b9a2ee", "#e6e05a", "#5fd0bd", "#f58a5a", "#f7b955", "#cfc27a", "#ef7f6b", "#d9a27a", "#8fc1e6"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MES3 = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const EFEM = { nacimiento: "del nacimiento", crimen: "del crimen", detencion: "de la detención", condena: "de la condena",
  hallazgo: "del hallazgo", desaparicion: "de la desaparición", golpe: "del golpe" };

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const CON_VALOR = ["--fecha", "--hilos", "--muestras"];
const ID = args.find((a, i) => !a.startsWith("--") && !CON_VALOR.includes(args[i - 1]));
if (!ID) { console.error("Uso: node tools/cortos/generar_corto.js <id> [--fecha AAAA-MM-DD] [--hilos 3] [--rehacer-voz]"); process.exit(1); }
const HILOS = Number(opt("--hilos", 3));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const pad = (n, k = 2) => String(n).padStart(k, "0");

// ---------- datos del caso (los mismos que usa la app) ----------
function caso(id) {
  const html = fs.readFileSync(path.join(ASSETS, "index.html"), "utf8");
  const ctx = {};
  vm.runInNewContext(html.slice(html.indexOf("const D = [];"), html.indexOf("const GROUPS")) + "\nthis.D = D;", ctx);
  const i = ctx.D.findIndex(e => e.id === id);
  if (i < 0) throw new Error("No existe el caso " + id);
  const e = ctx.D[i];
  const vc = !!(e.autor && norm(e.autor).trim() !== norm(e.n).trim());
  const t = norm(e.tipo_efemeride).replace(/[^a-z]/g, "");
  return { ...e, i, titulo: vc ? (e.titulo_caso || e.n) : e.n, alias: !vc && e.a ? "«" + e.a + "»" : (vc && e.titulo_caso ? e.n : ""),
    tipo: EFEM[t] ? t : "nacimiento", estrella: e.estrella !== false };
}

function fechaPublicacion(e) {
  const f = opt("--fecha");
  if (f) { const [y, m, d] = f.split("-").map(Number); return { y, m, d }; }
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  let y = hoy.getFullYear();
  if (new Date(y, e.m - 1, e.d) < hoy) y++;
  return { y, m: e.m, d: e.d };
}

function efem(e, anios) {
  const a = anios === 1 ? "1 año" : anios + " años";
  return e.tipo === "nacimiento" ? `Nació un día como hoy · hace ${a}` : `Hoy hace ${a} ${EFEM[e.tipo]}`;
}

// ---------- textos para cada red ----------
// título de YouTube: frases enteras del gancho hasta 90 caracteres (nunca cortado a media palabra)
function tituloYT(gancho) {
  let t = "";
  for (const f of gancho.match(/[^.!?]+[.!?]*/g) || [gancho]) {
    if ((t + f).trim().length > 90) break;
    t += f;
  }
  t = t.trim() || gancho.slice(0, 90).replace(/\s+\S*$/, "") + "…";
  return t;
}
function textos(e, pub, guion, anios) {
  const gancho = guion.escenas.filter(s => s.tipo === "gancho").map(s => s.texto).join(" ");
  const pais = "#" + e.p.toLowerCase().replace(/ñ/g, "\u0001").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0001/g, "ñ").replace(/[^a-zñ]/g, "");
  const tags = ["#truecrime", "#truecrimeespañol", "#crimenesreales", "#undiacomohoy", "#misterio", pais];
  const fecha = `${e.d} de ${MESES[e.m - 1]} de ${e.y}`;
  const quien = e.titulo + (e.alias ? ", " + e.alias : "");
  return [
    `Publicar el ${pub.d} de ${MESES[pub.m - 1]} de ${pub.y} (${efem(e, anios).toLowerCase()})`, "",
    "=== YOUTUBE SHORTS ===", "Título:", tituloYT(gancho) + " #shorts", "",
    "Descripción:",
    `${quien} (${fecha}). ${gancho}`, "",
    "La historia completa, contada en cintas, está en TRUE CRIME CALENDAR: un caso criminal real para cada día del año. Gratis y sin anuncios.",
    `▶ Google Play: ${PLAY}`, `▶ Web: ${WEB}`, "",
    "Reconstrucción basada en documentos públicos. Narración con voz sintética.", "",
    tags.join(" "), "Al subir: «contenido alterado o sintético» → Sí (voz generada).", "",
    "=== TIKTOK ===",
    `${gancho} ${quien}. 🎧 La historia completa, en la app TRUE CRIME CALENDAR (gratis en Google Play). Voz sintética. ${tags.join(" ")}`,
    "Al subir: activar «Contenido generado por IA».", "",
    "=== INSTAGRAM REELS ===", `${gancho}`, "", `${quien} (${fecha}).`, "",
    "🎧 La historia completa, contada en cintas, en la app TRUE CRIME CALENDAR (gratis en Google Play). Narración con voz sintética.", "",
    tags.join(" "), "Al subir: activar la etiqueta «Información de IA».", "",
  ].join("\n");
}

// ---------- fuentes de la app, incrustadas (la plantilla se abre como archivo) ----------
function fuentesCss() {
  const dir = path.join(ASSETS, "fonts");
  return fs.readFileSync(path.join(dir, "fonts.css"), "utf8").replace(
    /url\(https:\/\/appassets\.androidplatform\.net\/assets\/fonts\/([^)]+)\)/g,
    (_, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(dir, f)).toString("base64")})`);
}

// ---------- un Edge sin ventana con la plantilla cargada ----------
async function navegador(datos, puerto) {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "tcc-corto-"));
  const edge = spawn(EDGE, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-color-profile=srgb",
    `--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
  let pg = null;
  for (let i = 0; i < 40 && !pg; i++) { await sleep(500); try { pg = (await (await fetch(`http://127.0.0.1:${puerto}/json`)).json()).find(t => t.type === "page"); } catch (_) {} }
  if (!pg) throw new Error("Edge no arranca");
  const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(o => ws.onopen = o);
  let n = 0; const pend = new Map();
  ws.onmessage = m => { const r = JSON.parse(m.data); if (pend.has(r.id)) { pend.get(r.id)(r); pend.delete(r.id); } };
  const cdp = (method, params = {}) => new Promise(ok => { const id = ++n; pend.set(id, ok); ws.send(JSON.stringify({ id, method, params })); });
  const js = async expr => { const r = await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result.result.value; };
  await cdp("Page.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: "file:///" + path.join(__dirname, "plantilla.html").replace(/\\/g, "/") });
  await sleep(1200);
  await js(`(()=>{const s=document.createElement("style");s.textContent=${JSON.stringify(fuentesCss())};document.head.appendChild(s);})()`);
  await js(`preparar(${JSON.stringify(datos)})`);
  const foto = async (t, archivo, calidad = 90) => {
    await js(`pintar(${t.toFixed(4)})`);
    fs.writeFileSync(archivo, Buffer.from((await cdp("Page.captureScreenshot", { format: "jpeg", quality: calidad, optimizeForSpeed: true })).result.data, "base64"));
  };
  const cerrar = () => { try { ws.close(); } catch (_) {} edge.kill(); setTimeout(() => { try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (_) {} }, 1500); };
  return { foto, cerrar };
}

async function main() {
  const e = caso(ID);
  const guion = JSON.parse(fs.readFileSync(path.join(__dirname, "guiones", ID + ".json"), "utf8"));
  const pub = fechaPublicacion(e);
  const anios = pub.y - e.y;
  const dir = path.join(RAIZ, "cortos", `${pad(pub.m)}-${pad(pub.d)}_${ID}`);
  fs.mkdirSync(dir, { recursive: true });
  // la voz se rehace si se pide o si el texto hablado del guion ya no es el que se grabó
  const ficheroT = path.join(dir, "tiempos.json");
  const grabado = fs.existsSync(ficheroT) ? JSON.parse(fs.readFileSync(ficheroT, "utf8")) : null;
  const hablado = s => s.map(x => (x.voz || "ximena") + "|" + x.texto).join("\n");
  if (args.includes("--rehacer-voz") || !grabado || hablado(grabado.escenas) !== hablado(guion.escenas)) {
    const r = spawnSync("python", [path.join(__dirname, "voz_corto.py"), ID, dir], { stdio: "inherit" });
    if (r.status) throw new Error("voz_corto.py ha fallado");
  }
  const tiempos = JSON.parse(fs.readFileSync(ficheroT, "utf8"));
  // lo visual (rótulos, cifras, palabra clave…) siempre sale del guion actual
  tiempos.escenas = tiempos.escenas.map((s, k) => ({ ...guion.escenas[k], t0: s.t0, t1: s.t1, palabras: s.palabras }));
  const datos = { ...tiempos, lamp: guion.acento || LAMP[e.m - 1], exp: `${e.y}-${pad(e.i + 1, 3)}`, dia: `${e.d} · ${MES3[e.m - 1]} · ${e.y}`,
    titulo: e.titulo, alias: e.alias, efem: efem(e, anios), lugar: [e.p, e.per].filter(Boolean).join(" · "),
    estrella: e.estrella, icono: "data:image/png;base64," + fs.readFileSync(path.join(RAIZ, "play", "icono-512.png")).toString("base64") };
  fs.writeFileSync(path.join(dir, "textos.txt"), textos(e, pub, guion, anios), "utf8");

  if (opt("--muestras")) {                     // --muestras 1.5,8,20: solo esos fotogramas, para revisar el diseño
    const b = await navegador(datos, 9390);
    try {
      for (const t of opt("--muestras").split(",").map(Number)) await b.foto(t, path.join(dir, `muestra_${t}.jpg`), 85);
    } finally { b.cerrar(); }
    console.log("muestras en", path.relative(RAIZ, dir));
    return;
  }
  const fotos = path.join(dir, "_fotos");
  fs.rmSync(fotos, { recursive: true, force: true }); fs.mkdirSync(fotos);
  const total = Math.ceil(tiempos.duracion * FPS);
  const t0 = Date.now();
  let hechos = 0;
  const base = 9400 + Math.floor(Math.random() * 300);
  const nav = await Promise.all(Array.from({ length: HILOS }, (_, h) => navegador(datos, base + h)));
  try {
    // portada: el gancho ya entero en pantalla
    const g = tiempos.escenas[0];
    await nav[0].foto(Math.min(g.t1 - 0.05, g.t0 + 1.6), path.join(dir, "portada.jpg"), 92);
    await Promise.all(nav.map(async (b, h) => {
      for (let f = h; f < total; f += HILOS) {
        await b.foto(f / FPS, path.join(fotos, `f${pad(f, 5)}.jpg`));
        if (++hechos % (FPS * 5) === 0) process.stdout.write(`  ${Math.round(hechos / FPS)}s/${Math.round(tiempos.duracion)}s\r`);
      }
    }));
  } finally { nav.forEach(b => b.cerrar()); }
  const pintado = Math.round((Date.now() - t0) / 1000);
  const salida = path.join(dir, "corto.mp4");
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(FPS), "-i", path.join(fotos, "f%05d.jpg"),
    "-i", path.join(dir, "audio.wav"), "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
    // volumen igualado entre cortos (-14 LUFS, el que usan YouTube, TikTok e Instagram)
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-shortest", "-movflags", "+faststart", salida], { stdio: "inherit" });
  if (r.status) throw new Error("ffmpeg ha fallado");
  fs.rmSync(fotos, { recursive: true, force: true });
  console.log(`✓ ${path.relative(RAIZ, salida)} (${(fs.statSync(salida).size / 1048576).toFixed(1)} MB; fotogramas en ${pintado} s, total ${Math.round((Date.now() - t0) / 1000)} s)`);
}

main().catch(err => { console.error(err.message || err); process.exit(1); });
