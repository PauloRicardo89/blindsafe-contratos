"""document_service.py — Conversão DOCX → PDF sem dependências externas obrigatórias.

Ordem de tentativas:
  1. docx2pdf  — usa o Word via COM (Windows). Rápido, fidelidade máxima.
  2. pypandoc  — Pandoc embutido via pypandoc-binary. Sem instalação extra.

Ambos são empacotados pelo PyInstaller junto com o .exe — nenhuma instalação
manual é necessária nas máquinas dos usuários.
"""
from __future__ import annotations

import shutil
from pathlib import Path


def convert_docx_to_pdf(docx_path: Path, pdf_path: Path) -> Path:
    """
    Converte DOCX → PDF.
    Tenta Word (docx2pdf) primeiro; cai para pypandoc-binary se Word não estiver disponível.
    Se nenhum funcionar, entrega o .docx com aviso no nome do arquivo.
    """
    pdf_path.parent.mkdir(parents=True, exist_ok=True)

    # ── Tentativa 1: docx2pdf (Word via COM) ──────────────────────────────────
    try:
        from docx2pdf import convert as _word_convert
        _word_convert(str(docx_path), str(pdf_path))
        if pdf_path.exists():
            return pdf_path
    except Exception:
        pass  # Word não disponível ou falhou — tenta próximo

    # ── Tentativa 2: pypandoc-binary (Pandoc embutido, sem instalação) ────────
    try:
        import pypandoc  # type: ignore[import-untyped]
        pypandoc.convert_file(
            str(docx_path),
            "pdf",
            outputfile=str(pdf_path),
            extra_args=["--pdf-engine=weasyprint"],  # engine leve, sem LaTeX
        )
        if pdf_path.exists():
            return pdf_path
    except Exception:
        pass

    # Tenta sem especificar engine (pypandoc escolhe o disponível)
    try:
        import pypandoc
        pypandoc.convert_file(str(docx_path), "pdf", outputfile=str(pdf_path))
        if pdf_path.exists():
            return pdf_path
    except Exception:
        pass

    # ── Fallback: entrega o .docx renomeado com aviso ─────────────────────────
    docx_output = pdf_path.with_name(f"{pdf_path.stem} (sem-pdf).docx")
    shutil.copy2(str(docx_path), str(docx_output))
    return docx_output


def pdf_engine_available() -> str:
    """
    Retorna qual engine de PDF está disponível:
      'word'    — docx2pdf com Word instalado
      'pandoc'  — pypandoc-binary embutido
      'none'    — nenhum disponível (entregará .docx)
    """
    try:
        from docx2pdf import convert  # noqa: F401
        import win32com.client  # type: ignore[import-untyped]
        win32com.client.Dispatch("Word.Application")
        return "word"
    except Exception:
        pass

    try:
        import pypandoc
        pypandoc.get_pandoc_version()
        return "pandoc"
    except Exception:
        pass

    return "none"
