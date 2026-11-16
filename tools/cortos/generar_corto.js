// Genera un corto vertical (1080x1920, MP4) de un caso para YouTube Shorts, TikTok e Instagram Reels,
// más un texto con título, descripción y etiquetas para cada red.
//
// Uso: node tools/cortos/generar_corto.js <id> [--fecha AAAA-MM-DD] [--cinta 1] [--fps 30] [--rehacer-audio]
// El navegador (Edge sin ventana) dibuja las capas fijas con la plantilla y ffmpeg las anima y las une con el audio.
//   --fecha: día de publicación (por defecto, el próximo aniversario del caso). Sale en el vídeo: «Un día como hoy».
// Resultado: cortos/<MM-DD>_<id>/corto.mp4, portada.jpg y textos.txt (la carpeta cortos/ no va en git).
// Necesita: Edge (modo sin ventana), ffmpeg y la cinta en cintas/<id>/ (tools/generar_cintas.py).
const fs = require("fs"), path = require("path"), vm = require("vm"), os = require("os");
const { spawn, spawnSync } = require("child_process");

const RAIZ = path.resolve(__dirname, "..", "..");
const ASSETS = path.join(RAIZ, "app", "src", "main", "assets");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PLAY = "https://play.google.com/store/apps/details?id=com.heyteamsoftware.truecrimecalendar";
const WEB = "https://myappsserver.duckdns.org/truecrimescalendar/truecrime.html";
const LAMP = ["#f2a43c", "#ee8fa6", "#a6d06a", "#b9a2ee", "#e6e05a", "#5fd0bd", "#f58a5a", "#f7b955", "#cfc27a", "#ef7f6b", "#d9a27a", "#8fc1e6"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MES3 = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const EFEM = { nacimiento: "del nacimiento", crimen: "del crimen", detencion: "de la detención", condena: "de la condena",
  hallazgo: "del hallazgo", desaparicion: "de la desaparición", golpe: "del golpe" };

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const CON_VALOR = ["--fecha", "--cinta", "--fps"];
const ID = args.find((a, i) => !a.startsWith("--") && !CON_VALOR.includes(args[i - 1]));
if (!ID) { console.error("Uso: node tools/cortos/generar_corto.js <id> [--fecha AAAA-MM-DD] [--cinta 1] [--fps 30]"); process.exit(1); }
const CINTA = Number(opt("--cinta", 1)), FPS = Number(opt("--fps", 30));
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
  const titulo = vc ? (e.titulo_caso || e.n) : e.n;
  const t = norm(e.tipo_efemeride).replace(/[^a-z]/g, "");
  return { ...e, i, titulo, sub: vc ? (titulo !== e.n ? e.n : "") : (e.a ? "«" + e.a + "»" : ""),
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
function textos(e, pub, au, anios) {
  const fecha = `${e.d} de ${MESES[e.m - 1]} de ${e.y}`;
  const resumen = String(e.c || "").split(/(?<=\.)\s+/).slice(0, 2).join(" ");
  const pais = "#" + e.p.toLowerCase().replace(/ñ/g, "\u0001").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\u0001/g, "ñ").replace(/[^a-zñ]/g, "");
  const tags = ["#truecrime", "#truecrimeespañol", "#crimenesreales", "#undiacomohoy", "#historia", pais];
  const yt = `${e.titulo} · Un día como hoy`.slice(0, 92) + " #shorts";
  const efe = efem(e, anios);
  return [
    `Publicar el ${pub.d} de ${MESES[pub.m - 1]} de ${pub.y}`,
    "",
    "=== YOUTUBE SHORTS ===",
    "Título:", yt, "",
    "Descripción:",
    `${efe} (${fecha}). ${resumen}`, "",
    `Esto es el principio de la cinta ${au.cinta} («${au.titulo}»). El caso completo, ${au.cintas === 1 ? "en su cinta" : "en sus " + au.cintas + " cintas"} (unos ${au.minutos} minutos), está en TRUE CRIME CALENDAR: un caso criminal real para cada día del año.`,
    `▶ Google Play: ${PLAY}`, `▶ Web: ${WEB}`, "",
    "Reconstrucción basada en documentos públicos. Narración con voz sintética.", "",
    tags.join(" "),
    "Al subir: marcar «contenido alterado o sintético» → Sí (voz generada).", "",
    "=== TIKTOK ===",
    `${efe}: ${e.titulo}. La cinta completa, en la app TRUE CRIME CALENDAR (enlace en el perfil). Voz sintética. ${tags.join(" ")}`,
    "Al subir: activar «Contenido generado por IA».", "",
    "=== INSTAGRAM REELS ===",
    `${efe}: ${e.titulo}.`, "",
    `${resumen}`, "",
    "🎧 La cinta completa, en la app TRUE CRIME CALENDAR (enlace en la bio). Narración con voz sintética.", "",
    tags.join(" "),
    "Al subir: activar la etiqueta «Información de IA».", "",
  ].join("\n");
}

// ---------- fuentes de la app, incrustadas (la plantilla se abre como archivo) ----------
function fuentesCss() {
  const dir = path.join(ASSETS, "fonts");
  return fs.readFileSync(path.join(dir, "fonts.css"), "utf8").replace(
    /url\(https:\/\/appassets\.androidplatform\.net\/assets\/fonts\/([^)]+)\)/g,
    (_, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(dir, f)).toString("base64")})`);
}

async function main() {
  const e = caso(ID);
  const pub = fechaPublicacion(e);
  const anios = pub.y - e.y;
  const dir = path.join(RAIZ, "cortos", `${pad(pub.m)}-${pad(pub.d)}_${ID}`);
  fs.mkdirSync(dir, { recursive: true });
  if (args.includes("--rehacer-audio") || !fs.existsSync(path.join(dir, "audio.json"))) {
    const r = spawnSync("python", [path.join(__dirname, "preparar_audio.py"), ID, dir, "--cinta", String(CINTA)], { stdio: "inherit" });
    if (r.status) throw new Error("preparar_audio.py ha fallado");
  }
  const au = JSON.parse(fs.readFileSync(path.join(dir, "audio.json"), "utf8"));
  const datos = { ...au, lamp: LAMP[e.m - 1], hoy: `UN DÍA COMO HOY · ${pub.d} DE ${MESES[pub.m - 1].toUpperCase()}`,
    exp: `${e.y}-${pad(e.i + 1, 3)}`, dia: `${pub.d} · ${MES3[pub.m - 1].toUpperCase()}`, anio: String(e.y),
    titulo: e.titulo, sub: e.sub, efem: efem(e, anios), pais: e.p,
    cintasTxt: `${au.cintas} ${au.cintas === 1 ? "CINTA" : "CINTAS"} · ${au.minutos} MIN`, tituloCinta: au.titulo,
    estrella: e.estrella, icono: "data:image/png;base64," + fs.readFileSync(path.join(RAIZ, "play", "icono-512.png")).toString("base64") };
  fs.writeFileSync(path.join(dir, "textos.txt"), textos(e, pub, au, anios), "utf8");

  // ---------- Edge sin ventana, fotograma a fotograma ----------
  const PORT = 9400 + Math.floor(Math.random() * 400);
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "tcc-corto-"));
  const edge = spawn(EDGE, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-color-profile=srgb",
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${perfil}`, "--no-first-run", "about:blank"], { stdio: "ignore" });

  try {
    let pg = null;
    for (let i = 0; i < 40 && !pg; i++) { await sleep(500); try { pg = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === "page"); } catch (_) {} }
    const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(o => ws.onopen = o);
    let n = 0; const pend = new Map();
    ws.onmessage = m => { const r = JSON.parse(m.data); if (pend.has(r.id)) { pend.get(r.id)(r); pend.delete(r.id); } };
    const cdp = (method, params = {}) => new Promise(ok => { const id = ++n; pend.set(id, ok); ws.send(JSON.stringify({ id, method, params })); });
    const js = async expr => { const r = await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 500)); return r.result.result.value; };
    await cdp("Page.enable");
    await cdp("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
    await cdp("Page.navigate", { url: "file:///" + path.join(__dirname, "plantilla.html").replace(/\\/g, "/") });
    await sleep(1500);
    await js(`(()=>{const s=document.createElement("style");s.textContent=${JSON.stringify(fuentesCss())};document.head.appendChild(s);})()`);
    const medida = await js(`preparar(${JSON.stringify(datos)})`);
    console.log(`${ID}: ficha ${medida.ficha}px, título ${medida.fs}px, ${au.duracion}s a ${FPS} fps`);

    // portada (para la miniatura): la ficha con el primer subtítulo, pintada entera en el navegador
    await js(`pintar(2.2)`);
    fs.writeFileSync(path.join(dir, "portada.jpg"), Buffer.from((await cdp("Page.captureScreenshot", { format: "jpeg", quality: 92 })).result.data, "base64"));

    // capas: el navegador dibuja lo fijo una vez y ffmpeg anima bobinas, barra, contador, subtítulos y cierre
    const capas = path.join(dir, "_capas");
    fs.rmSync(capas, { recursive: true, force: true }); fs.mkdirSync(capas);
    const foto = async (archivo, clip) => fs.writeFileSync(path.join(capas, archivo),
      Buffer.from((await cdp("Page.captureScreenshot", { format: "png", ...(clip ? { clip: { ...clip, scale: 1 } } : {}) })).result.data, "base64"));
    await js(`capa("fondo")`); await foto("fondo.png");
    await js(`capa("cierre")`); await foto("cierre.png");
    await cdp("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    const SUB_H = 300;
    for (let k = 0; k < au.subs.length; k++) {
      await js(`capa("sub",${k})`);
      await foto(`sub${k}.png`, { x: 0, y: medida.subs - 20, width: 1080, height: SUB_H });
    }
    await js(`capa("sub",0); document.getElementById("subs").style.visibility="hidden";
      document.getElementById("casete").style.visibility="visible";
      document.querySelectorAll("#casete svg > *, #casete .lamp").forEach(n=>n.style.visibility="hidden");
      document.getElementById("bobI").style.visibility="visible";`);
    await foto("bobina.png", { x: 150 + 265 - 40, y: medida.casete + 231 - 40, width: 80, height: 80 });

    // ---------- composición ----------
    const dur = au.duracion.toFixed(2), fin = au.final;
    const ent = [["-loop", "1", "-t", dur, "-i", "fondo.png"], ["-loop", "1", "-t", dur, "-i", "bobina.png"],
      ["-loop", "1", "-t", dur, "-i", "cierre.png"], ...au.subs.map((_, k) => ["-loop", "1", "-t", dur, "-i", `sub${k}.png`]),
      ["-i", path.join(dir, "audio.wav")]];
    const lamp = datos.lamp.replace("#", "0x");
    const cx1 = 150 + 265 - 40, cx2 = 150 + 515 - 40, cy = medida.casete + 231 - 40;
    const g = [
      `[0:v]format=rgba[f0]`,
      `[1:v]format=rgba,rotate=a='2.97*if(lt(t,${fin}),t,${fin})':c=none,split[r1][r2]`,
      `[f0][r1]overlay=${cx1}:${cy}:format=auto[f1]`,
      `[f1][r2]overlay=${cx2}:${cy}:format=auto[f2]`,
      `color=c=0x0d0f0e:s=780x6:r=${FPS}:d=${dur}[pista]`,
      `color=c=${lamp}:s=780x6:r=${FPS}:d=${dur}[luz]`,
      `[pista][luz]overlay=x='-780+780*if(lt(t,${fin}),t/${fin},1)':y=0[barra]`,
      `[f2][barra]overlay=150:${medida.barra}[f3]`,
      `[f3]drawtext=fontfile='C\\:/Windows/Fonts/consolab.ttf':text='%{eif\\:3.1*if(lt(t\\,${fin})\\,t\\,${fin})\\:d\\:3}':fontcolor=0x96938a:fontsize=30:x=${150 + 390}-tw/2:y=${medida.casete + 424 - 24}[f4]`,
    ];
    let prev = "f4";
    au.subs.forEach((s, k) => {
      const a = Math.max(0, s.t0), b = Math.min(s.t1 + 0.15, fin - 0.35);
      if (b <= a) return;
      g.push(`[${3 + k}:v]format=rgba,fade=t=in:st=${a}:d=0.12:alpha=1,fade=t=out:st=${b.toFixed(2)}:d=0.1:alpha=1[s${k}]`);
      g.push(`[${prev}][s${k}]overlay=0:${medida.subs - 20}:enable='between(t,${a},${(b + 0.1).toFixed(2)})'[g${k}]`);
      prev = `g${k}`;
    });
    g.push(`[2:v]format=rgba,fade=t=in:st=${(fin - 0.45).toFixed(2)}:d=0.5:alpha=1[cz]`);
    g.push(`[${prev}][cz]overlay=0:0:enable='gte(t,${(fin - 0.45).toFixed(2)})'[f9]`);
    g.push(`[f9]fade=t=in:st=0:d=0.35,format=yuv420p[v]`);
    fs.writeFileSync(path.join(capas, "grafo.txt"), g.join(";\n"), "utf8");
    const salida = path.join(dir, "corto.mp4");
    const t0 = Date.now();
    const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...ent.flat(), "-filter_complex_script", "grafo.txt",
      "-map", "[v]", "-map", `${ent.length - 1}:a`, "-r", String(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "19",
      "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-t", dur, "-movflags", "+faststart", salida], { cwd: capas, stdio: "inherit" });
    if (r.status) throw new Error("ffmpeg ha fallado");
    fs.rmSync(capas, { recursive: true, force: true });
    console.log(`✓ ${path.relative(RAIZ, salida)} (${(fs.statSync(salida).size / 1048576).toFixed(1)} MB, ${Math.round((Date.now() - t0) / 1000)} s)`);
    ws.close();
  } finally {
    edge.kill();
    try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (_) {}
  }
}

main().catch(err => { console.error(err.message || err); process.exit(1); });
