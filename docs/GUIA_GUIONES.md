# Guía de los guiones de TRUE CRIME CALENDAR

Cada caso del archivo tiene un episodio de podcast de unos **5 minutos** que se escucha en la app y también se puede leer. Lo locutan dos voces sintéticas de Microsoft: **Ximena** (narradora, voz principal) y **Álvaro** (copresentador). El formato del archivo está en `docs/CONTRATO.md`, sección 2.

## Tono

- Podcast narrativo en castellano de España, al estilo de un buen documental sonoro: intriga, ritmo y escenas concretas, pero **riguroso y respetuoso**.
- Frases cortas, una idea por frase. Usa preguntas, puntos suspensivos y giros para mantener la tensión entre partes («Pero aquella noche algo salió mal…»).
- El protagonista del relato es la investigación: cómo se descubrió, qué falló, qué se aprendió. Las víctimas se tratan con respeto. No se glorifica al criminal ni se le admira.
- Sin morbo: ni detalles gráficos de la violencia, ni descripciones de métodos que puedan servir de instrucción. «La mató» basta; no hace falta describir cómo con detalle.

## Estructura (orientativa)

1. **Gancho** (2-4 frases): una escena concreta y documentada que atrape (un hallazgo, una llamada, un error).
2. **Presentación**, con esta fórmula u otra muy parecida: «Esto es TRUE CRIME CALENDAR. Hoy abrimos el expediente de [nombre], [alias].»
3. **Quién era**: origen, época y lugar (solo lo relevante y documentado).
4. **Los crímenes**: cronología y patrón, sin detalles gráficos.
5. **La investigación**: pistas, errores y el momento de la detención.
6. **Juicio y situación actual**: tiene que coincidir con la ficha.
7. **Legado**: las víctimas, cambios en leyes o técnicas forenses, por qué se recuerda el caso.
8. **Vínculos**: si la ficha tiene vínculos con otros expedientes del archivo, menciónalos.
9. **Cierre**, con esta fórmula u otra muy parecida: «Hasta aquí el expediente de [nombre]. Esto ha sido TRUE CRIME CALENDAR.»

## Álvaro, el copresentador

- Entre **4 y 7 intervenciones** breves (como mucho 25 palabras cada una): preguntas que se haría el oyente, un dato clave, una transición («Y entonces apareció la prueba que nadie esperaba»).
- Nunca interpreta al criminal, a las víctimas ni a testigos. No pone voz a citas.

## Rigor (lo más importante)

- Usa los datos de la ficha y lo que sea **conocimiento público bien establecido**. No inventes hechos, nombres, fechas, cifras, diálogos ni pensamientos.
- Si no estás seguro de un detalle, no lo pongas o dilo con prudencia («según la acusación», «se le atribuyen», «la cifra exacta nunca se conoció»).
- Las cifras de víctimas y la situación judicial deben coincidir con la ficha. Si crees que la ficha está mal o desactualizada, no la contradigas en el guion: explícalo en `nota_revision`.
- Casos con condena discutida, absolución o sin juicio: dilo claramente. Con personas vivas, cíñete a lo probado y a la condena.
- No pongas citas textuales atribuidas a personas reales salvo que sean muy conocidas y estés seguro de ellas. Si dudas, parafrasea.
- Nombra a las víctimas solo cuando el dato sea seguro y público.

## Pensado para el oído

- Longitud: **720-800 palabras** en total y **20-30 bloques**. Los bloques de Ximena tienen como mucho 70 palabras (1 a 4 frases).
- Escribe con todas las letras: «Estados Unidos» (no «EE. UU.»), «kilómetros», «el siglo diecinueve». Los años en cifra funcionan bien (1965).
- **Pronunciación**: Ximena lee todo como castellano. Para nombres extranjeros, lugares y siglas, añade al mapa `pronunciacion` una escritura fonética española. Solo se usa en el audio; en pantalla queda el original. Ejemplos:
  - «Ian Brady» → «Ían Bréidi» · «Myra Hindley» → «Máira Jíndli» · «Saddleworth» → «Sádelguorz»
  - «Jeffrey Dahmer» → «Yéfri Dámer» · «Milwaukee» → «Miluóki» · «Ted Bundy» → «Ted Bándi»
  - «FBI» → «efe be i» · «DNA» → «ADN» · «Scotland Yard» → «Escótland Iard»
  - «TRUE CRIME CALENDAR» → «Tru Cráim Cálendar» (añádelo siempre)
  - Nombres alemanes, rusos, japoneses, etc.: escríbelos como suenan en español («Chikatilo» ya funciona; «Kürten» → «Kírten»).
- Las claves del mapa tienen que aparecer exactamente así en el texto. Pon también las variantes que uses («Brady» → «Bréidi» si a veces dices solo el apellido).

## Comprobación

Al terminar, ejecuta `node tools/validar_guiones.js <ids…>` desde la carpeta del proyecto. Todos tus guiones deben salir con ✓.
