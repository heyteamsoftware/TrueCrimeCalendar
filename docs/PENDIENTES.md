# Pendientes

## Sonido de los podcasts: estilo «casete gastado» (elegido el 9 de noviembre de 2026, sin aplicar)

De las seis pruebas con Brady, el usuario eligió la **1, «casete gastado»**: la muestra está en `muestras-cinta/brady_1-casete-gastado.mp3` (fuera de git) y la receta es la función `v1_casete_gastado` de `tools/variantes_cinta.py`.

Respecto al sonido actual (`CINTA` y `cortes()` en `tools/generar_audios.py`):

- Banda más estrecha: paso alto a 220 Hz (×2) y paso bajo a 5 kHz (×2) + 5,5 kHz; medios +5 dB en 1,5 kHz.
- Más saturación: +7 dB de ganancia contra un recorte suave (tanh) a 0,45.
- Wow más marcado: retardos de 1,4 ms a 0,5 Hz y 2,2 ms a 0,19 Hz, flutter de 0,04 ms a 7 Hz.
- Siseo más alto (0,0025 RMS, 900 Hz–7 kHz).
- Cortes más frecuentes y profundos: cada 4–12 s, de 50–250 ms, bajando la voz al 15–50 %.
- Chasquidos sueltos (0,3 por segundo).

**No aplicar todavía**: el usuario quiere hacer otra cosa antes. Cuando dé el visto bueno, hay que pasar esta receta a `generar_audios.py` (con la semilla de cada caso, como ahora) y regenerar los 100 audios con `--forzar`. No hace falta volver a locutar nada.
