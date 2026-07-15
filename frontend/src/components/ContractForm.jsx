import { useState } from 'react'
import { Plus, Trash2, FileDown, ChevronDown, ChevronUp, Loader } from 'lucide-react'
import { Card, SectionTitle, Field, Input, Select, Btn, Checkbox } from './ui'

// ─── UFs brasileiras ─────────────────────────────────────────────────────────
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
             'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
             'SP','SE','TO']

// ─── Formatadores ─────────────────────────────────────────────────────────────

function fmtCEP(v) {
  const n = v.replace(/\D/g, '').slice(0, 8)
  return n.length > 5 ? `${n.slice(0,5)}-${n.slice(5)}` : n
}

function fmtCPF(v) {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 3) return n
  if (n.length <= 6) return `${n.slice(0,3)}.${n.slice(3)}`
  if (n.length <= 9) return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6)}`
  return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`
}

function fmtBRL(v) {
  // Remove tudo que não for dígito
  const n = v.replace(/\D/g, '')
  if (!n) return ''
  // Converte para centavos e formata
  const cents = parseInt(n, 10)
  const reais = (cents / 100).toFixed(2)
  const [int, dec] = reais.split('.')
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${intFmt},${dec}`
}

function fmtOnlyNum(v) {
  return v.replace(/\D/g, '')
}

function fmtCNPJ(v) {
  const n = v.replace(/\D/g, '').slice(0, 14)
  if (n.length <= 2)  return n
  if (n.length <= 5)  return `${n.slice(0,2)}.${n.slice(2)}`
  if (n.length <= 8)  return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5)}`
  if (n.length <= 12) return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5,8)}/${n.slice(8)}`
  return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5,8)}/${n.slice(8,12)}-${n.slice(12)}`
}

function fmtTelefone(v) {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 2) return n.length ? `(${n}` : n
  if (n.length <= 7) return `(${n.slice(0,2)}) ${n.slice(2)}`
  return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`
}

function fmtDate(v) {
  const n = v.replace(/\D/g, '').slice(0, 8)
  if (n.length <= 2) return n
  if (n.length <= 4) return `${n.slice(0,2)}/${n.slice(2)}`
  return `${n.slice(0,2)}/${n.slice(2,4)}/${n.slice(4)}`
}

// Formato CNJ: 0000000-00.0000.0.00.0000
function fmtProcesso(v) {
  const n = v.replace(/\D/g, '').slice(0, 20)
  if (n.length <= 7)  return n
  if (n.length <= 9)  return `${n.slice(0,7)}-${n.slice(7)}`
  if (n.length <= 13) return `${n.slice(0,7)}-${n.slice(7,9)}.${n.slice(9)}`
  if (n.length <= 14) return `${n.slice(0,7)}-${n.slice(7,9)}.${n.slice(9,13)}.${n.slice(13)}`
  if (n.length <= 16) return `${n.slice(0,7)}-${n.slice(7,9)}.${n.slice(9,13)}.${n.slice(13,14)}.${n.slice(14)}`
  return `${n.slice(0,7)}-${n.slice(7,9)}.${n.slice(9,13)}.${n.slice(13,14)}.${n.slice(14,16)}.${n.slice(16)}`
}

// ─── Valores iniciais ────────────────────────────────────────────────────────

const EMPTY_CLIENT = {
  nome: '', nacionalidade: 'brasileiro', estado_civil: 'solteiro',
  profissao: '', cpf: '', rg: '',
  rua: '', bairro: '', complemento: '', cidade: '', uf: 'RJ', cep: '',
  email: '', telefone: '',
}

const EMPTY_PROCESS = {
  banco: '', divida: '', valor_parcela: '', parcelas_totais: '',
  parcelas_pagas: '', parcelas_abertas: '', parcelas_vencidas: '',
  existe_processo: 'nao', numero_processo: '',
}

const EMPTY_EMPRESA = {
  nome: '', cnpj: '', rua: '', bairro: '', complemento: '', cidade: '', uf: '', cep: '',
}

const EMPTY_VEHICLE = {
  marca_modelo: '', ano: '', placa: '', cor: '', renavam: '',
  fora_endereco: true, observacao: '',
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

const CONTRACT_TYPES = [
  { value: 'emprestimo',         label: 'Empréstimo Bancário' },
  { value: 'veiculo',            label: 'Veículo (Financiamento)' },
  { value: 'fiscal',             label: 'Execução Fiscal' },
  { value: 'condominio',         label: 'Condomínio' },
  { value: 'condominio_aluguel', label: 'Condomínio + Aluguel' },
  { value: 'rural',              label: 'Rural / Agro' },
]

function pyapi(fn, ...args) {
  if (window.pywebview?.api) return window.pywebview.api[fn](...args)
  return Promise.resolve({ ok: true, path: 'C:/saida/contrato.docx' })
}

// ─── Seção: Dados do Cliente ─────────────────────────────────────────────────

async function buscarCEP(cep, data, onChange, setLoading, setErro) {
  const n = cep.replace(/\D/g, '')
  if (n.length !== 8) return
  setLoading(true)
  setErro(false)
  try {
    let result
    if (window.pywebview?.api) {
      result = await window.pywebview.api.buscar_cep(cep)
    } else {
      const res  = await fetch(`https://viacep.com.br/ws/${n}/json/`)
      const json = await res.json()
      result = json.erro
        ? { ok: false }
        : { ok: true, rua: json.logradouro, bairro: json.bairro, cidade: json.localidade, uf: json.uf }
    }
    if (!result.ok) { setErro(true); return }
    onChange({
      ...data,
      rua:    result.rua    || data.rua,
      bairro: result.bairro || data.bairro,
      cidade: result.cidade || data.cidade,
      uf:     result.uf     || data.uf,
    })
  } catch {
    // sem internet — mantém preenchimento manual
  } finally {
    setLoading(false)
  }
}

function ClientSection({ data, onChange }) {
  const f = (k) => (v) => onChange({ ...data, [k]: v })
  const [cepLoading, setCepLoading] = useState(false)
  const [cepErro,    setCepErro]    = useState(false)

  return (
    <Card className="p-6">
      <SectionTitle>Dados do Cliente</SectionTitle>
      <div className="grid grid-cols-2 gap-4">

        <Field label="Nome Completo" required className="col-span-2">
          <Input value={data.nome}
            onChange={e => f('nome')(e.target.value.toUpperCase())}
            placeholder="NOME COMPLETO EM MAIÚSCULAS" />
        </Field>

        <Field label="Nacionalidade" required>
          <Select value={data.nacionalidade} onChange={e => f('nacionalidade')(e.target.value)}>
            <option value="brasileiro">Brasileiro</option>
            <option value="brasileira">Brasileira</option>
            <option value="estrangeiro">Estrangeiro</option>
            <option value="estrangeira">Estrangeira</option>
          </Select>
        </Field>

        <Field label="Estado Civil" required>
          <Select value={data.estado_civil} onChange={e => f('estado_civil')(e.target.value)}>
            <option value="solteiro">Solteiro(a)</option>
            <option value="casado">Casado(a)</option>
            <option value="divorciado">Divorciado(a)</option>
            <option value="viuvo">Viúvo(a)</option>
            <option value="separado">Separado(a) de fato</option>
            <option value="uniao_estavel">União Estável</option>
          </Select>
        </Field>

        <Field label="Profissão" required>
          <Input value={data.profissao}
            onChange={e => f('profissao')(e.target.value)}
            placeholder="ex: empresário, auxiliar de produção..." />
        </Field>

        <Field label="CPF" required>
          <Input value={data.cpf}
            onChange={e => f('cpf')(fmtCPF(e.target.value))}
            placeholder="000.000.000-00" maxLength={14} />
        </Field>

        <Field label="RG / CNH">
          <Input value={data.rg}
            onChange={e => f('rg')(e.target.value)}
            placeholder="Número do documento" />
        </Field>

        <Field label="E-mail" required>
          <Input value={data.email}
            onChange={e => f('email')(e.target.value)}
            placeholder="email@exemplo.com" type="email" />
        </Field>

        <Field label="Telefone" required>
          <Input value={data.telefone}
            onChange={e => f('telefone')(fmtTelefone(e.target.value))}
            placeholder="(00) 00000-0000" maxLength={15} />
        </Field>

      </div>

      {/* Endereço */}
      <div className="mt-4 pt-4 border-t border-amber-200/60">
        <p className="text-xs font-bold text-brand-dark/50 uppercase tracking-wider mb-3">Endereço</p>
        <div className="grid grid-cols-2 gap-4">

          <Field label="Rua / Av. + Número" required className="col-span-2">
            <Input value={data.rua}
              onChange={e => f('rua')(e.target.value)}
              placeholder="Rua Exemplo, nº 100, Apto 101" />
          </Field>

          <Field label="Bairro" required>
            <Input value={data.bairro}
              onChange={e => f('bairro')(e.target.value)}
              placeholder="Nome do Bairro" />
          </Field>

          <Field label="Complemento">
            <Input value={data.complemento}
              onChange={e => f('complemento')(e.target.value)}
              placeholder="Bloco, sala, etc." />
          </Field>

          <Field label="Cidade" required>
            <Input value={data.cidade}
              onChange={e => f('cidade')(e.target.value)}
              placeholder="Nome da Cidade" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="UF" required>
              <Select value={data.uf} onChange={e => f('uf')(e.target.value)}>
                {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </Select>
            </Field>
            <Field label="CEP" required error={cepErro ? 'CEP não encontrado' : undefined}>
              <div className="relative">
                <Input value={data.cep}
                  onChange={e => {
                    const fmt     = fmtCEP(e.target.value)
                    const updated = { ...data, cep: fmt }
                    onChange(updated)
                    setCepErro(false)
                    if (fmt.length === 9) buscarCEP(fmt, updated, onChange, setCepLoading, setCepErro)
                  }}
                  placeholder="00000-000" maxLength={9} disabled={cepLoading}
                  className={cepLoading ? 'pr-8' : ''} />
                {cepLoading && (
                  <Loader size={14} className="animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                )}
              </div>
            </Field>
          </div>

          <div className="flex items-center">
            <p className="text-xs text-brand-muted italic leading-relaxed">
              Preencha o CEP e os campos de endereço serão completados automaticamente.
            </p>
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
      <div className="flex items-center justify-between px-4 py-3 bg-brand-bg cursor-pointer"
        onClick={() => setOpen(o => !o)}>
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
            <Input value={proc.banco}
              onChange={e => f('banco')(e.target.value.toUpperCase())}
              placeholder="NOME DO BANCO OU COOPERATIVA" />
          </Field>

          <Field label="Dívida Atual (R$)" required>
            <Input value={proc.divida}
              onChange={e => f('divida')(fmtBRL(e.target.value))}
              placeholder="0,00" />
          </Field>

          <Field label="Valor da Parcela (R$)">
            <Input value={proc.valor_parcela}
              onChange={e => f('valor_parcela')(fmtBRL(e.target.value))}
              placeholder="0,00" />
          </Field>

          <Field label="Parcelas Totais">
            <Input value={proc.parcelas_totais}
              onChange={e => f('parcelas_totais')(fmtOnlyNum(e.target.value))}
              placeholder="48" maxLength={3} />
          </Field>

          <Field label="Parcelas Pagas">
            <Input value={proc.parcelas_pagas}
              onChange={e => f('parcelas_pagas')(fmtOnlyNum(e.target.value))}
              placeholder="13" maxLength={3} />
          </Field>

          <Field label="Parcelas em Aberto">
            <Input value={proc.parcelas_abertas}
              onChange={e => f('parcelas_abertas')(fmtOnlyNum(e.target.value))}
              placeholder="35" maxLength={3} />
          </Field>

          <Field label="Parcelas Vencidas">
            <Input value={proc.parcelas_vencidas}
              onChange={e => f('parcelas_vencidas')(fmtOnlyNum(e.target.value))}
              placeholder="0" maxLength={3} />
          </Field>

          <div className="col-span-2 pt-2 border-t border-amber-100">
            <Field label="Existe Processo Judicial?">
              <Select value={proc.existe_processo}
                onChange={e => f('existe_processo')(e.target.value)}>
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </Select>
            </Field>
            {proc.existe_processo === 'sim' && (
              <div className="mt-3">
                <Field label="Número do Processo">
                  <Input value={proc.numero_processo}
                    onChange={e => f('numero_processo')(fmtProcesso(e.target.value))}
                    placeholder="0000000-00.0000.0.00.0000" maxLength={25} />
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
  const add    = () => onChange([...processes, { ...EMPTY_PROCESS }])
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
          <Input value={data.marca_modelo}
            onChange={e => f('marca_modelo')(e.target.value.toUpperCase())}
            placeholder="VW - VOLKSWAGEN GOL CITY 1.0 MI FLEX 8V 2P" />
        </Field>
        <Field label="Ano/Modelo" required>
          <Input value={data.ano}
            onChange={e => f('ano')(fmtOnlyNum(e.target.value))}
            placeholder="2015" maxLength={4} />
        </Field>
        <Field label="Placa" required>
          <Input value={data.placa}
            onChange={e => f('placa')(e.target.value.toUpperCase())}
            placeholder="AYV2H79" maxLength={7} />
        </Field>
        <Field label="Cor">
          <Input value={data.cor}
            onChange={e => f('cor')(e.target.value.toUpperCase())}
            placeholder="BRANCA" />
        </Field>
        <Field label="RENAVAM">
          <Input value={data.renavam}
            onChange={e => f('renavam')(fmtOnlyNum(e.target.value))}
            placeholder="1019855522" />
        </Field>
        <Field className="col-span-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={data.fora_endereco}
              onChange={e => f('fora_endereco')(e.target.checked)}
              className="w-4 h-4" />
            <span className="text-sm">O veículo não está localizado no mesmo endereço do carnê de financiamento</span>
          </label>
        </Field>
        <Field label="Observação adicional" className="col-span-2">
          <Input value={data.observacao}
            onChange={e => f('observacao')(e.target.value)}
            placeholder="Outras observações sobre o veículo (opcional)" />
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

      {data.tipo === 'boleto' && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor Total (R$)" required className="col-span-2">
            <Input value={data.valor_total}
              onChange={e => f('valor_total')(fmtBRL(e.target.value))}
              placeholder="0,00" />
          </Field>
          <Field label="Valor da Entrada (R$)" required>
            <Input value={data.valor_entrada}
              onChange={e => f('valor_entrada')(fmtBRL(e.target.value))}
              placeholder="0,00" />
          </Field>
          <Field label="Data da Entrada" required hint="As demais parcelas são geradas automaticamente">
            <Input value={data.data_entrada}
              onChange={e => f('data_entrada')(fmtDate(e.target.value))}
              placeholder="24/04/2026" maxLength={10} />
          </Field>
          <Field label="Nº de Parcelas Restantes" required hint="Não conta a entrada">
            <Input value={data.n_parcelas}
              onChange={e => f('n_parcelas')(fmtOnlyNum(e.target.value))}
              placeholder="5" maxLength={2} />
          </Field>
          <Field label="Valor de Cada Parcela (R$)" required>
            <Input value={data.valor_parcela}
              onChange={e => f('valor_parcela')(fmtBRL(e.target.value))}
              placeholder="0,00" />
          </Field>
        </div>
      )}

      {data.tipo === 'cartao' && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor Total (R$)" required className="col-span-2">
            <Input value={data.valor_total}
              onChange={e => f('valor_total')(fmtBRL(e.target.value))}
              placeholder="0,00" />
          </Field>
          <Field label="Nº de Parcelas" required>
            <Input value={data.n_parcelas}
              onChange={e => f('n_parcelas')(fmtOnlyNum(e.target.value))}
              placeholder="10" maxLength={2} />
          </Field>
          <Field label="Valor de Cada Parcela (R$)">
            <Input value={data.valor_parcela}
              onChange={e => f('valor_parcela')(fmtBRL(e.target.value))}
              placeholder="0,00" />
          </Field>
          <Field label="Data do Pagamento" required>
            <Input value={data.data}
              onChange={e => f('data')(fmtDate(e.target.value))}
              placeholder="11/05/2026" maxLength={10} />
          </Field>
        </div>
      )}

      {data.tipo === 'avista' && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor Total (R$)" required>
            <Input value={data.valor_total}
              onChange={e => f('valor_total')(fmtBRL(e.target.value))}
              placeholder="0,00" />
          </Field>
          <Field label="Data do Pagamento" required>
            <Input value={data.data}
              onChange={e => f('data')(fmtDate(e.target.value))}
              placeholder="23/04/2026" maxLength={10} />
          </Field>
        </div>
      )}
    </Card>
  )
}

// ─── Seção: Documentos ───────────────────────────────────────────────────────

function DocsSection({ docs, empresa, onDocsChange, onEmpresaChange }) {
  const toggle = (k) => onDocsChange({ ...docs, [k]: !docs[k] })
  const fe = (k) => (v) => onEmpresaChange({ ...empresa, [k]: v })
  const [cepLoading, setCepLoading] = useState(false)
  const [cepErro,    setCepErro]    = useState(false)

  return (
    <Card className="p-6">
      <SectionTitle>Documentos a Gerar</SectionTitle>
      <div className="flex gap-6 mb-4">
        <Checkbox label="Contrato"         checked={docs.contrato}   onChange={() => toggle('contrato')} />
        <Checkbox label="Procuração"       checked={docs.procuracao} onChange={() => toggle('procuracao')} />
        <Checkbox label="Hipossuficiência" checked={docs.hipo}       onChange={() => toggle('hipo')} />
        <Checkbox label="Declaração de Residência" checked={docs.declaracao_residencia} onChange={() => toggle('declaracao_residencia')} />
      </div>

      {docs.procuracao && (
        <div className="border-t border-amber-200 pt-4 mt-2">
          <label className="flex items-center gap-2 cursor-pointer select-none mb-4">
            <input type="checkbox" checked={docs.procuracao_pj || false}
              onChange={() => toggle('procuracao_pj')}
              className="w-4 h-4" />
            <span className="text-sm font-semibold text-brand-dark/80">Pessoa Jurídica (empresa como outorgante)</span>
          </label>

          {docs.procuracao_pj && (
            <div className="mt-2">
              <p className="text-xs font-bold text-brand-dark/50 uppercase tracking-wider mb-3">Dados da Empresa</p>
              <div className="grid grid-cols-2 gap-4">

                <Field label="Razão Social" required>
                  <Input value={empresa.nome}
                    onChange={e => fe('nome')(e.target.value.toUpperCase())}
                    placeholder="NOME DA EMPRESA LTDA" />
                </Field>

                <Field label="CNPJ" required>
                  <Input value={empresa.cnpj}
                    onChange={e => fe('cnpj')(fmtCNPJ(e.target.value))}
                    placeholder="00.000.000/0001-00" maxLength={18} />
                </Field>

                <Field label="Rua / Av. + Número">
                  <Input value={empresa.rua}
                    onChange={e => fe('rua')(e.target.value.toUpperCase())}
                    placeholder="RUA EXEMPLO, Nº 123" />
                </Field>

                <Field label="Bairro">
                  <Input value={empresa.bairro}
                    onChange={e => fe('bairro')(e.target.value.toUpperCase())}
                    placeholder="CENTRO" />
                </Field>

                <Field label="Complemento">
                  <Input value={empresa.complemento}
                    onChange={e => fe('complemento')(e.target.value.toUpperCase())}
                    placeholder="Sala 1" />
                </Field>

                <Field label="Cidade">
                  <Input value={empresa.cidade}
                    onChange={e => fe('cidade')(e.target.value.toUpperCase())}
                    placeholder="NOME DA CIDADE" />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="UF">
                    <Select value={empresa.uf} onChange={e => fe('uf')(e.target.value)}>
                      <option value="">--</option>
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </Select>
                  </Field>
                  <Field label="CEP" error={cepErro ? 'CEP não encontrado' : undefined}>
                    <div className="relative">
                      <Input value={empresa.cep}
                        onChange={e => {
                          const fmt     = fmtCEP(e.target.value)
                          const updated = { ...empresa, cep: fmt }
                          onEmpresaChange(updated)
                          setCepErro(false)
                          if (fmt.length === 9) buscarCEP(fmt, updated, onEmpresaChange, setCepLoading, setCepErro)
                        }}
                        placeholder="00000-000" maxLength={9} disabled={cepLoading}
                        className={cepLoading ? 'pr-8' : ''} />
                      {cepLoading && (
                        <Loader size={14} className="animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                      )}
                    </div>
                  </Field>
                </div>

                <div className="flex items-center col-span-2">
                  <p className="text-xs text-brand-muted italic leading-relaxed">
                    Preencha o CEP e os campos de endereço serão completados automaticamente.
                  </p>
                </div>

              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ContractForm() {
  const [client, setClient]         = useState({ ...EMPTY_CLIENT })
  const [contractType, setContractType] = useState('emprestimo')
  const [processes, setProcesses]   = useState([{ ...EMPTY_PROCESS }])
  const [vehicle, setVehicle]       = useState({ ...EMPTY_VEHICLE })
  const [payment, setPayment]       = useState({ ...EMPTY_PAYMENT_BOLETO })
  const [docs, setDocs]             = useState({ contrato: true, procuracao: true, hipo: false, procuracao_pj: false, declaracao_residencia: false })
  const [empresa, setEmpresa]       = useState({ ...EMPTY_EMPRESA })
  const [formato, setFormato]       = useState('pdf')
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState(null)

  const handleGenerate = async () => {
    if (!client.nome || !client.cpf || !client.cidade || !client.email) {
      alert('Preencha pelo menos: Nome, CPF, Cidade e E-mail.')
      return
    }
    if (!docs.contrato && !docs.procuracao && !docs.hipo && !docs.declaracao_residencia) {
      alert('Selecione pelo menos um documento para gerar.')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await pyapi('generate_documents', {
        client, contractType, processes,
        vehicle: contractType === 'veiculo' ? vehicle : null,
        payment, docs, formato,
        empresa: docs.procuracao && docs.procuracao_pj ? empresa : null,
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
    setDocs({ contrato: true, procuracao: true, hipo: false, procuracao_pj: false, declaracao_residencia: false })
    setEmpresa({ ...EMPTY_EMPRESA })
    setFormato('pdf')
    setResult(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
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

      <DocsSection docs={docs} empresa={empresa} onDocsChange={setDocs} onEmpresaChange={setEmpresa} />

      {/* Formato de saída */}
      <Card className="p-6">
        <SectionTitle>Formato dos Documentos</SectionTitle>
        <div className="flex gap-3">
          {[
            { value: 'pdf',  label: 'PDF' },
            { value: 'docx', label: 'Word (.docx)' },
          ].map(({ value, label }) => (
            <button key={value} onClick={() => setFormato(value)}
              className={`py-2.5 px-6 rounded-lg text-sm font-medium border-2 transition-all ${
                formato === value
                  ? 'bg-brand-dark border-brand-dark text-white'
                  : 'bg-white border-amber-200 text-brand-muted hover:border-brand-dark'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </Card>

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

      <div className="flex justify-end pb-8">
        <Btn variant="dark" onClick={handleGenerate} disabled={loading} className="px-8 py-3 text-base">
          {loading
            ? <><Loader size={16} className="animate-spin" /> Gerando...</>
            : <><FileDown size={16} /> Gerar Documentos</>}
        </Btn>
      </div>
    </div>
  )
}
