"""Audio y subtítulos de un corto vertical (YouTube Shorts, TikTok, Reels) a partir de una cinta del caso.

Toma el principio de la cinta (desde «Cinta uno. <título>», sin la presentación del archivo) hasta unos
45 segundos, cortando siempre al final de un bloque del guion; le pone el sonido «casete gastado» de la app
(tools/variantes_cinta.py) y añade al final una voz limpia que invita a escuchar la cinta completa en la app.

Uso: python tools/cortos/preparar_audio.py <id> <carpeta_salida> [--cinta 1] [--max 46]
Deja en la carpeta: audio.wav y audio.json (duración, subtítulos con sus tiempos y dónde empieza el final).
"""
import argparse, json, os, re, subprocess, sys, wave

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
sys.path.insert(0, os.path.dirname(AQUI))
from variantes_cinta import SR, v1_casete_gastado  # noqa: E402

ASSETS = os.path.join(RAIZ, "app", "src", "main", "assets")
PAUSA = 0.7                      # pausa entre bloques al grabar las cintas (tools/generar_cintas.py)
FINAL_TEXTO = "La cinta completa, en la app TRUE CRIME CALENDAR. Gratis en Google Play."
FINAL_PRON = {"TRUE CRIME CALENDAR": "Tru Cráim Cálendar"}
HUECO_FINAL = 0.9                # silencio entre la cinta y la voz final


def leer_wav(p):
    with wave.open(p) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        return x, w.getframerate()


def a_wav(src, dst, desde=None, hasta=None):
    cmd = ["ffmpeg", "-v", "error", "-y"]
    if desde is not None:
        cmd += ["-ss", f"{desde:.3f}", "-to", f"{hasta:.3f}"]
    subprocess.run(cmd + ["-i", src, "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", dst], check=True)


def voz_final(trabajo):
    """Voz de cierre (Ximena, limpia). Se graba una vez y se reutiliza en todos los cortos."""
    carpeta = os.path.join(trabajo, "_voz_final")
    wav = os.path.join(carpeta, "final.wav")
    if os.path.exists(wav):
        return wav
    locucion = open(os.path.join(RAIZ, "docs", ".locucion_ruta.txt"), encoding="utf-8").read().strip()
    texto = FINAL_TEXTO
    for k, v in FINAL_PRON.items():
        texto = texto.replace(k, v)
    os.makedirs(carpeta, exist_ok=True)
    guion = os.path.join(carpeta, "guion.json")
    json.dump([{"id": "final", "texto": texto, "voz": "ximena"}], open(guion, "w", encoding="utf-8"), ensure_ascii=False)
    subprocess.run([sys.executable, locucion, guion, carpeta, "--pausa", "0.3"], check=True)
    return wav


def trozos(texto, max_pal=6):
    """Parte un bloque en frases cortas para subtítulos: corta en la puntuación y cada ~6 palabras."""
    out = []
    for frase in re.split(r"(?<=[.!?…])\s+", texto.strip()):
        partes = [p for p in re.split(r"(?<=[,;:])\s+", frase) if p]
        for p in partes:
            pal = p.split()
            n = max(1, round(len(pal) / max_pal + 0.49))
            tam = -(-len(pal) // n)
            out += [" ".join(pal[i:i + tam]) for i in range(0, len(pal), tam)]
    return out


def peso(t):
    # tiempo de habla aproximado: letras + una pausa por cada signo de puntuación final
    return len(t) + 6 * len(re.findall(r"[,;:]$", t)) + 10 * len(re.findall(r"[.!?…]$", t))


def silencios(wav):
    """Pausas de la voz limpia: [(inicio, fin), ...] en segundos."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav, "-af", "silencedetect=n=-35dB:d=0.18", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    ini = [float(v) for v in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    fin = [float(v) for v in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    return list(zip(ini, fin))


def repartir(partes, t0, t1, pausas):
    """Tiempos de cada trozo de un bloque: primero en proporción a su longitud; luego cada final de frase
    se pega a la pausa real más cercana y lo que queda entre dos pausas se vuelve a repartir."""
    pesos = [peso(p) for p in partes]
    tot = sum(pesos)
    cortes, acc = [], t0
    for w in pesos[:-1]:
        acc += (t1 - t0) * w / tot
        cortes.append(acc)
    anclas = {}                                   # índice de corte -> (fin de voz, vuelta a hablar)
    libres = list(pausas)
    for k, b in enumerate(cortes):
        signo = partes[k][-1]
        tol = 1.4 if signo in ".!?…" else 0.9 if signo in ",;:" else 0
        if not tol or not libres:
            continue
        s = min(libres, key=lambda s: abs((s[0] + s[1]) / 2 - b))
        if abs((s[0] + s[1]) / 2 - b) <= tol:
            anclas[k] = s
            libres.remove(s)
    # anclas en orden y sin cruzarse
    orden, ultimo = {}, t0
    for k in sorted(anclas):
        if anclas[k][0] > ultimo:
            orden[k] = anclas[k]
            ultimo = anclas[k][1]
    tiempos, ini, k0 = [None] * len(partes), t0, 0
    for k in sorted(orden) + [len(partes) - 1]:
        fin = orden[k][0] if k in orden else t1
        grupo = range(k0, k + 1)
        sub = sum(pesos[j] for j in grupo)
        t = ini
        for j in grupo:
            d = (fin - ini) * pesos[j] / sub
            tiempos[j] = (t, t + d)
            t += d
        ini, k0 = (orden[k][1] if k in orden else t1), k + 1
    return tiempos


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("id")
    ap.add_argument("salida")
    ap.add_argument("--cinta", type=int, default=1)
    ap.add_argument("--max", type=float, default=46.0, help="segundos máximos de cinta")
    a = ap.parse_args()

    guion = json.load(open(os.path.join(ASSETS, "podcast", a.id + ".json"), encoding="utf-8"))
    c = next(c for c in guion["cintas"] if c["n"] == a.cinta)
    idx = json.load(open(os.path.join(ASSETS, "audio", "index.json"), encoding="utf-8"))[a.id]
    meta = next(m for m in idx["cintas"] if m["n"] == a.cinta)
    ini = [ms / 1000 for m in [meta] for ms in m["bloquesMs"]]
    fin_cinta = meta["durationMs"] / 1000
    fines = [ini[i + 1] - PAUSA for i in range(len(ini) - 1)] + [fin_cinta]

    # desde el bloque «Cinta uno. Título.» (el anterior es la presentación del archivo)
    primero = next(i for i, b in enumerate(c["bloques"]) if b["texto"].lower().startswith("cinta "))
    ultimo = primero + 1
    while ultimo + 1 < len(ini) and fines[ultimo + 1] - ini[primero] <= a.max:
        ultimo += 1
    desde, hasta = ini[primero] - 0.15, fines[ultimo] + 0.35

    os.makedirs(a.salida, exist_ok=True)
    trabajo = os.path.join(RAIZ, "cortos")
    limpio = os.path.join(a.salida, "_limpio.wav")
    a_wav(os.path.join(RAIZ, "cintas", a.id, f"cinta-{a.cinta}.ogg"), limpio, desde, hasta)
    seg = hasta - desde
    pausas = silencios(limpio)
    x = v1_casete_gastado(limpio, seg + 1, np.random.default_rng(7))
    os.remove(limpio)

    fx, _ = leer_wav(voz_final(trabajo))
    fx = fx / max(1e-6, np.sqrt(np.mean(fx ** 2))) * np.sqrt(np.mean(x ** 2)) * 0.95   # mismo volumen que la cinta
    inicio_final = len(x) / SR + HUECO_FINAL
    y = np.concatenate([x, np.zeros(int(HUECO_FINAL * SR), np.float32), fx, np.zeros(int(0.8 * SR), np.float32)])
    pico = np.max(np.abs(y))
    if pico > 0.89:
        y = y / pico * 0.89
    if not np.isfinite(y).all() or np.sqrt(np.mean(y ** 2)) < 0.02:
        sys.exit("audio roto (NaN o silencio)")
    with wave.open(os.path.join(a.salida, "audio.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y * 32767).astype(np.int16).tobytes())

    subs = []
    for i in range(primero, ultimo + 1):
        partes = trozos(c["bloques"][i]["texto"])
        t0, t1 = ini[i] - desde, fines[i] - desde
        for (a0, a1), p in zip(repartir(partes, t0, t1, [s for s in pausas if t0 < s[0] and s[1] < t1]), partes):
            subs.append({"t0": round(a0, 2), "t1": round(a1, 2), "txt": p, "voz": c["bloques"][i]["voz"]})
    json.dump({"id": a.id, "cinta": a.cinta, "titulo": c["titulo"], "cintas": len(guion["cintas"]),
               "duracion": round(len(y) / SR, 2), "final": round(inicio_final, 2),
               "minutos": round(sum(m["durationMs"] for m in idx["cintas"]) / 60000), "subs": subs},
              open(os.path.join(a.salida, "audio.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{a.id}: {seg:.1f} s de cinta + final = {len(y) / SR:.1f} s, {len(subs)} subtítulos")


if __name__ == "__main__":
    main()
