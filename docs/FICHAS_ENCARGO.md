# Fase 1, paso 3: encargo de las fichas

Cada agente hace las fichas de **un mes**. Los casos que tiene que hacer están en `web/datos/candidatos/seleccion.json`: son las entradas con su `m`. Cada uno trae título, protagonista, fecha, resumen, por qué y riesgos. Los demás candidatos del mismo día están en `web/datos/candidatos/<mm>.json`.

El resultado va en `web/datos/fichas/<mm>.json`, por ejemplo `01.json` para enero. Es una lista JSON de fichas. **No toques ningún otro archivo.** El coordinador une los meses con `node tools/unir_fichas.js`.

## Formato de cada ficha

Sigue el apartado 8 de `docs/CONTRATO.md`. Hay un ejemplo completo en `web/datos/casos_nuevos.json` (la Dalia Negra).

| Campo | Qué es |
|---|---|
| `id` | Identificador corto en minúsculas, sin tildes y con guiones (`robo-banco-rio`). Único. No puede coincidir con uno de los casos estrella (lista abajo). |
| `m`, `d`, `y` | Día, mes y año de la efeméride. Son los de `fecha` en la selección. |
| `n` | La persona principal: el autor si se conoce; si no, la víctima (como «Elizabeth Short»). |
| `a` | Apodo o nombre popular del caso (como «La Dalia Negra»). |
| `v` | Víctimas, en texto corto: `"1"`, `"5"`, `"Ninguna (robo)"`, `"Miles de ahorradores"`. |
| `p` | País, en castellano. |
| `f` | Emoji de la bandera de ese país. |
| `per` | Periodo de los hechos (`"1947"` o `"1963–1965"`). |
| `st` | Situación judicial hoy, en una o dos frases. |
| `c` | Resumen de 3 a 5 frases (entre 60 y 120 palabras). Tiene que contar qué pasó, cómo se descubrió y cómo terminó. |
| `mo` | Modo de actuar, en una o dos frases. |
| `loc` | Entre 1 y 5 lugares: `[lat, lon, "Lugar (qué pasó allí)"]`. Las coordenadas se comprueban en un mapa o en una fuente fiable, con 4 decimales. |
| `vin` | Vínculos con casos estrella o con casos de tu mismo mes: `[id, "c" o "r", "nota"]`. `c` es cómplice o mismo crimen y `r` es relacionado. Si no hay ninguno, `[]`. Los vínculos con casos nuevos de otros meses se proponen en el informe final y los pone el coordinador. |
| `g` | Grupos. Los admitidos son `sin_resolver`, `golpes`, `estafas`, `desapariciones`, `sectas`, `errores_judiciales`, `hispanoamerica`, `espana`, `argentina`, `londres`, `envenenadoras`, `urss`, `weimar`, `andes`, `nobles`, `angeles`, `mataviejas` y `freeway`. Si no encaja ninguno, `[]`. |
| `estrella` | Siempre `false`. |
| `tipo_efemeride` | El de la selección: `nacimiento`, `crimen`, `detencion`, `condena`, `hallazgo`, `desaparicion` o `golpe`. |
| `titulo_caso` | El de la selección. Se puede pulir. |
| `autor` | Quién lo hizo, como dicen las fuentes. Se usa «Desconocido» si no se sabe y «Atribuido a …» si no está probado. |
| `fuentes` | Entre 4 y 10, con la forma `{ "titulo", "url", "tipo" }`. Tipos: `hemeroteca`, `libro`, `judicial`, `policial`, `enciclopedia` o `documental`. El título lleva autor, medio y fecha si los tiene. |
| `nota_revision` | Opcional. Dudas que no se han podido resolver, como datos que las fuentes no dan igual. |

## Reglas de rigor

1. **Dos fuentes para cada dato clave:** la fecha, los nombres, el número de víctimas, la condena y los lugares. Si dos fuentes no dan lo mismo, se elige la más fiable y la discrepancia va en `nota_revision`.
2. **Las fuentes:**
   - Cuentan los periódicos y archivos de hemeroteca, los documentos judiciales y policiales, los libros de editoriales serias, las enciclopedias (Britannica, la Real Academia de la Historia, Treccani…) y los documentales de cadenas reconocidas.
   - **Wikipedia vale como punto de partida.** En la lista de fuentes puede figurar como mucho una vez (como en la Dalia Negra), y debe haber al menos 3 fuentes que no sean Wikipedia.
   - Nada de blogs anónimos, foros ni webs de «misterios».
3. **Los riesgos que trae la selección:** hay que atenderlos. Muchos dicen que la segunda fuente de la fecha es floja: búscale una buena.
4. **Personas:**
   - Presunción de inocencia: «acusado de», «condenado por» o «absuelto», tal como fue.
   - Respeto a las víctimas: nada morboso ni detalles gratuitos.
   - Las víctimas menores no se nombran, salvo en casos históricos de hace más de 30 años con el nombre público y difundido por la familia.
5. **Si un caso no se sostiene** (la fecha no se confirma, los datos clave no se pueden comprobar, hay un proceso abierto o los hechos son de los últimos 10 años), se cambia por otro candidato del mismo día de `web/datos/candidatos/<mm>.json`. Mejor uno de la misma región y del mismo tipo, para no romper las cuotas. El cambio se apunta en el informe final.
6. **El estilo:**
   - Castellano de España, claro y sobrio, como en el ejemplo.
   - Las fechas van escritas («15 de enero de 1947»).
   - Nada de adjetivos de sensacionalismo.

## Cómo trabajar

- **Las búsquedas web son limitadas y compartidas con otros 11 agentes.** Para ahorrarlas:
  - empieza por WebFetch de las páginas de Wikipedia (en castellano y en inglés) y de las `fuentes_fecha` del candidato;
  - de ahí, saca las referencias (periódicos, libros, archivos) y abre esas;
  - usa WebSearch solo cuando haga falta.
- **Guarda el archivo cada 4 o 5 fichas,** para que no se pierda el trabajo si se corta.
- **Al terminar,** ejecuta `node tools/validar_casos.js web/datos/fichas/<mm>.json` y corrige hasta que todas tus fichas salgan con ✓.
- **Informe final, breve:**
  - fichas hechas;
  - casos cambiados y por qué;
  - dudas que quedan en `nota_revision`;
  - fuentes que no se pudieron abrir.

## Casos estrella (no pueden repetirse; sí pueden ser vínculos)

brady letby keyes bonin puente dominique shipman petiot robledo rifkin bodkin camargo arropiero garavito ishikawa norris hansen ridgway cullen muehlberg wuornos ramirez toole rader gaskins king ireland gacy kraft toppan sobhraj jesperson christie pichushkin landru harvey yoo black homolka beck bryant holmes bellfield fish murano dahmer bianchi chase escalero kurten berkowitz sutcliffe shawcross little pedrinho jones hindley magnotta onoprienko yang bathory miyazaki lucas alcala gein bernardo franklin desalvo gillesrais kearney pardo bittaker fwest buono lopez iqbal chikatilo swango pickton haarmann cotton godino doss lee ray watts deangelo manson gilbert romasanta nilsen starkweather bundy rwest rodriguezvega barraza fernandez kemper corll hogel

Los nombres completos de cada uno están en `web/datos/candidatos/casos_existentes.json`.
