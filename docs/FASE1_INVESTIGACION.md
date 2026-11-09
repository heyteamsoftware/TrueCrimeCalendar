# Fase 1: investigación de los 276 casos nuevos

Se arranca cuando el piloto esté aprobado. Objetivo: un caso sólido para cada día libre del calendario (hoy quedan 276; `node tools/validar_casos.js --dias-libres` los lista) con su ficha completa y sus fuentes. Los guiones se escriben después, en la fase 2.

## Reglas

Son las del apartado 2 de `docs/REDISENO_CASOS_Y_CINTAS.md` y de `docs/GUIA_CINTAS.md`. En resumen:

- **Fuentes:** cada dato clave con al menos dos fuentes fiables.
- **Personas:** presunción de inocencia y respeto a las víctimas.
- **Antigüedad y procesos:** nada de los últimos 10 años ni con procesos abiertos.
- **Duplicados:** ninguno con los casos estrella; cuando proceda, se enlazan como vínculos.
- **Fecha:** puede ser cualquier fecha clave: nacimiento, crimen, detención, condena, hallazgo, desaparición o golpe.

## Cuotas de los 276

| Criterio | Objetivo |
|---|---|
| España e Hispanoamérica | ≥ 30 % (≥ 83 casos) |
| Resto de Europa | ≥ 25 % (≥ 69) |
| Estados Unidos y Canadá | ≤ 30 % (≤ 83) |
| Asia, África y Oceanía | el resto, con al menos 15 |
| Asesinos en serie | ≤ 35 % |
| Sin resolver, desapariciones y misterios | ≥ 15 % |
| Grandes golpes, estafas y secuestros | ≥ 10 % |
| Errores judiciales y absoluciones célebres | presentes (≥ 8) |
| Antes de 1900 | ≥ 10 % |

## Procedimiento

1. **Candidatos (12 agentes, uno por mes).** Para cada día libre del mes, tres candidatos con:
   - la fecha comprobada en dos fuentes;
   - el tipo de efeméride;
   - país, tipo de caso y época;
   - una línea de por qué es interesante.

   Salida: `web/datos/candidatos/<mes>.json`.
2. **Selección (coordinador).** Se elige uno por día cumpliendo las cuotas en el conjunto del año (`tools/validar_casos.js` informa de países y tipos). El usuario puede revisar la lista antes de seguir.
3. **Fichas (12 agentes, uno por mes).** Ficha completa de cada caso elegido en `web/datos/casos_nuevos.json`, con los campos del apartado 8 del contrato:
   - coordenadas comprobadas en un mapa;
   - entre 4 y 10 fuentes con tipo;
   - vínculos con otros casos del archivo.
4. **Verificación cruzada (agentes distintos de los autores).** Cada ficha se comprueba contra sus fuentes. Los errores se corrigen y las dudas pasan a `nota_revision` y a `docs/REVISION_GUIONES.md`.
5. **Validación automática:** `node tools/validar_casos.js`, todo ✓ y 366/366 días cubiertos.

## Después: fase 2 (guiones) y fase 3 (audio)

- **Casos estrella (100):** 2 cintas de 5 minutos cada uno. Se parte del episodio actual y de la ficha, y se añaden fuentes en `web/datos/fuentes.json`.
- **Casos nuevos (276):** 1 cinta de 5 minutos cada uno.
- **Tandas:** van por meses (enero primero). Cada tanda tiene verificación cruzada, `node tools/validar_cintas.js` y `python tools/generar_cintas.py`.
- **Tamaño estimado de la app:** unos 187 MB de audio.

## Formato de los candidatos: `web/datos/candidatos/<mm>.json`

```json
{
  "mes": 1,
  "dias": [
    { "dia": 13, "candidatos": [
      {
        "titulo_caso": "El robo del siglo (Banco Río de Acassuso)",
        "protagonista": "Banda de Luis Mario Vitette Sellanes",
        "fecha": "2006-01-13",
        "tipo_efemeride": "golpe",
        "pais": "Argentina",
        "region": "hispanoamerica",
        "tipo_caso": "golpe",
        "epoca": "2000-2009",
        "resumen": "Dos o tres frases con lo esencial del caso.",
        "por_que": "Una línea: por qué merece un día del calendario y una cinta de 5 minutos.",
        "fuentes_fecha": ["https://…", "https://…"],
        "riesgos": "Cualquier problema: proceso abierto, víctimas menores, datos discutidos… (vacío si no hay)."
      }
    ] }
  ]
}
```

- **Valores admitidos:**
  - `tipo_efemeride`: `nacimiento`, `crimen`, `detencion`, `condena`, `hallazgo`, `desaparicion` o `golpe`.
  - `region`: `espana`, `hispanoamerica`, `europa`, `eeuu_canada`, `asia`, `africa`, `oceania` u `oriente_medio`.
  - `tipo_caso`: `asesino_en_serie`, `asesinato`, `sin_resolver`, `desaparicion`, `envenenamiento`, `golpe`, `estafa`, `secuestro`, `secta`, `error_judicial`, `magnicidio`, `historico` u `otro`.
- **La fecha:** formato AAAA-MM-DD, el día y el mes tienen que ser exactamente los del día libre, y hay que comprobarla en dos fuentes independientes (`fuentes_fecha`).
- **Casos ya existentes:** nada que ya esté en el archivo (`web/datos/candidatos/casos_existentes.json`).
- **Comprobación:** `node tools/validar_candidatos.js <mes>`.
