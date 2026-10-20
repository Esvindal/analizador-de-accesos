# analizador-de-accesos

**Análisis de eventos de acceso 100% en el navegador.** Subí un CSV con
`fecha,punto,identificador,resultado,tipo` y obtené horas pico por hora y día,
rechazos repetidos, anomalías (accesos de madrugada, ráfagas de rechazos) y un
informe descargable. **Sin backend**: los datos se procesan en tu navegador y
no salen del equipo.

> English summary: a fully client-side access-log analyzer. Upload a CSV of
> access events and get peak-hour/peak-day histograms, repeated rejections,
> anomalies (night-time entries, rejection bursts) and a downloadable report.
> No backend: data never leaves the machine. MIT licensed.

## Uso

Abrí `index.html` en el navegador (o servilo con GitHub Pages). Columnas
esperadas del CSV:

```csv
fecha,punto,identificador,resultado,tipo
2026-10-20 08:15:32,porton-vehicular,cred-0042,permitido,tarjeta
2026-10-20 03:02:11,deposito,cred-0010,rechazado,huella
```

- `fecha`: `AAAA-MM-DD HH:MM:SS`
- `resultado`: `permitido` o `rechazado`

¿No tenés un CSV a mano? El botón **"Cargar datos de ejemplo"** genera 500
eventos sintéticos (marcados en la interfaz como datos generados) y
`scripts/generar_csv_ejemplo.py` produce el mismo CSV desde consola.

## Qué detecta

- **Horas pico:** histograma por hora del día y por día de la semana.
- **Rechazo por punto:** % de eventos rechazados en cada punto de acceso.
- **Rechazos repetidos:** identificadores con 3+ rechazos acumulados.
- **Anomalías:** accesos (permitidos o intentos) entre 00:00 y 05:59, y
  ráfagas de 3+ rechazos del mismo identificador en menos de 10 minutos.
- **Informe:** descarga un `.md` con el resumen completo.

## Qué es real y qué es simulado

| Componente | Estado |
|---|---|
| Parser CSV, métricas, anomalías, informe | **Real** — probado con Playwright en navegador real |
| Datos de ejemplo (botón y script) | **Generados** — sintéticos, marcados en la UI |
| CSV propios del usuario | **Los provee el usuario** — no se incluyen datos reales de nadie |

## Limitaciones honestas

- Los umbrales (3 rechazos, 10 minutos, 00–05 h) son razonables pero fijos;
  para producción deberían ser configurables.
- Archivos muy grandes (> ~50 MB) pueden tardar en parsear en el navegador.
- Los identificadores del CSV pueden ser datos personales: la herramienta
  corre local justamente para no enviarlos a ningún servidor. Al compartir el
  informe generado, revisá que no exponga identidades.

## Desarrollo y tests

```bash
python -m venv .venv && .venv\Scripts\activate
pip install pytest playwright
pytest tests/          # E2E con Chrome: carga, ejemplo, CSV válido y mal formado
python scripts/generar_csv_ejemplo.py
```

Licencia MIT.
