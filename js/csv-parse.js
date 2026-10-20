// Parser CSV tolerante: campos entrecomillados, CRLF, BOM.
// Devuelve { filas, errores } — nunca lanza: informa en español.
window.ANA = window.ANA || {};
(function (ANA) {
  const COLUMNAS = ["fecha", "punto", "identificador", "resultado", "tipo"];

  function partirLinea(linea) {
    const campos = [];
    let actual = "", enComillas = false;
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (enComillas) {
        if (c === '"') {
          if (linea[i + 1] === '"') { actual += '"'; i++; }
          else enComillas = false;
        } else actual += c;
      } else if (c === '"') enComillas = true;
      else if (c === ",") { campos.push(actual); actual = ""; }
      else actual += c;
    }
    campos.push(actual);
    return campos;
  }

  ANA.parsearCsv = function (texto) {
    const errores = [];
    const limpio = texto.replace(/^﻿/, "");
    const lineas = limpio.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lineas.length === 0) {
      return { filas: [], errores: ["El archivo está vacío. Subí un CSV con la fila de encabezado y al menos un evento."] };
    }
    const encabezado = partirLinea(lineas[0]).map((h) => h.trim().toLowerCase());
    const faltan = COLUMNAS.filter((c) => !encabezado.includes(c));
    if (faltan.length) {
      errores.push(
        "Faltan columnas en el encabezado: " + faltan.join(", ") +
        ". Se espera: " + COLUMNAS.join(",") + "."
      );
      return { filas: [], errores };
    }
    const idx = Object.fromEntries(COLUMNAS.map((c) => [c, encabezado.indexOf(c)]));
    const filas = [];
    for (let n = 1; n < lineas.length; n++) {
      const campos = partirLinea(lineas[n]);
      if (campos.length < COLUMNAS.length) {
        errores.push("Línea " + (n + 1) + ": tiene " + campos.length +
          " columnas y se esperaban " + COLUMNAS.length + ".");
        continue;
      }
      const fecha = new Date(campos[idx.fecha].trim().replace(" ", "T"));
      if (isNaN(fecha.getTime())) {
        errores.push("Línea " + (n + 1) + ": fecha no válida («" +
          campos[idx.fecha].trim() + "»). Formato esperado: AAAA-MM-DD HH:MM:SS.");
        continue;
      }
      const resultado = campos[idx.resultado].trim().toLowerCase();
      if (resultado !== "permitido" && resultado !== "rechazado") {
        errores.push("Línea " + (n + 1) + ": resultado «" + resultado +
          "» no reconocido (permitido|rechazado).");
        continue;
      }
      filas.push({
        fecha,
        punto: campos[idx.punto].trim(),
        identificador: campos[idx.identificador].trim(),
        resultado,
        tipo: campos[idx.tipo].trim(),
      });
    }
    return { filas, errores };
  };
})(window.ANA);
