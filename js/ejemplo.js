// Generador de datos de ejemplo en el navegador (mismo criterio que
// scripts/generar_csv_ejemplo.py). Los datos son GENERADOS: se marca en la UI.
window.ANA = window.ANA || {};
(function (ANA) {
  const PUNTOS = ["porton-vehicular", "puerta-principal", "acceso-peatonal", "deposito"];
  const TIPOS = ["tarjeta", "facial", "qr", "huella"];
  const IDS = Array.from({ length: 40 }, (_, i) => "cred-" + String(i + 1).padStart(4, "0"));

  ANA.generarEjemplo = function (cantidad) {
    cantidad = cantidad || 500;
    // Semilla fija para que el ejemplo sea reproducible.
    let s = 42;
    const azar = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
    const pick = (arr) => arr[Math.floor(azar() * arr.length)];
    const lineas = ["fecha,punto,identificador,resultado,tipo"];
    const base = new Date(2026, 9, 12); // lunes 12/oct/2026

    for (let i = 0; i < cantidad; i++) {
      // Semana laboral: mas eventos 7-19 h, alguno nocturno y ráfagas.
      const dia = Math.floor(azar() * 7);
      let hora;
      const r = azar();
      if (r < 0.75) hora = 7 + Math.floor(azar() * 12);
      else if (r < 0.95) hora = 19 + Math.floor(azar() * 5);
      else hora = Math.floor(azar() * 6); // madrugada -> anomalía
      const fecha = new Date(base);
      fecha.setDate(base.getDate() + dia);
      fecha.setHours(hora, Math.floor(azar() * 60), Math.floor(azar() * 60), 0);

      // ~12% de identificadores acumulan rechazos; alguno en ráfaga.
      const id = azar() < 0.12 ? "cred-00" + (10 + Math.floor(azar() * 4)) : pick(IDS);
      const resultado = azar() < 0.16 ? "rechazado" : "permitido";
      const f = fecha.toISOString().slice(0, 19).replace("T", " ");
      lineas.push([f, pick(PUNTOS), id, resultado, pick(TIPOS)].join(","));
    }
    return lineas.join("\n") + "\n";
  };
})(window.ANA);
