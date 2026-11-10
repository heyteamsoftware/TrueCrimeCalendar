"""Genera las cintas v3 (voz limpia) a partir de los guiones assets/podcast/<id>.json con `cintas`.

Para cada cinta: locución con la skill de Ximena (Ximena y Álvaro), 0,4 s de silencio inicial,
voz nivelada a unos -19 dB RMS de media (picos por debajo de -2 dBFS) y Opus a 12 kbps (modo voz). El sonido de casete NO
va grabado: lo aplica el móvil al reproducir (docs/CONTRATO.md, 7.6). Actualiza audio/index.json
con la entrada v3 del caso y borra su episodio v2 (audio/<id>.ogg) si existía.

Uso:
  python tools/generar_cintas.py --locucion RUTA/Locucion.py [--sin-validar] [--paralelo 2] id1 [id2 ...]
"""
import argparse, hashlib, json, os, subprocess, sys, wave
from concurrent.futures import ThreadPoolExecutor

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generar_audios import (AUDIO, PODCAST, RAIZ, TRABAJO, guardar_indice, leer_indice, lock, log,  # noqa: E402
                            nivelar, texto_locutado)

PAUSA = 0.7         # segundos entre bloques
INICIO = 0.4        # silencio antes del primer bloque
KBPS = "12k"


def validar(ids):
    r = subprocess.run(["node", os.path.join(RAIZ, "tools", "validar_cintas.js"), *ids],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    print(r.stdout.strip())
    return r.returncode == 0


def cinta(cid, c, pron, locucion):
    """Locuta y codifica una cinta. Devuelve su entrada para index.json."""
    frases = []
    for i, b in enumerate(c["bloques"]):
        t = texto_locutado(b["texto"].strip(), pron)
        h = hashlib.sha1((b["voz"] + "|" + t).encode("utf-8")).hexdigest()[:10]
        frases.append({"id": f"{i:02d}_{h}", "texto": t, "voz": b["voz"]})
    carpeta = os.path.join(TRABAJO, "cintas", cid, f"cinta-{c['n']}")
    os.makedirs(carpeta, exist_ok=True)
    guion = os.path.join(carpeta, "guion.json")
    json.dump(frases, open(guion, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    completa = os.path.join(carpeta, "locucion_completa.wav")
    if os.path.exists(completa):
        os.remove(completa)
    for intento in range(3):
        r = subprocess.run([sys.executable, locucion, guion, carpeta, "--pausa", str(PAUSA)],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode == 0 and os.path.exists(completa):
            break
        log(f"  reintento {cid} cinta {c['n']}: {(r.stdout + r.stderr).strip()[-200:]}")
    else:
        raise RuntimeError(f"{cid} cinta {c['n']}: la locución ha fallado")

    dur = json.load(open(os.path.join(carpeta, "duraciones.json"), encoding="utf-8"))
    inicios, t = [], INICIO
    for f in frases:
        inicios.append(round(t * 1000))
        t += dur[f["id"]] + PAUSA
    total = t - PAUSA

    with wave.open(completa) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    x = np.concatenate([np.zeros(int(INICIO * sr), np.float32), x])
    x = nivelar(x) * 0.75                            # voz limpia: unos -19 dB RMS de media y picos < -2 dBFS
    if not np.isfinite(x).all() or np.sqrt(np.mean(x ** 2)) < 0.03:
        raise RuntimeError(f"{cid} cinta {c['n']}: audio roto (NaN o silencio)")
    raw = os.path.join(carpeta, "voz.f32")
    x.astype(np.float32).tofile(raw)

    destino_dir = os.path.join(AUDIO, cid)
    os.makedirs(destino_dir, exist_ok=True)
    ogg = os.path.join(destino_dir, f"cinta-{c['n']}.ogg")
    tmp = ogg + ".tmp.ogg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", raw,
                    "-c:a", "libopus", "-b:a", KBPS, "-application", "voip", "-frame_duration", "60",
                    "-metadata", f"title=Cinta {c['n']} · {c['titulo']}", "-metadata", "artist=TRUE CRIME CALENDAR",
                    tmp], check=True)
    os.replace(tmp, ogg)
    os.remove(raw)
    log(f"✓ {cid} cinta {c['n']}: {total / 60:.1f} min, {os.path.getsize(ogg) // 1024} KB")
    return {"n": c["n"], "titulo": c["titulo"], "url": f"audio/{cid}/cinta-{c['n']}.ogg",
            "durationMs": round(total * 1000), "bloquesMs": inicios}


def caso(cid, locucion, paralelo):
    g = json.load(open(os.path.join(PODCAST, cid + ".json"), encoding="utf-8"))
    if not isinstance(g.get("cintas"), list):
        raise RuntimeError(f"{cid}: no es un guion v3 (sin «cintas»)")
    pron = g.get("pronunciacion") or {}
    with ThreadPoolExecutor(paralelo) as ex:
        entradas = list(ex.map(lambda c: cinta(cid, c, pron, locucion), g["cintas"]))
    # borra cintas sobrantes de una versión anterior con más cintas
    destino_dir = os.path.join(AUDIO, cid)
    validas = {f"cinta-{e['n']}.ogg" for e in entradas}
    for f in os.listdir(destino_dir):
        if f.endswith(".ogg") and f not in validas:
            os.remove(os.path.join(destino_dir, f))
    viejo = os.path.join(AUDIO, cid + ".ogg")        # episodio v2 del mismo caso
    if os.path.exists(viejo):
        os.remove(viejo)
    with lock:
        idx = leer_indice()
        idx[cid] = {"efecto": "casete-gastado", "cintas": entradas}
        guardar_indice(idx)
    mins = sum(e["durationMs"] for e in entradas) / 60000
    log(f"== {cid}: {len(entradas)} cintas, {mins:.1f} min")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="+")
    ap.add_argument("--locucion", default=os.environ.get("LOCUCION_XIMENA", ""))
    ap.add_argument("--sin-validar", action="store_true")
    ap.add_argument("--paralelo", type=int, default=2, help="cintas a la vez dentro de un caso")
    ap.add_argument("--casos-paralelo", type=int, default=1, help="casos a la vez (el índice se protege con un cerrojo)")
    a = ap.parse_args()
    if not a.locucion or not os.path.exists(a.locucion):
        sys.exit("Indica la ruta de Locucion.py con --locucion o LOCUCION_XIMENA")
    if not a.sin_validar and not validar(a.ids):
        sys.exit("Hay guiones que no pasan la validación (usa --sin-validar para probar)")
    fallos = []

    def uno(cid):
        try:
            caso(cid, a.locucion, a.paralelo)
        except Exception as e:                       # un caso roto no para la tanda
            log(f"✗ {cid}: {e}")
            fallos.append(cid)

    with ThreadPoolExecutor(max(1, a.casos_paralelo)) as ex:
        list(ex.map(uno, a.ids))
    if fallos:
        sys.exit("Casos con error: " + " ".join(fallos))


if __name__ == "__main__":
    main()
