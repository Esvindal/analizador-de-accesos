// Orquestación: archivo -> parseo -> análisis -> render -> informe.
// Todo ocurre en el navegador: ningún dato sale del equipo.
window.ANA = window.ANA || {};
(function (ANA) {
  const $ = (sel) => document.querySelector(sel);
  let ultimoAnalisis = null, ultimoOrigen = "";

  function fmtFecha(d) {
    return d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  }

  function barras(valores, etiquetas) {
    const max = Math.max(...valores, 1);
    const wrap = document.createElement("div");
    wrap.className = "barras";
    valores.forEach((v, i) => {
      const fila = document.createElement("div");
      fila.className = "barra-fila";
      fila.innerHTML =
        '<span class="barra-etq">' + etiquetas[i] + '</span>' +
        '<span class="barra-pista"><span class="barra-relleno" style="width:' +
        Math.round((v / max) * 100) + '%"></span></span>' +
        '<span class="barra-num">' + v + "</span>";
      wrap.appendChild(fila);
    });
    return wrap;
  }

  function tabla(headers, filas, maxFilas) {
    const frag = document.createDocumentFragment();
    const t = document.createElement("table");
    t.innerHTML = "<thead><tr>" + headers.map((h) => "<th>" + h + "</th>").join("") + "</tr></thead>";
    const cuerpo = document.createElement("tbody");
    const visibles = maxFilas ? filas.slice(0, maxFilas) : filas;
    for (const f of visibles) {
      const tr = document.createElement("tr");
      tr.innerHTML = f.map((c) => "<td>" + c + "</td>").join("");
      cuerpo.appendChild(tr);
    }
    t.appendChild(cuerpo);
    frag.appendChild(t);
    if (maxFilas && filas.length > maxFilas) {
      const nota = document.createElement("p");
      nota.className = "estado";
      nota.textContent = "Mostrando " + maxFilas + " de " + filas.length +
        "; el informe descargable incluye todo.";
      frag.appendChild(nota);
    }
    return frag;
  }

  function mostrarErrores(errores) {
    const caja = $("#errores");
    caja.textContent = "";
    if (!errores.length) { caja.hidden = true; return; }
    const lista = document.createElement("ul");
    for (const e of errores.slice(0, 10)) {
      const li = document.createElement("li");
      li.textContent = e;
      lista.appendChild(li);
    }
    if (errores.length > 10) {
      const li = document.createElement("li");
      li.textContent = "…y " + (errores.length - 10) + " problemas más.";
      lista.appendChild(li);
    }
    caja.appendChild(lista);
    caja.hidden = false;
  }

  function procesar(texto, origen) {
    const { filas, errores } = ANA.parsearCsv(texto);
    mostrarErrores(errores);
    const salida = $("#resultados");
    salida.hidden = true;
    if (!filas.length) return;
    ultimoAnalisis = ANA.analizar(filas);
    ultimoOrigen = origen;
    render(ultimoAnalisis);
    salida.hidden = false;
  }

  function render(a) {
    $("#origen-datos").textContent = ultimoOrigen;
    $("#m-total").textContent = a.total;
    $("#m-permitidos").textContent = a.permitidos;
    $("#m-rechazados").textContent = a.rechazados;
    const pct = a.total ? Math.round((a.rechazados / a.total) * 100) : 0;
    $("#m-pct").textContent = pct + "%";

    const horas = $("#graf-hora"); horas.textContent = "";
    horas.appendChild(barras(a.porHora, Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0") + "h")));
    const dias = $("#graf-dia"); dias.textContent = "";
    dias.appendChild(barras(a.porDia, a.dias));

    const puntos = $("#tabla-puntos"); puntos.textContent = "";
    puntos.appendChild(tabla(
      ["Punto de acceso", "Eventos", "Rechazados", "% rechazo"],
      a.porPunto.map((p) => [p.punto, p.total, p.rechazados, p.pct + "%"])
    ));

    const rep = $("#tabla-repetidos"); rep.textContent = "";
    if (a.repetidos.length) {
      rep.appendChild(tabla(
        ["Identificador", "Rechazos", "Último"],
        a.repetidos.map((r) => [r.identificador, r.cantidad, fmtFecha(r.ultimo)]),
        10
      ));
    } else {
      rep.innerHTML = '<p class="estado">Ningún identificador acumula ' +
        "3 o más rechazos.</p>";
    }

    const an = $("#tabla-anomalias"); an.textContent = "";
    if (a.anomalias.length) {
      an.appendChild(tabla(
        ["Fecha", "Anomalía", "Identificador"],
        a.anomalias.map((x) => [fmtFecha(x.fecha), x.detalle, x.identificador]),
        15
      ));
    } else {
      an.innerHTML = '<p class="estado">Sin anomalías detectadas.</p>';
    }
  }

  function descargarInforme() {
    if (!ultimoAnalisis) return;
    const a = ultimoAnalisis;
    const lineas = [
      "# Informe de eventos de acceso",
      "",
      "Fuente de datos: " + ultimoOrigen,
      "Generado: " + new Date().toLocaleString("es-AR"),
      "",
      "## Resumen",
      "- Total de eventos: " + a.total,
      "- Permitidos: " + a.permitidos + " · Rechazados: " + a.rechazados +
        " (" + (a.total ? Math.round((a.rechazados / a.total) * 100) : 0) + "%)",
      "",
      "## Por punto de acceso",
      ...a.porPunto.map((p) =>
        "- " + p.punto + ": " + p.total + " eventos, " + p.rechazados +
        " rechazados (" + p.pct + "%)"),
      "",
      "## Rechazos repetidos (3+)",
      ...(a.repetidos.length
        ? a.repetidos.map((r) => "- " + r.identificador + ": " + r.cantidad + " rechazos")
        : ["- Ninguno"]),
      "",
      "## Anomalías",
      ...(a.anomalias.length
        ? a.anomalias.map((x) =>
            "- " + fmtFecha(x.fecha) + " — " + x.detalle + " (" + x.identificador + ")")
        : ["- Ninguna detectada"]),
      "",
      "---",
      "Generado por analizador-de-accesos (herramienta local, sin backend).",
    ];
    const blob = new Blob([lineas.join("\n")], { type: "text/markdown;charset=utf-8" });
    const a2 = document.createElement("a");
    a2.href = URL.createObjectURL(blob);
    a2.download = "informe-accesos.md";
    a2.click();
    URL.revokeObjectURL(a2.href);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const input = $("#archivo");
    input.addEventListener("change", function () {
      const f = input.files[0];
      if (!f) return;
      const lector = new FileReader();
      lector.onload = () => procesar(String(lector.result), "Archivo: " + f.name);
      lector.readAsText(f, "utf-8");
    });

    $("#btn-ejemplo").addEventListener("click", function () {
      procesar(ANA.generarEjemplo(500), "Datos generados por el botón de ejemplo");
      $("#marca-ejemplo").hidden = false;
    });

    $("#btn-informe").addEventListener("click", descargarInforme);

    const drop = $("#drop");
    ["dragover", "dragenter"].forEach((ev) =>
      drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("sobre"); }));
    ["dragleave", "drop"].forEach((ev) =>
      drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("sobre"); }));
    drop.addEventListener("drop", function (e) {
      const f = e.dataTransfer.files[0];
      if (!f) return;
      const lector = new FileReader();
      lector.onload = () => procesar(String(lector.result), "Archivo: " + f.name);
      lector.readAsText(f, "utf-8");
    });
  });
})(window.ANA);
