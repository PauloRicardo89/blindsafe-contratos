from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re

import pdfplumber
from pypdf import PdfReader


BANK_NAMES = [
    "BANCO DO BRASIL",
    "BRADESCO",
    "ITAU",
    "ITAU UNIBANCO",
    "SANTANDER",
    "CAIXA ECONOMICA FEDERAL",
    "CAIXA",
    "MERCADO PAGO",
    "C6 BANK",
    "PAGBANK",
    "NU PAGAMENTOS",
    "NUBANK",
    "SAFRA",
    "BV",
    "PAN",
]


@dataclass
class ExtractionResult:
    fields: dict[str, str]
    petition_text: str
    bank_contract_text: str


def read_pdf_text(file_path: Path) -> str:
    text_chunks: list[str] = []

    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text_chunks.append(page.extract_text() or "")
    except Exception:
        text_chunks = []

    text = "\n".join(text_chunks).strip()
    if text:
        return text

    reader = PdfReader(str(file_path))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    return text.strip()


def _clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(" .:-")


def _extract_first(patterns: list[str], text: str, flags: int = re.IGNORECASE) -> str:
    for pattern in patterns:
        match = re.search(pattern, text, flags)
        if match:
            groups = [group for group in match.groups() if group]
            if groups:
                return _clean(groups[0])
            return _clean(match.group(0))
    return ""


def _detect_bank_name(text: str) -> str:
    upper_text = text.upper()
    for bank_name in BANK_NAMES:
        if bank_name in upper_text:
            return bank_name.title()
    return ""


def extract_fields(petition_path: Path, bank_contract_path: Path) -> ExtractionResult:
    petition_text = read_pdf_text(petition_path)
    bank_contract_text = read_pdf_text(bank_contract_path)
    combined_text = f"{petition_text}\n{bank_contract_text}"

    fields = {
        "nome_cliente": _extract_first(
            [
                r"(?:nome(?: do)? cliente|requerente|autor(?:a)?|contratante)\s*[:\-]\s*([A-ZÀ-Ú][A-ZÀ-Ú\s]+)",
                r"eu,\s*([A-ZÀ-Ú][A-ZÀ-Ú\s]+),\s*(?:brasileir[oa])",
            ],
            combined_text,
        ),
        "cpf_cliente": _extract_first([r"(\d{3}\.\d{3}\.\d{3}-\d{2})", r"(\d{11})"], combined_text),
        "cnpj_cliente": _extract_first([r"(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})", r"(\d{14})"], combined_text),
        "rg_cliente": _extract_first([r"(?:rg|identidade)\s*[:\-]?\s*([\d\.\-A-Z]+)"], combined_text),
        "endereco_cliente": _extract_first(
            [
                r"(?:endere[cç]o|residente(?: e domiciliad[oa])?)\s*[:\-]?\s*([^\n]{15,160})",
            ],
            combined_text,
        ),
        "banco_nome": _detect_bank_name(bank_contract_text),
        "numero_contrato_banco": _extract_first(
            [
                r"(?:contrato|proposta|opera[cç][aã]o|n[úu]mero do contrato)\s*(?:n[oº°.]*)?\s*[:\-]?\s*([A-Z0-9\-/\.]{5,})",
            ],
            bank_contract_text,
        ),
        "valor_contrato_banco": _extract_first(
            [
                r"(?:valor(?: total)?|valor financiado|montante)\s*[:\-]?\s*(R\$\s*[\d\.]+,\d{2})",
            ],
            bank_contract_text,
        ),
        "parcelas": _extract_first(
            [
                r"(?:parcelas|presta[cç][oõ]es)\s*[:\-]?\s*(\d{1,3})",
            ],
            bank_contract_text,
        ),
        "data_contrato_banco": _extract_first([r"(\d{2}/\d{2}/\d{4})"], bank_contract_text),
        "vara_comarca": _extract_first(
            [
                r"(?:vara|ju[ií]zo)\s*[:\-]?\s*([^\n]{6,120})",
            ],
            petition_text,
        ),
        "numero_processo": _extract_first(
            [r"(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})"],
            petition_text,
        ),
    }

    return ExtractionResult(
        fields=fields,
        petition_text=petition_text,
        bank_contract_text=bank_contract_text,
    )
