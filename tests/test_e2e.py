"""Tests E2E del analizador con Playwright (navegador real, servidor local)."""

import functools
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent

CSV_VALIDO = """fecha,punto,identificador,resultado,tipo
2026-10-19 08:00:00,porton,cred-0001,permitido,tarjeta
2026-10-19 08:05:00,porton,cred-0002,permitido,qr
2026-10-19 03:10:00,deposito,cred-0009,rechazado,huella
2026-10-19 03:15:00,deposito,cred-0009,rechazado,huella
2026-10-19 03:20:00,deposito,cred-0009,rechazado,huella
2026-10-19 12:00:00,puerta,cred-0003,permitido,facial
"""

CSV_MAL = """fecha,punto
2026-10-19 08:00:00,porton
sin-sentido
"""


@pytest.fixture(scope="session")
def servidor():
    handler = functools.partial(SimpleHTTPRequestHandler, directory=str(RAIZ))
    srv = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    srv.RequestHandlerClass.log_message = lambda *a, **k: None
    hilo = threading.Thread(target=srv.serve_forever, daemon=True)
    hilo.start()
    yield f"http://127.0.0.1:{srv.server_address[1]}"
    srv.shutdown()


@pytest.fixture(scope="session")
def navegador():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel="chrome")
        yield browser
        browser.close()


@pytest.fixture
def pagina(navegador, servidor):
    page = navegador.new_page()
    page.goto(servidor + "/index.html")
    page.wait_for_load_state("networkidle")
    yield page
    page.close()


def test_la_pagina_carga_y_muestra_la_zona_de_carga(pagina):
    assert "analizador-de-accesos" in pagina.title()
    assert pagina.locator("#drop").is_visible()
    assert pagina.locator("#resultados").is_hidden()


def test_el_boton_de_ejemplo_genera_datos_marcados(pagina):
    pagina.click("#btn-ejemplo")
    assert pagina.locator("#resultados").is_visible()
    assert pagina.locator("#marca-ejemplo").is_visible()
    assert pagina.locator("#m-total").inner_text() == "500"
    assert int(pagina.locator("#m-rechazados").inner_text()) > 0


def test_csv_mal_formado_muestra_errores_en_espanol(pagina):
    pagina.set_input_files(
        "#archivo", {"name": "malo.csv", "mimeType": "text/csv", "buffer": CSV_MAL.encode()}
    )
    errores = pagina.locator("#errores")
    assert errores.is_visible()
    assert "Faltan columnas" in errores.inner_text()


def test_csv_valido_produce_metricas_y_anomalias(pagina):
    pagina.set_input_files(
        "#archivo",
        {"name": "eventos.csv", "mimeType": "text/csv", "buffer": CSV_VALIDO.encode()},
    )
    assert pagina.locator("#m-total").inner_text() == "6"
    assert pagina.locator("#m-rechazados").inner_text() == "3"
    # cred-0009: 3 rechazos en rafaga + horario nocturno -> anomalias
    texto_anomalias = pagina.locator("#tabla-anomalias").inner_text()
    assert "cred-0009" in texto_anomalias
    assert "madrugada" in texto_anomalias or "rechazos seguidos" in texto_anomalias


def test_el_informe_se_descarga(pagina):
    pagina.click("#btn-ejemplo")
    with pagina.expect_download() as descarga:
        pagina.click("#btn-informe")
    assert descarga.value.suggested_filename == "informe-accesos.md"
