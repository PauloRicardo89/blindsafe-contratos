# BLINSAFE Contratos

Aplicativo desktop em Python para a equipe comercial:

- recebe a peticao inicial e o contrato do cliente com o banco em PDF
- extrai os dados principais desses documentos
- baixa o modelo oficial atualizado no Bitrix
- preenche o template em DOCX
- gera a versao final em DOCX e PDF

## Modalidades configuradas

- Execucao de titulo / Monitoria -> CPD EMPRESTIMO BLINDSAFE.docx
- Busca e apreensao -> CPS VEICULO BLINDSAFE.docx
- Execucao Fiscal -> CPS EXECUCAO FISCAL.docx
- Condominio -> CPS CONDOMINIO BLINDSAFE.docx
- Condominio + Aluguel -> CPS CONDOMINIO + ALUGUEL BLINDSAFE.docx

Documentos adicionais:

- Procuracao Luiz e Leo.docx
- HIPOSSUFICIENCIA NOVO.docx

## Requisitos

- Python 3.11+
- acesso ao webhook do Bitrix com permissao Disk
- acesso do usuario do webhook as pastas dos modelos
- Microsoft Word ou LibreOffice instalado para conversao em PDF

## Instalacao

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

## Configuracao no app

No painel lateral informe:

- Webhook do Bitrix
- Referencia da pasta principal dos contratos
- Referencia da pasta Procuracao e Hipo
- pasta local de saida

As referencias de pasta aceitam 3 formatos:

- ID numerico: `123`
- Nome exato da pasta: `name:Modelos Contratos`
- Caminho da pasta: `path:Juridico/Modelos/Contratos`

Importante: por seguranca, se houver ambiguidade de nome/caminho o app interrompe o fluxo para evitar baixar documento incorreto.

O arquivo local_config.json e salvo localmente para cada usuario.

## Como o Bitrix e usado

O app usa os metodos:

- disk.folder.getchildren
- disk.file.get

Fluxo:

1. lista os arquivos da pasta configurada
2. encontra o template pelo nome do arquivo
3. usa DOWNLOAD_URL retornada pela API para baixar o DOCX

## Placeholders esperados nos templates DOCX

Os modelos no Bitrix precisam conter placeholders Jinja/docxtpl, por exemplo:

- {{ nome_cliente }}
- {{ cpf_cliente }}
- {{ endereco_cliente }}
- {{ banco_nome }}
- {{ numero_contrato_banco }}
- {{ valor_contrato_banco }}
- {{ parcelas }}
- {{ data_contrato_banco }}
- {{ numero_processo }}
- {{ vara_comarca }}
- {{ tipo_contrato }}
- {{ data_geracao }}

## Observacoes importantes

- a extracao dos PDFs e automatica, mas precisa de conferencia humana
- PDFs escaneados podem precisar de OCR em uma proxima fase
- se o nome real de algum arquivo no Bitrix estiver diferente, ajuste em src/blindsafe/contracts.py
