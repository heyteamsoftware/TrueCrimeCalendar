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
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PODCAST = os.path.join(RAIZ, "app", "src", "main", "assets", "podcast")
AUDIO = os.path.join(RAIZ, "app", "src", "main", "assets", "audio")
INDICE = os.path.join(AUDIO, "index.json")
# Las cintas v3 no van en la APK: se graban aquí (fuera de git) y se suben al servidor (tools/subir_audios.ps1).
CINTAS = os.path.join(RAIZ, "cintas")
TRABAJO = os.path.join(tempfile.gettempdir(), "tcc_tts")  # ruta corta: Windows y rutas largas
LOCUCION_DEFECTO = os.environ.get("LOCUCION_XIMENA", "")
PAUSA = 0.7          # segundos entre bloques
TOTAL_CASOS = 100

# Sonido de casete viejo. No cambia la duración: los tiempos de los bloques siguen valiendo.
#  1. Banda limitada: paso alto a 180 Hz (24 dB/oct) y paso bajo a ~6,5 kHz (36 dB/oct),
#     con empuje de medios entre 1 y 2,5 kHz para que la voz suene «encajonada».
#  2. Saturación magnética: compresión y más ganancia de entrada contra un recorte suave,
#     de modo que los picos rasgan un poco sin perder inteligibilidad.
#  3. Wow & flutter (wow_flutter()): dos oscilaciones lentas desiguales (la cinta estirada
#     «marea» la voz) y una rápida y sutil (vibración del motor).
#  4. Siseo de cinta continuo con leves variaciones de nivel (siseo()) y cortes («dropouts»)
#     de cinta arrugada o sucia (cortes()).
# ffmpeg solo hace los filtros 1 y 2. El resto, y la nivelación de volumen, van en numpy:
# vibrato, loudnorm y amix de ffmpeg devolvían a veces la señal entera en NaN (audio mudo).
CINTA = (
    "highpass=f=180,highpass=f=180,"
    "lowpass=f=6500,lowpass=f=6500,lowpass=f=7000,"
    "equalizer=f=1600:t=o:w=1.3:g=4,"
    "acompressor=threshold=0.125:ratio=3:attack=6:release=120:makeup=2,"
    "volume=4dB,asoftclip=type=tanh:threshold=0.55"
)
VOZ_RMS = 0.168     # nivel final de la voz (unos -16,7 dBFS de media, como antes con loudnorm)
SISEO_RMS = 0.001   # nivel del siseo de cinta (unos -60 dBFS): muy bajito, se nota en las pausas


def cortes(wav_in, wav_out, semilla):
    """Dropouts: bajadas breves y aleatorias del volumen de la voz (cinta arrugada o sucia).

    Cada 7-22 s, un hueco de 40-160 ms que baja la voz entre 4 y 12 dB, con bordes suaves.
    La semilla sale del id del caso: el mismo audio tiene siempre los mismos cortes.
    """
    with wave.open(wav_in) as w:
        sr, n = w.getframerate(), w.getnframes()
        x = np.frombuffer(w.readframes(n), np.int16).astype(np.float32)
    rng = np.random.default_rng(semilla)
    g = np.ones(n, np.float32)
    t = rng.uniform(4, 10)
    while t < n / sr - 2:
        dur = rng.uniform(0.04, 0.16)
        fondo = rng.uniform(0.25, 0.63)           # ganancia en lo más hondo del corte
        borde = int(0.012 * sr)
        a, b = int(t * sr) - borde, int((t + dur) * sr) + borde
        forma = np.hanning(b - a) ** 0.5           # fondo plano y bordes suaves
        g[a:b] = np.minimum(g[a:b], 1 - (1 - fondo) * forma)
        t += rng.uniform(7, 22)
    y = np.clip(x * g, -32768, 32767).astype(np.int16)
    with wave.open(wav_out, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(y.tobytes())
lock = Lock()


def log(*a):
    with lock:
        print(time.strftime("%H:%M:%S"), *a, flush=True)


def wow_flutter(x, sr=48000):
    """Variación lenta y rápida de la velocidad de la cinta (línea de retardo variable).

    Desviaciones de tono aproximadas: wow 0,3 % a 0,55 Hz y 0,2 % a 0,21 Hz; flutter 0,1 % a 7,5 Hz.
    """
    t = np.arange(len(x)) / sr
    retardo = (0.0026                                             # retardo base (s)
               + 0.0009 * np.sin(2 * np.pi * 0.55 * t)
               + 0.0015 * np.sin(2 * np.pi * 0.21 * t + 1.3)
               + 0.00002 * np.sin(2 * np.pi * 7.5 * t + 0.4))
    pos = np.arange(len(x)) - retardo * sr
    return np.interp(pos, np.arange(len(x)), x, left=0.0).astype(np.float32)


def nivelar(x):
    """Lleva la voz a VOZ_RMS (medido solo donde se habla) y suaviza los picos por encima de -2 dB."""
    v = np.abs(x)
    trozos = v[: len(v) // 4800 * 4800].reshape(-1, 4800)          # ventanas de 100 ms
    rms = np.sqrt((trozos ** 2).mean(axis=1))
    activo = rms[rms > rms.max() * 0.1]
    x = x * (VOZ_RMS / (np.sqrt((activo ** 2).mean()) + 1e-9))
    techo = 0.79                                                   # -2 dBFS
    alto = np.abs(x) > techo * 0.8
    x[alto] = np.sign(x[alto]) * (techo * 0.8 + techo * 0.2 * np.tanh((np.abs(x[alto]) - techo * 0.8) / (techo * 0.2)))
    return x.astype(np.float32)


def siseo(n, semilla):
    """Siseo de casete: ruido rosa entre ~1 y 7,5 kHz, con una leve ondulación de nivel."""
    rng = np.random.default_rng(semilla ^ 0x5EED)
    X = np.fft.rfft(rng.standard_normal(n).astype(np.float32))
    f = np.fft.rfftfreq(n, 1 / 48000)
    forma = 1 / np.sqrt(np.maximum(f, 1.0))                       # rosa
    forma *= np.clip((f - 800) / 400, 0, 1) ** 2 * np.clip((8500 - f) / 2000, 0, 1) ** 2
    x = np.fft.irfft(X * forma, n).astype(np.float32)
    del X, f, forma
    x *= SISEO_RMS / (np.sqrt(np.mean(x ** 2)) + 1e-12)
    x *= (0.8 + 0.2 * np.sin(2 * np.pi * 0.13 * np.arange(n) / 48000)).astype(np.float32)
    return x


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
    semilla = int(hashlib.sha1(cid.encode("utf-8")).hexdigest()[:8], 16)
    con_cortes = os.path.join(carpeta, "locucion_cortes.wav")
    cortes(completa, con_cortes, semilla)
    voz_raw = os.path.join(carpeta, "voz.f32")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", con_cortes, "-af", CINTA,
                    "-ac", "1", "-ar", "48000", "-f", "f32le", voz_raw], check=True)
    voz = np.fromfile(voz_raw, np.float32)
    if not np.isfinite(voz).all() or np.sqrt(np.mean(voz ** 2)) < 0.005:
        raise RuntimeError("los filtros de cinta han devuelto un audio roto (NaN o silencio)")
    voz = nivelar(wow_flutter(voz))
    mezcla = np.clip(voz + siseo(len(voz), semilla), -1, 1)
    if not np.isfinite(mezcla).all() or np.sqrt(np.mean(mezcla ** 2)) < 0.03:
        raise RuntimeError("el audio final ha salido roto (NaN o silencio)")
    final_raw = os.path.join(carpeta, "final.f32")
    mezcla.astype(np.float32).tofile(final_raw)
    del voz, mezcla
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", "48000", "-ac", "1", "-i", final_raw,
                    "-c:a", "libopus", "-b:a", "24k", "-application", "audio",
                    "-metadata", f"title={g.get('titulo', cid)}", "-metadata", "artist=TRUE CRIME CALENDAR",
                    tmp], check=True)
    for f in (voz_raw, final_raw):
        os.remove(f)
    os.replace(tmp, ogg)
    with lock:
        idx = leer_indice()
        idx[cid] = {"durationMs": round(total * 1000), "bloquesMs": inicios}
        guardar_indice(idx)
    return total


def candidatos(ids, forzar=False):
    idx = {} if forzar else leer_indice()
    out = []
    for f in sorted(os.listdir(PODCAST)):
        if not f.endswith(".json"):
            continue
        cid = f[:-5]
        if ids and cid not in ids:
            continue
        ruta = os.path.join(PODCAST, f)
        if not forzar and time.time() - os.path.getmtime(ruta) < 90:   # aún se está escribiendo
            continue
        try:
            g = json.load(open(ruta, encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
        if guion_valido(g, cid) and pendiente(cid, idx):
            out.append(cid)
    return out


def ronda(ids, locucion, paralelo, fallos, forzar=False):
    lista = [c for c in candidatos(ids, forzar) if fallos.get(c, 0) < 3]
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
                with lock:  # que no quede como hecho un audio roto
                    idx = leer_indice(); idx.pop(c, None); guardar_indice(idx)
    return len(lista)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--watch", action="store_true")
    ap.add_argument("--paralelo", type=int, default=3)
    ap.add_argument("--locucion", default=LOCUCION_DEFECTO)
    ap.add_argument("--forzar", action="store_true",
                    help="rehace todos los audios (reutiliza las frases ya locutadas: no vuelve a llamar a la voz)")
    a = ap.parse_args()
    if not a.locucion or not os.path.exists(a.locucion):
        sys.exit("Indica la ruta de Locucion.py de la skill con --locucion o la variable LOCUCION_XIMENA")
    os.makedirs(AUDIO, exist_ok=True)
    fallos = {}
    while True:
        hechos = ronda(set(a.ids), a.locucion, a.paralelo, fallos, a.forzar)
        a.forzar = False  # solo en la primera ronda
        if not a.watch:
            if hechos and any(v < 3 for v in fallos.values()):
                continue  # repite los que han fallado (hasta 3 intentos)
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
