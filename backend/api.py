"""
api.py — Funções expostas ao React via PyWebView.
Cada método público vira window.pywebview.api.<método>() no JS.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from tkinter import filedialog
import tkinter as tk

from backend.document_generator import generate_all, generate_proposta, generate_contrato_veiculo

# ── Caminhos base ─────────────────────────────────────────────────────────────
# ROOT_DIR = pasta do .exe (para config e output)
# TEMPLATES_DIR = pasta _internal/templates quando frozen (PyInstaller v6+)

ROOT_DIR      = (
    Path(sys.executable).parent
    if getattr(sys, "frozen", False)
    else Path(__file__).resolve().parent.parent
)
TEMPLATES_DIR = (
    Path(sys._MEIPASS) / "templates"
    if getattr(sys, "frozen", False)
    else ROOT_DIR / "templates"
)
CONFIG_FILE   = ROOT_DIR / "local_config.json"

TEMPLATE_KEYS = [
    "emprestimo", "veiculo", "fiscal",
    "condominio", "condominio_aluguel", "rural",
    "procuracao", "procuracao_pj", "hipo",
    "proposta", "contrato_veiculo",
]

# ── Config ────────────────────────────────────────────────────────────────────

def _load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"output_dir": str(ROOT_DIR / "output")}


def _save_config(cfg: dict) -> None:
    CONFIG_FILE.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")


# ── API class ─────────────────────────────────────────────────────────────────

class BlindSafeAPI:
    """API exposta ao JavaScript via PyWebView."""

    # ── Configurações ─────────────────────────────────────────────────────────

    def get_settings(self) -> dict:
        cfg = _load_config()
        return {"output_dir": cfg.get("output_dir", "")}

    def save_settings(self, settings: dict) -> dict:
        cfg = _load_config()
        cfg.update(settings)
        _save_config(cfg)
        return {"ok": True}

    def browse_folder(self) -> dict:
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        path = filedialog.askdirectory(title="Selecionar pasta de saída")
        root.destroy()
        if path:
            return {"path": str(Path(path))}
        return {"path": ""}

    # ── Templates ─────────────────────────────────────────────────────────────

    def get_templates(self) -> dict:
        TEMPLATES_DIR.mkdir(exist_ok=True)
        result: dict = {}
        for key in TEMPLATE_KEYS:
            tpl = TEMPLATES_DIR / f"{key}.docx"
            result[key] = {
                "exists":   tpl.exists(),
                "filename": tpl.name if tpl.exists() else "",
            }
        return {"templates": result}

    def replace_template(self, key: str) -> dict:
        if key not in TEMPLATE_KEYS:
            return {"ok": False, "error": "Chave inválida."}

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        src = filedialog.askopenfilename(
            title=f"Selecionar template — {key}",
            filetypes=[("Documento Word", "*.docx")],
        )
        root.destroy()

        if not src:
            return {"ok": False, "error": "Nenhum arquivo selecionado."}

        dest = TEMPLATES_DIR / f"{key}.docx"
        TEMPLATES_DIR.mkdir(exist_ok=True)
        shutil.copy2(src, dest)
        return {"ok": True}

    # ── Geração de documentos ─────────────────────────────────────────────────

    def generate_documents(self, payload: dict) -> dict:
        """
        payload = {
            client: {...},
            contractType: str,
            processes: [...],
            vehicle: {...} | null,
            payment: {...},
            docs: { contrato, procuracao, hipo },
        }
        """
        cfg        = _load_config()
        output_dir = Path(cfg.get("output_dir", ROOT_DIR / "output"))

        try:
            generated, out_folder = generate_all(
                payload      = payload,
                templates_dir = TEMPLATES_DIR,
                output_dir   = output_dir,
            )
            return {
                "ok":    True,
                "path":  str(out_folder),
                "files": [str(f) for f in generated],
            }
        except FileNotFoundError as e:
            return {"ok": False, "error": str(e)}
        except Exception as e:
            return {"ok": False, "error": f"Erro inesperado: {e}"}

    def generate_proposta_doc(self, payload: dict) -> dict:
        """Gera a proposta de honorários em PPTX ou PDF."""
        cfg        = _load_config()
        output_dir = Path(cfg.get("output_dir", ROOT_DIR / "output"))
        try:
            generated, out_folder = generate_proposta(
                payload       = payload,
                templates_dir = TEMPLATES_DIR,
                output_dir    = output_dir,
            )
            return {
                "ok":    True,
                "path":  str(out_folder),
                "files": [str(f) for f in generated],
            }
        except FileNotFoundError as e:
            return {"ok": False, "error": str(e)}
        except Exception as e:
            return {"ok": False, "error": f"Erro inesperado: {e}"}

    def generate_veiculo_doc(self, payload: dict) -> dict:
        """Gera o Contrato de Compra de Veículo em DOCX ou PDF."""
        cfg        = _load_config()
        output_dir = Path(cfg.get("output_dir", ROOT_DIR / "output"))
        try:
            out, out_folder = generate_contrato_veiculo(
                payload       = payload,
                templates_dir = TEMPLATES_DIR,
                output_dir    = output_dir,
            )
            return {"ok": True, "path": str(out_folder), "files": [str(out)]}
        except FileNotFoundError as e:
            return {"ok": False, "error": str(e)}
        except Exception as e:
            return {"ok": False, "error": f"Erro inesperado: {e}"}

    # ── CEP ───────────────────────────────────────────────────────────────────

    def buscar_cep(self, cep: str) -> dict:
        """Consulta ViaCEP e retorna os dados de endereço."""
        import re
        import json as _json
        import urllib.request
        n = re.sub(r'\D', '', cep)
        if len(n) != 8:
            return {"ok": False, "error": "CEP inválido"}
        try:
            url = f"https://viacep.com.br/ws/{n}/json/"
            with urllib.request.urlopen(url, timeout=5) as resp:
                data = _json.loads(resp.read().decode("utf-8"))
            if data.get("erro"):
                return {"ok": False, "error": "CEP não encontrado"}
            return {
                "ok":     True,
                "rua":    data.get("logradouro", ""),
                "bairro": data.get("bairro", ""),
                "cidade": data.get("localidade", ""),
                "uf":     data.get("uf", ""),
            }
        except Exception:
            return {"ok": False, "error": "Sem conexão"}

    # ── Utilitários ───────────────────────────────────────────────────────────

    def open_folder(self, path: str) -> dict:
        """Abre a pasta no Explorer."""
        p = Path(path)
        if p.is_file():
            p = p.parent
        try:
            if sys.platform == "win32":
                os.startfile(str(p))
            elif sys.platform == "darwin":
                subprocess.Popen(["open", str(p)])
            else:
                subprocess.Popen(["xdg-open", str(p)])
        except Exception as e:
            return {"ok": False, "error": str(e)}
        return {"ok": True}
