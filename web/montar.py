"""Monta index.html: cabecera + CSS de Leaflet (v3, intacto) + CSS nuevo + marcado nuevo
+ librerías y mapa del mundo (v3, intactos) + datos de los casos (v3, intactos) + lógica nueva."""
import sys, re, pathlib

src = pathlib.Path(sys.argv[1])      # carpeta con app.css, body.html, app.js
v3 = pathlib.Path(sys.argv[2])       # copia de seguridad de la v3
out = pathlib.Path(sys.argv[3])      # index.html de destino

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

head = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#231e18">
<meta name="color-scheme" content="light">
<title>TRUE CRIME CALENDAR · Archivo de perfiles criminales</title>
<link rel="preload" href="img/ink.png" as="image" crossorigin>
<link rel="preload" href="img/kraft.webp" as="image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Mansalva&display=swap" rel="stylesheet">"""

parts = [head]
parts += lines[i_lcss:i_lcss_end + 1]                     # CSS de Leaflet
parts.append((src / "app.css").read_text(encoding="utf-8").rstrip("\n"))
parts.append((src / "body.html").read_text(encoding="utf-8").rstrip("\n"))
parts += lines[i_lib:i_data - 1]                          # Leaflet, topojson, WORLD
parts.append("<script>")
parts += data                                             # const D = []; D.push(...)
parts.append((src / "app.js").read_text(encoding="utf-8").rstrip("\n"))
parts.append("</script>")
parts.append("</body>")
parts.append("</html>")
out.write_text("\n".join(parts) + "\n", encoding="utf-8", newline="\n")
print("ok", out, out.stat().st_size)
