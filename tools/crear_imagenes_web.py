"""Dibuja las imágenes de la web y de la ficha de Google Play con Pillow:

  web/publica/favicon.svg, favicon-32.png, apple-touch-icon.png, og-image.png (1200x630, al compartir el enlace)
  play/icono-512.png (icono de la tienda) y play/grafico-1024x500.png (gráfico de funciones)

El icono repite el de la app (hoja de calendario con un día marcado, res/drawable/ic_launcher_foreground.xml).
Uso: python tools/crear_imagenes_web.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(RAIZ, "web", "publica")
PLAY = os.path.join(RAIZ, "play")
os.makedirs(WEB, exist_ok=True)
os.makedirs(PLAY, exist_ok=True)

DESK = (35, 30, 24)          # fondo del icono de la app (#231E18)
CHASIS = (25, 27, 26)        # chasis de la interfaz «Pletina» (#191b1a)
SILK = (220, 213, 194)       # serigrafía (#dcd5c2)
DIM = (150, 147, 138)
LAMP = (242, 164, 60)        # lámpara de enero (#f2a43c)
HOJA, ROJO, ARILLO, DIAS, TINTA = (239, 230, 207), (163, 34, 27), (214, 187, 124), (201, 185, 143), (42, 37, 30)

FUENTES = ["C:/Windows/Fonts/bahnschrift.ttf", "C:/Windows/Fonts/arialnarrow.ttf", "C:/Windows/Fonts/arial.ttf"]


def fuente(px, negrita=True):
    for ruta in FUENTES:
        if os.path.exists(ruta):
            f = ImageFont.truetype(ruta, px)
            if "bahnschrift" in ruta:
                try:
                    f.set_variation_by_name("Condensed Bold" if negrita else "Condensed")
                except Exception:
                    pass
            return f
    return ImageFont.load_default()


def icono(tam, fondo=DESK, relleno=0.0):
    """Hoja de calendario en un lienzo cuadrado de `tam` px (sin esquinas redondeadas: Google las aplica)."""
    img = Image.new("RGBA", (tam, tam), fondo + (255,))
    d = ImageDraw.Draw(img)
    s = tam / 108 * 1.9                      # la hoja ocupa algo más del 60 % del lienzo
    cx, cy = 54, 52.5
    def X(v): return tam / 2 + (v - cx) * s
    def Y(v): return tam / 2 + (v - cy) * s
    def caja(x0, y0, x1, y1, color, r=0):
        d.rounded_rectangle([X(x0), Y(y0), X(x1), Y(y1)], radius=r * s, fill=color)
    caja(32, 33, 76, 77, HOJA, 4)
    caja(32, 33, 76, 45, ROJO, 4)
    caja(32, 41, 76, 45, ROJO, 0)
    for x in (43, 65):
        caja(x - 2, 28, x + 2, 38, ARILLO, 2)
    for fila, y in enumerate((49.5, 58.5, 67.5)):
        for col, x in enumerate((36, 46, 56, 66)):
            if fila == 1 and col == 2:
                caja(x, y, x + 6, y + 5, TINTA)
            elif not (fila == 1 and col == 3 and False):
                caja(x, y, x + 6, y + 5, DIAS)
    # círculo rojo alrededor del día marcado
    d.ellipse([X(50.5), Y(54.4), X(67.5), Y(68.4)], outline=ROJO, width=max(2, round(2.4 * s)))
    return img


def fondo_chasis(w, h):
    img = Image.new("RGB", (w, h), CHASIS)
    d = ImageDraw.Draw(img)
    # rejilla fina de tornillos y una lámpara encendida
    for x in (28, w - 28):
        for y in (28, h - 28):
            d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=(11, 12, 12), outline=(58, 61, 60))
    return img


def casete(d, x, y, w, h, titulo, num):
    d.rounded_rectangle([x, y, x + w, y + h], radius=int(h * .07), fill=(227, 220, 200), outline=(182, 174, 151))
    lx0, ly0, lx1, ly1 = x + w * .06, y + h * .08, x + w * .94, y + h * .66
    d.rectangle([lx0, ly0, lx1, ly1], fill=(246, 241, 227), outline=(28, 27, 24))
    d.rectangle([lx0 + 1, ly0 + 1, lx1 - 1, ly0 + h * .05], fill=LAMP)
    r = h * .055
    d.ellipse([lx0 + 14, ly0 + h * .1, lx0 + 14 + 2 * r, ly0 + h * .1 + 2 * r], outline=(28, 27, 24), width=2)
    d.text((lx0 + 14 + r, ly0 + h * .1 + r), str(num), font=fuente(int(h * .08)), fill=(28, 27, 24), anchor="mm")
    d.text((lx0 + 14 + 2 * r + 12, ly0 + h * .1 + r), titulo, font=fuente(int(h * .1), False), fill=(29, 58, 114), anchor="lm")
    wx0, wy0, wx1, wy1 = x + w * .24, y + h * .36, x + w * .76, y + h * .62
    d.rounded_rectangle([wx0, wy0, wx1, wy1], radius=int(h * .04), fill=(28, 27, 24))
    for cx in (wx0 + (wx1 - wx0) * .25, wx0 + (wx1 - wx0) * .75):
        d.ellipse([cx - h * .06, (wy0 + wy1) / 2 - h * .06, cx + h * .06, (wy0 + wy1) / 2 + h * .06], outline=(228, 220, 203), width=2)
    d.polygon([(x + w * .2, y + h), (x + w * .8, y + h), (x + w * .74, y + h * .82), (x + w * .26, y + h * .82)], fill=(209, 201, 178))


def portada(w, h, titulo_px, sub_px):
    img = fondo_chasis(w, h)
    d = ImageDraw.Draw(img)
    m = int(h * .12)
    d.text((m, int(h * .2)), "TRUE CRIME", font=fuente(titulo_px), fill=SILK)
    d.text((m, int(h * .2) + int(titulo_px * 1.05)), "CALENDAR", font=fuente(titulo_px), fill=LAMP)
    d.text((m + 4, int(h * .2) + int(titulo_px * 2.25)), "UN CASO REAL PARA CADA DÍA DEL AÑO, CONTADO EN CINTAS", font=fuente(sub_px), fill=DIM)
    casete(d, int(w * .6), int(h * .22), int(w * .33), int(w * .33 / 1.6), "Una cabina en Hattersley", 1)
    casete(d, int(w * .66), int(h * .5), int(w * .3), int(w * .3 / 1.6), "Lo que aún guarda el páramo", 2)
    return img


def main():
    ic = icono(512)
    ic.save(os.path.join(PLAY, "icono-512.png"))
    ic.resize((180, 180), Image.LANCZOS).save(os.path.join(WEB, "apple-touch-icon.png"))
    ic.resize((32, 32), Image.LANCZOS).save(os.path.join(WEB, "favicon-32.png"))
    ic.resize((192, 192), Image.LANCZOS).save(os.path.join(WEB, "icono-192.png"))
    portada(1200, 630, 98, 21).save(os.path.join(WEB, "og-image.png"), optimize=True)
    portada(1024, 500, 80, 17).save(os.path.join(PLAY, "grafico-1024x500.png"), optimize=True)
    print("imágenes escritas en", WEB, "y", PLAY)


if __name__ == "__main__":
    main()
