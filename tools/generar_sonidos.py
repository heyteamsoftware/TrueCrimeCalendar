"""Sintetiza los efectos de sonido del cuaderno (sin muestras externas ni licencias).

  carpeta-abrir.ogg   cartón que se despega y roza, y el papel que se desliza
  carpeta-cerrar.ogg  barrido rápido y golpe seco de cartón sobre papel
  pagina-1..3.ogg     paso de página: aire, crujido de papel y la hoja que cae (3 variantes)

Uso: python tools/generar_sonidos.py   (escribe en app/src/main/assets/sfx/)
"""
import os, subprocess, tempfile, wave
import numpy as np

SR = 48000
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "app", "src", "main", "assets", "sfx")


def t(seg):
    return np.arange(int(seg * SR)) / SR


def banda(x, lo, hi, suave=0.25):
    """Filtro paso banda por FFT con bordes suaves (lo/hi en Hz)."""
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
    e = np.interp(np.arange(n), xs, ys)
    return e ** 1.6  # curvas más naturales que las rectas


def crujido(n, rng, densidad, t0, t1, lo=2500, hi=11000, fuerza=1.0):
    """Clics de papel: impulsos dispersos y aleatorios entre t0 y t1 (segundos)."""
    x = np.zeros(n)
    cuantos = int(densidad * (t1 - t0))
    pos = rng.uniform(t0, t1, cuantos) * SR
    for p in pos.astype(int):
        largo = rng.integers(6, 40)
        if p + largo < n:
            x[p:p + largo] += rng.normal(0, 1, largo) * rng.uniform(0.2, 1.0) * np.hanning(largo)
    return banda(x, lo, hi) * fuerza


def golpe(n, inicio, rng, grave=110, cuerpo=0.9, chasquido=0.6, caida=0.07):
    """Golpe de cartón: cuerpo grave que decae + ráfaga de ruido corta."""
    x = np.zeros(n)
    i = int(inicio * SR)
    k = np.arange(n - i) / SR
    cuerpo_s = (np.sin(2 * np.pi * grave * k) + 0.5 * np.sin(2 * np.pi * grave * 1.7 * k)) * np.exp(-k / caida)
    rafaga = banda(rng.normal(0, 1, n - i), 300, 5000) * np.exp(-k / 0.018)
    x[i:] = cuerpo * cuerpo_s + chasquido * rafaga
    return x


def suavizar_bordes(x, ms=4):
    k = int(SR * ms / 1000)
    x[:k] *= np.linspace(0, 1, k)
    x[-k:] *= np.linspace(1, 0, k)
    return x


def normalizar(x, pico_db=-3.0):
    return x / (np.max(np.abs(x)) + 1e-9) * 10 ** (pico_db / 20)


def pagina(semilla):
    rng = np.random.default_rng(semilla)
    dur = 0.55 + rng.uniform(-0.05, 0.05)
    n = int(dur * SR)
    vel = rng.uniform(0.9, 1.1)
    pico = 0.22 * vel
    # aire: dos bandas que se cruzan para dar sensación de movimiento
    r = rng.normal(0, 1, n)
    aire = (banda(r, 600, 3500) * envolvente(n, [(0, 0), (0.06, 0.35), (pico, 1), (0.36, 0.25), (dur, 0)])
            + 0.7 * banda(r, 2500, 9000) * envolvente(n, [(0, 0), (0.12, 0.2), (pico + 0.05, 0.9), (0.42, 0.1), (dur, 0)]))
    # crujidos: al levantar la hoja y al doblarse en el aire
    cr = crujido(n, rng, 260, 0.0, 0.08, fuerza=1.4) + crujido(n, rng, 120, 0.1, 0.34, fuerza=0.9)
    # la hoja cae sobre las demás
    caida = golpe(n, 0.36 + rng.uniform(-0.02, 0.02), rng, grave=170, cuerpo=0.25, chasquido=0.9, caida=0.03)
    x = 0.45 * normalizar(aire) + 0.45 * normalizar(cr) + 0.3 * normalizar(caida)
    return suavizar_bordes(x)


def carpeta_abrir():
    rng = np.random.default_rng(7)
    dur = 0.75
    n = int(dur * SR)
    # cartón que se despega: un clic seco
    despegue = golpe(n, 0.01, rng, grave=900, cuerpo=0.15, chasquido=1.0, caida=0.008)
    # roce del cartón: ruido medio modulado de forma irregular (pegar y soltar)
    r = rng.normal(0, 1, n)
    mod = 0.55 + 0.45 * np.sin(2 * np.pi * np.cumsum(rng.uniform(25, 55, n)) / SR)
    roce = banda(r, 250, 2200) * mod * envolvente(n, [(0, 0), (0.05, 0.9), (0.22, 0.7), (0.32, 0.2), (dur, 0)])
    # papel que se desliza al abrirse
    papel = banda(rng.normal(0, 1, n), 1500, 8000) * envolvente(n, [(0, 0), (0.18, 0.1), (0.34, 0.8), (0.55, 0.25), (dur, 0)])
    cr = crujido(n, rng, 140, 0.2, 0.55, fuerza=0.8)
    # la tapa se apoya sobre la mesa
    apoyo = golpe(n, 0.56, rng, grave=120, cuerpo=0.5, chasquido=0.4, caida=0.06)
    x = (0.35 * normalizar(despegue) + 0.5 * normalizar(roce) + 0.45 * normalizar(papel)
         + 0.25 * normalizar(cr) + 0.35 * normalizar(apoyo))
    return suavizar_bordes(x)


def carpeta_cerrar():
    rng = np.random.default_rng(11)
    dur = 0.5
    n = int(dur * SR)
    r = rng.normal(0, 1, n)
    barrido = (banda(r, 400, 3000) * envolvente(n, [(0, 0), (0.1, 0.5), (0.16, 1), (0.19, 0), (dur, 0)])
               + 0.6 * banda(r, 2500, 9000) * envolvente(n, [(0, 0), (0.12, 0.6), (0.17, 0.8), (0.19, 0), (dur, 0)]))
    cr = crujido(n, rng, 180, 0.04, 0.18, fuerza=0.8)
    cierre = golpe(n, 0.185, rng, grave=95, cuerpo=1.0, chasquido=0.9, caida=0.075)
    x = 0.45 * normalizar(barrido) + 0.2 * normalizar(cr) + 0.75 * normalizar(cierre)
    return suavizar_bordes(x)


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
