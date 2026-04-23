"""
app.py — Ponto de entrada do BLINDSAFE Contratos v2
Abre o React (dist/) numa janela PyWebView e expõe a API Python.
"""
from __future__ import annotations

import sys
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
DIST_DIR = ROOT_DIR / "frontend" / "dist"
INDEX    = DIST_DIR / "index.html"

# Garante que o backend seja importável
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.api import BlindSafeAPI


def build_frontend():
    """Faz build do React se dist/ não existir."""
    if INDEX.exists():
        return
    print("Construindo interface (primeira execução)...")
    subprocess.run(
        ["npm", "run", "build"],
        cwd=str(ROOT_DIR / "frontend"),
        check=True,
        shell=True,
    )
    print("Build concluído.")


def main():
    build_frontend()

    import webview  # importado aqui para não bloquear o build

    api = BlindSafeAPI()

    window = webview.create_window(
        title    = "BLINDSAFE Contratos",
        url      = str(INDEX),
        js_api   = api,
        width    = 1100,
        height   = 750,
        min_size = (900, 600),
        resizable= True,
    )

    webview.start(debug=False)


if __name__ == "__main__":
    main()
