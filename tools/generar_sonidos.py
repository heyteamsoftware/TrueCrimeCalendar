"""Sintetiza los efectos de sonido del cuaderno (sin muestras externas ni licencias).

Sonidos de papel, graves y cálidos (pocos agudos):
  carpeta-abrir.ogg   la tapa de papel se levanta, las hojas rozan y se asientan
  carpeta-cerrar.ogg  barrido de papel y golpe sordo de la carpeta al cerrarse
  pagina-1..3.ogg     paso de página: aire, crujido de papel y la hoja que cae (3 variantes)

Uso: python tools/generar_sonidos.py   (escribe en app/src/main/assets/sfx/)
"""
import os, subprocess, tempfile, wave
import numpy as np

SR = 48000
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "app", "src", "main", "assets", "sfx")

# Límite de agudos de todos los sonidos (Hz): más bajo = más oscuro.
TECHO = 4800


def banda(x, lo, hi, suave=0.25):
    """Filtro paso banda por FFT con bordes suaves (lo/hi en Hz; lo=0 = paso bajo)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo > 0:
        a, b = lo * (1 - suave), lo * (1 + suave)
        m *= np.clip((f - a) / (b - a), 0, 1) ** 2
    if hi < SR / 2:
        a, b = hi * (1 - suave), hi * (1 + suave)
        m *= np.clip((b - f) / (b - a), 0, 1) ** 2
    return np.fft.irfft(X * m, len(x))


def envolvente(n, puntos):
    """Envolvente por tramos: puntos = [(segundo, nivel), ...]."""
    xs = [p[0] * SR for p in puntos]
    ys = [p[1] for p in puntos]
    return np.interp(np.arange(n), xs, ys) ** 1.6  # curvas más naturales que las rectas


def crujido(n, rng, densidad, t0, t1, lo=700, hi=4200, fuerza=1.0):
    """Crujido de papel: impulsos dispersos y aleatorios entre t0 y t1 (segundos)."""
    x = np.zeros(n)
    pos = rng.uniform(t0, t1, int(densidad * (t1 - t0))) * SR
    for p in pos.astype(int):
        largo = int(rng.integers(12, 70))  # impulsos más largos = crujido más grave
        if p + largo < n:
            x[p:p + largo] += rng.normal(0, 1, largo) * rng.uniform(0.2, 1.0) * np.hanning(largo)
    return banda(x, lo, hi) * fuerza


def golpe(n, inicio, rng, grave=110, cuerpo=0.9, chasquido=0.6, caida=0.07, brillo=2600):
    """Golpe sordo: cuerpo grave que decae + ráfaga corta de ruido apagado."""
    x = np.zeros(n)
    i = int(inicio * SR)
    k = np.arange(n - i) / SR
    cuerpo_s = (np.sin(2 * np.pi * grave * k) + 0.45 * np.sin(2 * np.pi * grave * 1.6 * k)) * np.exp(-k / caida)
    rafaga = banda(rng.normal(0, 1, n - i), 150, brillo) * np.exp(-k / 0.022)
    x[i:] = cuerpo * cuerpo_s + chasquido * rafaga
    return x


def oscurecer(x):
    """Más cuerpo en graves-medios y sin agudos: tono cálido de papel grueso."""
    x = x + 0.45 * banda(x, 120, 600)
    return banda(x, 0, TECHO)


def suavizar_bordes(x, ms=6):
    k = int(SR * ms / 1000)
    x[:k] *= np.linspace(0, 1, k)
    x[-k:] *= np.linspace(1, 0, k)
    return x


def normalizar(x, pico_db=-3.0):
    return x / (np.max(np.abs(x)) + 1e-9) * 10 ** (pico_db / 20)


def pagina(semilla):
    rng = np.random.default_rng(semilla)
    dur = 0.58 + rng.uniform(-0.05, 0.05)
    n = int(dur * SR)
    pico = 0.22 * rng.uniform(0.9, 1.1)
    r = rng.normal(0, 1, n)
    # aire que mueve la hoja: sobre todo graves-medios
    aire = (banda(r, 220, 1500) * envolvente(n, [(0, 0), (0.06, 0.35), (pico, 1), (0.36, 0.25), (dur, 0)])
            + 0.45 * banda(r, 1200, 3800) * envolvente(n, [(0, 0), (0.12, 0.2), (pico + 0.05, 0.8), (0.42, 0.1), (dur, 0)]))
    # crujidos al levantar la hoja y al doblarse en el aire
    cr = (crujido(n, rng, 220, 0.0, 0.09, lo=800, hi=4200, fuerza=1.3)
          + crujido(n, rng, 110, 0.1, 0.34, lo=650, hi=3600, fuerza=0.9))
    # la hoja cae sobre las demás
    caida = golpe(n, 0.37 + rng.uniform(-0.02, 0.02), rng, grave=135, cuerpo=0.4, chasquido=0.8, caida=0.035, brillo=2200)
    x = 0.45 * normalizar(aire) + 0.45 * normalizar(cr) + 0.32 * normalizar(caida)
    return suavizar_bordes(oscurecer(x))


def carpeta_abrir():
    rng = np.random.default_rng(7)
    dur = 0.78
    n = int(dur * SR)
    r = rng.normal(0, 1, n)
    # la tapa de papel se levanta: crujido inicial
    levantar = crujido(n, rng, 260, 0.0, 0.13, lo=750, hi=4000, fuerza=1.3)
    # las hojas se deslizan unas sobre otras
    deslizar = (banda(r, 200, 1400) * envolvente(n, [(0, 0), (0.07, 0.45), (0.25, 1), (0.44, 0.45), (0.62, 0), (dur, 0)])
                + 0.5 * banda(r, 1100, 3400) * envolvente(n, [(0, 0), (0.1, 0.3), (0.28, 0.8), (0.46, 0.2), (0.6, 0), (dur, 0)]))
    roce = crujido(n, rng, 140, 0.12, 0.5, lo=600, hi=3400, fuerza=0.9)
    # la tapa se asienta: caída suave de papel sobre papel
    asiento = golpe(n, 0.52, rng, grave=150, cuerpo=0.35, chasquido=0.75, caida=0.035, brillo=2000)
    x = (0.4 * normalizar(levantar) + 0.5 * normalizar(deslizar)
         + 0.35 * normalizar(roce) + 0.3 * normalizar(asiento))
    return suavizar_bordes(oscurecer(x))


def carpeta_cerrar():
    rng = np.random.default_rng(11)
    dur = 0.55
    n = int(dur * SR)
    r = rng.normal(0, 1, n)
    barrido = (banda(r, 200, 1500) * envolvente(n, [(0, 0), (0.1, 0.5), (0.16, 1), (0.19, 0), (dur, 0)])
               + 0.45 * banda(r, 1100, 3200) * envolvente(n, [(0, 0), (0.12, 0.6), (0.17, 0.8), (0.19, 0), (dur, 0)]))
    cr = crujido(n, rng, 150, 0.04, 0.18, lo=650, hi=3400, fuerza=0.8)
    cierre = golpe(n, 0.185, rng, grave=82, cuerpo=1.0, chasquido=0.7, caida=0.085, brillo=1800)
    x = 0.45 * normalizar(barrido) + 0.2 * normalizar(cr) + 0.8 * normalizar(cierre)
    return suavizar_bordes(oscurecer(x))


def guardar(nombre, x):
    x = normalizar(x, -3.0)
    tmp = os.path.join(tempfile.gettempdir(), nombre + ".wav")
    with wave.open(tmp, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    destino = os.path.join(SALIDA, nombre + ".ogg")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-c:a", "libopus", "-b:a", "64k", destino], check=True)
    os.remove(tmp)
    print(f"{nombre}.ogg  {len(x) / SR:.2f} s  {os.path.getsize(destino) / 1024:.1f} KB")


if __name__ == "__main__":
    os.makedirs(SALIDA, exist_ok=True)
    guardar("carpeta-abrir", carpeta_abrir())
    guardar("carpeta-cerrar", carpeta_cerrar())
    for i, s in enumerate((3, 5, 9), 1):
        guardar(f"pagina-{i}", pagina(s))
