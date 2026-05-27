"""
make_proposta_template.py
Cria templates/proposta.pptx a partir do arquivo original.
Substitui os dados de exemplo por marcadores {{PLACEHOLDER}}.
Execute uma vez sempre que o design do original for atualizado.
"""
from pathlib import Path
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

SRC  = Path(r"C:\Users\prpau\OneDrive\Desktop\Propostas de Honorarios\proposta_A4.pptx")
DEST = Path(__file__).parent / "templates" / "proposta.pptx"

# Ordem importa: strings mais longas/específicas primeiro.
# NÃO usar break após o primeiro match — um parágrafo pode conter
# múltiplos placeholders (ex: "Total: R$ 2.502,00\nem 6 parcelas mensais").
REPLACEMENTS = [
    ("Economia de R$ 500,00 em relação ao parcelado por boleto. Aprovação rápida.", "{{OP2_ECONOMIA_LONGA}}"),
    ("Hirata Sistemas Rurais e TI Ltda",     "{{SOLICITANTE_EMPRESA}}"),
    ("Até 6 parcelas sem juros adicionais",  "{{OP2_PARCELAS_SEM_JUROS}}"),
    ("Execução de Título Extrajudicial",     "{{ASSUNTO}}"),
    ("Anderson Hirata de Moura",             "{{SOLICITANTE_NOME}}"),
    ("Economia de R$ 500,00",               "{{OP2_ECONOMIA_CURTA}}"),
    ("Total: R$ 2.502,00",                  "{{OP2_TOTAL}}"),        # antes de "em 6 parcelas"
    ("em 6 parcelas mensais",               "{{OP2_PARCELAS_MENSAIS}}"),
    ("5x R$ 500,00",                        "{{OP1_PARCELAS}}"),     # antes de "R$ 500,00"
    ("Abril de 2026",                       "{{DATA_PROPOSTA}}"),
    ("Até 6x de",                           "{{OP2_ATE_PARCELAS}}"),
    ("R$ 3.000,00",                         "{{OP1_VALOR_TOTAL}}"),
    ("R$ 2.500,00",                         "{{OP2_AVISTA}}"),
    ("R$ 500,00",                           "{{OP1_ENTRADA}}"),
    ("R$ 417,00",                           "{{OP2_VALOR_PARCELA}}"),
]


def _replace_para(para, old: str, new: str) -> bool:
    """Substitui old→new no parágrafo, consolidando runs no primeiro. Retorna True se achou."""
    full = "".join(r.text or "" for r in para.runs)
    if not full or old not in full:
        return False
    new_full = full.replace(old, new)
    if para.runs:
        para.runs[0].text = new_full
        for r in para.runs[1:]:
            r.text = ""
    return True


def _process_shapes(shapes, replaced: dict) -> None:
    for shape in shapes:
        if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
            _process_shapes(shape.shapes, replaced)
        elif shape.has_text_frame:
            for para in shape.text_frame.paragraphs:
                for old, new in REPLACEMENTS:          # sem break: múltiplos matches por parágrafo
                    if _replace_para(para, old, new):
                        replaced[old] = replaced.get(old, 0) + 1


def main() -> None:
    if not SRC.exists():
        print(f"Arquivo original não encontrado: {SRC}")
        return

    prs = Presentation(str(SRC))
    replaced: dict[str, int] = {}

    for slide in prs.slides:
        _process_shapes(slide.shapes, replaced)

    DEST.parent.mkdir(exist_ok=True)
    prs.save(str(DEST))

    print(f"Template salvo em: {DEST}\n")
    print("Substituições realizadas:")
    for old, count in replaced.items():
        print(f"  [{count}x] {old!r}")

    missing = [old for old, _ in REPLACEMENTS if old not in replaced]
    if missing:
        print("\nAVISO — padrões não encontrados:")
        for m in missing:
            print(f"  - {m!r}")


if __name__ == "__main__":
    main()
