# Prototipos de renovación de la interfaz

Dos direcciones para elegir. Son maquetas estáticas (HTML + CSS, sin tocar `web/src` ni la app): cada una enseña tres pantallas de móvil de 412 × 915 con contenido real del archivo (Ian Brady, 2 de enero, y los 33 casos de enero).

| Archivo | Qué es |
|---|---|
| `prototipo-a.png` / `prototipo-a.html` | A · «Quiosco» |
| `prototipo-b.png` / `prototipo-b.html` | B · «Pletina» |
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

## Lo que tienen en común

- Mismo contenido y mismos estados que hoy: un caso cada día (estrella o del archivo), días con dos casos, efeméride del día, expediente con ficha, mapa, vínculos y fuentes, y cintas arrastrables con su progreso.
- Un color por mes, reinterpretado (tinta en A, lámpara en B).
- Iconos dibujados en SVG, sin emojis; sin degradados de relleno ni tarjetas con sombra difusa.

## Notas

- Las maquetas cargan las tipografías de Google Fonts (hace falta conexión para verlas bien; sin ella caen a fuentes del sistema). Mansalva va incrustada en `prototipo-b.html`.
- La fecha de la maqueta es el sábado 2 de enero de 2027 (por eso «hace 89 años»).
- Solo están maquetadas estas tres pantallas: faltarían búsqueda, mapa mundial, ajustes, avisos y la tapa de arranque.
