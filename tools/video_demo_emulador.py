"""Graba en el emulador (emulator-5570) los vídeos de demostración que pide Google Play para los permisos de
servicio en primer plano: la reproducción de una cinta (FOREGROUND_SERVICE_MEDIA_PLAYBACK) y «Descargar todas»
(FOREGROUND_SERVICE_DATA_SYNC). Hace falta la APK de publicación instalada y el permiso de notificaciones concedido.
Uso: python tools/video_demo_emulador.py <carpeta de salida>
"""
import io, os, subprocess, sys, time
from PIL import Image

ADB = ["adb", "-s", "emulator-5570"]
PAQ = "com.heyteamsoftware.truecrimecalendar"
SAL = sys.argv[1] if len(sys.argv) > 1 else "."
ENV = dict(os.environ, MSYS_NO_PATHCONV="1")


def sh(*a, **k):
    return subprocess.run(ADB + list(a), capture_output=True, env=ENV, **k)


def tap(x, y): sh("shell", "input", "tap", str(x), str(y))
def swipe(x1, y1, x2, y2, ms=700): sh("shell", "input", "swipe", str(x1), str(y1), str(x2), str(y2), str(ms))
def key(k): sh("shell", "input", "keyevent", str(k))
def captura(): return Image.open(io.BytesIO(sh("exec-out", "screencap", "-p").stdout)).convert("RGB")


def claro(p): return 150 < p[0] < 222 and abs(p[0] - p[1]) < 9 and 5 < p[1] - p[2] < 15 and p[2] > 130


def fila_de_teclas(im):
    """y central de las teclas de aluminio de la pletina, o None si no se ven."""
    w, h = im.size
    ini = None
    for y in range(330, h - 160):
        ok = claro(im.getpixel((655, y))) and claro(im.getpixel((150, y)))
        if ok and ini is None: ini = y
        if not ok and ini is not None:
            if y - ini > 70: return (ini + y) // 2
            ini = None
    return None


def abrir_app(caso=None):
    sh("shell", "am", "force-stop", PAQ)
    key(3); time.sleep(1)
    cmd = ["shell", "am", "start", "-n", PAQ + "/.MainActivity"]
    if caso: cmd = ["shell", "am", "start", "-a", PAQ + ".ABRIR_CASO", "--es", "caso", caso, "-n", PAQ + "/.MainActivity"]
    sh(*cmd); time.sleep(12)


def grabar(nombre, limite=120):
    sh("shell", "rm", "-f", "/sdcard/" + nombre)
    p = subprocess.Popen(ADB + ["shell", "screenrecord", "--time-limit", str(limite), "--size", "540x1200", "--bit-rate", "3000000", "/sdcard/" + nombre], env=ENV)
    time.sleep(3)
    return p


def parar(p, nombre):
    sh("shell", "pkill", "-l", "SIGINT", "screenrecord"); time.sleep(5)
    try: p.wait(10)
    except Exception: p.kill()
    sh("pull", "/sdcard/" + nombre, os.path.join(SAL, nombre))


def sombra():
    swipe(540, 5, 540, 1300, 300); time.sleep(3)
    swipe(540, 5, 540, 1600, 300); time.sleep(7)


# --- 1. reproducción de una cinta ---
abrir_app("brady")
p = grabar("demo_reproduccion.mp4")
time.sleep(3)
y = None
for _ in range(8):
    y = fila_de_teclas(captura())
    if y: break
    swipe(540, 1800, 540, 1000, 900); time.sleep(1.5)
print("teclas en y =", y)
if y: tap(655, y)
time.sleep(10)
key(3); time.sleep(3)
sombra()
key(4); time.sleep(2)
parar(p, "demo_reproduccion.mp4")

# --- 2. «Descargar todas» ---
sh("shell", "pm", "clear", PAQ); sh("shell", "pm", "grant", PAQ, "android.permission.POST_NOTIFICATIONS")
sh("emu", "network", "speed", "edge")
abrir_app()
p = grabar("demo_descarga.mp4")
tap(985, 225); time.sleep(3)
tap(245, 1573); time.sleep(5)
sombra()
key(4); time.sleep(3)
sh("emu", "network", "speed", "full")
parar(p, "demo_descarga.mp4")
print("listo")
