# Fase 2: encargo de las cintas de los casos nuevos

Cada caso nuevo se cuenta en **una cinta de unos 5 minutos**, de tipo `expediente`. Cada agente recibe una lista de casos de un mes.

## Qué leer antes

1. `docs/GUIA_CINTAS.md`, entera. Son las reglas de las cintas y hay que cumplirlas al pie de la letra.
2. `app/src/main/assets/podcast/dalia-negra.json`: el caso modelo de una sola cinta, ya aprobado por el usuario. Fíjate en el tono, el arranque en frío, las notas del inspector y el cierre.
3. De cada caso tuyo, la ficha ya verificada: `node tools/ver_ficha.js <id>`. Trae el resumen, la situación judicial, los lugares, las fuentes y, a veces, una `nota_revision` con dudas.

## Qué entregar por cada caso

El guion: `app/src/main/assets/podcast/<id>.json`, con el formato de `dalia-negra.json`:

- `id`, `version: 3`, `pronunciacion` y `cintas` (una sola);
- la cinta lleva `n: 1`, `titulo`, `tipo: "expediente"` y `bloques` (`voz` y `texto`);
- se puede añadir `nota_revision` (texto) si queda alguna duda.

No toques ningún otro archivo.

## Reglas

- **Los hechos salen de la ficha y de sus fuentes.** La ficha sola no da para 5 minutos: abre al menos dos de sus fuentes para sacar el detalle con el que se cuenta la historia (cómo se descubrió, la clave de la investigación, el juicio, lo que pasó después). Cada dato que uses tiene que estar en una fuente fiable. Lo dudoso se deja fuera o se dice con prudencia.
- **Si una fuente contradice la ficha,** no lo resuelvas en el guion: usa la versión más prudente y apúntalo en `nota_revision` y en el informe.
- **Estructura de la cinta única:**
  1. el aviso literal de la guía, con el nombre del caso;
  2. la etiqueta: «Cinta uno. [título].»;
  3. arranque en frío en el momento más intrigante que esté documentado;
  4. quién es quién, la investigación y el desenlace;
  5. lo que quedó sin aclarar y la memoria de las víctimas;
  6. el cierre: «Fin del expediente [nombre]. Archivo de TRUE CRIME CALENDAR.»
- **Longitud:**
  - entre 650 y 750 palabras;
  - entre 16 y 30 bloques;
  - el inspector tiene entre el 20 % y el 40 % del texto;
  - los bloques de Ximena tienen como mucho 70 palabras y los del inspector 60.
- **Título de la cinta:** corto y con intriga, sacado de un objeto, un lugar o un momento del caso. Sin nombres de víctimas.
- **Casos sin resolver, absoluciones y errores judiciales:** cuidado máximo con la presunción de inocencia. No se señala a nadie que no fuera condenado.
- **Pronunciación:** el mapa lleva siempre «TRUE CRIME CALENDAR» → «Tru Cráim Cálendar» y los nombres extranjeros que salgan. Cada clave tiene que aparecer exactamente así en el texto.
- **Las búsquedas web son limitadas y compartidas con otros agentes.** Usa WebFetch sobre las fuentes de la ficha y deja WebSearch para cuando haga falta.

## Comprobación

Ejecuta `node tools/validar_cintas.js <id>` con cada caso hasta que salga ✓.

## Informe final, breve

- Casos hechos.
- Contradicciones entre la ficha y las fuentes.
- Dudas que quedan en `nota_revision`.

## Archivos temporales

El scratchpad lo comparten todos los agentes. Pon a tus archivos temporales un nombre único que empiece por tu tarea y tu mes o grupo (por ejemplo, `fichas03_`, `verif01_` o `cintasA02_`). Nunca reutilices un script que no hayas escrito tú en esta tarea.
