"""Baja de Google Fonts las tipografías de la interfaz «Pletina» y escribe app/src/main/assets/fonts/fonts.css.

La página pide las fuentes a fonts.googleapis.com; dentro de la app, MainActivity responde con este
fonts.css y con los .woff2 de assets/fonts, así que la app funciona sin conexión.

Familias (todas con licencia OFL): Barlow Condensed, Barlow, IBM Plex Mono y Mansalva.
Solo se guardan los subconjuntos latin y latin-ext.

Uso: python tools/descargar_fuentes.py
"""
import os, re, urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(RAIZ, "app", "src", "main", "assets", "fonts")
# La misma dirección que pide la página (web/montar.py).
URL = ("https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700"
       "&family=Barlow:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@500;600&family=Mansalva&display=swap")
AGENTE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
BASE_APP = "https://appassets.androidplatform.net/assets/fonts/"


def bajar(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": AGENTE}), timeout=60) as r:
        return r.read()


def main():
    css = bajar(URL).decode("utf-8")
    bloques = re.findall(r"/\* ([a-z-]+) \*/\s*(@font-face\s*\{.*?\})", css, re.S)
    salida = ["/* Copia local de Google Fonts (Barlow Condensed, Barlow, IBM Plex Mono y Mansalva) para que la app funcione",
              "   sin conexion. MainActivity sirve este archivo cuando la pagina pide fonts.googleapis.com.",
              "   Lo escribe tools/descargar_fuentes.py. */"]
    usados = set()
    for subconjunto, bloque in bloques:
        if subconjunto not in ("latin", "latin-ext"):
            continue
        familia = re.search(r"font-family:\s*'([^']+)'", bloque).group(1)
        estilo = re.search(r"font-style:\s*(\w+)", bloque).group(1)
        peso = re.search(r"font-weight:\s*(\d+)", bloque).group(1)
        origen = re.search(r"url\((https://[^)]+\.woff2)\)", bloque).group(1)
        nombre = f"{familia.replace(' ', '')}-{peso}{'i' if estilo == 'italic' else ''}-{subconjunto}.woff2"
        ruta = os.path.join(DESTINO, nombre)
        if not os.path.exists(ruta):
            open(ruta, "wb").write(bajar(origen))
        usados.add(nombre)
        salida.append(f"/* {subconjunto} */")
        salida.append(bloque.replace(origen, BASE_APP + nombre))
    open(os.path.join(DESTINO, "fonts.css"), "w", encoding="utf-8", newline="\n").write("\n".join(salida) + "\n")
    # Las fuentes que ya no usa la página se quitan de la app.
    for f in os.listdir(DESTINO):
        if f.endswith(".woff2") and f not in usados:
            os.remove(os.path.join(DESTINO, f))
            print("quitada", f)
    total = sum(os.path.getsize(os.path.join(DESTINO, f)) for f in usados)
    print(f"{len(usados)} archivos, {total // 1024} KB")


if __name__ == "__main__":
    main()
