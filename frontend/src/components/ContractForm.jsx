import { useState } from 'react'
import { Plus, Trash2, FileDown, ChevronDown, ChevronUp, Loader } from 'lucide-react'
import { Card, SectionTitle, Field, Input, Select, Btn, Checkbox } from './ui'

// ─── Valores iniciais ────────────────────────────────────────────────────────

const EMPTY_CLIENT = {
  nome: '', nacionalidade: 'brasileiro', estado_civil: 'solteiro',
  profissao: '', cpf: '', rg: '',
  rua: '', bairro: '', complemento: '', cidade: '', uf: '', cep: '',
  email: '', telefone: '',
}

const EMPTY_PROCESS = {
  banco: '', divida: '', valor_parcela: '', parcelas_totais: '',
  parcelas_pagas: '', parcelas_abertas: '', parcelas_vencidas: '',
  existe_processo: 'nao', numero_processo: '',
}

const EMPTY_VEHICLE = {
  marca_modelo: '', ano: '', placa: '', cor: '', renavam: '', observacao: '',
}

const EMPTY_PAYMENT_BOLETO = {
  tipo: 'boleto', valor_total: '', valor_entrada: '', data_entrada: '',
  n_parcelas: '', valor_parcela: '',
}

const EMPTY_PAYMENT_CARTAO = {
  tipo: 'cartao', valor_total: '', n_parcelas: '', valor_parcela: '', data: '',
}

const EMPTY_PAYMENT_AVISTA = {
  tipo: 'avista', valor_total: '', data: '',
}

// ─── Contrato tipos ──────────────────────────────────────────────────────────

const CONTRACT_TYPES = [
  { value: 'emprestimo',      label: 'Empréstimo Bancário' },
  { value: 'veiculo',         label: 'Veículo (Financiamento)' },
  { value: 'fiscal',          label: 'Execução Fiscal' },
  { value: 'condominio',      label: 'Condomínio' },
  { value: 'condominio_aluguel', label: 'Condomínio + Aluguel' },
  { value: 'rural',           label: 'Rural / Agro' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pyapi(fn, ...args) {
  if (window.pywebview?.api) return window.pywebview.api[fn](...args)
  // modo dev: simula resposta
  console.warn('pywebview não disponível — modo dev')
  return Promise.resolve({ ok: true, path: 'C:/saida/contrato.docx' })
}

// ─── Seção: Dados do Cliente ─────────────────────────────────────────────────

function ClientSection({ data, onChange }) {
  const f = (k) => (v) => onChange({ ...data, [k]: v })
  return (
    <Card className="p-6">
      <SectionTitle>Dados do Cliente</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nome Completo" required className="col-span-2">
          <Input value={data.nome} onChange={e => f('nome')(e.target.value.toUpperCase())}
            placeholder="NOME COMPLETO EM MAIÚSCULAS" />
        </Field>
        <Field label="Nacionalidade">
          <Select value={data.nacionalidade} onChange={e => f('nacionalidade')(e.target.value)}>
            <option value="brasileiro">Brasileiro</option>
            <option value="brasileira">Brasileira</option>
            <option value="estrangeiro">Estrangeiro</option>
            <option value="estrangeira">Estrangeira</option>
          </Select>
        </Field>
        <Field label="Estado Civil">
          <Select value={data.estado_civil} onChange={e => f('estado_civil')(e.target.value)}>
            <option value="solteiro">Solteiro(a)</option>
            <option value="casado">Casado(a)</option>
            <option value="divorciado">Divorciado(a)</option>
            <option value="viuvo">Viúvo(a)</option>
            <option value="uniao_estavel">União Estável</option>
          </Select>
        </Field>
        <Field label="Profissão" required>
          <Input value={data.profissao} onChange={e => f('profissao')(e.target.value)}
            placeholder="ex: empresário, auxiliar de produção..." />
        </Field>
        <Field label="CPF" required>
          <Input value={data.cpf} onChange={e => f('cpf')(e.target.value)}
            placeholder="000.000.000-00" maxLength={14} />
        </Field>
        <Field label="RG / CNH">
          <Input value={data.rg} onChange={e => f('rg')(e.target.value)}
            placeholder="Número do documento" />
        </Field>
        <Field label="E-mail">
          <Input value={data.email} onChange={e => f('email')(e.target.value)}
            placeholder="email@exemplo.com" type="email" />
        </Field>
        <Field label="Telefone">
          <Input value={data.telefone} onChange={e => f('telefone')(e.target.value)}
            placeholder="(21) 9 9999-9999" />
        </Field>
      </div>

      <div className="mt-4 pt-4 border-t border-amber-200/60">
        <p className="text-xs font-bold text-brand-dark/50 uppercase tracking-wider mb-3">Endereço</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Rua / Av. + Número" required className="col-span-2">
            <Input value={data.rua} onChange={e => f('rua')(e.target.value)}
              placeholder="Rua Exemplo, nº 100, Apto 101" />
          </Field>
          <Field label="Bairro">
            <Input value={data.bairro} onChange={e => f('bairro')(e.target.value)}
              placeholder="Nome do Bairro" />
          </Field>
          <Field label="Complemento">
            <Input value={data.complemento} onChange={e => f('complemento')(e.target.value)}
              placeholder="Bloco, sala, etc." />
          </Field>
          <Field label="Cidade" required>
            <Input value={data.cidade} onChange={e => f('cidade')(e.target.value)}
              placeholder="Nome da Cidade" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="UF" required>
              <Input value={data.uf} onChange={e => f('uf')(e.target.value.toUpperCase())}
                placeholder="RJ" maxLength={2} />
            </Field>
            <Field label="CEP">
              <Input value={data.cep} onChange={e => f('cep')(e.target.value)}
                placeholder="00000-000" maxLength={9} />
            </Field>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ─── Seção: Processo(s) ──────────────────────────────────────────────────────

function ProcessCard({ proc, idx, onChange, onRemove, canRemove }) {
  const [open, setOpen] = useState(true)
  const f = (k) => (v) => onChange({ ...proc, [k]: v })

  return (
    <div className="border border-amber-200/60 rounded-xl bg-white overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-brand-bg cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-sm font-semibold text-brand-dark">
          Processo / Dívida {idx + 1}
          {proc.banco && <span className="ml-2 text-brand-muted font-normal">— {proc.banco}</span>}
        </span>
        <div className="flex items-center gap-2">
          {canRemove && (
            <button onClick={e => { e.stopPropagation(); onRemove() }}
              className="p-1 text-red-400 hover:text-red-600 rounded">
              <Trash2 size={14} />
            </button>
          )}
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {open && (
        <div className="p-4 grid grid-cols-2 gap-4">
          <Field label="Banco / Instituição" required className="col-span-2">
            <Input value={proc.banco} onChange={e => f('banco')(e.target.value.toUpperCase())}
              placeholder="NOME DO BANCO OU COOPERATIVA" />
          </Field>
          <Field label="Dívida Atual (R$)">
            <Input value={proc.divida} onChange={e => f('divida')(e.target.value)}
              placeholder="68.847,49" />
          </Field>
          <Field label="Valor da Parcela (R$)">
            <Input value={proc.valor_parcela} onChange={e => f('valor_parcela')(e.target.value)}
              placeholder="1.379,90" />
          </Field>
          <Field label="Parcelas Totais">
            <Input value={proc.parcelas_totais} onChange={e => f('parcelas_totais')(e.target.value)}
              placeholder="48" />
          </Field>
          <Field label="Parcelas Pagas">
            <Input value={proc.parcelas_pagas} onChange={e => f('parcelas_pagas')(e.target.value)}
              placeholder="13" />
          </Field>
          <Field label="Parcelas em Aberto">
            <Input value={proc.parcelas_abertas} onChange={e => f('parcelas_abertas')(e.target.value)}
              placeholder="35" />
          </Field>
          <Field label="Parcelas Vencidas">
            <Input value={proc.parcelas_vencidas} onChange={e => f('parcelas_vencidas')(e.target.value)}
              placeholder="0" />
          </Field>

          <div className="col-span-2 pt-2 border-t border-amber-100">
            <Field label="Existe Processo Judicial?">
              <Select value={proc.existe_processo} onChange={e => f('existe_processo')(e.target.value)}>
                <option value="nao">Não</option>
                <option value="sim_eles">Sim — eles entraram contra nós</option>
                <option value="sim_nos">Sim — nós entramos com a ação</option>
              </Select>
            </Field>
            {proc.existe_processo !== 'nao' && (
              <div className="mt-3">
                <Field label="Número do Processo">
                  <Input value={proc.numero_processo} onChange={e => f('numero_processo')(e.target.value)}
                    placeholder="0000000-00.0000.0.00.0000" />
                </Field>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ProcessesSection({ processes, onChange }) {
  const add = () => onChange([...processes, { ...EMPTY_PROCESS }])
  const remove = (i) => onChange(processes.filter((_, idx) => idx !== i))
  const update = (i, val) => onChange(processes.map((p, idx) => idx === i ? val : p))

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>Processo(s) / Dívida(s)</SectionTitle>
        <Btn variant="outline" onClick={add} className="text-xs py-1.5">
          <Plus size={14} /> Adicionar
        </Btn>
      </div>
      <div className="space-y-3">
        {processes.map((proc, i) => (
          <ProcessCard key={i} proc={proc} idx={i}
            onChange={val => update(i, val)}
            onRemove={() => remove(i)}
            canRemove={processes.length > 1} />
        ))}
      </div>
    </Card>
  )
}

// ─── Seção: Veículo ──────────────────────────────────────────────────────────

function VehicleSection({ data, onChange }) {
  const f = (k) => (v) => onChange({ ...data, [k]: v })
  return (
    <Card className="p-6">
      <SectionTitle>Dados do Veículo</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Marca / Modelo" required className="col-span-2">
          <Input value={data.marca_modelo} onChange={e => f('marca_modelo')(e.target.value.toUpperCase())}
            placeholder="VW - VOLKSWAGEN GOL CITY 1.0 MI FLEX 8V 2P" />
        </Field>
        <Field label="Ano/Modelo" required>
          <Input value={data.ano} onChange={e => f('ano')(e.target.value)}
            placeholder="2015" maxLength={4} />
        </Field>
        <Field label="Placa" required>
          <Input value={data.placa} onChange={e => f('placa')(e.target.value.toUpperCase())}
            placeholder="AYV2H79" maxLength={7} />
        </Field>
        <Field label="Cor">
          <Input value={data.cor} onChange={e => f('cor')(e.target.value.toUpperCase())}
            placeholder="BRANCA" />
        </Field>
        <Field label="RENAVAM">
          <Input value={data.renavam} onChange={e => f('renavam')(e.target.value)}
            placeholder="1019855522" />
        </Field>
        <Field label="Observação" className="col-span-2">
          <Input value={data.observacao} onChange={e => f('observacao')(e.target.value)}
            placeholder="ex: veículo não está no mesmo endereço do carnê de financiamento" />
        </Field>
      </div>
    </Card>
  )
}

// ─── Seção: Pagamento ────────────────────────────────────────────────────────

function PaymentSection({ data, onChange }) {
  const setTipo = (tipo) => {
    if (tipo === 'boleto') onChange({ ...EMPTY_PAYMENT_BOLETO })
    else if (tipo === 'cartao') onChange({ ...EMPTY_PAYMENT_CARTAO })
    else onChange({ ...EMPTY_PAYMENT_AVISTA })
  }
  const f = (k) => (v) => onChange({ ...data, [k]: v })

  return (
    <Card className="p-6">
      <SectionTitle>Pagamento dos Honorários</SectionTitle>

      {/* Seletor de tipo */}
      <div className="flex gap-2 mb-5">
        {[
          { v: 'boleto', l: 'Boleto / PIX Parcelado' },
          { v: 'cartao', l: 'Cartão de Crédito' },
          { v: 'avista', l: 'À Vista' },
        ].map(({ v, l }) => (
          <button key={v} onClick={() => setTipo(v)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
              data.tipo === v
                ? 'bg-brand-gold border-brand-gold text-white'
                : 'bg-white border-amber-200 text-brand-muted hover:border-brand-gold'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {/* Campos por tipo */}
      {data.tipo === 'boleto' && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor Total (R$)" required className="col-span-2">
            <Input value={data.valor_total} onChange={e => f('valor_total')(e.target.value)}
              placeholder="6.000,00" />
          </Field>
          <Field label="Valor da Entrada (R$)" required>
            <Input value={data.valor_entrada} onChange={e => f('valor_entrada')(e.target.value)}
              placeholder="1.000,00" />
          </Field>
          <Field label="Data da Entrada" required hint="Data da 1ª parcela — as demais são geradas automaticamente">
            <Input value={data.data_entrada} onChange={e => f('data_entrada')(e.target.value)}
              placeholder="24/04/2026" maxLength={10} />
          </Field>
          <Field label="Nº de Parcelas Restantes" required hint="Não conta a entrada">
            <Input value={data.n_parcelas} onChange={e => f('n_parcelas')(e.target.value)}
              placeholder="5" type="number" min="1" />
          </Field>
          <Field label="Valor de Cada Parcela (R$)" required>
            <Input value={data.valor_parcela} onChange={e => f('valor_parcela')(e.target.value)}
              placeholder="1.000,00" />
          </Field>
        </div>
      )}

      {data.tipo === 'cartao' && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor Total (R$)" required className="col-span-2">
            <Input value={data.valor_total} onChange={e => f('valor_total')(e.target.value)}
              placeholder="2.000,00" />
          </Field>
          <Field label="Nº de Parcelas" required>
            <Input value={data.n_parcelas} onChange={e => f('n_parcelas')(e.target.value)}
              placeholder="10" type="number" min="1" max="12" />
          </Field>
          <Field label="Valor de Cada Parcela (R$)">
            <Input value={data.valor_parcela} onChange={e => f('valor_parcela')(e.target.value)}
              placeholder="200,00" />
          </Field>
          <Field label="Data do Pagamento" required>
            <Input value={data.data} onChange={e => f('data')(e.target.value)}
              placeholder="11/05/2026" maxLength={10} />
          </Field>
        </div>
      )}

      {data.tipo === 'avista' && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor Total (R$)" required>
            <Input value={data.valor_total} onChange={e => f('valor_total')(e.target.value)}
              placeholder="3.000,00" />
          </Field>
          <Field label="Data do Pagamento" required>
            <Input value={data.data} onChange={e => f('data')(e.target.value)}
              placeholder="23/04/2026" maxLength={10} />
          </Field>
        </div>
      )}
    </Card>
  )
}

// ─── Seção: Documentos a Gerar ───────────────────────────────────────────────

function DocsSection({ docs, onChange }) {
  const toggle = (k) => onChange({ ...docs, [k]: !docs[k] })
  return (
    <Card className="p-6">
      <SectionTitle>Documentos a Gerar</SectionTitle>
      <div className="flex gap-6">
        <Checkbox label="Contrato" checked={docs.contrato} onChange={() => toggle('contrato')} />
        <Checkbox label="Procuração" checked={docs.procuracao} onChange={() => toggle('procuracao')} />
        <Checkbox label="Hipossuficiência" checked={docs.hipo} onChange={() => toggle('hipo')} />
      </div>
    </Card>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ContractForm() {
  const [client, setClient] = useState({ ...EMPTY_CLIENT })
  const [contractType, setContractType] = useState('emprestimo')
  const [processes, setProcesses] = useState([{ ...EMPTY_PROCESS }])
  const [vehicle, setVehicle] = useState({ ...EMPTY_VEHICLE })
  const [payment, setPayment] = useState({ ...EMPTY_PAYMENT_BOLETO })
  const [docs, setDocs] = useState({ contrato: true, procuracao: true, hipo: false })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleGenerate = async () => {
    if (!client.nome || !client.cpf || !client.cidade) {
      alert('Preencha pelo menos: Nome, CPF e Cidade.')
      return
    }
    if (!docs.contrato && !docs.procuracao && !docs.hipo) {
      alert('Selecione pelo menos um documento para gerar.')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await pyapi('generate_documents', {
        client, contractType, processes,
        vehicle: contractType === 'veiculo' ? vehicle : null,
        payment, docs,
      })
      setResult(res)
    } catch (e) {
      setResult({ ok: false, error: String(e) })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    if (!confirm('Limpar todos os campos?')) return
    setClient({ ...EMPTY_CLIENT })
    setContractType('emprestimo')
    setProcesses([{ ...EMPTY_PROCESS }])
    setVehicle({ ...EMPTY_VEHICLE })
    setPayment({ ...EMPTY_PAYMENT_BOLETO })
    setDocs({ contrato: true, procuracao: true, hipo: false })
    setResult(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Novo Contrato</h1>
          <p className="text-sm text-brand-muted mt-0.5">Preencha os dados e gere os documentos</p>
        </div>
        <Btn variant="ghost" onClick={handleReset}>Limpar</Btn>
      </div>

      {/* Tipo de Contrato */}
      <Card className="p-6">
        <SectionTitle>Tipo de Contrato</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {CONTRACT_TYPES.map(({ value, label }) => (
            <button key={value} onClick={() => setContractType(value)}
              className={`py-2.5 px-3 rounded-lg text-sm font-medium border-2 text-left transition-all ${
                contractType === value
                  ? 'bg-brand-dark border-brand-dark text-white'
                  : 'bg-white border-amber-200 text-brand-muted hover:border-brand-dark'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </Card>

      <ClientSection data={client} onChange={setClient} />

      {contractType === 'veiculo' && (
        <VehicleSection data={vehicle} onChange={setVehicle} />
      )}

      <ProcessesSection processes={processes} onChange={setProcesses} />

      <PaymentSection data={payment} onChange={setPayment} />

      <DocsSection docs={docs} onChange={setDocs} />

      {/* Resultado */}
      {result && (
        <Card className={`p-4 border-2 ${result.ok ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          {result.ok ? (
            <div>
              <p className="text-green-700 font-semibold text-sm">✓ Documentos gerados com sucesso!</p>
              <p className="text-green-600 text-xs mt-1 font-mono">{result.path}</p>
              <Btn variant="primary" className="mt-3 text-xs" onClick={() => pyapi('open_folder', result.path)}>
                Abrir Pasta
              </Btn>
            </div>
          ) : (
            <p className="text-red-600 text-sm font-medium">Erro: {result.error}</p>
          )}
        </Card>
      )}

      {/* Botão Gerar */}
      <div className="flex justify-end pb-8">
        <Btn variant="dark" onClick={handleGenerate} disabled={loading} className="px-8 py-3 text-base">
          {loading ? <><Loader size={16} className="animate-spin" /> Gerando...</> : <><FileDown size={16} /> Gerar Documentos</>}
        </Btn>
      </div>
    </div>
  )
}
