# Fase 2: encargo de las cintas de los casos estrella

Cada caso estrella pasa del episodio único de la versión 2 a **2 cintas de unos 5 minutos**. Cada agente recibe una lista de casos.

## Qué leer antes

1. `docs/GUIA_CINTAS.md`, entera. Son las reglas de las cintas y hay que cumplirlas al pie de la letra.
2. `app/src/main/assets/podcast/brady.json`: el caso modelo, ya aprobado por el usuario. Fíjate en el tono, el arranque en frío, las notas del inspector y el cierre.
3. De cada caso tuyo:
   - **El episodio actual:** `app/src/main/assets/podcast/<id>.json` (versión 2, con `bloques`). Sirve de base de hechos y de pronunciaciones.
   - **La ficha:** se saca con `node tools/ver_ficha.js <id>`.
   - **La nota de revisión,** si la tiene, en `docs/REVISION_GUIONES.md`.

## Qué entregar por cada caso

1. **El guion en cintas:** `app/src/main/assets/podcast/<id>.json`, que sustituye al de la versión 2. El formato es el de `brady.json`:
   - `id`, `version: 3`, `pronunciacion` y `cintas`;
   - cada cinta lleva `n`, `titulo`, `tipo` y `bloques` (`voz` y `texto`);
   - se puede añadir `nota_revision` (texto) si queda alguna duda.
2. **Las fuentes:** `web/datos/fuentes/<id>.json`. Es una lista de 4 a 10 fuentes `{ "titulo", "url", "tipo" }`, como las de Brady en `web/datos/fuentes.json`. Tipos: `hemeroteca`, `libro`, `judicial`, `policial`, `enciclopedia` o `documental`.

No toques ningún otro archivo. En especial, no toques `web/datos/fuentes.json` ni los audios.

## Reglas

- **Los hechos se comprueban.** El episodio actual es el punto de partida, pero cada dato clave que uses (fechas, nombres, cifras de víctimas, condenas, lugares) tiene que estar en al menos dos fuentes fiables. Si el episodio actual o la ficha no coinciden con las fuentes, manda la fuente y la discrepancia va en `nota_revision`.
- **Las fuentes:**
  - Cuentan los periódicos, los documentos judiciales y policiales, los libros de editoriales serias, las enciclopedias y los documentales de cadenas reconocidas.
  - Wikipedia vale como punto de partida y puede figurar una vez en la lista. Tiene que haber al menos 3 fuentes que no sean Wikipedia.
  - Nada de blogs anónimos ni foros.
- **No es alargar el episodio.** Con el doble de tiempo hay que contar mejor la historia: la investigación, los errores, el juicio, lo que pasó después y la memoria de las víctimas. No se rellena con adjetivos.
- **Estructura:**
  - La cinta 1 es de tipo `hallazgo` o `notas`: aviso literal, etiqueta, arranque en frío e investigación. Termina con un gancho hacia la cinta 2.
  - La cinta 2 es de tipo `juicio` o `epilogo`: desenlace, lo que quedó sin aclarar y la memoria. Termina con «Fin del expediente [nombre]. Archivo de TRUE CRIME CALENDAR.»
- **Longitud:**
  - Entre 650 y 750 palabras por cinta.
  - Entre 16 y 30 bloques por cinta.
  - El inspector tiene entre el 20 % y el 40 % del texto de cada cinta.
  - Los bloques de Ximena tienen como mucho 70 palabras y los del inspector 60.
- **Títulos de las cintas:** cortos y con intriga, sacados de un objeto, un lugar o un momento del caso («Una cabina en Hattersley»). Sin nombres de víctimas.
- **Pronunciación:**
  - Parte del mapa del episodio actual.
  - Cada clave tiene que aparecer exactamente así en el texto. Quita las que no uses y añade las de los nombres nuevos.
- **Las búsquedas web son limitadas y compartidas con muchos otros agentes.** Empieza por WebFetch de Wikipedia (en inglés y en castellano) y de sus referencias. Usa WebSearch solo cuando haga falta.

## Comprobación

Ejecuta `node tools/validar_cintas.js <id>` con cada caso hasta que salga ✓.

## Informe final, breve

- Casos hechos.
- Discrepancias encontradas entre el episodio antiguo o la ficha y las fuentes.
- Dudas que quedan en `nota_revision`.
