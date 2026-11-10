# Verificación de los guiones de las cintas

Un agente distinto del que escribió los guiones revisa un grupo (un mes o parte de un mes). No eres el autor: desconfía de todo lo que no puedas comprobar en una fuente.

## Qué se revisa en cada guion

1. **Hechos.** Cada fecha, nombre, cifra, pena y lugar del texto está en la ficha verificada (`node tools/ver_ficha.js <id>`) o en una fuente fiable. Abre al menos dos fuentes por guion. Lo que solo consta en Wikipedia o en un blog tiene que ir atribuido en el texto («según…»). Lo que no se pueda comprobar se quita o se suaviza.
2. **Las notas del autor.** Resuelve las dudas de `nota_revision` cuando puedas, y los puntos de este caso en `docs/REVISION_CINTAS_PENDIENTE.md`.
3. **Presunción de inocencia.** Nadie sin condena firme aparece como culpable. Los absueltos, como absueltos. Los casos sin resolver no señalan a nadie.
4. **Víctimas menores.** Se aplica la «Regla común» de `docs/REVISION_CINTAS_PENDIENTE.md`. Si un menor aparece con nombre y no se cumple la regla, quita el nombre.
5. **Sin morbo.** Nada de métodos, detalles gráficos ni citas literales de los criminales.
6. **Personajes y voz.** La archivera (`ximena`) y el inspector (`alvaro`) no se hacen pasar por nadie real; no hay diálogos ni grabaciones inventados de personas reales; las hipótesis del inspector van atribuidas.
7. **Estructura.** `node tools/validar_cintas.js <id>` en ✓. El aviso literal al principio, la etiqueta «Cinta uno.», el cierre «Fin del expediente…» y el mapa de pronunciación. Las claves de pronunciación que no se usan se quitan.
8. **Pronunciación.** Revisa que el mapa dé una lectura razonable en español de los nombres extranjeros (por ejemplo, «Elísabez Short»). Corrige los que estén claramente mal.
9. **Estilo.** Castellano de España claro, frases cortas, números en cifras, nada de siglas sin leer (EE. UU. se escribe «Estados Unidos»).

## Qué hacer con lo que encuentres

- **Corrige en el propio archivo** `app/src/main/assets/podcast/<id>.json` lo que puedas con fuentes. Después de corregir, el guion tiene que seguir en 650-780 palabras por cinta (1.300-1.560 en total para los casos estrella).
- **Lo que no se pueda arreglar** va a `nota_revision` del guion y a tu informe.
- **Un error grave** (hecho falso, nombre de un menor sin permiso, alguien señalado sin condena) se corrige y se cuenta en el informe.

## El informe

Escríbelo en `docs/revision_guiones/<grupo>.md`: guiones revisados y corregidos, una línea por corrección (caso, qué decía, qué dice ahora, fuente), errores graves y dudas que quedan.

## Cómo trabajar

- Escribe solo los `.json` de tu grupo y tu informe.
- Temporales con un prefijo único (por ejemplo `revGuion_<grupo>_`); no borres ni muevas nada del scratchpad que no sea tuyo.
- WebFetch y, si una web de prensa está bloqueada, curl. WebSearch solo si hace falta (cuota compartida).
- Cada archivo termina con `node tools/validar_cintas.js <id>` en ✓.
