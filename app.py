"""
app.py — Ponto de entrada do BLINDSAFE Contratos v2
Abre o React (dist/) numa janela PyWebView e expõe a API Python.
"""
from __future__ import annotations

import sys
import subprocess
from pathlib import Path

_FROZEN = getattr(sys, "frozen", False)

# Quando empacotado: assets bundled ficam em sys._MEIPASS
# Em desenvolvimento: tudo fica na raiz do projeto
ASSETS_DIR = Path(sys._MEIPASS) if _FROZEN else Path(__file__).resolve().parent
ROOT_DIR   = Path(sys.executable).parent if _FROZEN else Path(__file__).resolve().parent
DIST_DIR   = ASSETS_DIR / "frontend" / "dist"
INDEX      = DIST_DIR / "index.html"

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Força pythonnet a usar o .NET Framework (já embutido em todo Windows 10/11)
# sem isso ele tenta .NET Core, que não está instalado na maioria das máquinas
if _FROZEN:
    try:
        import pythonnet
        pythonnet.load("netfx")
    except Exception:
        pass

from backend.api import BlindSafeAPI


def build_frontend():
    """Faz build do React se dist/ não existir (só em desenvolvimento)."""
    if _FROZEN:
        return
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
