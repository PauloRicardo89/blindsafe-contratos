"""gemini_service.py — Extração via Gemini + preenchimento com docxtpl."""
from __future__ import annotations

import calendar
import json
import re
from datetime import date
from pathlib import Path
from typing import Any

from google import genai  # type: ignore[import-untyped]
from docxtpl import DocxTemplate  # type: ignore[import-untyped]

# ── Prompt de extração ─────────────────────────────────────────────────────────
_EXTRACTION_PROMPT = """\
Você é um assistente jurídico. Analise os textos abaixo e extraia os dados \
do cliente e do contrato bancário.

PETIÇÃO INICIAL:
{petition_text}

---
CONTRATO BANCÁRIO:
{bank_text}

Retorne SOMENTE um objeto JSON válido, sem markdown, sem texto extra:
{{
  "nome": "NOME COMPLETO EM MAIÚSCULAS",
  "nacionalidade": "brasileiro ou brasileira",
  "estado_civil": "solteiro/casado/divorciado/viúvo",
  "profissao": "profissão em minúsculas",
  "cpf": "000.000.000-00",
  "rg": "número do RG ou vazio",
  "email": "email ou vazio",
  "telefone": "(XX) X XXXX-XXXX ou vazio",
  "rua": "Rua/Av X, nº Y",
  "bairro": "nome do bairro ou vazio",
  "complemento": "complemento ou vazio",
  "cidade": "NOME DA CIDADE",
  "uf": "UF",
  "cep": "00000-000",
  "banco": "NOME DO BANCO EM MAIÚSCULAS",
  "divida_atual": "00000.00",
  "valor_parcela_banco": "0000.00",
  "parcelas_totais": "00",
  "parcelas_pagas": "00",
  "parcelas_abertas": "00",
  "parcelas_vencidas": "00",
  "numero_processo": "número ou vazio",
  "existe_processo": "Sim ou Não",
  "veiculo_marca_modelo": "MARCA MODELO EM MAIÚSCULAS ou vazio",
  "veiculo_ano": "AAAA ou vazio",
  "veiculo_placa": "PLACA ou vazio",
  "veiculo_cor": "COR EM MAIÚSCULAS ou vazio",
  "veiculo_renavam": "número ou vazio",
  "veiculo_obs": "observação sobre localização do veículo ou vazio"
}}"""

_ADDRESS_PROMPT = """\
Extraia o endereço residencial completo do texto abaixo e retorne SOMENTE \
um objeto JSON válido, sem markdown, sem texto extra:
{{
  "rua": "Rua/Av X, nº Y",
  "bairro": "nome do bairro ou vazio",
  "complemento": "complemento ou vazio",
  "cidade": "NOME DA CIDADE",
  "uf": "UF",
  "cep": "00000-000"
}}

TEXTO:
{text}"""

_MANUAL_ADDRESS_PROMPT = """\
Parse o endereço abaixo e retorne SOMENTE um objeto JSON válido, sem markdown:
{{
  "rua": "Rua/Av X, nº Y",
  "bairro": "nome do bairro ou vazio",
  "complemento": "complemento ou vazio",
  "cidade": "NOME DA CIDADE",
  "uf": "UF",
  "cep": "00000-000"
}}

ENDEREÇO:
{address}"""


# ── Helpers internos ───────────────────────────────────────────────────────────

def _configure(api_key: str) -> Any:
    return genai.Client(api_key=api_key)


def _clean_json(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```[a-z]*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def _fmt_brl(value: float) -> str:
    reais, cents = divmod(round(value * 100), 100)
    reais_str = f"{reais:,}".replace(",", ".")
    return f"R$ {reais_str},{cents:02d}"


def _is_feminine(d: dict) -> bool:
    return d.get("nacionalidade", "").lower().strip().endswith("a")


# ── Extração de dados ──────────────────────────────────────────────────────────

def extract_client_data(
    petition_text: str,
    bank_text: str,
    api_key: str,
) -> dict[str, Any]:
    """Usa o Gemini para extrair dados estruturados do cliente e do banco."""
    client = _configure(api_key)
    prompt = _EXTRACTION_PROMPT.format(
        petition_text=petition_text[:12000],
        bank_text=bank_text[:12000],
    )
    resp = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
    return json.loads(_clean_json(resp.text))


def resolve_address(
    client_data: dict,
    api_key: str,
    residence_text: str = "",
    manual_address: str = "",
) -> dict[str, Any]:
    """
    Resolve o endereço correto com a seguinte prioridade:
      1º — Endereço manual digitado na tela
      2º — Comprovante de residência (texto extraído do PDF/imagem)
      3º — Endereço da petição inicial (já em client_data)

    Retorna client_data atualizado com o endereço correto.
    """
    data = dict(client_data)
    client = _configure(api_key)

    if manual_address.strip():
        prompt = _MANUAL_ADDRESS_PROMPT.format(address=manual_address.strip())
        resp = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        try:
            addr = json.loads(_clean_json(resp.text))
            data.update({k: v for k, v in addr.items() if v})
        except Exception:
            pass  # mantém o endereço da petição como fallback
        return data

    if residence_text.strip():
        prompt = _ADDRESS_PROMPT.format(text=residence_text[:4000])
        resp = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        try:
            addr = json.loads(_clean_json(resp.text))
            data.update({k: v for k, v in addr.items() if v})
        except Exception:
            pass  # mantém o endereço da petição como fallback
        return data

    # Sem override — usa o endereço extraído da petição
    return data


def read_image_as_text(image_path: str, api_key: str) -> str:
    """Extrai texto de uma imagem de comprovante via Gemini Vision."""
    from google.genai import types as _types

    _mime_map = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp", ".bmp": "image/bmp",
    }
    mime_type = _mime_map.get(Path(image_path).suffix.lower(), "image/jpeg")
    image_bytes = Path(image_path).read_bytes()
    client = _configure(api_key)

    content = _types.Content(
        role="user",
        parts=[
            _types.Part(inline_data=_types.Blob(data=image_bytes, mime_type=mime_type)),
            _types.Part(text=(
                "Extraia e retorne apenas o endereço residencial completo "
                "(rua, número, bairro, cidade, estado, CEP) contido neste "
                "comprovante de residência. Retorne apenas o endereço como texto simples."
            )),
        ],
    )
    resp = client.models.generate_content(model="gemini-2.5-flash", contents=content)
    return resp.text or ""


# ── Utilitários numéricos (extenso em português) ───────────────────────────────

_ONES = [
    "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
    "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis",
    "dezessete", "dezoito", "dezenove",
]
_TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta",
         "sessenta", "setenta", "oitenta", "noventa"]
_HUNDREDS = [
    "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
    "seiscentos", "setecentos", "oitocentos", "novecentos",
]
_MONTHS_PT = [
    "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]


def _int_extenso(n: int) -> str:
    if n == 0:
        return "zero"
    if n == 100:
        return "cem"
    if n < 20:
        return _ONES[n]
    if n < 100:
        d, u = divmod(n, 10)
        return _TENS[d] + (" e " + _ONES[u] if u else "")
    c, r = divmod(n, 100)
    return _HUNDREDS[c] + (" e " + _int_extenso(r) if r else "")


def number_to_extenso(value: float) -> str:
    """Converte valor monetário em BRL para extenso em português."""
    cents = round(value * 100)
    reais, centavos = divmod(cents, 100)

    parts: list[str] = []
    if reais >= 1_000_000:
        m, reais = divmod(reais, 1_000_000)
        parts.append(_int_extenso(m) + (" milhão" if m == 1 else " milhões"))
    if reais >= 1_000:
        t, reais = divmod(reais, 1_000)
        parts.append(_int_extenso(t) + " mil")
    if reais:
        parts.append(_int_extenso(reais))

    if not parts:
        text = "zero reais"
    else:
        noun = "real" if (cents // 100) == 1 else "reais"
        joined = (
            " e ".join(parts)
            if len(parts) <= 2
            else ", ".join(parts[:-1]) + " e " + parts[-1]
        )
        text = joined + " " + noun

    if centavos:
        text += " e " + _int_extenso(centavos) + " centavos"
    return text


def _add_months(d: date, n: int) -> date:
    month = d.month - 1 + n
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


# ── Bloco de identificação do cliente ─────────────────────────────────────────

def build_client_block(d: dict) -> str:
    """Monta o parágrafo padrão de identificação do contratante."""
    fem = _is_feminine(d)
    inscrito   = "inscrita"                if fem else "inscrito"
    residente  = "residente e domiciliada" if fem else "residente e domiciliado"

    rua         = d.get("rua", "")
    bairro      = d.get("bairro", "")
    complemento = d.get("complemento", "")
    cidade      = d.get("cidade", "")
    uf          = d.get("uf", "")
    cep         = d.get("cep", "")
    rg          = d.get("rg", "")
    email       = d.get("email", "")
    telefone    = d.get("telefone", "")

    endereco_parts = [p for p in [rua, bairro, complemento] if p]
    endereco = ", ".join(endereco_parts)

    text = (
        f"{d.get('nome', '')}, {d.get('nacionalidade', '')}, {d.get('estado_civil', '')}, "
        f"{d.get('profissao', '')}, {inscrito} no CPF/MF sob nº {d.get('cpf', '')}"
    )
    if rg:
        text += f" e Documento de Identificação nº {rg}"
    if email:
        text += f", endereço eletrônico {email}"
    text += f", {residente} na {endereco}, {cidade}/{uf}, CEP: {cep}"
    if telefone:
        text += f", Telefone: {telefone}"
    text += ', doravante denominado "Contratante";'
    return text


# ── Cronograma de pagamento ────────────────────────────────────────────────────

def generate_payment_schedule(
    entry_date_str: str,
    total_value: float,
    n_installments: int,
) -> str:
    """Gera o bloco completo de parcelas para {{cronograma_parcelas}}."""
    try:
        day, month, year = map(int, entry_date_str.split("/"))
        entry = date(year, month, day)
    except Exception:
        return "(data inválida)"

    installment = total_value / n_installments if n_installments else total_value
    lines: list[str] = []
    for i in range(n_installments):
        parc_date = _add_months(entry, i)
        lines.append(
            f"{i + 1}ª parcela: {_fmt_brl(installment)} — {parc_date.strftime('%d/%m/%Y')}"
        )
    return "\n".join(lines)


# ── Construção do contexto do template ────────────────────────────────────────

def build_template_context(
    client_data: dict,
    contract_params: dict,
) -> dict[str, Any]:
    """
    Monta o dicionário de contexto para o docxtpl.
    Todos os {{marcadores}} do template são resolvidos aqui.
    """
    total_value    = float(contract_params.get("total_value", 0))
    n_installments = int(contract_params.get("n_installments", 1))
    entry_date_str = contract_params.get("entry_date", "")
    sig_date_str   = contract_params.get("signature_date", "")
    installment    = total_value / n_installments if n_installments else total_value

    # Data de assinatura
    try:
        sd, sm, sy = map(int, sig_date_str.split("/"))
        sig_date = date(sy, sm, sd)
    except Exception:
        sig_date = date.today()

    cidade_fmt  = client_data.get("cidade", "").title()
    data_cidade = f"{cidade_fmt}, {sig_date.day:02d} de {_MONTHS_PT[sig_date.month]} {sig_date.year}."

    # Número do processo
    num_proc    = client_data.get("numero_processo", "")
    existe_proc = client_data.get("existe_processo", "Não")
    proc_text   = (
        f"Sim, {num_proc}"
        if existe_proc.lower().startswith("s") and num_proc
        else existe_proc
    )

    # Valores financeiros do banco
    def _safe_brl(val: str) -> str:
        try:
            return _fmt_brl(float(val))
        except (ValueError, TypeError):
            return val or ""

    return {
        # ── Dados do cliente ──────────────────────────────────────
        "nome":           client_data.get("nome", ""),
        "nacionalidade":  client_data.get("nacionalidade", ""),
        "estado_civil":   client_data.get("estado_civil", ""),
        "profissao":      client_data.get("profissao", ""),
        "cpf":            client_data.get("cpf", ""),
        "rg":             client_data.get("rg", ""),
        "email":          client_data.get("email", ""),
        "telefone":       client_data.get("telefone", ""),
        "rua":            client_data.get("rua", ""),
        "bairro":         client_data.get("bairro", ""),
        "complemento":    client_data.get("complemento", ""),
        "cidade":         client_data.get("cidade", ""),
        "uf":             client_data.get("uf", ""),
        "cep":            client_data.get("cep", ""),
        # ── Bloco completo de identificação ───────────────────────
        "bloco_cliente":  build_client_block(client_data),
        # ── Dados do banco ────────────────────────────────────────
        "banco":                client_data.get("banco", ""),
        "divida_atual":         _safe_brl(client_data.get("divida_atual", "")),
        "valor_parcela_banco":  _safe_brl(client_data.get("valor_parcela_banco", "")),
        "parcelas_totais":      client_data.get("parcelas_totais", ""),
        "parcelas_pagas":       client_data.get("parcelas_pagas", ""),
        "parcelas_abertas":     client_data.get("parcelas_abertas", ""),
        "parcelas_vencidas":    client_data.get("parcelas_vencidas", ""),
        # ── Dados do veículo ──────────────────────────────────────
        "veiculo_marca_modelo": client_data.get("veiculo_marca_modelo", ""),
        "veiculo_ano":          client_data.get("veiculo_ano", ""),
        "veiculo_placa":        client_data.get("veiculo_placa", ""),
        "veiculo_cor":          client_data.get("veiculo_cor", ""),
        "veiculo_renavam":      client_data.get("veiculo_renavam", ""),
        "veiculo_obs":          client_data.get("veiculo_obs", ""),
        # ── Processo ──────────────────────────────────────────────
        "numero_processo":  num_proc,
        "existe_processo":  proc_text,
        # ── Valores do contrato ───────────────────────────────────
        "valor_total":          _fmt_brl(total_value),
        "valor_total_extenso":  number_to_extenso(total_value),
        "valor_parcela":        _fmt_brl(installment),
        "valor_parcela_extenso": number_to_extenso(installment),
        "n_parcelas":           str(n_installments),
        "data_entrada":         entry_date_str,
        "data_contrato":        data_cidade,
        # ── Cronograma completo de parcelas ───────────────────────
        "cronograma_parcelas":  generate_payment_schedule(
            entry_date_str, total_value, n_installments
        ),
        # ── Quadro resumo ─────────────────────────────────────────
        "custos_entrada":    _fmt_brl(installment),
        "parcelamento_desc": f"{n_installments}x de {_fmt_brl(installment)}",
    }


# ── Preenchimento do DOCX via docxtpl ─────────────────────────────────────────

def fill_contract(
    docx_path: Path,
    client_data: dict,
    contract_params: dict,
    out_dir: Path | None = None,
) -> Path:
    """
    Preenche um template DOCX usando docxtpl.
    O template deve conter marcadores {{campo}} nos locais corretos.
    """
    context = build_template_context(client_data, contract_params)

    tpl = DocxTemplate(str(docx_path))
    tpl.render(context)

    save_dir = Path(out_dir) if out_dir else docx_path.parent
    save_dir.mkdir(parents=True, exist_ok=True)
    out_path = save_dir / f"{docx_path.stem}_preenchido.docx"
    tpl.save(str(out_path))
    return out_path
