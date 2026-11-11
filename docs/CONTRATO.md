# Contrato entre las piezas de TRUE CRIME CALENDAR

Este documento fija cómo se comunican la página web, la parte nativa de Android, los guiones del podcast y los audios. Si algo no está aquí, decide lo más sencillo y anótalo en tu informe final.

Proyecto: `C:\Users\aidan\Documents\hey_Truecrimecalendar` (paquete `com.heyteamsoftware.truecrimecalendar`).
Nombre oficial de la app: **TRUE CRIME CALENDAR** (en mayúsculas).

## 1. Quién toca qué

| Pieza | Archivos que puede modificar | No debe tocar |
|---|---|---|
| Interfaz web | `app/src/main/assets/index.html`, `app/src/main/assets/fonts/**`, `app/src/main/assets/img/**` (si la crea) | Kotlin, manifest, Gradle, `podcast/`, `audio/` |
| Android nativo | `app/src/main/java/**`, `app/src/main/res/**`, `app/src/main/AndroidManifest.xml`, `app/build.gradle.kts`, `gradle/libs.versions.toml`, `app/proguard-rules.pro` | `app/src/main/assets/**` |
| Guionistas | `app/src/main/assets/podcast/<id>.json` (solo los ids de su lote) | Todo lo demás |
| Coordinador | `app/src/main/assets/audio/**`, README, git | — |

## 2. Guion del podcast: `assets/podcast/<id>.json`

Un archivo por caso. `<id>` es el id del caso en el HTML (por ejemplo `brady`).

```json
{
  "id": "brady",
  "titulo": "Los niños del páramo",
  "pronunciacion": { "Ian Brady": "Ían Bréidi", "Saddleworth": "Sádelguorz" },
  "bloques": [
    { "voz": "ximena", "texto": "En el invierno de 1965, una llamada de madrugada…" },
    { "voz": "alvaro", "texto": "¿Y nadie sospechó nada durante dos años?" }
  ],
  "nota_revision": ""
}
```

- `titulo`: título del episodio (corto, sin el nombre del criminal si se puede evitar).
- `bloques`: el guion en orden. `voz` es `ximena` (narradora) o `alvaro` (copresentador). `texto` es lo que **se lee en pantalla** (ortografía normal).
- `pronunciacion`: sustituciones que **solo se aplican al audio** (claves exactas, sensibles a mayúsculas; se aplican primero las más largas). Sirve para nombres extranjeros y siglas.
- `nota_revision`: dudas para el coordinador (vacío si no hay).
- La versión para leer muestra `bloques` como párrafos: los de Ximena como texto principal y los de Álvaro como intervenciones del copresentador.

## 3. Audios: `assets/audio/<id>.ogg` y `assets/audio/index.json`

- Un audio por caso: Ogg Opus, mono, unos 24 kbps, unos 5 minutos. Lo genera el coordinador con la voz de Ximena (y Álvaro).
- `audio/index.json` lista los audios que existen:

```json
{
  "brady": { "durationMs": 301250, "bloquesMs": [0, 23510, 27120] }
}
```

- `bloquesMs[i]` es el milisegundo en que empieza el bloque `i` del guion. Sirve para resaltar el párrafo que suena en la versión para leer.
- Si un caso no está en `index.json`, su audio aún no existe: la interfaz muestra «Audio en preparación».
- URL dentro de la app: `https://appassets.androidplatform.net/assets/audio/<id>.ogg` (relativa desde la página: `audio/<id>.ogg`).

## 4. Puente JavaScript ↔ Android

### 4.1. Objeto `window.TCCNative` (solo existe dentro de la app)

Lo inyecta `MainActivity` con `addJavascriptInterface(..., "TCCNative")`. Los métodos son síncronos y devuelven tipos simples.

| Método | Qué hace |
|---|---|
| `play(id, titulo, subtitulo)` | Reproduce `audio/<id>.ogg` en el servicio de audio (sigue sonando con la pantalla apagada). Si ya suena ese id, continúa. |
| `pause()` / `resume()` / `stop()` | Pausa, reanuda, detiene y cierra la notificación de audio. |
| `seekTo(ms)` | Salta a una posición. |
| `seekBy(deltaMs)` | Avanza o retrocede (por ejemplo, `-15000` o `30000`). |
| `getPlayerState()` | Devuelve el JSON `PlayerState` (texto). |
| `setTapeVolume(v)` / `getTapeVolume()` | Volumen de las cintas (0 a 1), guardado en el móvil y aplicado al reproductor. |
| `openAppSettings()` | Abre la ficha de la app en los ajustes de Android (en Xiaomi, ahí está «Inicio automático»). |
| `setCases(json)` | Recibe `[{"id","n","a","m","d"}]` con todos los casos (texto JSON) y lo guarda para las notificaciones. La web lo llama al arrancar. |
| `getNotificationSettings()` | Devuelve el JSON `NotificationSettings` (texto). |
| `setNotificationsEnabled(enabled)` | Activa o desactiva los avisos. Al activarlos sin permiso (Android 13+) se muestra el diálogo de Android y solo quedan activados si se concede; si ya se denegó antes, se abren los ajustes de notificaciones. |
| `setNotificationTime(hour, minute)` | Cambia la hora del aviso diario (por defecto 9:00). |
| `testNotification()` | Lanza ya una notificación de prueba con el caso de hoy o el próximo. |

`PlayerState`:

```json
{ "id": "brady", "titulo": "Los niños del páramo", "subtitulo": "Ian Brady", "playing": true, "buffering": false, "ended": false, "positionMs": 12345, "durationMs": 301250 }
```

Si no hay nada cargado: `"id": null`, `"playing": false`, posiciones a 0.

`NotificationSettings`:

```json
{ "enabled": true, "hour": 9, "minute": 0, "permissionGranted": true, "xiaomi": false }
```

`xiaomi` es true en móviles Xiaomi, Redmi y POCO: la web recomienda activar «Inicio automático».

### 4.2. Funciones que la web expone y Android llama (con `evaluateJavascript`)

| Función | Cuándo la llama Android |
|---|---|
| `window.TCC_onPlayerState(state)` | Cada vez que cambia el estado del audio y cada segundo mientras suena. `state` es un objeto `PlayerState`. |
| `window.TCC_onNotificationSettings(settings)` | Después de cambiar los avisos o al responder el usuario al permiso. |
| `window.TCC_openCase(id)` | Cuando el usuario toca una notificación de un caso y la página ya está cargada. |
| `window.TCC_openToday()` | Cuando el usuario toca una notificación con varios casos del día y la página ya está cargada: cierra el expediente abierto (si lo hay) y muestra el mes actual con hoy seleccionado. |

Android siempre comprueba que la función existe antes de llamarla (`window.X && window.X(...)`).

Si la app se abre en frío desde una notificación, Android carga `index.html#<id>`: la página ya abre ese expediente al arrancar (y luego limpia el hash). Por eso la web debe mantener ese comportamiento.

### 4.3. Fuera de la app (navegador)

Si `window.TCCNative` no existe, la web reproduce con `<audio>` (`audio/<id>.ogg`) y oculta los ajustes de notificaciones. Así se puede probar en un navegador de escritorio.

## 5. Notificaciones diarias

- Cada día a la hora elegida (por defecto 9:00) Android comprueba si hay casos con `m`/`d` igual a hoy (el 29 de febrero cuenta el 28 en años no bisiestos, igual que la web).
- Si hay uno: notificación «Hoy en TRUE CRIME CALENDAR» con el nombre y el alias. Al tocarla se abre ese expediente.
- Si hay varios: una notificación con todos los nombres. Al tocarla se abre la app en el día de hoy.
- Si no hay ninguno: no se notifica.
- Desactivadas por defecto: se activan en la ficha de ajustes (engranaje de la cabecera), y es ahí donde Android pide el permiso. Quien ya las tenía activadas en la versión 2.0 con el permiso concedido las conserva.
- Se reprograman tras reiniciar el móvil, cambiar la hora o actualizar la app.

## 6. Reglas que la web debe conservar

- El expediente se abre con `history.pushState` y se cierra con `history.back()` / `popstate`: el botón Atrás de Android depende de ello.
- Abrir un expediente desde `location.hash` al arrancar.
- Los datos de los casos (`const D = []; D.push(...)`) no cambian de formato.

---

# Versión 3: casos en cintas (piloto: `brady` y `dalia-negra`)

Casos estrella: **2 cintas de unos 5 min**. Casos nuevos: **1 cinta de unos 5 min**.

Diseño completo: `docs/REDISENO_CASOS_Y_CINTAS.md`. Estilo de los guiones: `docs/GUIA_CINTAS.md`.
Durante la transición conviven dos formatos: los casos ya pasados a cintas y los episodios únicos de la versión 2. La web y Android deben aceptar los dos.

## 7. Cintas

### 7.1. Guion: `assets/podcast/<id>.json` (formato v3)

```json
{
  "id": "brady",
  "version": 3,
  "pronunciacion": { "Saddleworth": "Sádelguorz", "TRUE CRIME CALENDAR": "Tru Cráim Cálendar" },
  "cintas": [
    { "n": 1, "titulo": "Saddleworth, octubre de 1965", "tipo": "hallazgo",
      "bloques": [ { "voz": "ximena", "texto": "Archivo de TRUE CRIME CALENDAR. Expediente: …" },
                   { "voz": "alvaro", "texto": "…" } ] }
  ],
  "nota_revision": ""
}
```

- Se distingue del formato v2 porque tiene `cintas` (y `version: 3`). El v2 tiene `titulo` y `bloques` en la raíz.
- `tipo` ∈ `hallazgo`, `notas`, `declaraciones`, `hemeroteca`, `juicio`, `epilogo`, `expediente` (cinta única).
- `pronunciacion` es común a todas las cintas del caso.

### 7.2. Audios: `audio/<id>/cinta-<n>.ogg` (en el servidor) e `assets/audio/index.json`

Entrada v3 en `audio/index.json`:

```json
"brady": { "cintas": [
  { "n": 1, "titulo": "Saddleworth, octubre de 1965", "url": "audio/brady/cinta-1.ogg",
    "durationMs": 241000, "bytes": 439959, "bloquesMs": [1450, 9800] }
] }
```

- `url` es la ruta de siempre, relativa a la página (`audio/brady/cinta-1.ogg`). **El archivo ya no va dentro de la APK:** está en el servidor y Android y la web lo buscan allí (sección 7.7). También se acepta una `url` absoluta (`https://…`).
- `bytes` es el tamaño del archivo. Sirve para decir cuánto ocupa la descarga.
- `bloquesMs[i]` es el inicio del bloque `i` de esa cinta (hay 0,4 s de silencio al principio).
- **Las cintas v3 solo llevan la voz limpia** (Opus 12 kbps, mono, 48 kHz). El sonido de casete lo pone el móvil al reproducir (sección 7.6).
- La entrada v3 lleva además `"efecto": "casete-gastado"`.
- Las entradas v2 (`{ "durationMs", "bloquesMs" }` con `audio/<id>.ogg`) siguen valiendo para los casos no migrados.

### 7.3. Sonidos de la grabadora: `insertar-cinta.ogg`, `cambio-cinta.ogg` y `expulsar-cinta.ogg` (en `assets/sfx/`)

Salen del MP3 del usuario y **no llevan el efecto de casete** (son la propia grabadora).

| Archivo | Duración | Qué es | Cuándo suena |
|---|---|---|---|
| `insertar-cinta.ogg` | unos 1,4 s | Meter la cinta y pulsar «play» | Antes de la primera cinta que suena al empezar un caso |
| `cambio-cinta.ogg` | unos 2,5 s | Parar, expulsar, meter la siguiente y «play» | Entre una cinta y otra, tanto si se pasa sola al acabar como si se pulsa siguiente/anterior o se elige otra |
| `expulsar-cinta.ogg` | unos 1 s | «Stop» y expulsar | Al acabar la última cinta (o la única) y al pulsar expulsar |

**Toda cinta empieza y termina con un sonido de la grabadora.** Las cintas están siempre fuera, en la caja: para escuchar hay que meter una y, al acabar el caso o al expulsarla, sale y vuelve a la caja.

### 7.4. Puente: métodos nuevos de `window.TCCNative`

| Método | Qué hace |
|---|---|
| `playCase(json)` | `json` (texto): `{"id","titulo","subtitulo","cintas":[{"n","titulo","url","durationMs"}],"desde":n,"posMs":ms}`. Prepara la lista de cintas del caso y empieza a sonar la cinta `desde` en `posMs`. Al acabar una cinta suena `sfx/cambio-cinta.ogg` y entra la siguiente; al acabar la última, se para (`ended: true`). Si ese caso ya está cargado, salta a la cinta `desde` sin recargar la lista. |
| `playTape(n)` | Salta a la cinta `n` del caso cargado (con el cambio de cinta si ya sonaba otra). |
| `nextTape()` / `prevTape()` | Cinta siguiente o anterior, con el cambio de cinta. |
| `ejectTape()` | Expulsa la cinta: suena `expulsar-cinta.ogg` y después se detiene y se quita la notificación. Si después se mete una cinta, vuelve a sonar «insertar». |

`pause`, `resume`, `stop`, `seekTo` y `seekBy` actúan sobre la cinta en curso: las posiciones son siempre dentro de esa cinta. El `play(id, titulo, subtitulo)` de la versión 2 se mantiene para los episodios únicos.

`PlayerState` añade estos campos (con un episodio de la versión 2 valen `null`, `0`, `""` y `false`):

```json
{ "cinta": 2, "cintas": 2, "cintaTitulo": "Lo que aún guarda el páramo", "cambiando": false, "expulsando": false }
```

- `expulsando` vale `true` mientras suena «stop y expulsar». Entonces `positionMs` es el de la cinta que sale: su duración si acabó, o el punto donde se expulsó.
- `cambiando` vale `true` mientras suena el cambio de cinta. Entonces `positionMs` y `durationMs` siguen siendo los de la cinta que entra, a 0.
- Notificación multimedia y pantalla de bloqueo: título «Cinta 2 de 5 · <cintaTitulo>», subtítulo «TRUE CRIME CALENDAR · <subtitulo>». Los botones de anterior y siguiente cambian de cinta; los de −15 s y +30 s se mantienen.

### 7.5. Web

- **Caja de cintas** en el expediente: un casete por cinta, con su etiqueta escrita a mano (`titulo`), su duración y su estado (sin escuchar, a medias o escuchada).
- **Grabadora con ranura:** arrastrar un casete a la ranura lo mete y suena desde donde se quedó; tocar el casete hace lo mismo, por accesibilidad. Al cambiar de cinta, la grabadora expulsa la cinta y mete la siguiente.
- **Progreso:** en `localStorage` (`tcc_progreso`), con `{ id: { n, posMs, escuchadas: [n…] } }`. «Seguir escuchando» retoma la cinta y el punto.
- **Leer el caso:** una hoja por cinta; se resalta el bloque que suena con `bloquesMs` de esa cinta, y tocar un bloque salta a él.
- **Fuera de la app:** se usa `<audio>` con la misma lógica, cambio de cinta incluido.

## 8. Casos nuevos y fuentes (piloto)

- **Casos nuevos:** `web/datos/casos_nuevos.json` es una lista de casos con los mismos campos que los de `D` (`id, m, d, y, n, a, v, p, f, per, st, c, mo, loc, vin, g`) y, además, estos:
  - `estrella: false`;
  - `tipo_efemeride`, que puede ser `nacimiento`, `crimen`, `detencion`, `condena`, `hallazgo`, `desaparicion` o `golpe`;
  - `titulo_caso` (por ejemplo, «La Dalia Negra»);
  - `autor` (por ejemplo, «Desconocido»);
  - `fuentes`: `[{ "titulo", "url", "tipo" }]`.

  `web/montar.py` los añade a `D` al montar la página. En los casos nuevos, `y` es el año de la efeméride. Los 100 de la versión 2 son casos estrella, con fecha de nacimiento.
- **Fuentes de los casos estrella:** `web/datos/fuentes.json`, con la forma `{ id: [ { titulo, url, tipo } ] }`. La web muestra una sección «Fuentes» en el expediente cuando las hay.
- **Calendario:** los casos estrella llevan un sello con estrella y los demás un círculo a lápiz. Las fichas dicen qué se conmemora («Nació un día como hoy», «Hoy hace 79 años del hallazgo»…).
- **Avisos:** el texto de la notificación usa `tipo_efemeride`. Por eso `setCases` envía también `t` (el tipo), `e` (si es estrella) y `y`.

## 7.6. Efecto «casete gastado» en el móvil

Los audios v3 se guardan con la voz limpia (así se comprimen a 12 kbps sin sonar mal) y Android les aplica el sonido de casete al reproducirlos. La receta de referencia es `v1_casete_gastado` en `tools/variantes_cinta.py`:

1. Paso alto a 220 Hz (dos biquads) y paso bajo a 5 kHz (dos biquads) y 5,5 kHz (uno).
2. Pico de +5 dB en 1,5 kHz (ancho de 1,2 octavas).
3. Compresor: umbral −18 dB, ratio 3, ataque 6 ms, relajación 120 ms y ganancia de compensación ×2.
4. +7 dB y recorte suave `tanh` con umbral 0,45.
5. Wow & flutter: retardo variable de base 4 ms más 1,4 ms a 0,5 Hz, 2,2 ms a 0,19 Hz y 0,04 ms a 7 Hz, con interpolación.
6. Ganancia final fija para que la voz quede a unos −16,5 dB RMS de media. La voz limpia de entrada llega a unos −19 dB RMS de media, con picos por debajo de −2 dBFS.
7. Siseo de ruido rosa entre 900 Hz y 7 kHz (RMS 0,0025).
8. Cortes: cada 4–12 s, de 50–250 ms, bajando al 15–50 % con bordes suaves.
9. Chasquidos sueltos (unos 0,3 por segundo).

- El efecto solo se aplica a las cintas v3. No se aplica a los episodios v2 (ya lo llevan grabado) ni a los sonidos de la grabadora.
- Se acepta una imprecisión de unos 250 ms en el paso de un elemento a otro.
- Siseo, cortes y chasquidos son aleatorios en el móvil: no hace falta que coincidan con las muestras.

## 7.7. Cintas en el servidor y copia en el móvil

- **Dónde están.** Las cintas se graban en `cintas/<id>/cinta-<n>.ogg` (fuera de git y de la APK) y `tools/subir_audios.ps1` las sube al servidor: `https://myappsserver.duckdns.org/truecrimescalendar/<id>/cinta-<n>.ogg`. En la APK solo van `audio/index.json` y los sonidos de la grabadora (`sfx/`).
- **Android** (`AlmacenCintas`). Al reproducir `audio/<id>/cinta-<n>.ogg` usa, por este orden: la copia guardada en el móvil (`files/cintas/<id>/`), el archivo de la APK si existiera, o el servidor. Lo que suena desde el servidor se guarda a la vez, así que cada cinta solo se baja una vez. Sin conexión y sin copia, avisa con un mensaje breve.
- **Web en el navegador.** `<audio>` pide la cinta al servidor directamente (`tapeSrc`).
- **Descargar todas** (ficha de ajustes, sección «Cintas», solo en la app). Métodos de `window.TCCNative`:

| Método | Qué hace |
|---|---|
| `downloadAllTapes()` | Baja las cintas que falten. Sigue con la app en segundo plano y muestra una notificación de avance con «Cancelar». |
| `cancelTapeDownload()` | Cancela. Lo ya bajado se conserva. |
| `deleteDownloadedTapes()` | Borra las copias guardadas. No hace nada con una descarga en marcha. |
| `getTapeDownloadState()` | Devuelve `TapeDownloadState` en JSON. |

- `TapeDownloadState`: `{ "total", "saved", "bytes", "totalBytes", "running", "result", "failed" }`. `result` es cómo acabó la última descarga (`""`, `"complete"`, `"cancelled"` o `"error"`) y `failed`, las cintas que quedaron sin bajar.
- Android llama a `window.TCC_onTapeDownload(estado)` con cada avance y al terminar, cancelar o borrar.

## 7.8. Actualización obligatoria

Las cintas del servidor y los guiones de la app deben corresponderse; una versión antigua no debe seguir abierta cuando cambia el contenido. `MainActivity` llama a `ActualizacionObligatoria.comprobar()` en `onResume`:

- **Play (actualización inmediata):** si Google Play conoce una versión nueva, abre su pantalla de actualización a pantalla completa (librería `com.google.android.play:app-update`). Si el usuario la cancela, sale un aviso sin salida con «Actualizar» (ficha de Play) y «Salir»; Atrás no lo cierra. Solo funciona con la app instalada desde Play.
- **Respaldo con el servidor:** `https://myappsserver.duckdns.org/truecrimescalendar/version-minima.json` → `{"minVersionCode": N}`. Si el `versionCode` de la app es menor, sale el mismo aviso. Sirve para forzar justo cuando se cambia el contenido del servidor, sin esperar a Play. Se consulta como mucho cada 5 minutos; si falla la consulta, la app se abre con normalidad.
- **Procedimiento al cambiar contenido incompatible:** 1) subir `versionCode` y publicar la versión en Play; 2) cuando esté **aprobada y disponible**, subir `minVersionCode` en `web/publica/version-minima.json` y copiarlo al servidor (`scp` a `/var/www/html/truecrimescalendar/`); 3) solo entonces cambiar el contenido del servidor. Nunca subir el mínimo antes de que la versión nueva esté en Play: las apps antiguas quedarían bloqueadas sin poder actualizar.
- Probar el aviso: `./gradlew :app:assembleDebug -Pvc=1` instala una compilación con `versionCode` 1.
- La web no tiene versiones: se recarga con cada visita y ya sirve siempre el contenido actual.

## 8.1. Correcciones de las fichas estrella y vínculos entre meses

- `web/datos/correcciones_estrella.json`: `{ id: { campo: valor, "nota": "por qué" } }`. Corrige los campos `n`, `a`, `v`, `per`, `st`, `c`, `mo` y `loc` de las fichas de los casos estrella sin tocar `web/base/calendario_v3.html`. No corrige fechas, país ni vínculos. `nota` no va a la página.
- `web/datos/vinculos.json`: `[ [idA, idB, "c" | "r", nota] ]`. Vínculos entre casos de meses distintos. La página los enseña en los dos expedientes.
- Los aplica `web/montar.py` al montar la página.

## 9. Favoritos

- El usuario puede guardar cualquier caso como favorito con el marcapáginas de la cabecera del expediente (`#pFav`).
- Se guardan en el móvil, en `localStorage`, con la clave `tcc_favs`: una lista de ids, con el último guardado al final. No pasan por Android.
- La sección «Mis favoritos» se abre con el marcapáginas de la barra superior (`#tFav`) o con el grupo «Favoritos» de la búsqueda. Muestra primero los últimos guardados.
- Las fichas de los casos guardados llevan un marcapáginas rojo.

## 10. Interfaz «Pletina»

- La web es un equipo de sonido: chasis oscuro, serigrafía crema y una lámpara con el color del mes. El diseño de partida es `docs/prototipos/prototipo-b.html`.
- **Lámpara del mes:** `data-mes` (1 a 12) en `<body>` (el mes que se ve en el calendario), en la hoja del expediente (el mes del caso) y en cada lomo de la lista. Los doce colores están en `web/src/app.css`.
- **Tipografías:** Barlow Condensed, Barlow, IBM Plex Mono y Mansalva. La página las pide a Google Fonts y la app responde con `assets/fonts/fonts.css` y sus `.woff2`. Si cambia la lista, hay que cambiarla en `web/montar.py` y en `tools/descargar_fuentes.py`, y volver a ejecutar este.
- **Vúmetro:** la aguja es una animación. `PlayerState` no da el nivel del audio.
- **Piloto «Casete gastado»:** solo se enciende dentro de la app (clase `in-app`), que es donde se aplica el efecto.
