// Análisis de eventos de acceso: horas pico, rechazos repetidos, anomalías.
window.ANA = window.ANA || {};
(function (ANA) {
  const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const HORA_NOCTURNA_INI = 0, HORA_NOCTURNA_FIN = 5; // 00:00–05:59
  const RAFAGA_MIN = 3, RAFAGA_VENTANA_MS = 10 * 60 * 1000;
  const RECHAZOS_UMBRAL = 3;

  function esNocturno(d) { return d.getHours() >= HORA_NOCTURNA_INI && d.getHours() <= HORA_NOCTURNA_FIN; }

  ANA.analizar = function (eventos) {
    const porHora = Array(24).fill(0);
    const porDia = Array(7).fill(0);
    const porPunto = {};
    const rechazosPorId = {};
    const anomalias = [];

    let permitidos = 0;
    for (const e of eventos) {
      porHora[e.fecha.getHours()]++;
      porDia[e.fecha.getDay()]++;
      const p = (porPunto[e.punto] = porPunto[e.punto] || { total: 0, rechazados: 0 });
      p.total++;
      if (e.resultado === "rechazado") {
        p.rechazados++;
        (rechazosPorId[e.identificador] = rechazosPorId[e.identificador] || []).push(e);
      } else permitidos++;
      if (esNocturno(e.fecha)) {
        anomalias.push({
          tipo: "horario_nocturno",
          detalle: e.resultado === "permitido"
            ? "Acceso permitido de madrugada en " + e.punto
            : "Intento rechazado de madrugada en " + e.punto,
          fecha: e.fecha,
          identificador: e.identificador,
        });
      }
    }

    // rechazos repetidos por identificador
    const repetidos = Object.entries(rechazosPorId)
      .filter(([, lista]) => lista.length >= RECHAZOS_UMBRAL)
      .map(([id, lista]) => ({ identificador: id, cantidad: lista.length, ultimo: lista[lista.length - 1].fecha }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // ráfagas: >=3 rechazos del mismo identificador en 10 min
    for (const [id, lista] of Object.entries(rechazosPorId)) {
      const orden = [...lista].sort((a, b) => a.fecha - b.fecha);
      for (let i = 0; i + RAFAGA_MIN - 1 < orden.length; i++) {
        if (orden[i + RAFAGA_MIN - 1].fecha - orden[i].fecha <= RAFAGA_VENTANA_MS) {
          anomalias.push({
            tipo: "rafaga_rechazos",
            detalle: RAFAGA_MIN + " rechazos seguidos de «" + id + "» en menos de 10 min en " + orden[i].punto,
            fecha: orden[i].fecha,
            identificador: id,
          });
          break;
        }
      }
    }

    anomalias.sort((a, b) => a.fecha - b.fecha);
    return {
      total: eventos.length,
      permitidos,
      rechazados: eventos.length - permitidos,
      porHora,
      porDia,
      porPunto: Object.entries(porPunto).map(([punto, p]) => ({
        punto, total: p.total, rechazados: p.rechazados,
        pct: Math.round((p.rechazados / p.total) * 100),
      })),
      repetidos,
      anomalias,
      dias: DIAS,
    };
  };
})(window.ANA);
