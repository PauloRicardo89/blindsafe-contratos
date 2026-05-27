import { useState } from 'react'
import { FileDown, Loader } from 'lucide-react'
import { Card, SectionTitle, Field, Input, Select, Btn } from './ui'

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

function fmtOnlyNum(v) { return v.replace(/\D/g, '') }

function fmtAno(v) {
  const n = v.replace(/\D/g, '').slice(0, 8)
  if (n.length <= 4) return n
  return `${n.slice(0,4)}/${n.slice(4)}`
}

// ─── Busca CEP ────────────────────────────────────────────────────────────────

async function buscarCEP(cep, setForm, setLoading, setErro) {
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
    setForm(prev => ({
      ...prev,
      rua:    result.rua    || prev.rua,
      bairro: result.bairro || prev.bairro,
      cidade: result.cidade || prev.cidade,
      uf:     result.uf     || prev.uf,
    }))
  } catch {
    // sem internet — mantém preenchimento manual
  } finally {
    setLoading(false)
  }
}

// ─── pyapi ────────────────────────────────────────────────────────────────────

function pyapi(fn, ...args) {
  if (window.pywebview?.api) return window.pywebview.api[fn](...args)
  return Promise.resolve({ ok: true, path: 'C:/saida/contrato_veiculo.pdf' })
}

// ─── Estado inicial ───────────────────────────────────────────────────────────

const EMPTY = {
  nome: '', nacionalidade: 'brasileiro', rg: '', cpf: '', email: '',
  rua: '', bairro: '', complemento: '', cidade: '', uf: 'RJ', cep: '',
  veiculo_modelo: '', veiculo_ano: '', veiculo_cor: '',
  veiculo_chassi: '', veiculo_placa: '', veiculo_renavam: '',
  formato: 'pdf',
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function VeiculoForm() {
  const [form, setForm]           = useState(EMPTY)
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepErro,    setCepErro]    = useState(false)

  const f    = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const fUp  = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value.toUpperCase() }))
  const fNum = (k, fmt) => (e) => setForm(prev => ({ ...prev, [k]: fmt(e.target.value) }))

  const handleGerar = async () => {
    if (!form.nome)           { alert('Preencha o nome do contratante.'); return }
    if (!form.cpf)            { alert('Preencha o CPF.'); return }
    if (!form.veiculo_modelo) { alert('Preencha o modelo do veículo.'); return }
    if (!form.veiculo_placa)  { alert('Preencha a placa do veículo.'); return }

    setLoading(true)
    setResultado(null)
    try {
      const res = await pyapi('generate_veiculo_doc', { ...form })
      setResultado(res)
    } catch (e) {
      setResultado({ ok: false, error: String(e) })
    } finally {
      setLoading(false)
    }
  }

  const handleLimpar = () => {
    if (!confirm('Limpar todos os campos?')) return
    setForm(EMPTY)
    setResultado(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Compra de Veículo</h1>
          <p className="text-sm text-brand-muted mt-0.5">Dação em pagamento — assessoria e consultoria financeira</p>
        </div>
        <Btn variant="ghost" onClick={handleLimpar}>Limpar</Btn>
      </div>

      {/* Dados do Contratante */}
      <Card className="p-6">
        <SectionTitle>Dados do Contratante</SectionTitle>
        <div className="grid grid-cols-2 gap-4">

          <Field label="Nome Completo" required className="col-span-2">
            <Input value={form.nome}
              onChange={e => setForm(prev => ({ ...prev, nome: e.target.value.toUpperCase() }))}
              placeholder="NOME COMPLETO EM MAIÚSCULAS" />
          </Field>

          <Field label="Nacionalidade" required>
            <Select value={form.nacionalidade} onChange={f('nacionalidade')}>
              <option value="brasileiro">Brasileiro</option>
              <option value="brasileira">Brasileira</option>
              <option value="estrangeiro">Estrangeiro</option>
              <option value="estrangeira">Estrangeira</option>
            </Select>
          </Field>

          <Field label="RG / CNH" required>
            <Input value={form.rg} onChange={f('rg')} placeholder="Número do documento" />
          </Field>

          <Field label="CPF" required>
            <Input value={form.cpf}
              onChange={fNum('cpf', fmtCPF)}
              placeholder="000.000.000-00" maxLength={14} />
          </Field>

          <Field label="E-mail">
            <Input value={form.email} onChange={f('email')}
              placeholder="email@exemplo.com" type="email" />
          </Field>

        </div>

        {/* Endereço */}
        <div className="mt-4 pt-4 border-t border-amber-200/60">
          <p className="text-xs font-bold text-brand-dark/50 uppercase tracking-wider mb-3">Endereço</p>
          <div className="grid grid-cols-2 gap-4">

            <Field label="Rua / Av. + Número" required className="col-span-2">
              <Input value={form.rua} onChange={f('rua')}
                placeholder="Rua Exemplo, nº 100, Apto 101" />
            </Field>

            <Field label="Bairro" required>
              <Input value={form.bairro} onChange={f('bairro')} placeholder="Nome do Bairro" />
            </Field>

            <Field label="Complemento">
              <Input value={form.complemento} onChange={f('complemento')} placeholder="Bloco, sala, etc." />
            </Field>

            <Field label="Cidade" required>
              <Input value={form.cidade} onChange={f('cidade')} placeholder="Nome da Cidade" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="UF" required>
                <Select value={form.uf} onChange={f('uf')}>
                  {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </Select>
              </Field>
              <Field label="CEP" required error={cepErro ? 'CEP não encontrado' : undefined}>
                <div className="relative">
                  <Input value={form.cep}
                    onChange={e => {
                      const fmt = fmtCEP(e.target.value)
                      setForm(prev => ({ ...prev, cep: fmt }))
                      setCepErro(false)
                      if (fmt.length === 9) buscarCEP(fmt, setForm, setCepLoading, setCepErro)
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

      {/* Dados do Veículo */}
      <Card className="p-6">
        <SectionTitle>Dados do Veículo</SectionTitle>
        <div className="grid grid-cols-2 gap-4">

          <Field label="Marca / Modelo" required className="col-span-2">
            <Input value={form.veiculo_modelo} onChange={fUp('veiculo_modelo')}
              placeholder="VOLKSWAGEN GOLS 1.0" />
          </Field>

          <Field label="Ano Fabricação / Modelo" required>
            <Input value={form.veiculo_ano}
              onChange={e => setForm(prev => ({ ...prev, veiculo_ano: fmtAno(e.target.value) }))}
              placeholder="2020/2021" maxLength={9} />
          </Field>

          <Field label="Cor" required>
            <Input value={form.veiculo_cor} onChange={fUp('veiculo_cor')} placeholder="PRATA" />
          </Field>

          <Field label="Placa" required>
            <Input value={form.veiculo_placa} onChange={fUp('veiculo_placa')}
              placeholder="ABC-1234" maxLength={8} />
          </Field>

          <Field label="RENAVAM" required>
            <Input value={form.veiculo_renavam}
              onChange={fNum('veiculo_renavam', v => fmtOnlyNum(v).slice(0, 11))}
              placeholder="00000000000" maxLength={11} />
          </Field>

          <Field label="Chassi" required className="col-span-2">
            <Input value={form.veiculo_chassi} onChange={fUp('veiculo_chassi')}
              placeholder="9BWZZZ377VT004251" maxLength={17} />
          </Field>

        </div>
      </Card>

      {/* Formato */}
      <Card className="p-6">
        <SectionTitle>Formato do Arquivo</SectionTitle>
        <div className="flex gap-3">
          {[
            { value: 'pdf',  label: 'PDF',          hint: 'Requer Word instalado' },
            { value: 'docx', label: 'Word (.docx)', hint: 'Abre em qualquer versão do Office' },
          ].map(({ value, label, hint }) => (
            <button key={value} onClick={() => setForm(prev => ({ ...prev, formato: value }))}
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
              <p className="text-green-700 font-semibold text-sm">✓ Contrato gerado com sucesso!</p>
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
            : <><FileDown size={16} /> Gerar Contrato</>}
        </Btn>
      </div>

    </div>
  )
}
