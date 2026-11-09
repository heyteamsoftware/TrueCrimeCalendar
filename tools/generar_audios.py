"""Genera los audios del podcast a partir de los guiones (assets/podcast/<id>.json).

Usa el script de la skill «locución Ximena» (edge-tts: Ximena narra, Álvaro copresenta),
normaliza el volumen, comprime a Ogg Opus y actualiza assets/audio/index.json con la
duración y el inicio de cada bloque (para resaltar el párrafo que suena).

Uso:
  python tools/generar_audios.py [--watch] [--paralelo 3] [--locucion RUTA/Locucion.py] [ids...]

Sin ids procesa todos los guiones. Solo regenera un audio si su guion es más nuevo que el audio.
Con --watch sigue vigilando la carpeta de guiones hasta que todos los casos tengan audio.
"""
import argparse, hashlib, json, os, subprocess, sys, tempfile, time, wave
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PODCAST = os.path.join(RAIZ, "app", "src", "main", "assets", "podcast")
AUDIO = os.path.join(RAIZ, "app", "src", "main", "assets", "audio")
INDICE = os.path.join(AUDIO, "index.json")
TRABAJO = os.path.join(tempfile.gettempdir(), "tcc_tts")  # ruta corta: Windows y rutas largas
LOCUCION_DEFECTO = os.environ.get("LOCUCION_XIMENA", "")
PAUSA = 0.7          # segundos entre bloques
TOTAL_CASOS = 100
lock = Lock()


def log(*a):
    with lock:
        print(time.strftime("%H:%M:%S"), *a, flush=True)


def leer_indice():
    try:
        return json.load(open(INDICE, encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def guardar_indice(idx):
    tmp = INDICE + ".tmp"
    json.dump(dict(sorted(idx.items())), open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.replace(tmp, INDICE)


def texto_locutado(texto, pron):
    for clave in sorted(pron, key=len, reverse=True):
        texto = texto.replace(clave, pron[clave])
    return texto


def guion_valido(g, cid):
    if g.get("id") != cid or not isinstance(g.get("bloques"), list) or not g["bloques"]:
        return False
    if any(b.get("voz") not in ("ximena", "alvaro") or not str(b.get("texto", "")).strip() for b in g["bloques"]):
        return False
    palabras = sum(len(b["texto"].split()) for b in g["bloques"])
    return 600 <= palabras <= 950


def pendiente(cid, idx):
    js = os.path.join(PODCAST, cid + ".json")
    ogg = os.path.join(AUDIO, cid + ".ogg")
    if cid not in idx or not os.path.exists(ogg):
        return True
    return os.path.getmtime(js) > os.path.getmtime(ogg)


def generar(cid, locucion):
    js = os.path.join(PODCAST, cid + ".json")
    g = json.load(open(js, encoding="utf-8"))
    pron = g.get("pronunciacion") or {}
    frases = []
    for i, b in enumerate(g["bloques"]):
        t = texto_locutado(b["texto"].strip(), pron)
        h = hashlib.sha1((b["voz"] + "|" + t).encode("utf-8")).hexdigest()[:10]
        frases.append({"id": f"{i:02d}_{h}", "texto": t, "voz": b["voz"]})

    carpeta = os.path.join(TRABAJO, cid)
    os.makedirs(carpeta, exist_ok=True)
    guion = os.path.join(carpeta, "guion.json")
    json.dump(frases, open(guion, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    completa = os.path.join(carpeta, "locucion_completa.wav")
    if os.path.exists(completa):
        os.remove(completa)
    r = subprocess.run([sys.executable, locucion, guion, carpeta, "--pausa", str(PAUSA)],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0 or not os.path.exists(completa):
        raise RuntimeError((r.stdout + r.stderr).strip()[-600:])

    dur = json.load(open(os.path.join(carpeta, "duraciones.json"), encoding="utf-8"))
    inicios, t = [], 0.0
    for f in frases:
        inicios.append(round(t * 1000))
        t += dur[f["id"]] + PAUSA
    total = t - PAUSA

    ogg = os.path.join(AUDIO, cid + ".ogg")
    tmp = ogg + ".tmp.ogg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", completa,
                    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "1",
                    "-c:a", "libopus", "-b:a", "24k", "-application", "audio",
                    "-metadata", f"title={g.get('titulo', cid)}", "-metadata", "artist=TRUE CRIME CALENDAR",
                    tmp], check=True)
    os.replace(tmp, ogg)
    with lock:
        idx = leer_indice()
        idx[cid] = {"durationMs": round(total * 1000), "bloquesMs": inicios}
        guardar_indice(idx)
    return total


def candidatos(ids):
    idx = leer_indice()
    out = []
    for f in sorted(os.listdir(PODCAST)):
        if not f.endswith(".json"):
            continue
        cid = f[:-5]
        if ids and cid not in ids:
            continue
        ruta = os.path.join(PODCAST, f)
        if time.time() - os.path.getmtime(ruta) < 90:   # aún se está escribiendo
            continue
        try:
            g = json.load(open(ruta, encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
        if guion_valido(g, cid) and pendiente(cid, idx):
            out.append(cid)
    return out


def ronda(ids, locucion, paralelo, fallos):
    lista = [c for c in candidatos(ids) if fallos.get(c, 0) < 3]
    if not lista:
        return 0
    log(f"generando {len(lista)}: {', '.join(lista)}")
    with ThreadPoolExecutor(paralelo) as ex:
        futs = {ex.submit(generar, c, locucion): c for c in lista}
        for fu in as_completed(futs):
            c = futs[fu]
            try:
                log(f"✓ {c}: {fu.result() / 60:.1f} min")
                fallos.pop(c, None)
            except Exception as e:  # se reintenta en la siguiente ronda
                fallos[c] = fallos.get(c, 0) + 1
                log(f"✗ {c} (intento {fallos[c]}): {e}")
    return len(lista)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--watch", action="store_true")
    ap.add_argument("--paralelo", type=int, default=3)
    ap.add_argument("--locucion", default=LOCUCION_DEFECTO)
    a = ap.parse_args()
    if not a.locucion or not os.path.exists(a.locucion):
        sys.exit("Indica la ruta de Locucion.py de la skill con --locucion o la variable LOCUCION_XIMENA")
    os.makedirs(AUDIO, exist_ok=True)
    fallos = {}
    while True:
        hechos = ronda(set(a.ids), a.locucion, a.paralelo, fallos)
        if not a.watch:
            break
        idx = leer_indice()
        objetivo = len(a.ids) if a.ids else TOTAL_CASOS
        if len(idx) >= objetivo and not candidatos(set(a.ids)):
            log(f"listo: {len(idx)} audios")
            break
        if not hechos:
            time.sleep(60)
    total_min = sum(v["durationMs"] for v in leer_indice().values()) / 60000
    log(f"audios en el índice: {len(leer_indice())} · {total_min:.0f} min en total")


if __name__ == "__main__":
    main()
