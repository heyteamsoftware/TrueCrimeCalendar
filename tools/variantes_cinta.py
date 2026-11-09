"""Seis variantes de «sonido antiguo» para comparar sobre un mismo fragmento.

Uso: python tools/variantes_cinta.py entrada.wav carpeta_salida [segundos]

Estilo elegido (pendiente de aplicar a los 100 podcasts): v1_casete_gastado. Ver docs/PENDIENTES.md.
ffmpeg solo hace filtros sencillos (EQ, compresión, saturación); el resto va en numpy
(los filtros vibrato/loudnorm/amix de ffmpeg devolvían a veces NaN).
"""
import os, subprocess, sys, tempfile, wave
import numpy as np

SR = 48000


# ---------- utilidades ----------
def banda(x, lo, hi, suave=0.25):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo > 0:
        a, b = lo * (1 - suave), lo * (1 + suave)
        m *= np.clip((f - a) / (b - a), 0, 1) ** 2
    if hi < SR / 2:
        a, b = hi * (1 - suave), hi * (1 + suave)
        m *= np.clip((b - f) / (b - a), 0, 1) ** 2
    return np.fft.irfft(X * m, len(x)).astype(np.float32)


def ruido_rosa(n, rng, lo, hi, rms):
    X = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    X *= 1 / np.sqrt(np.maximum(f, 1.0))
    x = np.fft.irfft(X, n)
    x = banda(x, lo, hi)
    return (x * rms / (np.sqrt(np.mean(x ** 2)) + 1e-12)).astype(np.float32)


def suave(n):  # campana 0→1→0
    return (0.5 - 0.5 * np.cos(np.linspace(0, 2 * np.pi, n))).astype(np.float32)


def retardo_variable(x, rng, comps, base=0.004, arrastres=None):
    """Wow/flutter con senos y, opcionalmente, «arrastres» (la cinta frena y recupera)."""
    n = len(x)
    t = np.arange(n) / SR
    d = np.full(n, base)
    for amp, freq, fase in comps:
        d += amp * np.sin(2 * np.pi * freq * t + fase)
    if arrastres:
        cada, amp, dur = arrastres
        s = rng.uniform(*cada)
        while s < n / SR - 1:
            a, L = int(s * SR), int(rng.uniform(*dur) * SR)
            if a + L < n:
                d[a:a + L] += rng.uniform(*amp) * suave(L)
            s += rng.uniform(*cada)
    return np.interp(np.arange(n) - d * SR, np.arange(n), x, left=0.0).astype(np.float32)


def nivelar(x, rms=0.168):
    v = x[: len(x) // 4800 * 4800].reshape(-1, 4800)
    r = np.sqrt((v ** 2).mean(axis=1))
    act = r[r > r.max() * 0.1]
    return (x * rms / (np.sqrt((act ** 2).mean()) + 1e-9)).astype(np.float32)


def cortes(x, rng, cada, fondo, dur):
    g = np.ones(len(x), np.float32)
    t = rng.uniform(*cada)
    while t < len(x) / SR - 1:
        L = int(rng.uniform(*dur) * SR) + 2 * int(0.012 * SR)
        a = int(t * SR)
        if a + L < len(x):
            g[a:a + L] = np.minimum(g[a:a + L], 1 - (1 - rng.uniform(*fondo)) * np.hanning(L) ** 0.5)
        t += rng.uniform(*cada)
    return x * g


def tracking(x, rng, cada, dur, ruido, fondo):
    """Fallo de tracking de VHS: ráfaga de ruido y la voz se hunde un instante."""
    y = x.copy()
    t = rng.uniform(*cada)
    while t < len(x) / SR - 1:
        L, a = int(rng.uniform(*dur) * SR), int(t * SR)
        if a + L < len(x):
            w = suave(L)
            y[a:a + L] *= 1 - (1 - rng.uniform(*fondo)) * w
            r = banda(rng.standard_normal(L), 400, 6500)
            y[a:a + L] += r * w * ruido / (np.sqrt(np.mean(r ** 2)) + 1e-9)
        t += rng.uniform(*cada)
    return y


def zumbido(n, freq, rms, armonicos):
    t = np.arange(n) / SR
    z = sum(np.sin(2 * np.pi * freq * k * t) / k ** armonicos for k in range(1, 12))
    return (z * rms / (np.sqrt(np.mean(z ** 2)) + 1e-12)).astype(np.float32)


def chasquidos(n, rng, por_segundo, nivel):
    x = np.zeros(n, np.float32)
    for p in rng.uniform(0, n / SR, int(por_segundo * n / SR)) * SR:
        p, L = int(p), int(rng.integers(8, 60))
        if p + L < n:
            x[p:p + L] += rng.normal(0, 1, L) * np.hanning(L) * rng.uniform(0.3, 1.0)
    return banda(x, 300, 7000) * nivel


def eco(x, retrasos):
    y = x.copy()
    for seg, g in retrasos:
        k = int(abs(seg) * SR)
        if seg > 0:
            y[k:] += g * x[:-k]
        else:
            y[:-k] += g * x[k:]
    return y


def ffmpeg_cadena(src, cadena, segundos):
    raw = os.path.join(tempfile.gettempdir(), "variante_voz.f32")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-t", str(segundos), "-i", src, "-af", cadena,
                    "-ac", "1", "-ar", str(SR), "-f", "f32le", raw], check=True)
    x = np.fromfile(raw, np.float32)
    os.remove(raw)
    if not np.isfinite(x).all():
        raise RuntimeError("NaN en los filtros de ffmpeg")
    return x


# ---------- las seis variantes ----------
def v1_casete_gastado(voz_src, s, rng):
    x = ffmpeg_cadena(voz_src, "highpass=f=220,highpass=f=220,lowpass=f=5000,lowpass=f=5000,lowpass=f=5500,"
                      "equalizer=f=1500:t=o:w=1.2:g=5,acompressor=threshold=0.125:ratio=3:attack=6:release=120:makeup=2,"
                      "volume=7dB,asoftclip=type=tanh:threshold=0.45", s)
    x = retardo_variable(x, rng, [(0.0014, 0.5, 0), (0.0022, 0.19, 1.3), (0.00004, 7, 0.4)])
    x = nivelar(x) + ruido_rosa(len(x), rng, 900, 7000, 0.0025)
    x = cortes(x, rng, (4, 12), (0.15, 0.5), (0.05, 0.25))
    return x + chasquidos(len(x), rng, 0.3, 0.04)


def v2_casete_destrozado(voz_src, s, rng):
    x = ffmpeg_cadena(voz_src, "highpass=f=300,highpass=f=300,lowpass=f=3800,lowpass=f=3800,lowpass=f=4200,"
                      "equalizer=f=1400:t=o:w=1.2:g=6,acompressor=threshold=0.1:ratio=4:attack=4:release=100:makeup=3,"
                      "volume=11dB,asoftclip=type=atan:threshold=0.32", s)
    x = retardo_variable(x, rng, [(0.0025, 0.45, 0), (0.004, 0.17, 1.1), (0.00008, 9, 0.2)],
                         base=0.05, arrastres=((5, 11), (0.02, 0.04), (0.5, 0.9)))
    x = nivelar(x) + ruido_rosa(len(x), rng, 700, 6000, 0.005)
    x = cortes(x, rng, (1.5, 5), (0.03, 0.35), (0.08, 0.45))
    return x + zumbido(len(x), 50, 0.002, 1.5) + chasquidos(len(x), rng, 1.5, 0.08)


def v3_vhs(voz_src, s, rng):
    x = ffmpeg_cadena(voz_src, "highpass=f=90,lowpass=f=8500,lowpass=f=7000,equalizer=f=800:t=o:w=1.5:g=2,"
                      "acompressor=threshold=0.18:ratio=2:attack=10:release=150:makeup=1.5,"
                      "volume=3dB,asoftclip=type=tanh:threshold=0.7", s)
    x = retardo_variable(x, rng, [(0.0008, 0.4, 0), (0.00003, 6, 0.3)])
    coro = retardo_variable(x, rng, [(0.0015, 0.6, 0)], base=0.012)          # doble pista desfasada
    x = nivelar(0.7 * x + 0.45 * coro) + ruido_rosa(len(x), rng, 2000, 9000, 0.0018)
    x = tracking(x, rng, (8, 16), (0.15, 0.3), 0.05, (0.25, 0.5))
    return x + zumbido(len(x), 50, 0.0012, 0.6)                              # zumbido del cambio de cabezas


def v4_vhs_gastado(voz_src, s, rng):
    x = ffmpeg_cadena(voz_src, "highpass=f=120,lowpass=f=6000,lowpass=f=6000,equalizer=f=1000:t=o:w=1.4:g=3,"
                      "acompressor=threshold=0.15:ratio=2.5:attack=8:release=130:makeup=2,"
                      "volume=6dB,asoftclip=type=tanh:threshold=0.5", s)
    x = retardo_variable(x, rng, [(0.0018, 0.5, 0), (0.0025, 0.15, 0.7), (0.00005, 6.5, 0)],
                         base=0.03, arrastres=((6, 14), (0.008, 0.016), (0.3, 0.6)))
    coro = retardo_variable(x, rng, [(0.0025, 0.7, 0)], base=0.014)
    x = nivelar(0.65 * x + 0.6 * coro) + ruido_rosa(len(x), rng, 1500, 8000, 0.004)
    x = tracking(x, rng, (3, 7), (0.2, 0.5), 0.1, (0.08, 0.3))
    x = cortes(x, rng, (6, 14), (0.05, 0.3), (0.1, 0.3))
    return x + zumbido(len(x), 50, 0.0025, 0.6)


def v5_microcasete_interrogatorio(voz_src, s, rng):
    x = ffmpeg_cadena(voz_src, "highpass=f=400,highpass=f=400,lowpass=f=3200,lowpass=f=3200,lowpass=f=3500,"
                      "equalizer=f=1200:t=o:w=1.2:g=5,acompressor=threshold=0.08:ratio=6:attack=3:release=90:makeup=3,"
                      "volume=8dB,asoftclip=type=tanh:threshold=0.4", s)
    x = eco(x, [(0.023, 0.3), (0.041, 0.2), (0.067, 0.12), (0.101, 0.06)])  # sala pequeña y cerrada
    x = retardo_variable(x, rng, [(0.0012, 0.7, 0), (0.00006, 11, 0.5)])
    t = np.arange(len(x)) / SR
    motor = np.sin(2 * np.pi * 2400 * t + 3 * np.sin(2 * np.pi * 11 * t)).astype(np.float32) * 0.0028
    x = nivelar(x) + ruido_rosa(len(x), rng, 1000, 4000, 0.003) + motor
    return cortes(x, rng, (8, 20), (0.2, 0.6), (0.05, 0.2))


def v6_bobina_de_archivo(voz_src, s, rng):
    x = ffmpeg_cadena(voz_src, "highpass=f=150,lowpass=f=7000,lowpass=f=7000,equalizer=f=2000:t=o:w=1.3:g=2,"
                      "acompressor=threshold=0.15:ratio=2.5:attack=8:release=140:makeup=2,"
                      "volume=4dB,asoftclip=type=tanh:threshold=0.6", s)
    x = retardo_variable(x, rng, [(0.001, 0.3, 0), (0.00003, 5, 0.2)])
    x = nivelar(x)
    x = eco(x, [(-1.0, 0.03), (1.0, 0.025)])                                # copia magnética (pre-eco)
    x = x + ruido_rosa(len(x), rng, 600, 9000, 0.003)
    x = cortes(x, rng, (10, 25), (0.2, 0.6), (0.06, 0.25))
    return x + zumbido(len(x), 50, 0.0015, 2.5) + chasquidos(len(x), rng, 0.5, 0.06)


VARIANTES = [
    ("1-casete-gastado", v1_casete_gastado),
    ("2-casete-destrozado", v2_casete_destrozado),
    ("3-vhs", v3_vhs),
    ("4-vhs-muy-gastado", v4_vhs_gastado),
    ("5-microcasete-de-interrogatorio", v5_microcasete_interrogatorio),
    ("6-bobina-de-archivo-policial", v6_bobina_de_archivo),
]

if __name__ == "__main__":
    src, out = sys.argv[1], sys.argv[2]
    segundos = float(sys.argv[3]) if len(sys.argv) > 3 else 45
    os.makedirs(out, exist_ok=True)
    for i, (nombre, f) in enumerate(VARIANTES):
        y = f(src, segundos, np.random.default_rng(100 + i))
        pico = np.max(np.abs(y))
        if pico > 0.89:                     # techo suave a -1 dB
            y = np.where(np.abs(y) > 0.7, np.sign(y) * (0.7 + 0.19 * np.tanh((np.abs(y) - 0.7) / 0.19)), y)
        if not np.isfinite(y).all() or np.sqrt(np.mean(y ** 2)) < 0.03:
            raise RuntimeError(f"{nombre}: audio roto")
        raw = os.path.join(tempfile.gettempdir(), "variante_final.f32")
        y.astype(np.float32).tofile(raw)
        dest = os.path.join(out, f"brady_{nombre}.mp3")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", raw,
                        "-c:a", "libmp3lame", "-b:a", "128k", dest], check=True)
        os.remove(raw)
        print(f"{nombre}: {len(y) / SR:.1f} s, rms {20 * np.log10(np.sqrt(np.mean(y ** 2))):.1f} dB")
