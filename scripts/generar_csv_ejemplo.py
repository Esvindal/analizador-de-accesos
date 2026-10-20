#!/usr/bin/env python3
"""Genera un CSV de eventos de acceso de ejemplo (datos GENERADOS, no reales).

Uso: python scripts/generar_csv_ejemplo.py [--cantidad 500] [--salida datos/eventos-ejemplo.csv]
Columnas: fecha,punto,identificador,resultado,tipo
"""

import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path

PUNTOS = ["porton-vehicular", "puerta-principal", "acceso-peatonal", "deposito"]
TIPOS = ["tarjeta", "facial", "qr", "huella"]


def generar(cantidad: int, semilla: int) -> list[str]:
    azar = random.Random(semilla)
    ids = [f"cred-{i:04d}" for i in range(1, 41)]
    base = datetime(2026, 10, 12)  # lunes
    lineas = ["fecha,punto,identificador,resultado,tipo"]
    for _ in range(cantidad):
        dia = azar.randrange(7)
        r = azar.random()
        if r < 0.75:
            hora = azar.randrange(7, 19)
        elif r < 0.95:
            hora = azar.randrange(19, 24)
        else:
            hora = azar.randrange(0, 6)  # madrugada -> anomalia
        fecha = base + timedelta(
            days=dia, hours=hora, minutes=azar.randrange(60), seconds=azar.randrange(60)
        )
        ident = f"cred-00{azar.randrange(10, 14)}" if azar.random() < 0.12 else azar.choice(ids)
        resultado = "rechazado" if azar.random() < 0.16 else "permitido"
        lineas.append(
            f"{fecha:%Y-%m-%d %H:%M:%S},{azar.choice(PUNTOS)},{ident},{resultado},{azar.choice(TIPOS)}"
        )
    return lineas


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--cantidad", type=int, default=500)
    p.add_argument("--salida", type=Path, default=Path("datos/eventos-ejemplo.csv"))
    p.add_argument("--semilla", type=int, default=42)
    args = p.parse_args()
    args.salida.parent.mkdir(parents=True, exist_ok=True)
    args.salida.write_text("\n".join(generar(args.cantidad, args.semilla)) + "\n",
                           encoding="utf-8")
    print(f"{args.cantidad} eventos generados en {args.salida}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
