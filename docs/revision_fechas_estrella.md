# Revisión de las fechas de nacimiento de los 100 casos estrella

Encargo: `docs/FECHAS_ESTRELLA_ENCARGO.md`. No se ha tocado ningún archivo de datos.

## Resumen

| Estado | Casos |
|---|---|
| OK (fecha confirmada con dos fuentes) | 85 |
| OK con nota (confirmada, pero con fuente débil o una discrepancia menor que no cambia el día ni el mes) | 8 |
| FALLA (la fecha de la ficha es incorrecta o no existe) | 2 seguros: yang y gillesrais |
| NO CONFIRMADA (fuentes enfrentadas o sin fuente) | 5: gaskins, king, pedrinho, iqbal, cotton |


Método: fuente A = Wikipedia (inglés o español, cuenta como una; se leyó el wikitexto de las 100 páginas). Fuente B = otra independiente: Murderpedia para unos 60 casos y, para el resto, Britannica, Biography.com, Find a Grave, prensa, FranceArchives, Shipman Inquiry, USHMM, Washington Post, South Carolina Encyclopedia, Baidu Baike, artículos académicos, etc. Muy pocas son registros civiles; los documentos oficiales o primarios que he visto se indican en la tabla. Ningún caso se ha dado por bueno con una sola fuente. La lectura de Murderpedia fue mecánica (campo «Date of birth»); las discrepancias las seguí a mano.

Días del calendario: ahora mismo todos los días del año tienen ya algún caso salvo el 15 de enero, así que cualquier traslado desplaza a alguien. Los casos que ocupan cada día se han buscado en `web/base/calendario_v3.html`, `web/datos/fichas/*.json` y `web/datos/candidatos/seleccion.json`.

## Casos que fallan o no se pueden confirmar

### 1. gaskins (ficha: 13-3-1933): FUENTES ENFRENTADAS

- **31 de marzo de 1933:** South Carolina Encyclopedia (Univ. of South Carolina, entrada de Hugh Munn: «Born on March 31, 1933, near ... Prospect»), Wikipedia en inglés y los guionistas.
- **13 de marzo de 1933:** Crime Museum / Alcatraz East, Find a Grave, scnow.com, biographs.org, IMDb. Serial Killer Calendar da el 21-3.
- Ninguna es registro civil ni de prisiones. No pude abrir el expediente del Departamento de Prisiones de Carolina del Sur ni el certificado. Los sitios populares dicen sobre todo 13; la fuente institucional (enciclopedia académica) y Wikipedia dicen 31. Posible origen del 13: inversión de cifras.
- **Propuesta:** dejarlo como dudoso. Si el coordinador acepta la enciclopedia, la fecha sería 31-3-1933 y chocaría con **toppan** (31 de marzo, confirmada). No he encontrado una fecha clave suya el 13 de marzo (ejecución 6-9-1991; sentencia a muerte, mayo de 1976; condena por el asesinato de Tyner, 1982). El 13 de marzo solo tiene a gaskins.

### 2. king (ficha: 14-3-1965): NINGUNA FUENTE LO RESPALDA

- Wikipedia en inglés (artículo sobre el asesinato de Rocío Wanninkhof): nacido Anthony Bromwich el **2 de agosto de 1967**. Wikidata: solo el año **1965**. Prensa del juicio de 2005: «cumplía 40 años en agosto» (agosto de 1965). Telecinco: condenado en 1986 «con 19 años» (1966 o 1967). Un blog dice «desconocida». Ninguna fuente da el 14 de marzo.
- Lo único consistente: nació en agosto (día 2 según Wikipedia), año 1965 o 1967. No hay segunda fuente para el día 2.
- **Propuesta:** si se acepta el 2 de agosto, pasaría al **2 de agosto**, donde ya está «La mano del muerto» (asesinato de Wild Bill Hickok). Alternativas con fecha clave documentada: 14-8-2003, desaparición de Sonia Carabantes (ocupado por Mary Blandy); 19-8-2003, hallazgo del cadáver (ocupado por la masacre de Hungerford); 9-10-1999, crimen de Rocío Wanninkhof (**ya ocupado por «El caso Wanninkhof»**). No hay ninguna fecha clave el 14 de marzo. Opción razonable: retirar la estrella de King y dejar el caso Wanninkhof del 9 de octubre, o moverlo al 2 de agosto.

### 3. yang (ficha: 29-7-1968): FALLA, la correcta es 17-7-1968

- 17 de julio de 1968: Wikipedia (en, es, de), Wikidata, DBpedia, NamuWiki, **Baidu Baike** y **Tencent News** (prensa china).
- 29 de julio: PeoplePill, Killer.Cloud y subculture.at (sitios secundarios que parecen copiarse entre sí).
- **Propuesta:** pasaría al **17 de julio**, donde ya está «El crimen de La Bombilla» (asesinato de Obregón). Otras fechas clave documentadas: detención el 3-11-2003 en Cangzhou (ocupado por la masacre de Barrios Altos) y ejecución el 14-2-2004 (ocupado por la matanza de San Valentín). No hay ninguna fecha clave documentada el 29 de julio.

### 4. gillesrais (ficha: 10-9-1405): FECHA DESCONOCIDA

- Ni el día ni el año están documentados. Britannica 1911: «septiembre u octubre de 1404». Otros autores: finales de 1404 o principios de 1405, o el 1-9-1405 (nota de Geneanet, sin fuente). Wikipedia en español: «fecha desconocida». El 10-9 aparece en un espejo de Wikipedia como 10-9-1404, sin respaldo en estudios.
- **Propuesta:** no sirve como cumpleaños. Fechas clave con varias fuentes (cronología de famous-trials.com y Serial Killer Calendar): citación 13-9-1440, **detención 15-9-1440** (ocupa: «El cura de Brancaccio», Puglisi), confesión 21-10-1440, sentencia 25-10-1440 (ocupa: Haarmann) y **ejecución 26-10-1440** (ocupa: «El magnicidio de Harbin», Itō Hirobumi). El 10 de septiembre solo tiene a gillesrais; se puede mover a una de esas fechas o conservar el 10-9 con otro tipo de efeméride (no he hallado hecho documentado ese día).

### 5. pedrinho (ficha: 17-6-1954): FUENTES ENFRENTADAS

- **29 de octubre de 1954:** Wikipedia (en y es), Gazeta de São Paulo, O Diário de Mogi.
- **17 de junio de 1954:** Wikidata y Estado de Minas (2023). Es el que usa la ficha.
- Él mismo se contradecía en entrevistas. No he visto registro civil.
- **Propuesta:** no cambiar sin más. Si se pasa a 29-10, compartiría día con «La ejecución de sir Walter Raleigh». El 17 de junio solo tiene a pedrinho. No he buscado otra fecha clave el 17-6.

### 6. iqbal (ficha: 8-10-1956): AÑO Y DÍA SIN CONFIRMAR

- Año: 1956 (Murderpedia; un perfil con «8 de octubre de 1956») frente a 1961 (Wikipedia en inglés; Britannica con interrogante). Día: solo un perfil menor da el 8 de octubre. Ese día coincide con la fecha de su muerte en prisión (8 o 9 de octubre de 2001, también discutida), lo que sugiere confusión.
- **Propuesta:** tratarlo como desconocido. Hoy comparte el 8-10 con **lopez**. Fechas clave a comprobar (no verificadas con dos fuentes por mí): entrega a la policía 30-12-1999 (ocupa: Högel), sentencia 16-3-2000 (ocupa: Colin Ireland), muerte 8 o 9-10-2001 (8-10: lopez; 9-10: caso Wanninkhof).

### 7. cotton (ficha: 31-10-1832): NO DOCUMENTADA

- No existe partida de nacimiento. Wikipedia y muchas fuentes dan el 31 de octubre; Britannica lo pone con interrogante; Murderpedia dice 1 de octubre; se cita un bautizo el 11 de noviembre de 1832 (no lo vi confirmado en las páginas que abrí). El 31-10 es la fecha tradicional.
- Coincide con **godino** (31-10, confirmado), así que el 31 de octubre tiene ahora dos estrellas.
- **Propuesta:** mantenerla en 31-10 como «fecha tradicional», o usar la ejecución del **24-3-1873** (Durham; Murderpedia y Serial Killer Calendar), día ocupado por «El incidente de Sakuradamon».

## Con nota (confirmadas, pero conviene saberlo)

- **robledo (19-1-1952):** Infobae y la mayoría de prensa argentina dan el 19; Murderpedia y allfamous el 22. Se mantiene.
- **beck (6-5-1920):** el año se discute (1919 en Murderpedia y Crime Library). El día no.
- **lopez (8-10-1948):** Wikipedia en inglés dice 5-10; El Tiempo, IMDb y Murderpedia dicen 8-10. Se mantiene el 8.
- **bathory (7-8-1560), ray, muehlberg, hogel, letby:** fuente B débil o secundaria, sin documento oficial; todas las fuentes coinciden entre sí.
- **barraza, escalero, kearney, pickton, toppan, norris, camargo:** hay erratas aisladas en alguna fuente (años o días), pero la mayoría y las mejores fuentes coinciden con la ficha.
- **pardo** (Manuel Pardo, asesino): no buscarlo en es.wikipedia, donde «Manuel Pardo» es el presidente peruano.

## Tabla de los 100 casos

| id | Nombre | Ficha | Estado | Fuente A | Fuente B | Notas |
|---|---|---|---|---|---|---|
| brady | Ian Brady | 2 enero 1938 | OK | en.wikipedia (Moors murders) | Murderpedia; Serial Killer Calendar (cita obituario de The Guardian) |  |
| letby | Lucy Letby | 4 enero 1990 | OK (con nota) | en.wikipedia | Filmalist; Grazia Daily (fuentes secundarias; sin registro oficial a la vista) | Fecha muy repetida por la prensa; sin registro civil a la vista. |
| keyes | Israel Keyes | 7 enero 1978 | OK | en.wikipedia | Murderpedia; Biography.com |  |
| bonin | William Bonin | 8 enero 1947 | OK | en.wikipedia | Murderpedia; clarkprosecutor.org (registro de condenados a muerte) |  |
| puente | Dorothea Puente | 9 enero 1929 | OK | en.wikipedia | Murderpedia; Pressbooks (UNC); Alchetron | IMDb da 29-1-1929 (error evidente). |
| dominique | Ronald Dominique | 9 enero 1964 | OK | en.wikipedia | Murderpedia; Famous Birthdays |  |
| shipman | Harold Shipman | 14 enero 1946 | OK | en.wikipedia | Britannica; The Shipman Inquiry (cronología oficial) |  |
| petiot | Marcel Petiot | 17 enero 1897 | OK | en.wikipedia | USHMM (Museo del Holocausto); Astro-Databank (cita actas); Geneanet |  |
| robledo | Carlos Eduardo Robledo Puch | 19 enero 1952 | OK (con nota) | es.wikipedia (19-1-1952, cita Infobae) | Infobae y la mayoría de la prensa argentina: 19-1. Murderpedia y allfamous: 22-1-1952 | Discrepancia de tres días en fuentes menores; se mantiene el 19 (mayoría y prensa de referencia). Sin partida de nacimiento. |
| rifkin | Joel Rifkin | 20 enero 1959 | OK | en.wikipedia | Murderpedia |  |
| bodkin | John Bodkin Adams | 21 enero 1899 | OK | en.wikipedia | Murderpedia |  |
| camargo | Daniel Camargo Barbosa | 22 enero 1930 | OK | en.wikipedia | Murderpedia; Killer.Cloud; prensa colombiana | Un blog da 1931 (minoritario). |
| arropiero | Manuel Delgado Villegas | 25 enero 1943 | OK | en.wikipedia | Murderpedia; Find a Grave |  |
| garavito | Luis Alfredo Garavito | 25 enero 1957 | OK | en.wikipedia | Murderpedia |  |
| ishikawa | Miyuki Ishikawa | 5 febrero 1897 | OK | en.wikipedia (cita la gaceta de la policía de Tokio de 1948) | Wikimedia Commons / Wikidata. Murderpedia solo da el año 1897 | La gaceta policial de 1948 es documento oficial. |
| norris | Roy Norris | 5 febrero 1948 | OK | en.wikipedia (Roy Norris, 5-2-1948) | All That's Interesting; MyCrimeLibrary; Medium | La página compartida con Bittaker en Wikipedia tiene dos fechas; la de Norris es la correcta aquí. |
| hansen | Robert Hansen | 15 febrero 1939 | OK | en.wikipedia | Murderpedia |  |
| ridgway | Gary Ridgway | 18 febrero 1949 | OK | en.wikipedia | Murderpedia |  |
| cullen | Charles Cullen | 22 febrero 1960 | OK | en.wikipedia | Murderpedia |  |
| muehlberg | Gary Muehlberg | 27 febrero 1949 | OK (con nota) | en.wikipedia | theywillkillyou.com; bloodylike.ly (fuentes menores) | Pocas fuentes; coinciden en 27-2-1949. Un artículo da 1940 (errata). |
| wuornos | Aileen Wuornos | 29 febrero 1956 | OK | en.wikipedia | Murderpedia |  |
| ramirez | Richard Ramirez | 29 febrero 1960 | OK | en.wikipedia | Murderpedia |  |
| toole | Ottis Toole | 5 marzo 1947 | OK | en.wikipedia | Murderpedia |  |
| rader | Dennis Rader | 9 marzo 1945 | OK | en.wikipedia | Murderpedia; Britannica |  |
| gaskins | Donald Henry Gaskins | 13 marzo 1933 | NO CONFIRMADA | en.wikipedia: 31-3-1933 | South Carolina Encyclopedia (Univ. of South Carolina, autor Hugh Munn): 31-3-1933. Crime Museum, Find a Grave, scnow.com, biographs.org: 13-3-1933 | Fuentes enfrentadas, ninguna primaria. Ver sección de fallos. |
| king | Tony King | 14 marzo 1965 | NO CONFIRMADA | en.wikipedia: 2-8-1967 (nacido Anthony Bromwich) | Wikidata: solo 1965; prensa de 2005: «cumplía 40 años en agosto»; un blog dice «desconocida» | Ninguna fuente da 14-3-1965. Ver sección de fallos. |
| ireland | Colin Ireland | 16 marzo 1954 | OK | en.wikipedia | Murderpedia |  |
| gacy | John Wayne Gacy | 17 marzo 1942 | OK | en.wikipedia | Crime and Investigation; Behind the Name; Wikidata (cita Britannica) |  |
| kraft | Randy Kraft | 19 marzo 1945 | OK | en.wikipedia | Murderpedia |  |
| toppan | Jane Toppan | 31 marzo 1854 | OK | en.wikipedia | Find a Grave; PSU; Boston Ghosts | Murderpedia solo da 1857 y WikiTree 17-8-1854 (mezclada con la muerte): erratas. Boston Ghosts avisa de registros contradictorios. |
| sobhraj | Charles Sobhraj | 6 abril 1944 | OK | en.wikipedia | Murderpedia |  |
| jesperson | Keith Jesperson | 6 abril 1955 | OK | en.wikipedia | Murderpedia |  |
| christie | John Reginald Christie | 8 abril 1899 | OK | en.wikipedia | Murderpedia |  |
| pichushkin | Alexander Pichushkin | 9 abril 1974 | OK | en.wikipedia | Murderpedia |  |
| landru | Henri Désiré Landru | 12 abril 1869 | OK | en.wikipedia | FranceArchives (registro de autoridad); Criminocorpus y dossier Mandl (citan el acta) | No he visto la partida del distrito XIX. |
| harvey | Donald Harvey | 15 abril 1952 | OK | en.wikipedia | Murderpedia |  |
| yoo | Yoo Young-chul | 18 abril 1970 | OK | en.wikipedia | Artículo forense (KoreaScience, Univ. Kyungpook): 18-4-1970 | El día solo aparece en el artículo forense; el año lo da toda la prensa. |
| black | Robert Black | 21 abril 1947 | OK | en.wikipedia | Murderpedia |  |
| homolka | Karla Homolka | 4 mayo 1970 | OK | en.wikipedia | Murderpedia |  |
| beck | Martha Beck | 6 mayo 1920 | OK (con nota) | en.wikipedia (6-5-1920) | Alchetron: 1920; Murderpedia y Crime Library: 1919 | Día y mes coinciden; solo el año es discutido. No afecta al día del calendario. |
| bryant | Martin Bryant | 7 mayo 1967 | OK | en.wikipedia | Murderpedia |  |
| holmes | H. H. Holmes | 16 mayo 1861 | OK | en.wikipedia | Murderpedia |  |
| bellfield | Levi Bellfield | 17 mayo 1968 | OK | en.wikipedia | Murderpedia |  |
| fish | Albert Fish | 19 mayo 1870 | OK | en.wikipedia | Murderpedia |  |
| murano | Yiya Murano | 20 mayo 1930 | OK | en.wikipedia | Murderpedia |  |
| dahmer | Jeffrey Dahmer | 21 mayo 1960 | OK | en.wikipedia | Murderpedia |  |
| bianchi | Kenneth Bianchi | 22 mayo 1951 | OK | en.wikipedia | Murderpedia |  |
| chase | Richard Chase | 23 mayo 1950 | OK | en.wikipedia | Murderpedia |  |
| escalero | Francisco García Escalero | 24 mayo 1954 | OK | es.wikipedia | Prensa (El Independiente y otros): 24-5-1954 | Murderpedia da 1948 (errata; murió con 60 años en 2014, lo que confirma 1954). |
| kurten | Peter Kürten | 26 mayo 1883 | OK | en.wikipedia | Murderpedia |  |
| berkowitz | David Berkowitz | 1 junio 1953 | OK | en.wikipedia | Britannica; Encyclopedia.com; Murderpedia |  |
| sutcliffe | Peter Sutcliffe | 2 junio 1946 | OK | en.wikipedia | Murderpedia |  |
| shawcross | Arthur Shawcross | 6 junio 1945 | OK | en.wikipedia | Murderpedia |  |
| little | Samuel Little | 7 junio 1940 | OK | en.wikipedia | Washington Post (Georgia no entregó el certificado); Wikidata |  |
| pedrinho | Pedro Rodrigues Filho | 17 junio 1954 | NO CONFIRMADA | en/es.wikipedia: 29-10-1954 | Gazeta de S. Paulo y O Diário de Mogi: 29-10. Wikidata y Estado de Minas: 17-6-1954 | La ficha usa 17-6 (la minoritaria entre las fuentes). Ver sección de fallos. |
| jones | Genene Jones | 13 julio 1950 | OK | en.wikipedia | Murderpedia |  |
| hindley | Myra Hindley | 23 julio 1942 | OK | en.wikipedia (Crumpsall, 23-7-1942) | Murderpedia; Oxford DNB citado por Wikipedia |  |
| magnotta | Luka Magnotta | 24 julio 1982 | OK | en.wikipedia (Murder of Jun Lin) | Murderpedia |  |
| onoprienko | Anatoly Onoprienko | 25 julio 1959 | OK | en.wikipedia | Murderpedia |  |
| yang | Yang Xinhai | 29 julio 1968 | FALLA | en/es/de.wikipedia y Wikidata: 17-7-1968 | Baidu Baike y Tencent News: 17-7-1968 (PeoplePill, Killer.Cloud y subculture.at dan 29-7) | El 29 de julio solo aparece en sitios secundarios. Ver sección de fallos. |
| bathory | Isabel Báthory | 7 agosto 1560 | OK (con nota) | en.wikipedia | Britannica; Find a Grave; IMDb | No hay documento primario; algunos textos hablan de 1560 o 1561. Fecha tradicional. |
| miyazaki | Tsutomu Miyazaki | 21 agosto 1962 | OK | en.wikipedia | Murderpedia |  |
| lucas | Henry Lee Lucas | 23 agosto 1936 | OK | en.wikipedia | Biography.com; Find a Grave; Geni |  |
| alcala | Rodney Alcala | 23 agosto 1943 | OK | en.wikipedia | Murderpedia |  |
| gein | Ed Gein | 27 agosto 1906 | OK | en.wikipedia | Britannica (vídeo); Biography.com; Geni |  |
| bernardo | Paul Bernardo | 27 agosto 1964 | OK | en.wikipedia | Murderpedia |  |
| franklin | Lonnie David Franklin Jr. | 30 agosto 1952 | OK | en.wikipedia | Murderpedia |  |
| desalvo | Albert DeSalvo | 3 septiembre 1931 | OK | en.wikipedia | Murderpedia |  |
| gillesrais | Gilles de Rais | 10 septiembre 1405 | FALLA | es.wikipedia: «fecha desconocida» | Britannica 1911: sept.-oct. 1404; Geneanet y otros: 1-9-1405; ningún 10-9 documentado | Fecha de nacimiento desconocida. Ver sección de fallos. |
| kearney | Patrick Kearney | 24 septiembre 1939 | OK | en.wikipedia | Serial Killer Calendar; PeoplePill; Crimes Solvers Central | Murderpedia da solo 1940; el resto, 1939. |
| pardo | Manuel Pardo | 24 septiembre 1956 | OK | en.wikipedia (Manuel Pardo, asesino cubano-estadounidense) | Murderpedia | Ojo: el título «Manuel Pardo» de es.wikipedia es el presidente peruano; no usar esa página. |
| bittaker | Lawrence Bittaker | 27 septiembre 1940 | OK | en.wikipedia | Murderpedia |  |
| fwest | Fred West | 29 septiembre 1941 | OK | en.wikipedia | Biography.com; IMDb |  |
| buono | Angelo Buono Jr. | 5 octubre 1934 | OK | en.wikipedia | Murderpedia |  |
| lopez | Pedro Alonso López | 8 octubre 1948 | OK (con nota) | en.wikipedia: 5-10-1948 (infobox) | El Tiempo (Colombia, 2018 y 2021), IMDb, Murderpedia: 8-10-1948. Semana: mayo de 1949 | Wikipedia en inglés discrepa; el resto da el 8. Sin documento oficial. |
| iqbal | Javed Iqbal | 8 octubre 1956 | NO CONFIRMADA | en.wikipedia: 1961, sin día | Murderpedia: solo 1956; Britannica: «1961?»; un perfil da 8-10-1956 | Año 1956 o 1961 y día sin confirmar; el 8-10 coincide con la fecha de su muerte (8 o 9-10-2001). Ver sección de fallos. |
| chikatilo | Andrei Chikatilo | 16 octubre 1936 | OK | en.wikipedia | Britannica; Biography.com; Murderpedia |  |
| swango | Michael Swango | 21 octubre 1954 | OK | en.wikipedia | Murderpedia |  |
| pickton | Robert Pickton | 24 octubre 1949 | OK | en.wikipedia | IMDb; Wikidata; EBSCO Research Starters | Murderpedia da 26-10 (errata aislada). |
| haarmann | Fritz Haarmann | 25 octubre 1879 | OK | en.wikipedia | Murderpedia |  |
| cotton | Mary Ann Cotton | 31 octubre 1832 | NO CONFIRMADA | en.wikipedia: 31-10-1832 | Britannica: «Oct. 31?» (con interrogante, sin acta); Murderpedia: 1-10; bautizo el 11-11-1832 según varios | Sin certificado de nacimiento. Ver sección de fallos. |
| godino | Cayetano Santos Godino | 31 octubre 1896 | OK | en.wikipedia | Infobae; MDZ |  |
| doss | Nannie Doss | 4 noviembre 1905 | OK | en.wikipedia | Murderpedia |  |
| lee | Derrick Todd Lee | 5 noviembre 1968 | OK | en.wikipedia | Find a Grave; WAFB / The Advocate (47 años al morir en 2016) |  |
| ray | David Parker Ray | 6 noviembre 1939 | OK (con nota) | en.wikipedia | IMDb y fichas biográficas menores | Pocas fuentes buenas; todas coinciden en 6-11-1939. |
| watts | Coral Eugene Watts | 7 noviembre 1953 | OK | en.wikipedia | Serial Killer Calendar; PDF de la Univ. de Radford; Factual America |  |
| deangelo | Joseph James DeAngelo | 8 noviembre 1945 | OK | en.wikipedia | Biography.com; IMDb |  |
| manson | Charles Manson | 12 noviembre 1934 | OK | en.wikipedia | Murderpedia |  |
| gilbert | Kristen Gilbert | 13 noviembre 1967 | OK | en.wikipedia | Murderpedia |  |
| romasanta | Manuel Blanco Romasanta | 18 noviembre 1809 | OK | es/en.wikipedia | Blog de J. M. Serrano (cita el Libro de Bautizados de Santa Eulalia de Esgos, p. 30); Maestro Virtuale |  |
| nilsen | Dennis Nilsen | 23 noviembre 1945 | OK | en.wikipedia | Murderpedia |  |
| starkweather | Charles Starkweather | 24 noviembre 1938 | OK | en.wikipedia | Murderpedia |  |
| bundy | Ted Bundy | 24 noviembre 1946 | OK | en.wikipedia | Britannica; Find a Grave; Biography.com |  |
| rwest | Rosemary West | 29 noviembre 1953 | OK | en.wikipedia | Murderpedia |  |
| rodriguezvega | José Antonio Rodríguez Vega | 3 diciembre 1957 | OK | en.wikipedia | Murderpedia |  |
| barraza | Juana Barraza | 27 diciembre 1957 | OK | en.wikipedia | Infobae; dictamen criminológico | Murderpedia y EcuRed dan 1958 (minoritario). |
| fernandez | Raymond Fernandez | 17 diciembre 1914 | OK | en.wikipedia | Murderpedia |  |
| kemper | Edmund Kemper | 18 diciembre 1948 | OK | en.wikipedia | Murderpedia |  |
| corll | Dean Corll | 24 diciembre 1939 | OK | en.wikipedia | Murderpedia |  |
| hogel | Niels Högel | 30 diciembre 1976 | OK (con nota) | en.wikipedia | Wikidata; fernsehserien.de; prensa regional alemana | Fuente B débil, sin documento oficial. |
