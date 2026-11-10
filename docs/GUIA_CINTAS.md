# Guía de las cintas de TRUE CRIME CALENDAR (versión 3)

Cada caso del archivo se cuenta en **cintas de casete de unos 5 minutos** (**2 cintas** los casos estrella y **1 cinta** los casos nuevos) que se escuchan en la app con sonido de cinta gastada y también se pueden leer. El conjunto cuenta la historia completa. Esta guía sustituye a `GUIA_GUIONES.md` para los casos en formato de cintas. El formato del archivo está en `docs/CONTRATO.md`, sección 7.

## 1. El concepto: material del archivo

La app es el **Archivo de TRUE CRIME CALENDAR**: una caja por caso con cintas catalogadas. Dos personajes ficticios graban esas cintas:

- **La archivera** (voz `ximena`): cataloga el material y cuenta lo documentado. Precisa, sobria y con un punto de inquietud. Es la voz principal.
- **El inspector** (voz `alvaro`): un investigador veterano que dicta sus notas al grabador. Analiza pistas, señala errores de la investigación y plantea las hipótesis que se manejaron. Habla en primera persona («Lo que me inquieta de este informe es…»). Es un personaje inventado: no es ningún policía real del caso.

Ninguno de los dos dice haber estado en el caso ni se hace pasar por alguien que participó. Son quienes, hoy, revisan el material.

## 2. Reglas de rigor (innegociables)

1. **Nada inventado.** Los hechos salen de la ficha del caso y de sus fuentes. Si no estás seguro de un dato, no lo pongas o dilo con prudencia («la cifra exacta nunca se conoció»).
2. **Ni grabaciones falsas ni palabras puestas en boca de personas reales.** Nada de «escuchemos la llamada al 091» ni de reconstruir diálogos de víctimas, acusados, policías, testigos o familiares. Lo que dijeron solo aparece si está documentado: cita breve y atribuida («según declaró en el juicio, …») o parafraseado. Ante la duda, parafrasea.
3. **Las hipótesis del inspector se atribuyen.** Puede plantear las líneas que barajaron los investigadores, los periodistas o los autores de referencia («los investigadores de la época sospecharon…»). No puede inventar sospechosos nuevos ni acusar a personas identificables que no fueron condenadas.
4. **Presunción de inocencia.** Si no hay condena firme, se dice claramente. Una absolución es una absolución. En los casos sin resolver no se señala a nadie como culpable.
5. **Respeto a las víctimas.** Sin morbo ni detalles gráficos, y sin describir métodos que puedan servir de instrucciones. Se nombra a las víctimas solo si el dato es público y seguro. A las víctimas menores, solo en casos históricos (hace más de 30 años) en los que sus nombres son públicos desde entonces y sus familias los han difundido, o si el nombre forma parte del nombre histórico del caso. Nunca en casos recientes ni si la familia pidió discreción. Siempre con respeto.
6. **Discrepancias.** Si la ficha y las fuentes no coinciden, no lo resuelvas en el guion: anótalo en `nota_revision` y quédate con la versión más prudente.

## 3. Estructura de un caso

### 3.1. Primera cinta: aviso y arranque en frío

La cinta 1 empieza siempre con este aviso (bloque de Ximena, literal, cambiando solo el nombre):

> «Archivo de TRUE CRIME CALENDAR. Expediente: [nombre del caso]. Lo que vas a escuchar es una reconstrucción basada en documentos públicos. Las voces pertenecen al archivo, no a los protagonistas.»

Justo después, sin presentaciones, entra en el **momento más intrigante documentado**: un hallazgo, una llamada que hizo alguien, un error o un objeto. Nunca empieza por el nacimiento del autor.

### 3.2. Cada cinta

- **Empieza leyendo su etiqueta:** «Cinta dos. La maleta de la estación.» (Ximena, en un bloque corto aparte). La cinta 1 la lee después del aviso.
- **Tiene un tipo** (apartado 4) y una función clara en la historia.
- **Si hay otra cinta después, termina con un gancho** que empuje a la siguiente («Pero en el fondo de la caja había algo más…»). La última cinta (o la única) cierra la historia y termina con: «Fin del expediente [nombre]. Archivo de TRUE CRIME CALENDAR.»
- **Se entiende sola**, aunque el orden numérico cuenta la historia completa. Si se escucha suelta, no debe resultar confusa: recuerda en una frase quién es quién cuando haga falta.

### 3.3. El conjunto

Al acabar todas las cintas, el oyente debe saber: qué pasó, a quién, cómo se investigó, cómo se resolvió (o por qué no), qué pasó después y por qué se recuerda. También debe quedar claro el papel de las víctimas.

## 4. Tipos de cinta

| `tipo` | Qué contiene | Quién habla |
|---|---|---|
| `hallazgo` | El descubrimiento del caso, en arranque en frío, reconstruido con lo documentado | Archivera (y alguna nota del inspector) |
| `notas` | Notas del inspector: pistas, hipótesis manejadas y errores de la investigación | Inspector, con apuntes de la archivera |
| `declaraciones` | Lo que dijeron testigos, acusados y peritos según actas y prensa: citado brevemente o parafraseado, siempre atribuido | Archivera, con comentarios del inspector |
| `hemeroteca` | Cómo lo contaron los periódicos, la radio o la televisión de la época (parafraseado) | Archivera |
| `juicio` | Proceso, pruebas y sentencia | Ambos |
| `epilogo` | Lo que nunca se aclaró, las consecuencias y la memoria de las víctimas | Ambos |
| `expediente` | Cinta única de un caso nuevo: el caso entero en 5 minutos (hallazgo, investigación, desenlace y memoria) | Ambos |

- **Casos estrella (2 cintas):** la primera suele ser `hallazgo` o `notas` (el arranque y la investigación) y la segunda `juicio` o `epilogo` (el desenlace, lo que quedó y la memoria).
- **Casos nuevos (1 cinta):** tipo `expediente`. Sigue el mismo arco completo: arranque en frío, quién, investigación, desenlace y memoria.

## 5. Longitud

Con la voz real, una cinta de 765 palabras dura unos 5,5 minutos. Para que cada cinta dure unos 5 minutos, el objetivo es de **650 a 750 palabras** (el validador admite hasta 780).

| Caso | Cintas | Palabras por cinta | Total |
|---|---|---|---|
| Estrella | 2 | 650–750 | 1.300–1.500 palabras (unos 10 min) |
| Nuevo | 1 | 650–750 | 650–750 palabras (unos 5 min) |

- **Bloques:**
  - De Ximena: como mucho 70 palabras (1 a 4 frases).
  - Del inspector: como mucho 60 palabras.
  - De cada cinta: entre 16 y 30.
- **Reparto:** el inspector tiene entre el 20 % y el 40 % del texto de cada cinta.
- **Con 5 minutos hay que elegir:** cuenta lo esencial y lo más revelador (el arranque, la clave de la investigación, el desenlace y la memoria de las víctimas) y deja fuera los detalles secundarios y los datos discutidos.

## 6. Escribir para el oído

- Frases cortas, una idea por frase. Usa preguntas, puntos suspensivos y giros.
- Castellano de España. Escribe con todas las letras: «Estados Unidos» (no «EE. UU.»), «el siglo diecinueve». Los años en cifra funcionan bien.
- **Pronunciación:** el mapa `pronunciacion` (solo para el audio) recoge cómo se dicen en español los nombres extranjeros, lugares y siglas. Por ejemplo: «Elizabeth Short» → «Elísabez Short», «Los Ángeles» se queda igual, «LAPD» → «la policía de Los Ángeles» (mejor escribirlo así directamente). Siempre: «TRUE CRIME CALENDAR» → «Tru Cráim Cálendar». Las claves tienen que aparecer exactamente así en el texto.

## 7. Comprobación

Ejecuta `node tools/validar_cintas.js <id>` desde la carpeta del proyecto hasta que salga ✓. Comprueba la estructura, el aviso, las etiquetas, las longitudes, el reparto de voces y el mapa de pronunciación.
