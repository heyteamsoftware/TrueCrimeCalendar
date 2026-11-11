"""Monta la versión web publicable en web/publicada/ (se sube con tools/subir_web.ps1):

  truecrime.html      = app/src/main/assets/index.html con las etiquetas de cabecera (compartir, favicon, canonical),
                        las tipografías desde el propio servidor (nada de Google), el pie legal, el contador de visitas
                        y el aviso de que la web no usa cookies
  fonts/              = tipografías y fonts.css con rutas relativas
  podcast/, sfx/      = guiones y sonidos de la pletina
  audio/index.json    = índice de las cintas (los .ogg ya están en el servidor, por casos)
  y todo lo de web/publica/ (privacidad, términos, 404, robots, sitemap, .htaccess, favicon, contador.php…)

Antes hay que montar la página: python web/montar.py web/src web/base/calendario_v3.html app/src/main/assets/index.html
Uso: python tools/publicar_web.py
"""
import os, re, shutil

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(RAIZ, "app", "src", "main", "assets")
PUBLICA = os.path.join(RAIZ, "web", "publica")
SALIDA = os.path.join(RAIZ, "web", "publicada")
BASE = "https://myappsserver.duckdns.org/truecrimescalendar/"
TITULO = "TRUE CRIME CALENDAR · Archivo sonoro de expedientes"
DESCRIPCION = "Un caso criminal real para cada día del año, contado en cintas: 377 expedientes con fuentes, mapa y vínculos. Gratis y sin cuentas."

CABECERA = f"""<link rel="canonical" href="{BASE}truecrime.html">
<meta name="robots" content="index,follow">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TRUE CRIME CALENDAR">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="{TITULO}">
<meta property="og:description" content="{DESCRIPCION}">
<meta property="og:url" content="{BASE}truecrime.html">
<meta property="og:image" content="{BASE}og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="TRUE CRIME CALENDAR: dos casetes y el título sobre un fondo oscuro">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{TITULO}">
<meta name="twitter:description" content="{DESCRIPCION}">
<meta name="twitter:image" content="{BASE}og-image.png">
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"WebSite","name":"TRUE CRIME CALENDAR","url":"{BASE}truecrime.html","inLanguage":"es","description":"{DESCRIPCION}"}}</script>
<link rel="stylesheet" href="fonts/fonts.css">"""

PIE = """<nav class="legal" aria-label="Información legal"><a href="privacidad.html">Privacidad</a><a href="terminos.html">Términos y condiciones</a><span id="visitas" aria-live="polite"></span></nav>"""

ESTILO = """<style>
.legal{display:flex;flex-wrap:wrap;gap:8px 18px;margin:14px 8px 0;font:600 11px/1 var(--cond);letter-spacing:.2em;text-transform:uppercase}
.legal a{color:var(--dim);min-height:24px;display:inline-flex;align-items:center}
.legal span{color:var(--dim);margin-left:auto;font-family:var(--mono);letter-spacing:.04em;text-transform:none}
.aviso-web{position:fixed;left:10px;right:10px;bottom:calc(var(--mini-h,0px) + 10px);z-index:2400;max-width:560px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:12px 12px 12px 14px;background:var(--ch2);border-radius:5px;box-shadow:inset 0 1px 0 #454948,0 0 0 1px #000,0 10px 30px rgba(0,0,0,.7);font:400 13.5px/1.4 var(--sans);color:var(--silk)}
.aviso-web a{color:var(--lamp)}
.aviso-web button{flex:none;min-height:44px;padding:0 14px;border-radius:3px;background:var(--lamp);color:var(--ink);font:700 11px/1 var(--cond);letter-spacing:.2em;text-transform:uppercase;box-shadow:inset 0 1px 0 var(--lamp-hi),0 3px 0 #080909}
</style>"""

SCRIPT = """<div class="aviso-web" id="avisoWeb" role="region" aria-label="Aviso sobre cookies" hidden>
<span>Esta web <strong>no usa cookies</strong> ni te rastrea. Guarda en tu navegador, solo en tu dispositivo, tus favoritos y por dónde vas en cada cinta. <a href="privacidad.html">Más información</a></span>
<button type="button" id="avisoOk">Entendido</button></div>
<script>
(function(){
  var aviso=document.getElementById("avisoWeb"), visto=false;
  try{ visto=localStorage.getItem("tcc_aviso")==="1"; }catch(_){}
  if(!visto) aviso.hidden=false;
  document.getElementById("avisoOk").onclick=function(){ aviso.hidden=true; try{ localStorage.setItem("tcc_aviso","1"); }catch(_){} };
  // Contador de visitas: una por sesión, sin cookies ni direcciones IP (contador.php)
  var contado=false; try{ contado=sessionStorage.getItem("tcc_visita")==="1"; }catch(_){}
  fetch("contador.php",{method:contado?"GET":"POST",cache:"no-store"}).then(function(r){return r.json();}).then(function(j){
    if(j && j.visitas!=null) document.getElementById("visitas").textContent=Number(j.visitas).toLocaleString("es-ES")+" visitas";
    try{ sessionStorage.setItem("tcc_visita","1"); }catch(_){}
  }).catch(function(){});
})();
</script>"""


def main():
    origen = os.path.join(ASSETS, "index.html")
    html = open(origen, encoding="utf-8").read()
    # tipografías del propio servidor
    html, n = re.subn(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\s*<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>\s*<link href="https://fonts\.googleapis\.com/[^"]*" rel="stylesheet">',
                      lambda m: CABECERA, html)
    assert n == 1, "no se encontró el bloque de Google Fonts en index.html"
    html = html.replace("<title>" + TITULO + "</title>", "<title>" + TITULO + "</title>", 1)
    html, n = re.subn(r'(<p class="foot">.*?</p>)', lambda m: m.group(1) + "\n" + PIE, html, count=1, flags=re.S)
    assert n == 1, "no se encontró el pie de la página"
    html = html.replace("</head>", ESTILO + "\n</head>", 1)
    html = html.replace("</body>", SCRIPT + "\n</body>", 1)

    if os.path.isdir(SALIDA):
        shutil.rmtree(SALIDA)
    os.makedirs(SALIDA)
    open(os.path.join(SALIDA, "truecrime.html"), "w", encoding="utf-8", newline="\n").write(html)

    # tipografías con rutas relativas
    os.makedirs(os.path.join(SALIDA, "fonts"))
    for f in os.listdir(os.path.join(ASSETS, "fonts")):
        if f.endswith(".woff2"):
            shutil.copy(os.path.join(ASSETS, "fonts", f), os.path.join(SALIDA, "fonts", f))
    css = open(os.path.join(ASSETS, "fonts", "fonts.css"), encoding="utf-8").read()
    css = css.replace("https://appassets.androidplatform.net/assets/fonts/", "")
    open(os.path.join(SALIDA, "fonts", "fonts.css"), "w", encoding="utf-8", newline="\n").write(css)

    for carpeta in ("podcast", "sfx"):
        shutil.copytree(os.path.join(ASSETS, carpeta), os.path.join(SALIDA, carpeta))
    os.makedirs(os.path.join(SALIDA, "audio"))
    shutil.copy(os.path.join(ASSETS, "audio", "index.json"), os.path.join(SALIDA, "audio", "index.json"))

    for f in os.listdir(PUBLICA):
        shutil.copy(os.path.join(PUBLICA, f), os.path.join(SALIDA, f))
    peso = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(SALIDA) for f in fs)
    print(f"web/publicada/ lista: {peso // 1024} KB")


if __name__ == "__main__":
    main()
