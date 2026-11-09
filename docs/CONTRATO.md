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
| `setCases(json)` | Recibe `[{"id","n","a","m","d"}]` con todos los casos (texto JSON) y lo guarda para las notificaciones. La web lo llama al arrancar. |
| `getNotificationSettings()` | Devuelve el JSON `NotificationSettings` (texto). |
| `setNotificationsEnabled(enabled)` | Activa o desactiva los avisos. Al activarlos en Android 13+ pide el permiso de notificaciones. |
| `setNotificationTime(hour, minute)` | Cambia la hora del aviso diario (por defecto 9:00). |
| `testNotification()` | Lanza ya una notificación de prueba con el caso de hoy o el próximo. |

`PlayerState`:

```json
{ "id": "brady", "titulo": "Los niños del páramo", "subtitulo": "Ian Brady", "playing": true, "buffering": false, "ended": false, "positionMs": 12345, "durationMs": 301250 }
```

Si no hay nada cargado: `"id": null`, `"playing": false`, posiciones a 0.

`NotificationSettings`:

```json
{ "enabled": true, "hour": 9, "minute": 0, "permissionGranted": true }
```

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
- Activadas por defecto. En Android 13+ el permiso se pide la primera vez que se abre la app.
- Se reprograman tras reiniciar el móvil, cambiar la hora o actualizar la app.

## 6. Reglas que la web debe conservar

- El expediente se abre con `history.pushState` y se cierra con `history.back()` / `popstate`: el botón Atrás de Android depende de ello.
- Abrir un expediente desde `location.hash` al arrancar.
- Los datos de los casos (`const D = []; D.push(...)`) no cambian de formato.
