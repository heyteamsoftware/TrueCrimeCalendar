# TRUE CRIME CALENDAR

App Android (`com.heyteamsoftware.truecrimecalendar`) con un calendario divulgativo de 100 perfiles criminales: cada caso tiene su expediente, un episodio de podcast de unos 5 minutos (también para leer) y un aviso el día de su efeméride.

## Qué incluye

- **Cuaderno de investigación**: la interfaz es una libreta de detective de los años 60 con pestañas de meses, fichas mecanografiadas, sellos, fotos con cinta e hilo rojo entre casos vinculados. Tiene animaciones (apertura del cuaderno, paso de página, carpeta que se abre) que se desactivan si el sistema pide reducir el movimiento.
- **Sonidos del cuaderno**: abrir y cerrar carpeta y pasar página, con tono grave de papel (sintetizados con `tools/generar_sonidos.py`, sin muestras externas). Se desactivan en la ficha de ajustes.
- **Podcast de cada caso**: narrado por Ximena con Álvaro como copresentador (voces neuronales de Microsoft vía `edge-tts`). Suena con la pantalla apagada y se controla desde la notificación, la pantalla de bloqueo o los auriculares.
- **Versión para leer**: el guion completo, con el párrafo que suena resaltado. Al tocar un párrafo, el audio salta a ese punto.
- **Avisos diarios**: una notificación solo los días en que hay un caso. Se activan en la ficha de ajustes (engranaje de la cabecera), donde Android pide el permiso; la hora es configurable (9:00 por defecto).
- **Ficha de ajustes**: sonidos del cuaderno, volumen de las cintas y avisos diarios.
- **Funciona sin conexión**: solo necesitan internet las fotos de Wikipedia/Wikimedia Commons y la capa «Detalle» del mapa.

## Estructura

| Ruta | Contenido |
|---|---|
| `app/src/main/assets/index.html` | La página completa (generada desde `web/`). |
| `app/src/main/assets/podcast/<id>.json` | Guiones de los 100 episodios. |
| `app/src/main/assets/audio/<id>.ogg` + `index.json` | Audios (Ogg Opus, 24 kbps) y el inicio de cada párrafo. |
| `app/src/main/assets/fonts/`, `img/`, `sfx/` | Fuentes (Special Elite, Courier Prime, Mansalva) con sus licencias, texturas y efectos de sonido. |
| `app/src/main/java/.../` | `MainActivity` (WebView), `puente/` (JavaScript ↔ Android), `audio/` (Media3) y `notificaciones/`. |
| `web/` | Código fuente de la interfaz (`src/app.css`, `src/body.html`, `src/app.js`) y la base v3 con los datos. |
| `tools/` | Validador de guiones, generador de audios y exportador a Google Calendar. |
| `docs/CONTRATO.md` | Cómo se comunican la web, Android, los guiones y los audios. |
| `docs/GUIA_GUIONES.md` | Estilo, rigor y pronunciación de los guiones. |
| `docs/REVISION_GUIONES.md` | Datos de las fichas que conviene revisar. |
| `google-calendar/` | CSV (5 y 20 años) e ICS anual para importar en Google Calendar. |

## Tareas habituales

Montar la página tras editar `web/src`:

```bash
python web/montar.py web/src web/base/calendario_v3.html app/src/main/assets/index.html
```

Validar los guiones:

```bash
node tools/validar_guiones.js
```

Regenerar los audios que hayan cambiado (necesita `edge-tts`, `numpy`, `ffmpeg` y el script `Locucion.py` de la skill de locución de Ximena):

```bash
python tools/generar_audios.py --locucion "RUTA/Locucion.py"
```

Exportar el calendario para Google Calendar:

```bash
node tools/exportar_calendario.js app/src/main/assets/index.html google-calendar 20 true_crime_calendar_20_anios.csv
```

Compilar e instalar:

```bash
./gradlew assembleDebug
```

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

En móviles Xiaomi/POCO hay que activar **Opciones de desarrollador → Instalar vía USB**.

## Google Play

Para publicar hace falta un AAB firmado (`./gradlew bundleRelease` con una clave de firma propia). El APK pesa unos 94 MB, por debajo del límite de 200 MB de Google Play.
