// Capturas de pantalla para la ficha de Google Play (1080x1920) a partir de la web publicada.
// Abre Edge sin cabeza, emula un móvil de 360x640 con escala 3 y guarda PNG en play/capturas/.
// Uso: node tools/capturas_play.js [url]
const { spawn } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");

const URL_WEB = process.argv[2] || "https://myappsserver.duckdns.org/truecrimescalendar/truecrime.html";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const SALIDA = path.join(__dirname, "..", "play", "capturas");
const PUERTO = 9344;
fs.mkdirSync(SALIDA, { recursive: true });

const espera = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "tcc-cap-"));
  const edge = spawn(EDGE, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PUERTO}`,
    `--user-data-dir=${perfil}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
  try {
    let pagina = null;
    for (let i = 0; i < 40 && !pagina; i++) {
      await espera(500);
      try { pagina = (await (await fetch(`http://127.0.0.1:${PUERTO}/json`)).json()).find(t => t.type === "page"); } catch (_) {}
    }
    if (!pagina) throw new Error("Edge no arrancó");
    const ws = new WebSocket(pagina.webSocketDebuggerUrl);
    await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
    let n = 0; const pend = new Map();
    ws.onmessage = m => { const r = JSON.parse(m.data); if (pend.has(r.id)) { pend.get(r.id)(r); pend.delete(r.id); } };
    const cdp = (method, params = {}) => new Promise(ok => { const id = ++n; pend.set(id, ok); ws.send(JSON.stringify({ id, method, params })); });
    const js = async expr => { expr = expr.replace(/;\s*1\s*$/, "; return 1;"); const r = await cdp("Runtime.evaluate", { expression: "(async()=>{"+expr+"})()", awaitPromise: true, returnByValue: true, userGesture: true }); if (r.result.exceptionDetails) console.log("JS:", JSON.stringify(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description)); return r.result.result && r.result.result.value; };
    const foto = async nombre => {
      await espera(900);
      const r = await cdp("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(SALIDA, nombre), Buffer.from(r.result.data, "base64"));
      console.log("capturada", nombre);
    };

    await cdp("Page.enable");
    await cdp("Emulation.setDeviceMetricsOverride", { width: 360, height: 640, deviceScaleFactor: 3, mobile: true });
    await cdp("Emulation.setEmulatedMedia", { media: "screen", features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await cdp("Emulation.setTouchEmulationEnabled", { enabled: true });
    await cdp("Page.navigate", { url: URL_WEB });
    await espera(6000);
    await js(`try{ sessionStorage.setItem("tcc_visita","1"); localStorage.setItem("tcc_aviso","1"); }catch(_){} document.getElementById("avisoWeb") && (document.getElementById("avisoWeb").hidden=true); 1`);
    await js(`await audioIdxReady; await document.fonts.ready; 1`);

    // 1. calendario de un mes con casos estrella (marzo) y la carátula de hoy
    await js(`vy=2026; vm=3; selDay=null; renderCal(0); renderSlip(); scrollTo(0,0); 1`);
    await foto("1-calendario.png");
    // 2. el caso del día y la lista
    await js(`scrollTo(0,430); 1`);
    await foto("2-lista.png");
    // 3. expediente
    await js(`window.TCC_openCase("brady"); 1`);
    await espera(1500);
    await js(`document.getElementById("pBody").scrollTop=0; 1`);
    await foto("3-expediente.png");
    // 4. pletina con el casete dentro
    await js(`playTapeOf(BY["brady"],1,0); await new Promise(r=>setTimeout(r,2500)); document.getElementById("deck").scrollIntoView(); document.getElementById("pBody").scrollTop-=30; 1`);
    await espera(1500);
    await foto("4-pletina.png");
    // 5. leer el caso
    await js(`Player.stop && Player.stop(); document.getElementById("readBtn").click(); await new Promise(r=>setTimeout(r,800)); document.getElementById("transcript").scrollIntoView(); 1`);
    await foto("5-leer-el-caso.png");
    // 6. mapa
    await js(`closeP(); await new Promise(r=>setTimeout(r,600)); document.getElementById("tView").click(); await new Promise(r=>setTimeout(r,3500)); scrollTo(0,0); 1`);
    await foto("6-mapa.png");
    ws.close();
  } finally {
    edge.kill();
    setTimeout(() => { try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (_) {} }, 1500);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
