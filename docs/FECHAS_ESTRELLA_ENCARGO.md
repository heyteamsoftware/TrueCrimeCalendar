# Comprobación de las fechas de los 100 casos estrella

**Por qué:** en los casos estrella, el día del calendario es la fecha de nacimiento del protagonista (`d`, `m` e `y` en `web/base/calendario_v3.html`, que se ven con `node tools/ver_ficha.js <id>`). Los guionistas han encontrado dos fechas mal:

- gaskins nació el 31 de marzo de 1933, no el 13;
- de king no hay ninguna fuente que dé el 14 de marzo de 1965.

Puede haber más.

## Qué hay que hacer

1. **Comprobar la fecha de nacimiento de cada caso estrella** (día, mes y año) en dos fuentes fiables e independientes. Wikipedia cuenta como una sola fuente aunque esté en dos idiomas.
2. **Si la fecha de la ficha es correcta,** basta con anotar las dos fuentes.
3. **Si es incorrecta o no se puede confirmar:**
   - anota la fecha correcta con sus fuentes, o «desconocida» si no se sabe;
   - busca si hay otra fecha clave documentada del caso que caiga en el mismo día y mes que la ficha (crimen, detención, condena, hallazgo…), con dos fuentes. Así el caso podría quedarse en su día con otro tipo de efeméride;
   - si no la hay, indica a qué día pasaría el caso y qué otros casos hay ya ese día (míralo con `node tools/ver_ficha.js` o buscando en `web/datos/fichas/` y en `web/datos/candidatos/seleccion.json`).

No toques ningún archivo de datos. Escribe solo el informe `docs/revision_fechas_estrella.md`, con una tabla de los 100 casos y una sección con los que fallan. El coordinador decide después los cambios.

## Cómo trabajar

- **Herramientas:** usa WebFetch y curl; WebSearch solo cuando haga falta. La cuota es compartida con otros 19 agentes.
- **Archivos temporales:** con el prefijo `fechas_`.
