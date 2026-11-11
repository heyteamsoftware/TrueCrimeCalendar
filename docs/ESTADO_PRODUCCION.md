# Estado de la producción del 3.0

Lo mantiene el coordinador. El límite es de 20 agentes a la vez: según terminan unos, se lanzan los siguientes de la cola.

## Orden de prioridad al liberarse un hueco

1. Verificación cruzada de un mes de fichas ya terminado (`docs/VERIFICACION_FICHAS.md`).
2. Guiones de casos nuevos de un mes ya verificado y unido (`docs/GUIONES_NUEVOS_ENCARGO.md`).
3. Grupos de guiones estrella en cola (`docs/GUIONES_ESTRELLA_ENCARGO.md`).
4. Verificación de guiones ya escritos.

## Fichas de casos nuevos (12 agentes, uno por mes)

Lanzados el 10 de noviembre de 2026. Estado por mes: escritas / verificadas / unidas.

| Mes | Escritas | Verificadas | Unidas |
|---|---|---|---|
| 01 | 18/18 ✓ | ✓ verificado (24/1 ya es Hobeika; Arturo Ruiz se queda) | — |
| 11 | 19/19 ✓ | ✓ verificado (11 correcciones) | — |
| 10 | 24/24 ✓ | ✓ verificado (11 correcciones) | — |
| 03 | 23/23 ✓ | ✓ verificado (11 correcciones; 11/3 cambiado a Ravachol) | — |
| 05 | 19/19 ✓ | ✓ verificado (2 correcciones) | — |
| 02 | 23/23 ✓ | ✓ verificado (11 correcciones) | — |
| 09 | 25/25 ✓ | ✓ verificado (22/9 Sara Jane Moore; 25/9 cambiado a Bandaranaike por Rucci con causa reactivada) | — |
| 04 | 23/23 ✓ | ✓ verificado (8 correcciones) | — |
| 07 | 26/26 ✓ | ✓ verificado (5 correcciones) | — |
| 08 | 26/26 ✓ | ✓ verificado (13/8 cambiado a Macarthur) | — |
| 12 | 25/25 ✓ | ✓ verificado (22 correcciones) | ✓ |
| 06 | en marcha | — | — |

## Guiones de casos estrella (2 cintas por caso)

Hecho antes: `brady` (piloto).

| Grupo | Casos | Estado |
|---|---|---|
| enero A | letby keyes bonin puente | ✓ hecho (4/4) |
| enero B | dominique shipman petiot robledo rifkin | ✓ hecho (5/5) |
| enero C | bodkin camargo arropiero garavito | ✓ hecho (4/4) |
| febrero A | ishikawa norris hansen ridgway | ✓ hecho (4/4) |
| febrero B | cullen muehlberg wuornos ramirez | ✓ hecho (4/4) |
| marzo A | toole rader gaskins king | ✓ hecho (4/4) |
| marzo B | ireland gacy kraft toppan | ✓ hecho (4/4) |
| abril A | sobhraj jesperson christie pichushkin | ✓ hecho (4/4) |
| abril B | landru harvey yoo black | ✓ hecho (4/4) |
| mayo A | homolka beck bryant holmes | ✓ homolka y beck; bryant y holmes en curso |
| mayo B | bellfield fish murano dahmer | ✓ hecho (4/4) |
| mayo C | bianchi chase escalero kurten | ✓ hecho (4/4) |
| junio | berkowitz sutcliffe shawcross little pedrinho | ✓ hecho (5/5) |
| julio | jones hindley magnotta onoprienko yang | ✓ hecho (5/5) |
| agosto A | bathory miyazaki lucas alcala | ✓ hecho (4/4) |
| agosto B | gein bernardo franklin | ✓ hecho (3/3) |
| septiembre A | desalvo gillesrais kearney | ✓ hecho (3/3) |
| septiembre B | pardo bittaker fwest | ✓ hecho (3/3) |
| octubre A | buono lopez iqbal chikatilo swango | en cola |
| octubre B | pickton haarmann cotton godino | en cola |
| noviembre A | doss lee ray watts | en cola |
| noviembre B | deangelo manson gilbert romasanta | en cola |
| noviembre C | nilsen starkweather bundy rwest | en cola |
| diciembre A | rodriguezvega barraza fernandez | en cola |
| diciembre B | kemper corll hogel | en cola |

Notas para los encargos:

- **Parejas** (mismos crímenes, dos expedientes): brady–hindley, homolka–bernardo, bianchi–buono, fwest–rwest, lucas–toole, bittaker–norris, beck–fernandez. Cada uno se cuenta desde su protagonista.
- **hindley:** tiene que leer `brady.json` y contar lo que ese no cuenta.
- **king:** el error judicial con Dolores Vázquez se cuenta en el caso nuevo del 9 de octubre (caso Wanninkhof).

## Guiones de casos nuevos (1 cinta por caso)

Pendientes de que cada mes de fichas esté verificado y unido.

## Audio

Pendiente. Se graba por tandas con `python tools/generar_cintas.py` cuando los guiones de la tanda están verificados.

## Incidencias

- **10 de noviembre, hacia las 00:40:** los 19 agentes se cortaron por el límite de uso de 5 horas. Se reanudaron a las 05:55 con lo ya guardado (85 fichas).
- **Cambios en la selección** (`web/datos/candidatos/ajustes.json`, apartado `fijar`), para quitar casos repetidos y cumplir la cuota de casos sin resolver:
  - 29/4: Rodney King, en lugar de la fuga de Roldán;
  - 9/7: O. J. Simpson (el cambio lo hizo el agente de julio, porque Klebnikov tiene la investigación abierta);
  - 27/7: Richard Jewell, en lugar de Pettersson y Palme;
  - 5/8: el caso Dominici, en lugar de Stringtown;
  - 3/10: Thompson y Bywaters, en lugar del veredicto de O. J.;
  - 14/12: Kaspar Hauser, en lugar de Sidónio Pais.
- **Más cambios hechos por los agentes de fichas:**
  - 11/11: el secuestro de Rupérez, en lugar de Palomino (víctima menor en un caso reciente);
  - 16/11: Totò Riina, en lugar de los jesuitas de la UCA (proceso abierto en El Salvador);
  - 5/8: caso nuevo que busca el agente de agosto, porque Dominici ya está el 28/11.

  Al unir hay que volver a comprobar las cuotas, porque Hispanoamérica ha perdido un caso.
- **Cambios hechos por el agente de octubre:**
  - 2/10: el gallinero de Wineville, en lugar de Goold (la fecha solo la da Wikipedia);
  - 29/10: Ben Barka tiene la instrucción abierta y se puso Lindy Chamberlain, pero ese caso ya está el 17/8: está buscando otro.
- **Regla para el coordinador:** antes de dar por buena una sustitución, buscar el nombre en todas las fichas y en la selección. En dos sustituciones (Dominici y Chamberlain) el caso ya estaba en otro día.
  - 29/10, resuelto: la ejecución de Walter Raleigh (1618), en lugar de Lindy Chamberlain.
- **22/9:** Sara Jane Moore contra Ford, en lugar del caso Asunta (víctima menor en un caso reciente). Se quedan el 18/9 (Jorge Julio López: se busca al desaparecido, no hay acusado) y el 14/9 (el Monstruo de Florencia, pendiente de verificar).
- **Cambios hechos por el agente de agosto:**
  - 5/8: las Trece Rosas (caso nuevo);
  - 11/8: Paolo Giaccone, en lugar del Carlton de Cannes (fuentes contradictorias);
  - 18/8: Julien Lahaut, en lugar de Galán (proceso abierto).

  Hispanoamérica ha perdido varios casos (UCA, Galán y Asunta). Al unir hay que comprobar la cuota.
- **Fechas de los casos estrella:** gaskins y king tienen mal la fecha de nacimiento, que es la que decide su día. Se comprueban las 100 (`docs/FECHAS_ESTRELLA_ENCARGO.md`).

## 10 de noviembre por la tarde: relanzado con Sonnet de esfuerzo medio

Por petición del usuario, desde ahora los agentes de la producción usan el modelo Sonnet con esfuerzo medio. Los 20 agentes anteriores se cortaron por el límite de uso, así que se relanzaron como agentes nuevos que siguen desde lo guardado en disco:

- fichas de junio (20 de 25 guardadas);
- verificación de 11 meses (todos menos junio), con los puntos especiales de cada mes en `docs/revision_fichas/PUNTOS.md`;
- comprobación de las fechas de los 100 casos estrella;
- 6 agentes con los guiones estrella que faltan (hechos: 33 de 100 más el piloto).

Todo lo que ya estaba guardado y validado sigue en GitHub.

## 10 de noviembre, tarde: fichas unidas

- Los 12 meses están verificados y unidos en `web/datos/casos_nuevos.json` (277 casos nuevos, contando la Dalia Negra).
- `node tools/validar_casos.js`: 277/277 correctas y 366/366 días cubiertos.
- **Cuotas:** España e Hispanoamérica 31 % (mínimo 30 %), EE. UU. y Canadá 23 %, Asia, África y Oceanía 29 casos, antes de 1900 el 16 %.
- Los vínculos entre meses de `docs/VINCULOS_PROPUESTOS.md` aún no están puestos.
- Decidido por el usuario: las fechas de los casos estrella se dejan como están (`docs/DECISIONES_FECHAS_ESTRELLA.md`).
- Siguiente fase: guiones de los 276 casos nuevos (una cinta cada uno), por mitades de mes.

## 10 de noviembre, noche: sesión interrumpida

- Al cerrarse la sesión se cortaron 13 agentes. Se relanzaron como agentes nuevos que siguen desde lo guardado:
  - guiones estrella (bryant, holmes, corll, hogel);
  - casos nuevos de febrero 1-15 y agosto, septiembre, octubre 1-15 y octubre 16-31.
- **Pendiente de relanzar** (se hará poco a poco): noviembre 1-15, noviembre 16-30, diciembre 1-15, diciembre 16-31 y la verificación de los guiones nuevos de enero.
- Guiones validados: 295 de 297 (fallan por pocas palabras matanza-san-valentin, puerto-hurraco y thompson-bywaters, que ya tienen agente asignado).

## 10 de noviembre, noche: los audios irán al servidor del usuario

- Decisión del usuario: las cintas se sirven desde su servidor (`https://myappsserver.duckdns.org/truecrimescalendar/<id>/cinta-<n>.ogg`, Apache con soporte de `Range`) y no van dentro del APK.
- Carpeta creada en el servidor y probada con 6 cintas (Brady, Dalia Negra, Letby, Marvin Gaye): `200 OK`, `Accept-Ranges` y `206` al pedir un tramo.
- `tools/subir_audios.ps1` sube las carpetas grabadas. Los audios no se suben a GitHub.
- Tanda 1 de grabación en marcha (`tools/tandas/tanda1.txt`: casos estrella revisados y casos nuevos de febrero a septiembre).
- **Pendiente en la app:** descargar y guardar las cintas en el móvil (caché) para escucharlas sin conexión después; `index.json` con direcciones https; mantener dentro de la app los sonidos de la grabadora.

## 10 de noviembre, 23:45: guiones revisados y audio completo

- Los 21 grupos de revisión de guiones están terminados (`docs/revision_guiones/`); los 377 guiones pasan el validador.
- Audio: 477 cintas grabadas (37,4 horas, 175 MB), sin fallos; cada cinta coincide con su guion bloque a bloque. Subida al servidor en marcha.
- Favoritos añadidos a la web (contrato, sección 9).
- Prototipos de interfaz A y B entregados; C y D en marcha.
- **Falta:** que la app descargue y guarde las cintas del servidor; aplicar `docs/CORRECCIONES_FICHAS_ESTRELLA.md`; poner los vínculos de `docs/VINCULOS_PROPUESTOS.md`; quitar los audios antiguos del APK; rediseño si el usuario elige un prototipo; compilar, probar en el POCO y subir la versión final.

## 11 de noviembre, 00:05: cintas en el servidor, descarga en la app y fichas corregidas

- **Servidor:** las 477 cintas están en `https://myappsserver.duckdns.org/truecrimescalendar/` (181.589.940 bytes, igual que en local). Las grabaciones pasan a `cintas/` (fuera de git y de la APK).
- **App:** reproduce cada cinta desde la copia del móvil o, si no la hay, desde el servidor, y la guarda. La ficha de ajustes tiene la sección «Cintas» con «Descargar todas», cancelar y borrar (contrato 7.7). La APK de publicación baja a 3,7 MB.
- **Probado en el POCO:** reproducción desde el servidor, guardado, descarga de las 477 cintas (173 MB, 0 fallos), cancelación y reproducción de una cinta guardada.
- **Fichas estrella:** 56 corregidas (`web/datos/correcciones_estrella.json`). **Vínculos entre meses:** 95 (`web/datos/vinculos.json`). Los aplica `web/montar.py` (contrato 8.1).
- **Web:** versión de navegador publicada en `https://myappsserver.duckdns.org/truecrimescalendar/truecrime.html` (con `img/`, `sfx/`, `podcast/` y `audio/index.json`). En el navegador las cintas suenan sin el efecto de casete, que solo lo pone Android.
- Prototipos C «Teletexto» y D «Atlas» entregados. El usuario elige el B «Pletina».
- **Falta:** implementar el diseño B, instalarlo en el POCO y volver a subir la web.

## 11 de noviembre, 00:20: interfaz «Pletina» (prototipo B)

- El usuario eligió el prototipo B. La web pasa de cuaderno a equipo de sonido: chasis oscuro, serigrafía crema y una lámpara con el color de cada mes.
- **Calendario:** dial de meses con aguja, teclado de días (tecla crema: caso estrella; oscura: caso del archivo; encendida: hoy), carátula del caso del día y lista en lomos de casete.
- **Expediente:** carátula desplegada (lomo, nombre, tabla de datos, el caso, situación judicial, material gráfico, lugares, vínculos y fuentes).
- **Pletina:** vúmetro, contador, pilotos, casete tras el cristal, línea de tiempo, teclas de aluminio, caja de cintas y «Leer el caso» con la hora de cada bloque. La lógica de cintas, progreso y puente con Android no cambia.
- **Tipografías:** Barlow Condensed, Barlow, IBM Plex Mono y Mansalva, empaquetadas en `assets/fonts` (`tools/descargar_fuentes.py`). Se quitan Courier Prime, Special Elite y las texturas de `assets/img`.
- La aguja del vúmetro es una animación: el reproductor no da el nivel real del audio.
- Instalada en el POCO y publicada en `https://myappsserver.duckdns.org/truecrimescalendar/truecrime.html`.
- **Sin comprobar a ojo en el móvil:** al instalar, la pantalla del POCO estaba apagada y no hay captura. Comprobado por depuración: página cargada, tipografías cargadas y 477 cintas guardadas.

## 11 de noviembre, 08:10: publicación en Google Play

- **App creada** en la consola de Google Play (`com.heyteamsoftware.truecrimecalendar`, gratis, es-ES). AAB firmado con la clave de subida (versión 3.0.0, código 10, 3,6 MB de descarga) subido a **producción en 178 países**, sin pruebas previas.
- **Enviado a revisión** el 11 de noviembre de 2026 (11 cambios). Google suele tardar hasta 7 días; la publicación es automática al aprobarse.
- **Ficha:** textos, icono, gráfico de funciones y capturas (`play/`); categoría Entretenimiento; contacto `heyteamsoftware@gmail.com` y web.
- **Declaraciones:** privacidad, anuncios (no), inicio de sesión (no hay), ID de publicidad (no), gubernamental (no), financieras (no), salud (no), público 18+, seguridad de los datos (sin recogida) y clasificación IARC (violencia y violencia sexual solo en texto y audio, drogas por referencia).
- **Servicios en primer plano:** `dataSync` (descargar todas) y `mediaPlayback`, con vídeos grabados en el emulador (`play/videos/`, publicados en `/truecrimescalendar/demo/`; no se pueden borrar mientras dure la revisión).
- **Probada** la versión firmada (R8) en el emulador de Android 17: arranca, reproduce y descarga. En el POCO no se pudo instalar: pedía confirmación en pantalla.
- **Pendiente:** ver la respuesta de Google; guardar copia de `%USERPROFILE%\.tcc-signing\tcc-upload.jks`; el efecto «casete gastado» solo existe en la app, no en la web.

## 11 de noviembre, tarde: calendario con años y ✓, y actualización obligatoria

- **Calendario (web y app):** cada día muestra el año del caso (o ×N si hay varios) y un tick ✓ cuando se han escuchado todas las cintas del caso; el tick también sale en la ficha, en la carátula de hoy y en la leyenda. Web publicada en `truecrime.html`; commit `44748c7`.
- **Actualización obligatoria en la app** (`docs/CONTRATO.md` 7.8): actualización inmediata de Google Play más un aviso sin salida si `version-minima.json` del servidor pide una versión mayor. `version-minima.json` está en el servidor con `minVersionCode` 10 (la versión actual). Probado en el emulador: con `versionCode` 1 sale el aviso, Atrás no lo cierra y «Actualizar» abre Play; con la versión normal no sale; la compilación de publicación (R8) arranca y consulta a Play sin fallos.
- **No comprobado:** el flujo real de la actualización inmediata de Play (solo se puede probar con una versión publicada en Play y otra instalada desde Play).
- **Para que llegue a los usuarios hace falta una versión nueva en Play** (3.0.1, código 11): quien instale la 3.0.0 no tiene este mecanismo.
