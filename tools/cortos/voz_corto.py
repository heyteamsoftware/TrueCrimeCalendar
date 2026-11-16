"""Voz y sonido de un corto a partir de su guion (tools/cortos/guiones/<id>.json).

Cada escena se locuta aparte (Ximena, o Álvaro si la escena lo pide) con los tiempos de cada palabra, para
los subtítulos palabra a palabra. La voz lleva un color de cinta suave (sin cortes, para que se entienda bien),
y debajo va un fondo grave sintetizado, golpes graves en el gancho y la pregunta, y el ruido de la pletina
de la app al empezar y al acabar. Todo el sonido es propio: no hay música de terceros.

Uso: python tools/cortos/voz_corto.py <id> <carpeta_salida>
Deja audio.wav y tiempos.json (escenas con su inicio, su fin y sus palabras).
"""
import asyncio, json, os, re, subprocess, sys, wave

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
sys.path.insert(0, os.path.dirname(AQUI))
from variantes_cinta import SR, ffmpeg_cadena, nivelar, retardo_variable, ruido_rosa  # noqa: E402

ASSETS = os.path.join(RAIZ, "app", "src", "main", "assets")
VOCES = {"ximena": ("es-ES-XimenaNeural", "+9%", "+0Hz"), "alvaro": ("es-ES-AlvaroNeural", "+0%", "-3Hz")}
PRON = {"TRUE CRIME CALENDAR": "Tru Cráim Cálendar"}
HUECO = {"gancho": 0.12, "pregunta": 0.35, "cierre": 0.8}      # silencio antes de la escena (por defecto 0.22)
COLA = 2.6                                                       # el cartel final se queda en pantalla
RITMO_CIERRE = "+0%"                                             # el cierre, sin prisa


async def locutar(texto, voz, mp3, ritmo=None):
    import edge_tts
    nombre, rate, pitch = VOCES[voz]
    rate = ritmo or rate
    palabras = []
    for intento in range(4):
        try:
            palabras = []
            c = edge_tts.Communicate(texto, nombre, rate=rate, pitch=pitch, boundary="WordBoundary")
            with open(mp3, "wb") as f:
                async for trozo in c.stream():
                    if trozo["type"] == "audio":
                        f.write(trozo["data"])
                    elif trozo["type"] == "WordBoundary":
                        palabras.append((trozo["offset"] / 1e7, (trozo["offset"] + trozo["duration"]) / 1e7, trozo["text"]))
            return palabras
        except Exception as e:                  # el servicio a veces corta la conexión
            print("reintento", voz, e)
            await asyncio.sleep(2)
    raise RuntimeError("la locución ha fallado: " + texto[:40])


def leer(mp3):
    raw = mp3 + ".f32"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-ac", "1", "-ar", str(SR), "-f", "f32le", raw], check=True)
    x = np.fromfile(raw, np.float32)
    os.remove(raw)
    return x


def palabras_originales(texto, tts):
    """Los subtítulos enseñan el texto del guion, no el adaptado para la pronunciación."""
    orig = texto.split()
    if len(orig) == len(tts):
        return [(a, b, w) for (a, b, _), w in zip(tts, orig)]
    out = []                                   # recuento distinto: reparto proporcional
    for k, w in enumerate(orig):
        j = min(len(tts) - 1, int(k * len(tts) / len(orig)))
        out.append((tts[j][0], tts[j][1], w))
    return out


def golpe(n_seg, f0=70, f1=34, dur=0.9, nivel=0.5):
    t = np.arange(int(dur * SR)) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5) * nivel
    return s.astype(np.float32)


def tecla(rng):
    """Golpe de máquina de escribir: chasquido corto con algo de cuerpo."""
    n = int(0.045 * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n) * np.exp(-t * 160) * 0.35 + np.sin(2 * np.pi * 180 * t) * np.exp(-t * 90) * 0.15
    return x.astype(np.float32)


def fondo(n, rng):
    """Zumbido grave que respira: dos notas graves y ruido muy filtrado."""
    t = np.arange(n) / SR
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * t / 7.0)
    x = (np.sin(2 * np.pi * 55 * t) * 0.5 + np.sin(2 * np.pi * 82.41 * t) * 0.3 + np.sin(2 * np.pi * 110 * t) * 0.12) * lfo
    x = x + ruido_rosa(n, rng, 60, 400, 0.08)
    return (x / np.sqrt(np.mean(x ** 2)) * 0.02).astype(np.float32)


def sfx(nombre):
    raw = os.path.join(os.environ.get("TEMP", "."), "sfx_corto.f32")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(ASSETS, "sfx", nombre), "-ac", "1", "-ar", str(SR),
                    "-f", "f32le", raw], check=True)
    x = np.fromfile(raw, np.float32)
    os.remove(raw)
    return x


def poner(y, x, t, g=1.0):
    i = int(t * SR)
    if i >= len(y):
        return
    k = min(len(x), len(y) - i)
    y[i:i + k] += x[:k] * g


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    cid, salida = sys.argv[1], sys.argv[2]
    guion = json.load(open(os.path.join(AQUI, "guiones", cid + ".json"), encoding="utf-8"))
    pron = dict(PRON)
    p = os.path.join(ASSETS, "podcast", cid + ".json")
    if os.path.exists(p):
        pron.update(json.load(open(p, encoding="utf-8")).get("pronunciacion") or {})
    os.makedirs(salida, exist_ok=True)

    async def todas():
        tareas = []
        for k, e in enumerate(guion["escenas"]):
            t = e["texto"]
            for a, b in sorted(pron.items(), key=lambda kv: -len(kv[0])):
                t = re.sub(r"\b" + re.escape(a) + r"\b", b, t)
            ritmo = e.get("ritmo") or (RITMO_CIERRE if e["tipo"] == "cierre" else None)
            tareas.append(locutar(t, e.get("voz", "ximena"), os.path.join(salida, f"_e{k}.mp3"), ritmo))
        return await asyncio.gather(*tareas)
    res = asyncio.run(todas())

    partes, escenas, t = [], [], 0.0
    for k, (e, pal) in enumerate(zip(guion["escenas"], res)):
        hueco = 0.05 if k == 0 else HUECO.get(e["tipo"], 0.22)
        partes.append(np.zeros(int(hueco * SR), np.float32))
        t += hueco
        mp3 = os.path.join(salida, f"_e{k}.mp3")
        x = leer(mp3)
        os.remove(mp3)
        fin_voz = pal[-1][1] if pal else len(x) / SR
        x = x[:int(min(len(x) / SR, fin_voz + 0.12) * SR)]           # sin la cola de silencio del servicio
        partes.append(x)
        escenas.append({**e, "t0": round(t, 3), "t1": round(t + len(x) / SR, 3),
                        "palabras": [{"t0": round(t + a, 3), "t1": round(t + b, 3), "w": w} for a, b, w in palabras_originales(e["texto"], pal)]})
        t += len(x) / SR
    partes.append(np.zeros(int(COLA * SR), np.float32))
    voz = np.concatenate(partes)

    # color de cinta suave
    limpio = os.path.join(salida, "_voz.wav")
    with wave.open(limpio, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(voz, -1, 1) * 32767).astype(np.int16).tobytes())
    rng = np.random.default_rng(11)
    v = ffmpeg_cadena(limpio, "highpass=f=130,lowpass=f=7500,equalizer=f=2600:t=o:w=1.2:g=3,"
                      "acompressor=threshold=0.1:ratio=3:attack=5:release=90:makeup=2", len(voz) / SR + 1)
    os.remove(limpio)
    v = retardo_variable(v, rng, [(0.0006, 0.5, 0), (0.0009, 0.21, 1.3)])
    v = nivelar(v) + ruido_rosa(len(v), rng, 900, 7000, 0.0018)

    y = v + fondo(len(v), rng)
    for e in escenas:
        if e["tipo"] == "gancho" and e.get("estilo") == "maquina":
            # una tecla por letra, al ritmo con que la plantilla escribe el texto
            n = len("\n".join(e["lineas"]))
            dur = max(0.5, (e["t1"] - e["t0"]) * 0.85)
            for k in range(n):
                if "\n".join(e["lineas"])[k] != " ":
                    poner(y, tecla(rng), e["t0"] + dur * k / n, 0.9)
        elif e["tipo"] in ("gancho", "pregunta", "hora", "titular") or e.get("golpe"):
            poner(y, golpe(len(y)), max(0, e["t0"] - 0.03))
    poner(y, sfx("insertar-cinta.ogg"), 0.0, 0.35)
    cierre = next((e for e in escenas if e["tipo"] == "cierre"), None)
    if cierre:
        poner(y, sfx("expulsar-cinta.ogg"), cierre["t1"] + 0.15, 0.45)
    pico = np.max(np.abs(y))
    if pico > 0.89:
        y = y / pico * 0.89
    if not np.isfinite(y).all() or np.sqrt(np.mean(y ** 2)) < 0.02:
        sys.exit("audio roto (NaN o silencio)")
    with wave.open(os.path.join(salida, "audio.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y * 32767).astype(np.int16).tobytes())
    dur = round(len(y) / SR, 2)
    json.dump({"id": cid, "duracion": dur, "escenas": escenas},
              open(os.path.join(salida, "tiempos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{cid}: {dur} s, {len(escenas)} escenas")


if __name__ == "__main__":
    main()
