# Guia de Placeholders — BLINDSAFE Contratos v2

Cada arquivo .docx desta pasta é um template.
Substitua os dados reais do cliente pelos marcadores abaixo.

## Arquivos esperados

| Arquivo              | Tipo                    |
|----------------------|-------------------------|
| emprestimo.docx      | Empréstimo Bancário     |
| veiculo.docx         | Veículo                 |
| fiscal.docx          | Execução Fiscal         |
| condominio.docx      | Condomínio              |
| condominio_aluguel.docx | Condomínio + Aluguel |
| rural.docx           | Rural / Agro            |
| procuracao.docx      | Procuração              |
| hipo.docx            | Hipossuficiência        |

---

## Placeholders — Dados do Cliente

| Marcador           | O que coloca                                      |
|--------------------|---------------------------------------------------|
| {{nome}}           | NOME COMPLETO EM MAIÚSCULAS                       |
| {{nacionalidade}}  | brasileiro / brasileira                           |
| {{estado_civil}}   | solteiro, casado, divorciado...                   |
| {{profissao}}      | profissão do cliente                              |
| {{cpf}}            | 000.000.000-00                                    |
| {{rg}}             | número do RG/CNH (pode ficar vazio)               |
| {{email}}          | email do cliente                                  |
| {{telefone}}       | telefone do cliente                               |
| {{rua}}            | Rua + número + complemento                        |
| {{bairro}}         | bairro                                            |
| {{cidade}}         | cidade                                            |
| {{uf}}             | estado (ex: RJ)                                   |
| {{cep}}            | CEP                                               |
| {{bloco_cliente}}  | Parágrafo completo de identificação (substitui    |
|                    | o bloco "NOME, brasileiro, solteiro, inscrito...") |
| {{local_data}}     | "Florianópolis, 07 de abril de 2026." (automático)|

---

## Placeholders — Processo/Dívida (1 processo)

| Marcador               | O que coloca                        |
|------------------------|-------------------------------------|
| {{banco}}              | Nome do banco/cooperativa           |
| {{divida}}             | R$ valor da dívida atual            |
| {{valor_parcela_banco}}| R$ valor da parcela do banco        |
| {{parcelas_totais}}    | Total de parcelas                   |
| {{parcelas_pagas}}     | Parcelas pagas                      |
| {{parcelas_abertas}}   | Parcelas em aberto                  |
| {{parcelas_vencidas}}  | Parcelas vencidas                   |
| {{existe_processo}}    | "Não" ou "Sim, 0000000-00.0000..."  |

### Múltiplos processos (loop Jinja)

Para contratos com mais de um processo, use loop na tabela:

```
{% for p in processos %}
Banco: {{p.banco}}
Dívida: {{p.divida}}
Parcelas Totais: {{p.parcelas_totais}}
Processo: {{p.existe_processo}}
{% endfor %}
```

---

## Placeholders — Cláusula 6 (Pagamento)

Substitua TODO o texto das cláusulas 6.1 e 6.2 pelos marcadores:

```
{{clausula_6_1}}

{{clausula_6_2}}
```

O app gera o texto correto automaticamente conforme a modalidade
(boleto, cartão ou à vista). Quando for à vista ou cartão,
{{clausula_6_2}} fica vazio e não aparece no documento.

---

## Placeholders — Quadro Resumo (Seção 3)

| Marcador          | O que coloca                                      |
|-------------------|---------------------------------------------------|
| {{custos_desc}}   | Ex: "ENTRADA DE R$500 + 5X DE R$500"              |
| {{parcelamento}}  | "Boleto", "Crédito" ou vazio (à vista)            |
| {{n_parcelas_qr}} | Número total de parcelas                          |

---

## Placeholders — Veículo (só veiculo.docx)

| Marcador                | O que coloca                          |
|-------------------------|---------------------------------------|
| {{veiculo_marca_modelo}}| VW - VOLKSWAGEN GOL CITY 1.0 FLEX 8V |
| {{veiculo_ano}}         | 2015                                  |
| {{veiculo_placa}}       | AYV2H79                               |
| {{veiculo_cor}}         | BRANCA                                |
| {{veiculo_renavam}}     | 1019855522                            |
| {{veiculo_obs}}         | observação sobre o veículo            |

---

## Exemplo de uso no Word

1. Abra o arquivo .docx original
2. Use Ctrl+H (Localizar e Substituir)
3. Substitua "NOME DO CLIENTE AQUI" por {{nome}}
4. Substitua o bloco de identificação inteiro por {{bloco_cliente}}
5. Substitua as cláusulas 6.1 e 6.2 por {{clausula_6_1}} e {{clausula_6_2}}
6. Salve o arquivo com o nome correto (ex: emprestimo.docx)
7. Copie para esta pasta templates/
