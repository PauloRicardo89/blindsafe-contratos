"""
document_generator.py
Toda a lógica de geração de contratos, procuração e hipossuficiência.
Sem dependência de internet, Gemini ou Bitrix.
"""
from __future__ import annotations

import calendar
import re
import shutil
from datetime import date, datetime
from pathlib import Path
from typing import Any

from docxtpl import DocxTemplate, RichText

# ── RichText helpers ─────────────────────────────────────────────────────────

_BOLD_6   = {'CONTRATANTE', 'CONTRATADA'}
_RT_FONT  = 'Arial'
_RT_SIZE  = 20  # meios-pontos → 10pt

def _rt_bold(text: str, bold_words: set) -> RichText:
    """Cria RichText com as palavras indicadas em negrito, fonte e tamanho fixos."""
    rt = RichText()
    pattern = '(' + '|'.join(re.escape(w) for w in sorted(bold_words, key=len, reverse=True)) + ')'
    for i, line in enumerate(text.split('\n')):
        if i > 0:
            rt.add('\n')
        for part in re.split(pattern, line):
            if part:
                rt.add(part, bold=(part in bold_words), font=_RT_FONT, size=_RT_SIZE)
    return rt

# ── Meses em português ────────────────────────────────────────────────────────
_MESES = [
    "", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

# ── Números por extenso ───────────────────────────────────────────────────────
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


def _int_extenso(n: int) -> str:
    if n == 0:   return "zero"
    if n == 100: return "cem"
    if n < 20:   return _ONES[n]
    if n < 100:
        d, u = divmod(n, 10)
        return _TENS[d] + (" e " + _ONES[u] if u else "")
    c, r = divmod(n, 100)
    return _HUNDREDS[c] + (" e " + _int_extenso(r) if r else "")


def valor_extenso(value_str: str) -> str:
    """Converte '6.000,00' → 'seis mil reais'."""
    try:
        clean = value_str.replace("R$", "").replace(".", "").replace(",", ".").strip()
        value = float(clean)
    except Exception:
        return value_str

    cents = round(value * 100)
    reais, centavos = divmod(cents, 100)

    parts: list[str] = []
    tmp = reais
    if tmp >= 1_000_000:
        m, tmp = divmod(tmp, 1_000_000)
        parts.append(_int_extenso(m) + (" milhão" if m == 1 else " milhões"))
    if tmp >= 1_000:
        t, tmp = divmod(tmp, 1_000)
        parts.append(_int_extenso(t) + " mil")
    if tmp:
        parts.append(_int_extenso(tmp))

    if not parts:
        text = "zero reais"
    else:
        noun = "real" if reais == 1 else "reais"
        joined = " e ".join(parts) if len(parts) <= 2 else ", ".join(parts[:-1]) + " e " + parts[-1]
        text = joined + " " + noun

    if centavos:
        text += " e " + _int_extenso(centavos) + " centavos"
    return text


def _fmt_brl(value_str: str) -> str:
    """Garante formatação 'R$ 1.000,00'."""
    s = value_str.strip().lstrip("R$").strip()
    if not s:
        return ""
    return f"R$ {s}"


def _add_months(d: date, n: int) -> date:
    month = d.month - 1 + n
    year  = d.year + month // 12
    month = month % 12 + 1
    day   = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _parse_date(s: str) -> date:
    """Tenta DD/MM/AAAA."""
    try:
        d, m, y = map(int, s.strip().split("/"))
        return date(y, m, d)
    except Exception:
        return date.today()


# ── Geração da Cláusula 6 ─────────────────────────────────────────────────────

def build_clausula_6(payment: dict) -> tuple[str, str]:
    """
    Retorna (texto_6_1, texto_6_2).
    texto_6_2 é string vazia quando não deve existir.
    """
    tipo          = payment.get("tipo", "boleto")
    valor_total   = payment.get("valor_total", "")
    total_brl     = _fmt_brl(valor_total)
    total_ext     = valor_extenso(valor_total)

    _bold = _BOLD_6 | {'6.1.', '6.1'}

    if tipo == "avista":
        data_pgto = payment.get("data", "")
        txt = (
            f"6.1. Pela prestação dos serviços descritos neste contrato, "
            f"O CONTRATANTE pagará à CONTRATADA o valor de {total_brl} "
            f"({total_ext}), de forma à vista na data de {data_pgto}, "
            f"conforme combinado entre as partes."
        )
        return _rt_bold(txt, _bold), ""

    if tipo == "cartao":
        n_parc    = payment.get("n_parcelas", "")
        val_parc  = _fmt_brl(payment.get("valor_parcela", ""))
        parc_ext  = valor_extenso(payment.get("valor_parcela", ""))
        n_ext     = _int_extenso(int(n_parc)) if n_parc.isdigit() else n_parc
        data_pgto = payment.get("data", "")
        txt = (
            f"6.1. Pela prestação dos serviços descritos neste contrato, "
            f"O CONTRATANTE pagará à CONTRATADA o valor de {total_brl} "
            f"({total_ext}), podendo o pagamento ser realizado à vista ou "
            f"parcelado no cartão de crédito em até {n_parc} ({n_ext}) "
            f"parcelas de {val_parc} ({parc_ext}), na data de {data_pgto}, "
            f"conforme condições acordadas entre as partes."
        )
        return _rt_bold(txt, _bold), ""

    # boleto / PIX
    valor_entrada = payment.get("valor_entrada", "")
    data_entrada  = payment.get("data_entrada", "")
    n_parc        = payment.get("n_parcelas", "")
    val_parc      = _fmt_brl(payment.get("valor_parcela", ""))
    entrada_brl   = _fmt_brl(valor_entrada)
    entrada_ext   = valor_extenso(valor_entrada)
    parc_ext      = valor_extenso(payment.get("valor_parcela", ""))
    n_int         = int(n_parc) if str(n_parc).isdigit() else 0
    n_ext         = _int_extenso(n_int)

    txt = (
        f"6.1 – Pela prestação dos serviços descritos neste contrato, "
        f"o CONTRATANTE pagará à CONTRATADA o valor de {total_brl} "
        f"({total_ext}), com entrada de {entrada_brl} ({entrada_ext}) "
        f"na data de {data_entrada}, e o saldo restante em {n_ext} "
        f"parcelas de {val_parc} ({parc_ext}) cada, a serem pagas nas "
        f"datas subsequentes, conforme combinado entre as partes:"
    )

    base = _parse_date(data_entrada)
    linhas: list[str] = []
    for i in range(1, n_int + 1):
        parc_date = _add_months(base, i)
        linhas.append(f"• {i + 1}ª parcela: {parc_date.strftime('%d/%m/%Y')} – no valor de {val_parc} ({parc_ext})")
    if linhas:
        txt += "\n" + "\n".join(linhas)

    c62 = (
        "6.2. O pagamento será realizado por PIX IDENTIFICADO NA CONTA "
        "BANCÁRIA DA CONTRATADA, com vencimento de cada mês."
    )
    return _rt_bold(txt, _bold), c62


# ── Quadro Resumo ─────────────────────────────────────────────────────────────

def build_quadro_custos(payment: dict) -> dict:
    """Retorna dict com campos para seção 3 do Quadro Resumo."""
    tipo = payment.get("tipo", "boleto")

    if tipo == "avista":
        return {
            "custos_desc":   f"R$ {payment.get('valor_total', '')} à vista.",
            "parcelamento":  "",
            "n_parcelas_qr": "",
        }
    if tipo == "cartao":
        vt   = payment.get("valor_total", "")
        np   = payment.get("n_parcelas", "")
        vp   = payment.get("valor_parcela", "")
        return {
            "custos_desc":   f"R$ {vt} em {np}x de R${vp}",
            "parcelamento":  "Crédito",
            "n_parcelas_qr": np,
        }
    # boleto
    ve = payment.get("valor_entrada", "")
    np = payment.get("n_parcelas", "")
    vp = payment.get("valor_parcela", "")
    n_total = int(np) + 1 if str(np).isdigit() else 0
    return {
        "custos_desc":   f"ENTRADA DE R${ve} + {np}X DE R${vp}",
        "parcelamento":  "Boleto",
        "n_parcelas_qr": str(n_total),
    }


# ── Identificação do cliente (parágrafo padrão) ───────────────────────────────

def build_bloco_hipo(client: dict) -> RichText:
    """Bloco do cliente para a hipossuficiência — Tahoma 12pt, sem ponto final."""
    fem       = client.get("nacionalidade", "").lower().endswith("a")
    inscrito  = "inscrita"                if fem else "inscrito"
    residente = "residente e domiciliada" if fem else "residente e domiciliado"

    rua    = client.get("rua", "")
    bairro = client.get("bairro", "")
    comp   = client.get("complemento", "")
    cidade = client.get("cidade", "")
    uf     = client.get("uf", "")
    cep    = client.get("cep", "")

    end_parts = [p for p in [rua, bairro, comp] if p]
    endereco  = ", ".join(end_parts)

    kw = dict(font="Tahoma", size=24)  # 12pt em meios-pontos
    rt = RichText()
    rt.add(client.get("nome", ""), bold=True, **kw)
    rt.add(
        f", {client.get('nacionalidade', '')}, {client.get('estado_civil', '')}, "
        f"{client.get('profissao', '')}, {inscrito} no CPF/MF sob o nº {client.get('cpf', '')}",
        **kw
    )
    rg = client.get("rg", "")
    if rg:
        rt.add(f", portador(a) da carteira de identidade nº {rg}", **kw)
    email = client.get("email", "")
    if email:
        rt.add(f", Email: {email}", **kw)
    rt.add(f", {residente} na {endereco}", **kw)
    if cidade and uf:
        rt.add(f", {cidade}/{uf}", **kw)
    if cep:
        rt.add(f", CEP: {cep}", **kw)
    return rt


def build_bloco_procuracao(client: dict) -> RichText:
    """Bloco do OUTORGANTE para a procuração — sem 'Contratante' no final."""
    fem       = client.get("nacionalidade", "").lower().endswith("a")
    inscrito  = "inscrita"                if fem else "inscrito"
    residente = "residente e domiciliada" if fem else "residente e domiciliado"

    rua    = client.get("rua", "")
    bairro = client.get("bairro", "")
    comp   = client.get("complemento", "")
    cidade = client.get("cidade", "")
    uf     = client.get("uf", "")
    cep    = client.get("cep", "")

    end_parts = [p for p in [rua, bairro, comp] if p]
    endereco  = ", ".join(end_parts)

    kw = dict(font=_RT_FONT, size=_RT_SIZE)
    rt = RichText()
    rt.add(client.get("nome", ""), bold=True, **kw)
    rt.add(
        f", {client.get('nacionalidade', '')}, {client.get('estado_civil', '')}, "
        f"{client.get('profissao', '')}, {inscrito} no CPF/MF sob o nº {client.get('cpf', '')}",
        **kw
    )
    rg = client.get("rg", "")
    if rg:
        rt.add(f", portador(a) da carteira de identidade nº {rg}", **kw)
    email = client.get("email", "")
    if email:
        rt.add(f", Email: {email}", **kw)
    rt.add(f", {residente} na {endereco}", **kw)
    if cidade and uf:
        rt.add(f", {cidade}/{uf}", **kw)
    if cep:
        rt.add(f", CEP: {cep}", **kw)
    rt.add(".", **kw)
    return rt


def build_bloco_cliente(client: dict) -> RichText:
    fem       = client.get("nacionalidade", "").lower().endswith("a")
    inscrito  = "inscrita"                if fem else "inscrito"
    residente = "residente e domiciliada" if fem else "residente e domiciliado"

    rua    = client.get("rua", "")
    bairro = client.get("bairro", "")
    comp   = client.get("complemento", "")
    cidade = client.get("cidade", "")
    uf     = client.get("uf", "")
    cep    = client.get("cep", "")

    end_parts = [p for p in [rua, bairro, comp] if p]
    endereco  = ", ".join(end_parts)

    kw = dict(font=_RT_FONT, size=_RT_SIZE)
    rt = RichText()
    rt.add(client.get("nome", ""), bold=True, **kw)
    rt.add(
        f", {client.get('nacionalidade', '')}, {client.get('estado_civil', '')}, "
        f"{client.get('profissao', '')}, {inscrito} no CPF/MF sob o nº {client.get('cpf', '')}",
        **kw
    )
    rg = client.get("rg", "")
    if rg:
        rt.add(f", portador(a) da carteira de identidade nº {rg}", **kw)
    email = client.get("email", "")
    if email:
        rt.add(f", Email: {email}", **kw)
    rt.add(f", {residente} na {endereco}", **kw)
    if cidade and uf:
        rt.add(f", {cidade}/{uf}", **kw)
    if cep:
        rt.add(f", CEP: {cep}", **kw)
    rt.add(', doravante denominado ', **kw)
    rt.add('"Contratante"', bold=True, **kw)
    rt.add(';', **kw)
    return rt


# ── Data por extenso ──────────────────────────────────────────────────────────

def build_local_data(cidade: str, uf: str = "") -> str:
    today = date.today()
    loc   = cidade.title() if cidade else (uf or "")
    return f"{loc}, {today.day:02d} de {_MESES[today.month]} de {today.year}."


_OBS_FORA_ENDERECO = "O VEÍCULO NÃO ESTÁ LOCALIZADO NO MESMO ENDEREÇO DO CARNÊ DE FINANCIAMENTO"

def _build_veiculo_obs(vehicle: dict) -> str:
    parts = []
    if vehicle.get("fora_endereco", False):
        parts.append(_OBS_FORA_ENDERECO)
    extra = vehicle.get("observacao", "").strip()
    if extra:
        parts.append(extra)
    return " - ".join(parts)


# ── Contexto completo do template ─────────────────────────────────────────────

def build_context(payload: dict) -> dict[str, Any]:
    client       = payload.get("client", {})
    contract_type = payload.get("contractType", "emprestimo")
    processes    = payload.get("processes", [{}])
    vehicle      = payload.get("vehicle") or {}
    payment      = payload.get("payment", {})

    c61, c62 = build_clausula_6(payment)
    qr_custos = build_quadro_custos(payment)

    # Taxa de rescisão = valor da entrada (boleto) ou valor total (cartão/à vista)
    tipo_pgto = payment.get("tipo", "boleto")
    if tipo_pgto == "boleto":
        _taxa_str = payment.get("valor_entrada", "")
    else:
        _taxa_str = payment.get("valor_total", "")
    taxa_brl    = _fmt_brl(_taxa_str)
    taxa_extenso = valor_extenso(_taxa_str)

    # Processo(s) — pega o primeiro para campos simples, lista completa para loop
    proc0 = processes[0] if processes else {}

    def proc_existe(p: dict) -> str:
        ep  = p.get("existe_processo", "nao")
        num = p.get("numero_processo", "")
        if ep == "nao":
            return "Não"
        return f"Sim, {num}" if num else "Sim"

    processos_ctx = [
        {
            "banco":             p.get("banco", ""),
            "divida":            _fmt_brl(p.get("divida", "")),
            "valor_parcela":     _fmt_brl(p.get("valor_parcela", "")),
            "parcelas_totais":   p.get("parcelas_totais", ""),
            "parcelas_pagas":    p.get("parcelas_pagas", ""),
            "parcelas_abertas":  p.get("parcelas_abertas", ""),
            "parcelas_vencidas": p.get("parcelas_vencidas", ""),
            "existe_processo":   proc_existe(p),
        }
        for p in processes
    ]

    ctx: dict[str, Any] = {
        # Cliente
        "nome":           client.get("nome", ""),
        "nacionalidade":  client.get("nacionalidade", ""),
        "estado_civil":   client.get("estado_civil", ""),
        "profissao":      client.get("profissao", ""),
        "cpf":            client.get("cpf", ""),
        "rg":             client.get("rg", ""),
        "email":          client.get("email", ""),
        "telefone":       client.get("telefone", ""),
        "rua":            client.get("rua", ""),
        "bairro":         client.get("bairro", ""),
        "complemento":    client.get("complemento", ""),
        "cidade":         client.get("cidade", ""),
        "uf":             client.get("uf", ""),
        "cep":            client.get("cep", ""),
        "bloco_cliente":     build_bloco_cliente(client),
        "bloco_procuracao":  build_bloco_procuracao(client),
        "bloco_hipo":        build_bloco_hipo(client),
        "local_data":        build_local_data(client.get("cidade", ""), client.get("uf", "")),

        # Processo 1 (atalho)
        "banco":             proc0.get("banco", ""),
        "divida":            _fmt_brl(proc0.get("divida", "")),
        "valor_parcela_banco": _fmt_brl(proc0.get("valor_parcela", "")),
        "parcelas_totais":   proc0.get("parcelas_totais", ""),
        "parcelas_pagas":    proc0.get("parcelas_pagas", ""),
        "parcelas_abertas":  proc0.get("parcelas_abertas", ""),
        "parcelas_vencidas": proc0.get("parcelas_vencidas", ""),
        "existe_processo":   proc_existe(proc0),

        # Lista completa de processos (para Jinja {% for %})
        "processos": processos_ctx,

        # Cláusula 6
        "clausula_6_1": c61,
        "clausula_6_2": c62,

        # Quadro Resumo seção 3
        "custos_desc":   qr_custos["custos_desc"],
        "parcelamento":  qr_custos["parcelamento"],
        "n_parcelas_qr": qr_custos["n_parcelas_qr"],

        # Veículo (vazio se não for veículo)
        "veiculo_marca_modelo": vehicle.get("marca_modelo", ""),
        "veiculo_ano":          vehicle.get("ano", ""),
        "veiculo_placa":        vehicle.get("placa", ""),
        "veiculo_cor":          vehicle.get("cor", ""),
        "veiculo_renavam":      vehicle.get("renavam", ""),
        "veiculo_obs":          _build_veiculo_obs(vehicle),

        # Tipo do contrato
        "tipo_contrato": contract_type,

        # Cláusula 7.4 — taxa de rescisão antecipada
        "taxa_rescisao":         taxa_brl,
        "taxa_rescisao_extenso": taxa_extenso,
    }
    return ctx


# ── Mapeamento de template por tipo ──────────────────────────────────────────

TEMPLATE_KEYS = {
    "emprestimo":         "emprestimo",
    "veiculo":            "veiculo",
    "fiscal":             "fiscal",
    "condominio":         "condominio",
    "condominio_aluguel": "condominio_aluguel",
    "rural":              "rural",
}


def _docx_to_pdf(docx_path: Path) -> Path:
    """Converte DOCX para PDF e remove o DOCX."""
    pdf_path = docx_path.with_suffix(".pdf")
    try:
        from docx2pdf import convert
        convert(str(docx_path), str(pdf_path))
        docx_path.unlink()
        return pdf_path
    except Exception:
        return docx_path  # sem Word instalado: mantém o DOCX


def fill_template(template_path: Path, context: dict, out_path: Path) -> Path:
    """Preenche um template DOCX com docxtpl, salva e converte para PDF."""
    tpl = DocxTemplate(str(template_path))
    tpl.render(context)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tpl.save(str(out_path))
    return _docx_to_pdf(out_path)


def generate_all(
    payload: dict,
    templates_dir: Path,
    output_dir: Path,
) -> list[Path]:
    """
    Gera todos os documentos selecionados.
    Retorna lista de caminhos gerados.
    """
    context      = build_context(payload)
    docs         = payload.get("docs", {})
    contract_type = payload.get("contractType", "emprestimo")
    client_name  = payload.get("client", {}).get("nome", "cliente").title()

    # Pasta de saída: output_dir / nome_cliente_data
    today_str = date.today().strftime("%Y%m%d")
    safe_name = "".join(c for c in client_name if c.isalnum() or c in " _-").strip()[:40]
    out_folder = output_dir / f"{safe_name} {today_str}"
    out_folder.mkdir(parents=True, exist_ok=True)

    generated: list[Path] = []

    # Contrato
    if docs.get("contrato"):
        key = TEMPLATE_KEYS.get(contract_type, "emprestimo")
        tpl_path = templates_dir / f"{key}.docx"
        if not tpl_path.exists():
            raise FileNotFoundError(f"Template não encontrado: {tpl_path.name}\nAdicione-o na tela de Templates.")
        out = fill_template(tpl_path, context, out_folder / f"Contrato - {safe_name}.docx")
        generated.append(out)

    # Procuração
    if docs.get("procuracao"):
        tpl_path = templates_dir / "procuracao.docx"
        if not tpl_path.exists():
            raise FileNotFoundError("Template de Procuração não encontrado.")
        out = fill_template(tpl_path, context, out_folder / "Procuracao.docx")
        generated.append(out)

    # Hipossuficiência
    if docs.get("hipo"):
        tpl_path = templates_dir / "hipo.docx"
        if not tpl_path.exists():
            raise FileNotFoundError("Template de Hipossuficiência não encontrado.")
        out = fill_template(tpl_path, context, out_folder / "Hipossuficiencia.docx")
        generated.append(out)

    return generated, out_folder
