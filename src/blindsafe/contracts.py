from dataclasses import dataclass, field


@dataclass(frozen=True)
class ContractTemplate:
    slug: str
    label: str
    file_names: list[str]
    reference_url: str

    @property
    def primary_file_name(self) -> str:
        return self.file_names[0]


@dataclass(frozen=True)
class SupportingTemplate:
    key: str
    label: str
    file_names: list[str] = field(default_factory=list)

    @property
    def primary_file_name(self) -> str:
        return self.file_names[0]


CONTRACT_TEMPLATES = {
    "execucao_titulo_monitoria": ContractTemplate(
        slug="execucao_titulo_monitoria",
        label="Execucao de titulo / Monitoria",
        file_names=["CPS EMPRESTIMO BLINDSAFE.docx"],
        reference_url="https://blindsafe.bitrix24.com.br/disk/file/GeK2pq0BziE02ES6x0Lg",
    ),
    "busca_apreensao": ContractTemplate(
        slug="busca_apreensao",
        label="Busca e apreensao",
        file_names=["CPS VEICULO BLINDSAFE.docx"],
        reference_url="https://blindsafe.bitrix24.com.br/disk/file/HRsvl8y2W1ran96WF3wk",
    ),
    "execucao_fiscal": ContractTemplate(
        slug="execucao_fiscal",
        label="Execucao Fiscal",
        file_names=["CPS EXECUCAO FISCAL.docx", "CPS EXECUÇÃO FISCAL.docx"],
        reference_url="https://blindsafe.bitrix24.com.br/disk/file/7Blr7o8kJ6y29YWXYXeP",
    ),
    "condominio": ContractTemplate(
        slug="condominio",
        label="Condominio",
        file_names=["CPS CONDOMINIO BLINDSAFE.docx", "CPS CONDOMÍNIO BLINDSAFE.docx"],
        reference_url="https://blindsafe.bitrix24.com.br/disk/file/hh23KeAQx52VxA40m9Gi",
    ),
    "condominio_aluguel": ContractTemplate(
        slug="condominio_aluguel",
        label="Condominio + Aluguel",
        file_names=["CPS CONDOMINIO + ALUGUEL BLINDSAFE.docx", "CPS CONDOMÍNIO + ALUGUEL BLINDSAFE.docx"],
        reference_url="https://blindsafe.bitrix24.com.br/disk/file/1ZvqfD5Y8hQF54GDT70s",
    ),
}


SUPPORTING_TEMPLATES = {
    "procuracao": SupportingTemplate(
        key="procuracao",
        label="Procuracao",
        file_names=["Procuração Luiz e Leo.docx", "Procuracao Luiz e Leo.docx"],
    ),
    "hipossuficiencia": SupportingTemplate(
        key="hipossuficiencia",
        label="Hipossuficiencia",
        file_names=["HIPOSSUFICIENCIA NOVO.docx", "HIPOSSUFICIENCIA NOVO.DOCX"],
    ),
}
