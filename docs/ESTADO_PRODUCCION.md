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
| 01 | 18/18 ✓ | en marcha (y cambiar el 24/1, Mumcu: proceso abierto) | — |
| 11 | 19/19 ✓ | en marcha | — |
| 10 | 24/24 ✓ | en marcha | — |
| 03 | 23/23 ✓ | en marcha (mirar el 11/3, Ragone: ¿causa cerrada?) | — |
| 05 | 19/19 ✓ | ✓ verificado (2 correcciones) | — |
| 02 | 23/23 ✓ | en marcha | — |
| 09 | 25/25 ✓ | en marcha (y cambiar el 22/9 por Sara Jane Moore) | — |
| 04 | 23/23 ✓ | en marcha | — |
| 07 | 26/26 ✓ | ✓ verificado (5 correcciones) | — |
| 08 | 26/26 ✓ | ✓ verificado (cambiar el 13/8: Garzón tiene juicio abierto, entra Macarthur) | — |
| 12 | 25/25 ✓ | en marcha | — |
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
| abril B | landru harvey yoo black | lanzado |
| mayo A | homolka beck bryant holmes | lanzado |
| mayo B | bellfield fish murano dahmer | lanzado |
| mayo C | bianchi chase escalero kurten | lanzado |
| junio | berkowitz sutcliffe shawcross little pedrinho | lanzado |
| julio | jones hindley magnotta onoprienko yang | lanzado |
| agosto A | bathory miyazaki lucas alcala | en cola |
| agosto B | gein bernardo franklin | en cola |
| septiembre A | desalvo gillesrais kearney | en cola |
| septiembre B | pardo bittaker fwest | en cola |
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
