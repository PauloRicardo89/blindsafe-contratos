import { useState, useEffect } from 'react'
import { FileDown, Loader } from 'lucide-react'
import { Card, SectionTitle, Field, Input, Select, Btn } from './ui'

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const TIPOS_ACAO = [
  'Execução de Título Extrajudicial',
  'Busca e Apreensão de Veículo',
  'Execução Fiscal',
  'Ação de Cobrança — Condomínio',
  'Ação de Cobrança — Aluguel',
]

function fmtBRL(v) {
  const n = v.replace(/\D/g, '')
  if (!n) return ''
  const cents = parseInt(n, 10)
  const reais = (cents / 100).toFixed(2)
  const [int, dec] = reais.split('.')
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec
}

function fmtOnlyNum(v) { return v.replace(/\D/g, '') }

function brlToFloat(s) {
  try { return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0 }
  catch { return 0 }
}

function floatToBRL(v) {
  if (!v || isNaN(v)) return ''
  return v.toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    .split(',').reverse().join(',')
    .split('.').reverse().join('.')
}

// Formata número como BRL sem usar toLocaleString (evita inconsistências)
function calcBRL(v) {
  if (!v || isNaN(v) || v <= 0) return ''
  const s = Math.round(v * 100).toString().padStart(3, '0')
  const dec = s.slice(-2)
  let int = s.slice(0, -2)
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return int + ',' + dec
}

function pyapi(fn, ...args) {
  if (window.pywebview?.api) return window.pywebview.api[fn](...args)
  return Promise.resolve({ ok: true, path: 'C:/saida/proposta.pdf' })
}

export default function PropostaForm() {
  const today = new Date()
  const [form, setForm] = useState({
    solicitante_nome:    '',
    solicitante_empresa: '',
    assunto:             TIPOS_ACAO[0],
    assunto_custom:      '',
    mes:                 String(today.getMonth()),   // índice 0-11
    ano:                 String(today.getFullYear()),
    op1_valor_total:     '',
    op1_entrada:         '',
    op1_n_parcelas:      '',
    op2_avista:          '',
    op2_n_parcelas:      '',
    formato:             'pdf',
  })
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading]     = useState(false)

  // ── Cálculos automáticos ────────────────────────────────────────────────────

  // Opção 1: valor_parcela = (total - entrada) / n_parcelas
  const op1Total = brlToFloat(form.op1_valor_total)
  const op1Ent   = brlToFloat(form.op1_entrada)
  const op1Np    = parseInt(form.op1_n_parcelas) || 0
  const op1Vp    = op1Np > 0 ? (op1Total - op1Ent) / op1Np : 0

  // Opção 2: valor_parcela = avista / n_parcelas
  const op2Av = brlToFloat(form.op2_avista)
  const op2Np = parseInt(form.op2_n_parcelas) || 0
  const op2Vp = op2Np > 0 ? op2Av / op2Np : 0

  // Economia = total boleto - avista cartão
  const economia = op1Total > 0 && op2Av > 0 ? op1Total - op2Av : 0

  const f = (k) => (v) => setForm(prev => ({ ...prev, [k]: v }))

  const dataProposta = `${MESES[parseInt(form.mes)]} de ${form.ano}`
  const assuntoFinal = form.assunto === '__outro__' ? form.assunto_custom : form.assunto

  const handleGerar = async () => {
    if (!form.solicitante_nome) { alert('Preencha o nome do solicitante.'); return }
    if (!form.op1_valor_total)  { alert('Preencha o valor total da Opção 1.'); return }
    if (!form.op2_avista)       { alert('Preencha o valor à vista da Opção 2.'); return }

    setLoading(true)
    setResultado(null)
    try {
      const payload = {
        solicitante_nome:    form.solicitante_nome.toUpperCase(),
        solicitante_empresa: form.solicitante_empresa.toUpperCase(),
        assunto:             assuntoFinal,
        data_proposta:       dataProposta,
        op1_valor_total:     form.op1_valor_total,
        op1_entrada:         form.op1_entrada,
        op1_n_parcelas:      form.op1_n_parcelas,
        op1_valor_parcela:   calcBRL(op1Vp),
        op2_avista:          form.op2_avista,
        op2_n_parcelas:      form.op2_n_parcelas,
        op2_valor_parcela:   calcBRL(op2Vp),
        formato:             form.formato,
      }
      const res = await pyapi('generate_proposta_doc', payload)
      setResultado(res)
    } catch (e) {
      setResultado({ ok: false, error: String(e) })
    } finally {
      setLoading(false)
    }
  }

  const handleLimpar = () => {
    if (!confirm('Limpar todos os campos?')) return
    setForm({
      solicitante_nome: '', solicitante_empresa: '', assunto: TIPOS_ACAO[0],
      assunto_custom: '', mes: String(today.getMonth()), ano: String(today.getFullYear()),
      op1_valor_total: '', op1_entrada: '', op1_n_parcelas: '',
      op2_avista: '', op2_n_parcelas: '', formato: 'pdf',
    })
    setResultado(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Proposta de Honorários</h1>
          <p className="text-sm text-brand-muted mt-0.5">Preencha os dados e gere a proposta em PDF</p>
        </div>
        <Btn variant="ghost" onClick={handleLimpar}>Limpar</Btn>
      </div>

      {/* Solicitante */}
      <Card className="p-6">
        <SectionTitle>Solicitante</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome do Cliente" required className="col-span-2">
            <Input value={form.solicitante_nome}
              onChange={e => f('solicitante_nome')(e.target.value.toUpperCase())}
              placeholder="NOME COMPLETO EM MAIÚSCULAS" />
          </Field>
          <Field label="Empresa (opcional)" className="col-span-2"
            hint="Preencha somente se o cliente for pessoa jurídica">
            <Input value={form.solicitante_empresa}
              onChange={e => f('solicitante_empresa')(e.target.value.toUpperCase())}
              placeholder="NOME DA EMPRESA LTDA" />
          </Field>
        </div>
      </Card>

      {/* Caso e data */}
      <Card className="p-6">
        <SectionTitle>Caso e Data</SectionTitle>
        <div className="grid grid-cols-2 gap-4">

          <Field label="Tipo de Ação" required className="col-span-2">
            <Select value={form.assunto} onChange={e => f('assunto')(e.target.value)}>
              {TIPOS_ACAO.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="__outro__">Outro (digitar)</option>
            </Select>
          </Field>

          {form.assunto === '__outro__' && (
            <Field label="Descreva o tipo de ação" required className="col-span-2">
              <Input value={form.assunto_custom}
                onChange={e => f('assunto_custom')(e.target.value)}
                placeholder="Ex: Ação Revisional de Contrato Bancário" />
            </Field>
          )}

          <Field label="Mês da Proposta" required>
            <Select value={form.mes} onChange={e => f('mes')(e.target.value)}>
              {MESES.map((m, i) => <option key={i} value={String(i)}>{m}</option>)}
            </Select>
          </Field>

          <Field label="Ano" required>
            <Input value={form.ano}
              onChange={e => f('ano')(fmtOnlyNum(e.target.value).slice(0, 4))}
              placeholder="2026" maxLength={4} />
          </Field>

        </div>
      </Card>

      {/* Opção 1 — Boleto */}
      <Card className="p-6">
        <SectionTitle>Opção 1 — Boleto Bancário</SectionTitle>
        <div className="grid grid-cols-2 gap-4">

          <Field label="Valor Total (R$)" required className="col-span-2">
            <Input value={form.op1_valor_total}
              onChange={e => f('op1_valor_total')(fmtBRL(e.target.value))}
              placeholder="0,00" />
          </Field>

          <Field label="Valor da Entrada (R$)" required>
            <Input value={form.op1_entrada}
              onChange={e => f('op1_entrada')(fmtBRL(e.target.value))}
              placeholder="0,00" />
          </Field>

          <Field label="Nº de Parcelas Restantes" required hint="Não conta a entrada">
            <Input value={form.op1_n_parcelas}
              onChange={e => f('op1_n_parcelas')(fmtOnlyNum(e.target.value))}
              placeholder="5" maxLength={2} />
          </Field>

          {op1Vp > 0 && (
            <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-xs text-brand-muted uppercase font-bold tracking-wide mb-1">Valor calculado por parcela</p>
              <p className="text-xl font-bold text-brand-dark">R$ {calcBRL(op1Vp)}</p>
              <p className="text-xs text-brand-muted mt-0.5">
                (R$ {form.op1_valor_total} − R$ {form.op1_entrada}) ÷ {form.op1_n_parcelas} parcelas
              </p>
            </div>
          )}

        </div>
      </Card>

      {/* Opção 2 — Cartão */}
      <Card className="p-6">
        <SectionTitle>Opção 2 — Cartão de Crédito</SectionTitle>
        <div className="grid grid-cols-2 gap-4">

          <Field label="Valor à Vista (R$)" required>
            <Input value={form.op2_avista}
              onChange={e => f('op2_avista')(fmtBRL(e.target.value))}
              placeholder="0,00" />
          </Field>

          <Field label="Nº de Parcelas (sem juros)" required>
            <Input value={form.op2_n_parcelas}
              onChange={e => f('op2_n_parcelas')(fmtOnlyNum(e.target.value))}
              placeholder="6" maxLength={2} />
          </Field>

          {op2Vp > 0 && (
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-xs text-brand-muted uppercase font-bold tracking-wide mb-1">Valor por parcela</p>
                <p className="text-xl font-bold text-brand-dark">R$ {calcBRL(op2Vp)}</p>
                <p className="text-xs text-brand-muted mt-0.5">
                  R$ {form.op2_avista} ÷ {form.op2_n_parcelas}x
                </p>
              </div>
              {economia > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-green-700 uppercase font-bold tracking-wide mb-1">Economia vs. boleto</p>
                  <p className="text-xl font-bold text-green-700">R$ {calcBRL(economia)}</p>
                  <p className="text-xs text-green-600 mt-0.5">pagando à vista no cartão</p>
                </div>
              )}
            </div>
          )}

        </div>
      </Card>

      {/* Formato */}
      <Card className="p-6">
        <SectionTitle>Formato do Arquivo</SectionTitle>
        <div className="flex gap-3">
          {[
            { value: 'pdf',  label: 'PDF',   hint: 'Requer PowerPoint instalado' },
            { value: 'pptx', label: 'PowerPoint (.pptx)', hint: 'Abre em qualquer versão do Office' },
          ].map(({ value, label, hint }) => (
            <button key={value} onClick={() => f('formato')(value)}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium border-2 text-left transition-all ${
                form.formato === value
                  ? 'bg-brand-dark border-brand-dark text-white'
                  : 'bg-white border-amber-200 text-brand-muted hover:border-brand-dark'
              }`}>
              <div className="font-semibold">{label}</div>
              <div className={`text-xs mt-0.5 ${form.formato === value ? 'text-white/60' : 'text-gray-400'}`}>{hint}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Resultado */}
      {resultado && (
        <Card className={`p-4 border-2 ${resultado.ok ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          {resultado.ok ? (
            <div>
              <p className="text-green-700 font-semibold text-sm">✓ Proposta gerada com sucesso!</p>
              <p className="text-green-600 text-xs mt-1 font-mono">{resultado.path}</p>
              <Btn variant="primary" className="mt-3 text-xs"
                onClick={() => pyapi('open_folder', resultado.path)}>
                Abrir Pasta
              </Btn>
            </div>
          ) : (
            <p className="text-red-600 text-sm font-medium">Erro: {resultado.error}</p>
          )}
        </Card>
      )}

      {/* Botão gerar */}
      <div className="flex justify-end pb-8">
        <Btn variant="dark" onClick={handleGerar} disabled={loading} className="px-8 py-3 text-base">
          {loading
            ? <><Loader size={16} className="animate-spin" /> Gerando...</>
            : <><FileDown size={16} /> Gerar Proposta</>}
        </Btn>
      </div>

    </div>
  )
}
