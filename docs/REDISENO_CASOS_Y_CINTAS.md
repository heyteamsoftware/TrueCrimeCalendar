# Rediseño 3.0: un caso cada día y casos contados en cintas

Estado: propuesta pendiente de aprobación (9 de noviembre de 2026).

## 1. Qué cambia

| | Ahora (2.x) | Rediseño (3.0) |
|---|---|---|
| Casos | 100 (89 días cubiertos, 11 días con varios) | **366 días cubiertos**: los 100 actuales pasan a ser **casos estrella** y se añaden **277 casos nuevos** |
| Fecha del caso | Nacimiento del autor | Nacimiento, crimen, detención, sentencia, desaparición o hallazgo (campo «tipo de efeméride») |
| Audio por caso | 1 episodio de unos 5 min | **Cintas de unos 5 min**: 2 en los casos estrella (10 min) y 1 en los nuevos (5 min) |
| Formato | Podcast con dos presentadores | **Material del archivo**: diligencias, notas del investigador, declaraciones, hemeroteca… que juntas cuentan el caso con intriga |
| Reproductor | Una grabadora por caso | **Caja de cintas**: se arrastra una cinta a la grabadora; al terminar suena el cambio de cinta y entra la siguiente |
| Sonido | Casete actual | Estilo **«casete gastado»** (`v1_casete_gastado` en `tools/variantes_cinta.py`) |
| Dónde viven los audios | Dentro de la APK (93 MB) | **Dentro de la app**: voz limpia a 12 kbps (~187 MB) y efecto de casete aplicado en el móvil |

## 2. Principios de rigor (se aplican a todo)

1. **Hechos verificables.** Cada dato clave (fechas, lugares, víctimas, condena) con al menos **dos fuentes fiables** independientes: sentencias y documentos judiciales, hemerotecas, libros de referencia, archivos policiales publicados y Wikipedia solo como punto de partida (con sus referencias). Las fuentes se guardan en la ficha y se muestran en la app.
2. **Las cintas son una reconstrucción narrada, no grabaciones reales.** No se inventan llamadas, interrogatorios ni frases de personas reales (víctimas, acusados, policías, testigos o familias). Hablan dos personajes ficticios del archivo:
   - **La archivera** (Ximena), que abre las cajas y cuenta lo documentado.
   - **El inspector** (Álvaro), que dicta sus notas y conjeturas, siempre marcadas como tales.
   Lo que dijeron personas reales solo aparece si está documentado: citado brevemente y atribuido («según declaró en el juicio…») o parafraseado. La primera cinta de cada caso empieza con un aviso de diez segundos, y la ficha lo repite.
   *Por qué:* presentar como auténtico material policial inventado sobre personas reales sería desinformación y podría ser difamatorio. También choca con las normas de Google Play y falta al respeto a las víctimas. Con este formato el tono de «material encontrado» se mantiene sin ese riesgo.
3. **Presunción de inocencia.** Si no hay condena firme, se dice. Nunca se llama «asesino» a quien no fue condenado; las absoluciones y los casos sin resolver se cuentan como tales.
4. **Respeto a las víctimas.** Sin morbo ni detalles gráficos, y sin describir métodos que puedan servir de instrucciones. A las víctimas menores solo se las nombra en casos históricos (hace más de 30 años) con nombres públicos que sus familias han difundido, o si el nombre forma parte del nombre histórico del caso. Nunca en casos recientes ni si la familia pidió discreción.
5. **Exclusiones.** Quedan fuera los casos con proceso judicial abierto y los hechos de los últimos 10 años. También los autores menores de edad (salvo casos históricos muy conocidos y sin nombrarlos) y los casos cuyas fuentes se contradicen sin forma de resolverlo.
6. **Revisión cruzada.** Cada ficha y cada guion los revisa un agente distinto del que los escribió, comparándolos con las fuentes. Las dudas van a `nota_revision` y a `docs/REVISION_GUIONES.md`.

## 3. Los 277 casos nuevos

### 3.1. Fecha

Para cubrir cada día del año con un caso sólido hace falta flexibilidad: la efeméride puede ser cualquier fecha clave bien documentada. La app muestra qué se conmemora («Hoy hace 79 años del hallazgo de…», «Nació un día como hoy…»). Los casos estrella mantienen su fecha de nacimiento.

Ejemplos para días libres, pendientes de verificar en la investigación:

| Día | Caso | Tipo de efeméride |
|---|---|---|
| 13 ene | Robo del Banco Río de Acassuso, «el robo del siglo» (2006) | Golpe |
| 15 ene | La Dalia Negra (1947) | Hallazgo |
| 1 ago | Asesinato de los marqueses de Urquijo (1980) | Crimen |
| 4 ago | Lizzie Borden (1892), absuelta | Crimen |
| 8 ago | El gran robo del tren de Glasgow a Londres (1963) | Golpe |
| 26 ago | Masacre de Puerto Hurraco (1990) | Crimen |
| 31 ago | Whitechapel: Mary Ann Nichols (1888) | Crimen |
| 20 dic | Zodiac: Lake Herman Road (1968) | Crimen |

### 3.2. Equilibrio del archivo

- **Tipos:** asesinos en serie (no más del 35 %), casos sin resolver, desapariciones, envenenamientos, grandes golpes y robos, estafas célebres, secuestros, sectas, crímenes históricos y errores judiciales.
- **Geografía:** ahora la mitad del archivo es de Estados Unidos y solo hay 4 casos españoles. Objetivo de los nuevos: España e Hispanoamérica al menos el 30 %, resto de Europa al menos el 25 %, Estados Unidos y Canadá como mucho el 30 %, y el resto de Asia, África y Oceanía.
- **Épocas:** desde el siglo XVIII hasta 2015.
- **Sin duplicados:** un caso nuevo no puede repetir un caso estrella (por ejemplo, los crímenes de Cielo Drive ya están en Manson). Se enlazan como vínculos.

### 3.3. Proceso de investigación

1. **Candidatos:** tres por día libre, unos 830, con la fecha confirmada en dos fuentes.
2. **Selección:** se elige uno por día cumpliendo las cuotas del apartado 3.2 y las exclusiones del 2.5.
3. **Ficha completa** (apartado 4), con coordenadas comprobadas en mapas y las fuentes.
4. **Verificación cruzada** por otro agente, comparando la ficha con las fuentes.

## 4. Datos: de bloque en el HTML a `assets/data/casos.json`

Los casos dejan de estar escritos dentro del HTML: `web/montar.py` los inyecta desde `casos.json`, así la lógica actual (`D`) sigue funcionando. Campos de cada caso:

```json
{
  "id": "dalia-negra",
  "estrella": false,
  "fecha": { "m": 1, "d": 15, "anio": 1947, "tipo": "hallazgo" },
  "nombre": "Elizabeth Short",
  "titulo_caso": "La Dalia Negra",
  "alias": "La Dalia Negra",
  "autor": "Desconocido",
  "victimas": "1",
  "pais": "Estados Unidos", "bandera": "🇺🇸",
  "periodo": "1947",
  "situacion": "Sin resolver.",
  "resumen": "…", "modus_operandi": "…",
  "lugares": [[34.0, -118.3, "Leimert Park (hallazgo)"]],
  "vinculos": [], "grupos": ["sin_resolver"],
  "tipo": "sin_resolver",
  "fuentes": [{ "titulo": "…", "url": "…", "tipo": "hemeroteca" }],
  "nota_revision": ""
}
```

Grupos nuevos: «Sin resolver», «Grandes golpes», «Estafas», «Desapariciones», «Sectas», «Errores judiciales» y «Hispanoamérica».

## 5. Las cintas

### 5.1. Cuántas y cuánto duran

| | Cintas | Duración total | Cada cinta |
|---|---|---|---|
| Caso estrella | 4 o 5 | 15–20 min | 3–5 min |
| Caso nuevo | 3 (4 si el caso lo merece) | 10–12 min | 3–4 min |

A 160 palabras por minuto, una cinta de 4 minutos tiene unas 600 palabras.

### 5.2. Tipos de cinta (el «material del archivo»)

Cada caso combina entre 3 y 5 de estos tipos, en el orden que mejor cuente su historia:

| Tipo | Qué contiene | Quién habla |
|---|---|---|
| **El hallazgo / Diligencias** | Arranque en frío: el momento en que se descubre el caso, reconstruido con lo documentado | Archivera |
| **Notas del inspector** | Análisis de pistas, hipótesis y errores de la investigación (marcadas como conjeturas) | Inspector |
| **Declaraciones** | Lo que dijeron testigos, acusados y peritos según actas y prensa: citado breve o parafraseado y siempre atribuido | Archivera |
| **Hemeroteca** | Cómo lo contaron los periódicos y la radio de la época (parafraseado) | Archivera |
| **El juicio** | Proceso, pruebas y sentencia | Ambos |
| **Lo que nunca se aclaró** | Epílogo: cabos sueltos, consecuencias, memoria de las víctimas | Ambos |

### 5.3. Nombres

Cada cinta lleva una etiqueta escrita a mano relacionada con el caso: «CINTA 1 · Saddleworth, octubre de 1965», «CINTA 3 · La maleta de la estación». Se ven en la caja y suenan al principio de la cinta.

### 5.4. Narrativa

- La cinta 1 empieza en frío, en el momento más intrigante documentado, no por el nacimiento del autor.
- Cada cinta termina con un gancho que empuja a la siguiente.
- Cada cinta se entiende sola, pero el orden numérico cuenta la historia completa. Al terminar todas, el oyente conoce el caso entero.
- Las reglas de tono, rigor y pronunciación de `docs/GUIA_GUIONES.md` siguen valiendo (se actualizará como `GUIA_CINTAS.md`).

### 5.5. Formato del guion: `assets/podcast/<id>.json`

```json
{
  "id": "brady",
  "cintas": [
    { "n": 1, "titulo": "Saddleworth, octubre de 1965", "tipo": "hallazgo",
      "bloques": [{ "voz": "ximena", "texto": "…" }, { "voz": "alvaro", "texto": "…" }] }
  ],
  "pronunciacion": { "Saddleworth": "Sádelguorz" },
  "nota_revision": ""
}
```

## 6. Audio

- **Locución:** igual que ahora, con Ximena y Álvaro (skill de locución con `edge-tts`), más el estilo «casete gastado». Cada cinta tiene su semilla, así que no hay dos cintas con los mismos cortes y chasquidos.
- **Inicio y final de cada cinta:** medio segundo de siseo y el clic de «play» al principio, y el «clac» de parada al final.
- **Cambio de cinta:** lo pone el reproductor entre cinta y cinta (no va grabado dentro), para que funcione con cualquier orden. Con el MP3 que me has pasado se monta un cambio de unos 2 s: parar y expulsar (6,2–7,0 s), meter la cinta (0,3–0,9 s) y pulsar «play» (2,1–2,8 s). **Falta confirmar su licencia** (viene del canal «Sound Effect Reaction»); si no está clara, sintetizo uno propio como los de papel.
- **Volumen total:** unos 4.800 minutos (80 horas). Con el filtro de casete la voz no pasa de 5,5 kHz, así que Opus a 16 kbps basta: unos **580 MB**. No cabe en la APK (Google Play limita la APK base a 200 MB).
- **Alojamiento propuesto:** los audios en un almacenamiento web, y la app los reproduce en streaming y los guarda en caché. Además habrá un botón «Guardar las cintas de este caso» para escucharlas sin conexión. Opciones:
  - **Cloudflare R2:** 10 GB gratis y sin coste por descarga; es la recomendación.
  - **GitHub Releases** del propio repositorio: gratis y sin configurar nada, pero no está pensado para servir audio.
  - **Play Asset Delivery:** solo funciona si la app se instala desde Google Play y complica las pruebas.
- **Control de calidad automático:** se rechaza cualquier audio en silencio, con NaN o fuera de duración. Se comprueba la duración de cada cinta frente a su guion y que los bloques estén bien marcados para resaltar el texto.

## 7. La app

- **Calendario:** cada día tiene caso. Los casos estrella llevan un sello rojo con estrella y los demás un círculo a lápiz. Se actualiza la leyenda.
- **Expediente:**
  - La ficha muestra el tipo de efeméride y una pestaña **Fuentes**.
  - Debajo, la **caja de pruebas** con 3 a 5 casetes etiquetados, cada uno con su duración y su estado (sin escuchar, a medias o escuchada).
- **Arrastrar a la grabadora:** al arrastrar un casete a la ranura se mete con animación y sonido. Tocarlo también funciona, para accesibilidad. Al acabar, la cinta se expulsa, suena el cambio y entra la siguiente.
- **Progreso por caso:** «Seguir escuchando» retoma la cinta y el punto donde lo dejaste.
- **Leer:** una hoja por cinta, con el párrafo que suena resaltado (como ahora).
- **Parte nativa:**
  - Media3 trata el caso como una lista de cintas e intercala el cambio de cinta entre ellas.
  - La notificación muestra «Cinta 2 de 4 · título».
  - Desde la pantalla de bloqueo se pasa a la cinta anterior o a la siguiente.
  - Caché de descarga (`CacheDataSource`) y descargas por caso.
- **Búsqueda:** añade filtros por tipo de caso, país, época y «solo casos estrella».
- **Avisos:** como cada día tiene caso, hay aviso diario. El texto dice qué se conmemora («Hoy hace 79 años del hallazgo de Elizabeth Short, la Dalia Negra»).

## 8. Plan de trabajo

| Fase | Qué | Cómo | Resultado que validas tú |
|---|---|---|---|
| **0. Piloto** | Formato de cintas de punta a punta con 2 casos: Brady (estrella, 5 cintas, ~18 min) y la Dalia Negra (nuevo, 3 cintas, ~11 min). Prototipo de la caja de cintas en la app | 2–3 agentes y yo | Escuchas las 8 cintas en el POCO y das el visto bueno al tono, la duración y el arrastre |
| **1. Investigación** | 277 fichas con fuentes | Un agente por mes (12) y verificación cruzada | Lista de casos por día con sus fuentes, antes de escribir guiones |
| **2. Guiones** | Unas 1.350 cintas (~750.000 palabras) | Tandas de unos 10 agentes, por meses (enero primero), cada una con verificación | Puedes ir escuchando cada mes según sale |
| **3. Audio** | Unos 4.800 minutos | Generador automático (~3 horas de máquina) con control de calidad | — |
| **4. App** | Datos en JSON, calendario, caja de cintas, reproductor encadenado, caché y alojamiento | Agente de interfaz web y agente Android, con contrato actualizado | Versión 3.0 instalada en el POCO |
| **5. Cierre** | Pruebas completas y publicación en GitHub | Yo | — |

**Escala:** es unas 8 veces el contenido del primer podcast. Se hace en varias sesiones, mes a mes, para que la app crezca de forma ordenada y puedas revisar cada tanda. Mientras tanto, los casos estrella siguen funcionando con su audio actual.

## 9. Decisiones tomadas (9 de noviembre de 2026)

1. **Fechas de los casos nuevos:** cualquier fecha clave (crimen, detención, sentencia, hallazgo, desaparición o nacimiento).
2. **Alojamiento de los audios:** Cloudflare R2 descartado (pide tarjeta). Todo va dentro de la app: voz limpia en Opus a 12 kbps y el efecto «casete gastado» aplicado por Android al reproducir (apartado 10).
5. **Duración (decidida tras la prueba de compresión):** casos estrella con 2 cintas de unos 5 min y casos nuevos con 1 cinta de unos 5 min. En total, unos 2.385 min (40 h), que ocupan unos 187 MB. Los guiones largos del piloto se guardan en `docs/borradores_cintas/`.
3. **Sonido de cambio de cinta:** el MP3 del usuario (`Cassette Tape Sound Effect .mp3`), que declara tener derecho a usarlo.
4. **Arranque:** piloto con Brady (estrella, 5 cintas) y la Dalia Negra (nuevo, 3 cintas).

## 10. Compresión de las cintas (prueba del 9 de noviembre de 2026)

Prueba con 5,4 min de la voz de Brady codificada con Opus en modo voz (`-application voip -frame_duration 60`). Las cifras son el tamaño estimado para unos 4.800 minutos de cintas:

| Opción | KB/min | Total | Distancia a la voz original (220-5000 Hz) |
|---|---|---|---|
| Efecto grabado a 24 kbps (como en la v2) | 172 | 806 MB | — |
| Voz limpia a 12 kbps | 80 | 377 MB | 6,9 dB |
| Voz limpia a 8 kbps | 53 | 250 MB | 10,9 dB |
| Voz limpia a 6 kbps | 41 | 193 MB | 11,1 dB |

- **La clave es separar voz y efecto.** Se guarda la voz limpia (que se comprime muy bien) y el efecto «casete gastado» lo aplica el móvil al reproducir. Para eso hace falta un `AudioProcessor` de Media3 en Kotlin: filtros, compresión, saturación, wow & flutter, siseo, cortes y chasquidos. Si el efecto va grabado, el siseo y los chasquidos se comen los bits (contraejemplo: `muestras-cinta/compresion/brady_4_efecto_grabado_y_8kbps.mp3`).
- **Límites de Google Play (consultados el 9 de noviembre de 2026):**
  - Módulo base: 500 MB.
  - Cada paquete de recursos: 1,5 GB.
  - Total del módulo base y los paquetes instalados con la app: 4 GB.
  - Por encima de 200 MB, Play muestra un aviso a quien descarga con datos móviles.

  Así que no hace falta servidor: todas las cintas pueden ir en la app (en un paquete de recursos que se instala con ella).
- **Ventaja extra:** con el efecto en el móvil, el estilo (casete, VHS, microcasete…) se podría cambiar en los ajustes sin regenerar audios.

**Decisión final:** voz limpia a 12 kbps y cintas de 5 minutos (2 en los casos estrella y 1 en los nuevos): unos 2.385 minutos que ocupan unos 187 MB. Queda por debajo de 200 MB, así que no hay aviso por datos móviles.

**Ajuste tras el piloto:** con la voz real, una cinta de 765 palabras dura unos 5,5 minutos (un 10 % más de lo estimado) y ocupa unos 430 KB. Así, el total rondaría los 200 MB. En el despliegue completo, el objetivo pasa a **650-750 palabras por cinta**, para quedar en unos 5 minutos reales y por debajo de 200 MB.
