# Fase 1, paso 4: verificación cruzada de las fichas

Cada agente verifica las fichas de **un mes** que escribió otro agente: `web/datos/fichas/<mm>.json`. El formato y las reglas con las que se escribieron están en `docs/FICHAS_ENCARGO.md`; léelo entero antes de empezar.

No eres el autor: tu trabajo es desconfiar. Lo que no puedas comprobar en una fuente no se da por bueno.

## Qué se comprueba en cada ficha

1. **Las fuentes existen y hablan del caso.** Abre al menos tres fuentes de cada ficha, y que dos de ellas no sean Wikipedia. Si una URL no abre o no trata del caso, cámbiala por otra fiable o quítala. Tienen que quedar entre 4 y 10 fuentes, con al menos 3 que no sean Wikipedia.
2. **La fecha.** El día, el mes y el año (`d`, `m`, `y`) coinciden con lo que dicen dos fuentes, y corresponden al `tipo_efemeride` (el día del crimen, de la detención, de la condena…). Si la fecha correcta es otro día, **no la cambies**: apúntalo en el informe como error grave, porque el caso tendría que cambiar de día.
3. **Los datos clave:** nombres bien escritos, número de víctimas, autor, condena y situación judicial actual (`st`), y el periodo (`per`).
4. **El resumen (`c`) y el modo de actuar (`mo`):** cada afirmación está en las fuentes. Nada inventado ni exagerado.
5. **Los lugares (`loc`):** las coordenadas caen en el sitio que dice el texto. Compruébalas con las coordenadas de Wikipedia del lugar o con un mapa. Un error de más de unos pocos kilómetros se corrige.
6. **Las personas:**
   - presunción de inocencia: «acusado», «condenado» o «absuelto», tal como fue;
   - víctimas menores sin nombrar, salvo en casos históricos de hace más de 30 años con el nombre público;
   - nada morboso.
7. **Hechos recientes o procesos abiertos.** Si los hechos son de los últimos 10 años o hay un proceso abierto, apúntalo en el informe como error grave.
8. **Los campos:** bandera y país correctos, grupos (`g`) bien puestos, vínculos (`vin`) reales, y un castellano de España sobrio y sin erratas.

## Qué hacer con lo que encuentres

- **Errores que puedes corregir con fuentes:** corrígelos en el archivo del mes.
- **Dudas que no se pueden resolver:** van al campo `nota_revision` de la ficha.
- **Errores graves** (fecha en otro día, caso que no se sostiene, proceso abierto): no rehagas el caso. Déjalo como está y apúntalo en el informe.

No toques ningún otro archivo, salvo tu informe.

## El informe

Escríbelo en `docs/revision_fichas/<mm>.md` con este contenido:

- cuántas fichas has revisado y cuántas has corregido;
- una línea por cada corrección: caso, qué decía, qué dice ahora y con qué fuente;
- los errores graves, si los hay;
- las dudas que quedan.

Al terminar, ejecuta `node tools/validar_casos.js web/datos/fichas/<mm>.json` y deja todas las fichas con ✓.

Las búsquedas web son limitadas y compartidas con otros agentes: usa WebFetch sobre las URL de las fuentes y deja WebSearch para cuando haga falta sustituir una fuente.
