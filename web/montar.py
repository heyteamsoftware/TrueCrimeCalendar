"""Monta index.html: cabecera + CSS de Leaflet (v3, intacto) + CSS nuevo + marcado nuevo
+ librerías y mapa del mundo (v3, intactos) + datos de los casos (v3, intactos)
+ casos nuevos y fuentes (web/datos, si existen) + lógica nueva.

Uso:
    python web/montar.py web/src web/base/calendario_v3.html app/src/main/assets/index.html [carpeta_datos]

carpeta_datos es opcional (por defecto, web/datos junto a este script). De ella se leen:
  - casos_nuevos.json: lista de casos con los campos de D y, además, estrella, tipo_efemeride,
    titulo_caso, autor y fuentes. Se añaden a D conservando todos sus campos.
  - fuentes.json: { id: [ { titulo, url, tipo } ] } con las fuentes de los casos estrella.
    Queda disponible en la página como const FUENTES.
  - correcciones_estrella.json: { id: { campo: valor, nota } } con los campos corregidos de las
    fichas de los casos estrella (n, a, v, per, st, c, mo, loc). «nota» explica la corrección y
    no va a la página.
  - vinculos.json: [ [idA, idB, "c" | "r", nota] ] con los vínculos entre casos de meses distintos.
Si no existen, están vacíos o aún no son JSON válido (los escriben otros), se monta sin ellos."""
import sys, re, json, unicodedata, pathlib

src = pathlib.Path(sys.argv[1])      # carpeta con app.css, body.html, app.js
v3 = pathlib.Path(sys.argv[2])       # copia de seguridad de la v3
out = pathlib.Path(sys.argv[3])      # index.html de destino
datos = pathlib.Path(sys.argv[4]) if len(sys.argv) > 4 else pathlib.Path(__file__).resolve().parent / "datos"


for flujo in (sys.stdout, sys.stderr):           # consolas de Windows sin UTF-8: sin errores por «·» o «º»
    try:
        flujo.reconfigure(errors="replace")
    except (AttributeError, ValueError):
        pass


def aviso(msg):
    print("aviso:", msg, file=sys.stderr)


lines = v3.read_text(encoding="utf-8").split("\n")
# localizar las piezas por contenido (no por número de línea)
def find(pred, start=0):
    for i in range(start, len(lines)):
        if pred(lines[i]):
            return i
    raise SystemExit("no encontrado")

i_lcss = find(lambda l: l.startswith("<style>/* required styles */"))
i_lcss_end = find(lambda l: l.strip() == "</style>", i_lcss)
i_lib = find(lambda l: l.startswith("<script>/* @preserve"))
i_data = find(lambda l: l.strip() == "const D = [];")
assert lines[i_data - 1].strip() == "<script>"
i_data_end = find(lambda l: l.strip() == ");", i_data)
# los D.push( terminan en ");" ; el último bloque de datos acaba antes de "const GROUPS"
i_groups = find(lambda l: l.startswith("const GROUPS"), i_data)
data = lines[i_data:i_groups]
while data and data[-1].strip() == "":
    data.pop()
assert data[-1].strip() == ");", data[-1]


# ---------- Datos nuevos (web/datos) ----------
def leer_json(path):
    """Contenido del JSON, o None si no existe, está vacío o todavía no se puede leer."""
    if not path.is_file():
        return None
    try:
        txt = path.read_text(encoding="utf-8-sig").strip()
    except OSError as err:
        aviso(f"no se pudo leer {path} ({err}); se monta sin él")
        return None
    if not txt:
        return None
    try:
        return json.loads(txt)
    except json.JSONDecodeError as err:
        aviso(f"{path} no es JSON válido ({err}); se monta sin él")
        return None


def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", str(s)) if unicodedata.category(c) != "Mn")


TIPOS = {"nacimiento", "crimen", "detencion", "condena", "hallazgo", "desaparicion", "golpe"}
# por si alguna ficha llega con los nombres largos de docs/REDISENO_CASOS_Y_CINTAS.md (apartado 4)
LARGOS = {"nombre": "n", "alias": "a", "victimas": "v", "pais": "p", "bandera": "f", "periodo": "per",
          "situacion": "st", "resumen": "c", "modus_operandi": "mo", "lugares": "loc", "vinculos": "vin",
          "grupos": "g"}


def entero(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def normalizar(c):
    """Devuelve el caso listo para D (o None si le falta lo imprescindible). Conserva los campos extra."""
    if not isinstance(c, dict):
        return None
    c = dict(c)
    for largo, corto in LARGOS.items():
        if corto not in c and largo in c:
            c[corto] = c.pop(largo)
    fecha = c.get("fecha")
    if isinstance(fecha, dict):
        c.setdefault("m", fecha.get("m"))
        c.setdefault("d", fecha.get("d"))
        c.setdefault("y", fecha.get("anio", fecha.get("y")))
        if fecha.get("tipo"):
            c.setdefault("tipo_efemeride", fecha["tipo"])
    for k in ("m", "d", "y"):
        c[k] = entero(c.get(k))
    if not isinstance(c.get("id"), str) or not c["id"].strip() or not c.get("n") \
            or not c["m"] or not 1 <= c["m"] <= 12 or not c["d"] or not 1 <= c["d"] <= 31 or c["y"] is None:
        return None
    c["id"] = c["id"].strip()
    c.setdefault("estrella", False)
    tipo = re.sub(r"[^a-z]", "", sin_tildes(c.get("tipo_efemeride") or "").lower())
    c["tipo_efemeride"] = tipo if tipo in TIPOS else ("nacimiento" if not tipo else tipo)
    if c["tipo_efemeride"] not in TIPOS:
        aviso(f"caso {c['id']}: tipo_efemeride desconocido «{c['tipo_efemeride']}»")
    return c


def js(valor):
    """JSON seguro dentro de <script>."""
    t = json.dumps(valor, ensure_ascii=False, separators=(",", ":"))
    return t.replace("</", "<\\/").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


ids = set(re.findall(r'\bid:"([^"]+)"', "\n".join(data)))
nuevos = []
crudo = leer_json(datos / "casos_nuevos.json")
if isinstance(crudo, dict):                      # se admite también { "casos": [ ... ] }
    crudo = crudo.get("casos")
if crudo is not None and not isinstance(crudo, list):
    aviso("casos_nuevos.json no es una lista; se monta sin casos nuevos")
    crudo = None
for i, c in enumerate(crudo or []):
    caso = normalizar(c)
    if not caso:
        aviso(f"casos_nuevos.json: el caso nº {i + 1} no tiene id, n, m, d e y válidos; se omite")
        continue
    if caso["id"] in ids:
        aviso(f"casos_nuevos.json: el id «{caso['id']}» ya existe; se omite")
        continue
    ids.add(caso["id"])
    nuevos.append(caso)

fuentes = leer_json(datos / "fuentes.json")
if fuentes is not None and not isinstance(fuentes, dict):
    aviso("fuentes.json no es un objeto { id: [...] }; se monta sin fuentes")
    fuentes = None
fuentes = {k: [f for f in v if isinstance(f, dict) and isinstance(f.get("url"), str)]
           for k, v in (fuentes or {}).items() if isinstance(v, list)}
fuentes = {k: v for k, v in fuentes.items() if v}

# Correcciones de las fichas estrella: { id: { campo: valor, ..., nota } }. Los datos de la v3 no se
# tocan: los campos corregidos se aplican encima al cargar la página. La fecha, el país y los
# vínculos no se corrigen aquí, y «nota» (el porqué de la corrección) no va a la página.
CORREGIBLES = {"n", "a", "v", "per", "st", "c", "mo", "loc"}
estrella_ids = set(ids) - {c["id"] for c in nuevos}
correcciones = {}
crudo = leer_json(datos / "correcciones_estrella.json")
if crudo is not None and not isinstance(crudo, dict):
    aviso("correcciones_estrella.json no es un objeto { id: {...} }; se monta sin correcciones")
    crudo = None
for cid, cambios in (crudo or {}).items():
    if cid not in estrella_ids or not isinstance(cambios, dict):
        aviso(f"correcciones_estrella.json: «{cid}» no es un caso estrella; se omite")
        continue
    raros = set(cambios) - CORREGIBLES - {"nota"}
    if raros:
        aviso(f"correcciones_estrella.json: en «{cid}» no se aplican los campos {sorted(raros)}")
    limpio = {k: v for k, v in cambios.items() if k in CORREGIBLES}
    if limpio:
        correcciones[cid] = limpio

# Vínculos entre casos de meses distintos: [ [idA, idB, "c" | "r", nota] ]. Se apuntan en el primero
# y la página los enseña en los dos. Los que ya existen en un sentido u otro no se repiten.
vinculos = []
crudo = leer_json(datos / "vinculos.json")
if crudo is not None and not isinstance(crudo, list):
    aviso("vinculos.json no es una lista; se monta sin esos vínculos")
    crudo = None
vistos = set()
for v in crudo or []:
    if not (isinstance(v, list) and len(v) == 4 and all(isinstance(x, str) for x in v)):
        aviso(f"vinculos.json: entrada no válida {v!r}; se omite")
        continue
    a, b, tipo, nota = (x.strip() for x in v)
    if a == b or a not in ids or b not in ids or tipo not in ("c", "r") or not nota:
        aviso(f"vinculos.json: vínculo no válido entre «{a}» y «{b}»; se omite")
        continue
    if frozenset((a, b)) in vistos:
        aviso(f"vinculos.json: el vínculo entre «{a}» y «{b}» está repetido; se omite")
        continue
    vistos.add(frozenset((a, b)))
    vinculos.append([a, b, tipo, nota])

extra = []
if nuevos:
    extra.append("/* casos nuevos (web/datos/casos_nuevos.json) */")
    extra.append("D.push(")
    extra.append(",\n".join(js(c) for c in nuevos))
    extra.append(");")
if correcciones:
    extra.append("/* correcciones de las fichas estrella (web/datos/correcciones_estrella.json) */")
    extra.append("{const C={" + ",\n".join(js(k) + ":" + js(v) for k, v in correcciones.items()) + "};")
    extra.append("D.forEach(e=>{ if(C[e.id]) Object.assign(e,C[e.id]); });}")
if vinculos:
    extra.append("/* vínculos entre casos de meses distintos (web/datos/vinculos.json) */")
    extra.append("{const P={}; D.forEach(e=>{ P[e.id]=e; });")
    extra.append("[" + ",\n".join(js(v) for v in vinculos) + "].forEach(([a,b,t,n])=>{")
    extra.append("  const x=P[a], y=P[b]; if(!x || !y) return;")
    extra.append("  if((x.vin||[]).some(v=>v[0]===b) || (y.vin||[]).some(v=>v[0]===a)) return;")
    extra.append("  (x.vin=x.vin||[]).push([b,t,n]);")
    extra.append("});}")
extra.append("/* fuentes de los casos estrella (web/datos/fuentes.json) */")
extra.append("const FUENTES = {" + ",\n".join(js(k) + ":" + js(v) for k, v in fuentes.items()) + "};")

head = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#191b1a">
<meta name="color-scheme" content="dark">
<title>TRUE CRIME CALENDAR · Archivo sonoro de expedientes</title>
<meta name="description" content="Un caso real para cada día del año, contado en cintas: 377 expedientes con sus fuentes, su mapa y sus vínculos.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@500;600&family=Mansalva&display=swap" rel="stylesheet">"""

parts = [head]
parts += lines[i_lcss:i_lcss_end + 1]                     # CSS de Leaflet
parts.append((src / "app.css").read_text(encoding="utf-8").rstrip("\n"))
parts.append((src / "body.html").read_text(encoding="utf-8").rstrip("\n"))
parts += lines[i_lib:i_data - 1]                          # Leaflet, topojson, WORLD
parts.append("<script>")
parts += data                                             # const D = []; D.push(...)
parts += extra                                            # casos nuevos y FUENTES
parts.append((src / "app.js").read_text(encoding="utf-8").rstrip("\n"))
parts.append("</script>")
parts.append("</body>")
parts.append("</html>")
out.write_text("\n".join(parts) + "\n", encoding="utf-8", newline="\n")
print("ok", out, out.stat().st_size, f"· {len(nuevos)} casos nuevos · fuentes de {len(fuentes)} casos"
      f" · {len(correcciones)} fichas estrella corregidas · {len(vinculos)} vínculos entre meses")
