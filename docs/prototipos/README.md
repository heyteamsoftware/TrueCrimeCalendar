# Prototipos de renovación de la interfaz

Dos direcciones para elegir. Son maquetas estáticas (HTML + CSS, sin tocar `web/src` ni la app): cada una enseña tres pantallas de móvil de 412 × 915 con contenido real del archivo (Ian Brady, 2 de enero, y los 33 casos de enero).

| Archivo | Qué es |
|---|---|
| `prototipo-a.png` / `prototipo-a.html` | A · «Quiosco» |
| `prototipo-b.png` / `prototipo-b.html` | B · «Pletina» |
| `prototipo-c.png` / `prototipo-c.html` | C · «Teletexto» |
| `prototipo-d.png` / `prototipo-d.html` | D · «Atlas» |
| `actual.png` | La interfaz de hoy (cuaderno), para comparar |
| `proto_shot.sh` | Temporal: `sh proto_shot.sh a` o `b` regenera el PNG con Edge sin cabeza |

En las tres pantallas de cada prototipo: (1) calendario de enero de 2027 con el caso de hoy destacado, (2) expediente de Ian Brady, (3) grabadora con la cinta 1 dentro y sonando y la cinta 2 fuera, en la caja.

---

## A · «Quiosco»

**Concepto.** La app es un semanario de sucesos de quiosco impreso a dos tintas: negro y la tinta del mes. Cada mes es un número de la revista, el caso de hoy es la portada y el expediente se lee como un reportaje.

**Tipografías.** Anton (titulares condensados), Archivo Narrow (rótulos, datos y botones) y Newsreader (texto de lectura y cursivas). Las tres son libres (OFL) y habría que empaquetarlas en `assets/fonts/`.

**Paleta.** Papel prensa `#ece5d3`, negro tinta `#16130f` y una sola tinta plana por mes (enero, bermellón `#d6321e`). El color del mes actual se conserva, pero como tinta de imprenta: cambia el mes y cambia la segunda tinta de toda la app. Tramas de puntos en vez de degradados; ni sombras ni esquinas redondeadas.

**Qué cambia respecto a la interfaz actual.**
- El calendario pasa de cuadrícula de cuaderno a «sumario del mes»: cada casilla lleva el número y una palabra del caso (Brady, La Dalia, Fago…). Los casos estrella van en casilla negra con estrella; los del archivo, en papel; hoy, en la tinta del mes.
- El caso del día deja de ser una nota pegada y pasa a ser una portada ilustrada (ilustración vectorial a dos tintas; en la maqueta, la cabina de Hattersley en el páramo). Habría que decidir si hay una ilustración por caso estrella o un juego de motivos genéricos por tipo de efeméride.
- Las pestañas laterales de meses pasan a una tira inferior con la tinta de cada mes.
- El expediente es un artículo: titular enorme, entradilla, franja de datos, capitular, mapa a trama y fuentes numeradas. Desaparecen el retrato robot, la cinta adhesiva y la tipografía de máquina de escribir.
- La grabadora se dibuja plana, a dos tintas; las cintas llevan etiqueta impresa en lugar de manuscrita. Se mantienen arrastrar a la pletina, expulsar, −15/+30, cambio de cinta, estados (sin escuchar, a medias, escuchada) y «Leer el caso» con el bloque que suena resaltado.

**Coste de implementación: medio.** Es sobre todo CSS y plantillas: no hay texturas fotográficas ni piezas 3D, y la estructura de datos no cambia. Lo que más pesa es rehacer el marcado del calendario y del expediente en `app.js`, sustituir las animaciones de cuaderno (tapa, hojas, carpeta) por otras de imprenta, y decidir y dibujar las ilustraciones de portada. Las palabras clave de cada casilla se pueden derivar de `n`/`titulo_caso`, pero convendría un campo corto revisado a mano.

---

## B · «Pletina»

**Concepto.** La app es un equipo de sonido de archivo: chasis negro, serigrafía crema y una sola lámpara encendida, del color del mes. Cada caso es un casete y su expediente es la carátula desplegada, con las cintas apuntadas a mano.

**Tipografías.** Barlow Condensed (serigrafía y rótulos), Barlow (lectura), IBM Plex Mono (contador y tiempos) y Mansalva, que ya está en `assets/fonts/`, para todo lo escrito a boli (títulos de las cintas, notas). Las tres primeras son libres (OFL) y habría que empaquetarlas.

**Paleta.** Chasis `#191b1a`, huecos `#0d0f0e`, serigrafía `#dcd5c2`, cartulina de carátula `#eae2cd`, tinta de boli `#1d3a72` y la lámpara del mes (enero, ámbar `#f2a43c`). El rojo `#cf452c` queda solo para la zona roja del vúmetro y la situación judicial.

**Qué cambia respecto a la interfaz actual.**
- Los meses se eligen con un dial de sintonía y los días son un teclado: tecla crema, caso estrella; tecla oscura, caso del archivo; tecla encendida, hoy.
- El caso del día aparece como una carátula de casete en un hueco del frontal, con sus cintas y su duración; los próximos días son lomos de casete apilados.
- El expediente es la carátula desplegada: lomo con el color del mes, nombre, tabla de datos, índice de cintas escrito a mano con su estado, el caso, la situación judicial, el mapa y los vínculos. Queda un minirreproductor fijo abajo.
- La grabadora gana protagonismo: vúmetro, contador, pilotos (incluido «casete gastado», que es el efecto real del móvil), teclas de aluminio y el casete visible tras el cristal. La caja de cintas y «Leer el caso» se mantienen con la misma lógica.
- Se pasa de interfaz clara a oscura; el papel solo aparece en carátulas y etiquetas.

**Coste de implementación: medio-alto.** La lógica de cintas, progreso y puente con Android no cambia, pero hay más piezas con comportamiento propio: el dial de meses (gesto de arrastre con inercia y accesibilidad por teclado), el vúmetro (necesita el nivel de audio o una animación creíble; hoy `PlayerState` no lo da) y el teclado de días con sus estados. Todo se puede dibujar con CSS y SVG, sin imágenes, pero hay que afinar mucho el detalle para que parezca un aparato y no un panel oscuro genérico, y revisar el contraste de los textos pequeños de serigrafía.

---

## C · «Teletexto»

**Concepto.** La app es un servicio de teletexto: toda la pantalla es una rejilla de caracteres con ocho colores planos y dibujos de mosaico, y cada día del año es una página con su número (el 2 de enero es la 102). Se navega como en el mando: tocando números de página y con las cuatro teclas de color del pie, que significan siempre lo mismo (rojo, anterior; verde, siguiente; amarillo, cintas; cian, el mes).

**Tipografías.** Una sola, «TCC Mosaico», dibujada para esta maqueta: matriz de 5 × 9 puntos en celda de 6 × 10 con redondeo de diagonales, monoespaciada, con acentos, eñe y los iconos de la grabadora. Va incrustada en `prototipo-c.html` (18 KB) y sustituiría a las tres familias actuales. Solo hay tres tamaños: normal, doble altura (rótulos) y doble tamaño (nombre del caso y contador).

**Paleta.** Negro y los colores de la carta, algo templados: rojo `#e62b20`, verde `#27d64a`, amarillo `#ffe01a`, azul `#2333dd`, magenta `#ee45c6`, cian `#20d9e4` y blanco `#f3f3ec`, más un gris de media intensidad `#8b8b85` para lo ya escuchado. El color del mes es el de las bandas de cabecera (enero, cian); con seis colores y sus inversos salen los doce meses. Amarillo es siempre «caso estrella», azul «caso del archivo» y rojo «hoy».

**Qué cambia respecto a la interfaz actual.**
- La rejilla es de 34 columnas (celdas de 12 × 20 px en un móvil de 412): el texto queda grande y todo se alinea a la celda. No hay sombras, texturas ni esquinas redondeadas.
- El calendario es una tabla de bloques de color: amarillo con estrella, caso estrella; azul, caso del archivo; rojo con «HOY» parpadeando, hoy; «×2» si el día tiene dos casos. Cada bloque mide 48 × 40 px, con aire alrededor.
- El caso del día lleva una ilustración de mosaico (aquí, la cabina de Hattersley en el páramo, de madrugada). Habría que decidir si se dibuja una por caso estrella o un juego por tipo de efeméride; se generan con código, no son imágenes.
- El expediente es una página con subpáginas (ficha 1/4, caso 2/4, situación 3/4, fuentes 4/4) y un mapa de mosaico del país, sacado de la geografía que ya lleva la app. Vínculos y fuentes son enlaces a otras páginas, con su número.
- La grabadora se dibuja en mosaico: la cinta dentro de la pletina con el título en la etiqueta, contador a doble tamaño, barra de avance de bloques y cinco teclas. En la caja, el hueco de la cinta que está dentro se ve en mosaico punteado y la otra cinta se arrastra a saltos de celda. «Leer el caso» se mantiene, con el bloque que suena bajo una banda amarilla.
- Búsqueda, mapa y ajustes pasan a ser páginas (600, 700, 800). Los meses se cambian con la banda del mes o con la tecla cian.

**Coste de implementación: bajo-medio.** Es la dirección más barata de dibujar: todo es texto, CSS y un SVG de rectángulos; no hay imágenes ni fuentes externas y la app pesaría menos. El trabajo está en rehacer el marcado de calendario, expediente y grabadora en `app.js` (como en A) y en tres cosas propias: que la rejilla escale entera en pantallas de otro ancho y con el tamaño de letra del sistema, que los nombres largos tengan reglas claras (a doble tamaño caben 16 letras; el resto va a doble altura o en dos líneas) y que los mosaicos de portada estén a la altura. El lector de pantalla necesita etiquetas propias, porque los bloques de color no dicen nada por sí solos.

---

## D · «Atlas»

**Concepto.** La app es un atlas: cada mes es una lámina con su planisferio y cada caso es un lugar con sus coordenadas. Se entra por el dónde y por el cuándo a la vez: la cuadrícula del mapa es el calendario y el expediente es una hoja con su mapa, su leyenda y su escala.

**Tipografías.** Spectral (nombres, lectura y la cursiva de los topónimos), Overpass (rótulos y números de la cuadrícula) y Overpass Mono (coordenadas, tiempos y contador). Las tres son libres (OFL) y habría que empaquetarlas en `assets/fonts/`.

**Paleta.** Papel de mapa `#f2f0e6`, tierra `#f8f5e7`, mar `#cfe1e2`, tinta azul negra `#17262e`, curvas de nivel en siena `#bf9160`, arbolado `#d3ddb4` y una tinta de sobreimpresión por mes (enero, magenta de carta náutica `#c4207c`). La sobreimpresión marca solo lo que es del caso o de hoy: la retícula del día, los lugares numerados, el avance de la cinta.

**Qué cambia respecto a la interfaz actual.**
- La pantalla de inicio abre con el planisferio del mes: los 33 casos de enero son puntos (relleno, caso estrella; hueco, caso del archivo) y el de hoy lleva una retícula que cruza el mapa, con sus coordenadas. Debajo, una cartela con el caso del día.
- El calendario es la cuadrícula de la lámina: semanas en el margen, días en columnas, y en cada casilla el número, el símbolo del caso y el código del país. La fila y la columna de hoy quedan teñidas, como al buscar una referencia en un mapa.
- La lista de fichas pasa a ser un nomenclátor: día, caso, lugar y coordenadas.
- Los meses se cambian en una barra de escala de doce tramos, al pie.
- El expediente es una hoja: nombre, mapa de la zona con relieve, carreteras y los lugares del caso numerados (con la distancia entre ellos), leyenda con coordenadas, franja de datos, texto, situación judicial y vínculos como «hojas contiguas». Desaparecen el retrato robot, la cinta adhesiva y la máquina de escribir.
- La grabadora es una lámina de dibujo técnico a línea, con las mismas tintas. El avance de la cinta es una escala graduada en minutos con un marcador de posición, y «Leer el caso» es un itinerario: cada bloque es un hito con su hora, y el que suena va en la tinta del mes. Se mantienen arrastrar a la grabadora, expulsar, −15/+30, cambio de cinta y los tres estados.

**Coste de implementación: alto (medio si se renuncia al mapa de detalle).** El planisferio, la cuadrícula, la barra de meses y la grabadora son SVG y CSS sobre datos que ya existen (`loc` de cada caso y el mapa del mundo que lleva la app), y eso es un trabajo medio. Lo caro es el mapa de cada hoja: el de la maqueta está dibujado a mano para Brady, y hay 377 casos. Hacerlo en serie exige o bien teselas vectoriales con estilo propio (hoy el mapa de detalle usa teselas de Esri y necesita conexión), o bien mapas generados solo con costa y fronteras, que quedan más pobres que el de la maqueta. Una salida intermedia: mapa generado para todos y lámina dibujada solo para los 100 casos estrella. Además hay que comprobar los `loc` uno a uno, porque aquí las coordenadas se leen.

---

## Lo que tienen en común

- Mismo contenido y mismos estados que hoy: un caso cada día (estrella o del archivo), días con dos casos, efeméride del día, expediente con ficha, mapa, vínculos y fuentes, y cintas arrastrables con su progreso.
- Un color por mes, reinterpretado (tinta en A, lámpara en B).
- Iconos dibujados en SVG, sin emojis; sin degradados de relleno ni tarjetas con sombra difusa.

## Notas

- Las maquetas cargan las tipografías de Google Fonts (hace falta conexión para verlas bien; sin ella caen a fuentes del sistema). Mansalva va incrustada en `prototipo-b.html`.
- La fecha de la maqueta es el sábado 2 de enero de 2027 (por eso «hace 89 años»).
- Solo están maquetadas estas tres pantallas: faltarían búsqueda, mapa mundial, ajustes, avisos y la tapa de arranque.

### Notas de C y D

- `sh proto_shot.sh c` y `sh proto_shot.sh d` regeneran sus capturas igual que las de A y B.
- C no necesita conexión: la fuente va dentro del HTML. D carga Spectral y Overpass de Google Fonts.
- En C, el número de página de cada día (100 más el día del año) y las páginas 500 a 800 son una propuesta de la maqueta, no algo que exista en la app. En la portada, la efeméride va abreviada («Nació un día como hoy, en 1938») porque la frase completa no cabe en 34 columnas; en el expediente va entera, en dos líneas.
- En C y D las horas de «Leer el caso» salen de `bloquesMs` de la cinta 1 de Brady (01:54, 02:13 y 02:28): a las 02:14 suena un bloque de archivo, no la nota del inspector que marcan A y B.
- En D, el planisferio y el mapa de mosaico de C salen del mapa del mundo que ya lleva la app. El mapa de Mánchester y Saddleworth de D es un esquema hecho a mano: las poblaciones, los dos lugares del caso, la escala y la distancia están en su sitio, pero las curvas de nivel y el trazado fino de carreteras y embalses son aproximados.
- En D, los códigos de país de la cuadrícula (GBR, USA…) y los números de semana no están en los datos: habría que derivarlos de `p` y de la fecha.
