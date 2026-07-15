import { useState, useEffect } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { Card, SectionTitle, Btn, Badge } from './ui'

const TEMPLATE_LABELS = {
  'emprestimo':         'Empréstimo Bancário',
  'veiculo':            'Veículo (Financiamento)',
  'fiscal':             'Execução Fiscal',
  'condominio':         'Condomínio',
  'condominio_aluguel': 'Condomínio + Aluguel',
  'rural':              'Rural / Agro',
  'procuracao':                'Procuração Judicial (PF)',
  'procuracao_pj':             'Procuração Judicial (PJ)',
  'procuracao_extrajudicial':     'Procuração Extrajudicial (PF)',
  'procuracao_extrajudicial_pj':  'Procuração Extrajudicial (PJ)',
  'hipo':                      'Hipossuficiência',
}

function pyapi(fn, ...args) {
  if (window.pywebview?.api) return window.pywebview.api[fn](...args)
  return Promise.resolve({ templates: Object.fromEntries(
    Object.keys(TEMPLATE_LABELS).map(k => [k, { exists: !['rural','procuracao_extrajudicial','procuracao_extrajudicial_pj'].includes(k), filename: `${k}.docx` }])
  )})
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState({})
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  const load = async () => {
    setLoading(true)
    const res = await pyapi('get_templates')
    setTemplates(res.templates || {})
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleReplace = async (key) => {
    setUpdating(key)
    try {
      const res = await pyapi('replace_template', key)
      if (res.ok) await load()
      else alert(res.error || 'Erro ao substituir template.')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Templates</h1>
          <p className="text-sm text-brand-muted mt-0.5">Gerencie os modelos DOCX de cada tipo de contrato</p>
        </div>
        <Btn variant="ghost" onClick={load}>
          <RefreshCw size={14} /> Atualizar
        </Btn>
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-3 text-sm text-brand-muted bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle size={16} className="text-brand-gold shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-brand-dark">Como funciona</p>
            <p className="mt-1">Os templates são arquivos <strong>.docx</strong> com marcadores <code className="bg-amber-100 px-1 rounded text-xs">{'{{campo}}'}</code> nos locais certos.
            Para substituir um template, clique em <strong>Substituir</strong> e selecione o novo arquivo .docx.</p>
          </div>
        </div>
      </Card>

      {/* Contratos */}
      <Card className="p-6">
        <SectionTitle>Contratos</SectionTitle>
        {loading ? (
          <p className="text-sm text-brand-muted">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {['emprestimo','veiculo','fiscal','condominio','condominio_aluguel','rural'].map(key => {
              const tpl = templates[key] || {}
              return (
                <div key={key} className="flex items-center justify-between py-3 px-4 rounded-lg bg-brand-bg">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className={tpl.exists ? 'text-brand-gold' : 'text-gray-300'} />
                    <div>
                      <p className="text-sm font-semibold text-brand-dark">{TEMPLATE_LABELS[key]}</p>
                      <p className="text-xs text-brand-muted">{tpl.filename || 'Não configurado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {tpl.exists
                      ? <Badge color="green"><CheckCircle size={10} className="mr-1" />OK</Badge>
                      : <Badge color="red"><AlertCircle size={10} className="mr-1" />Ausente</Badge>}
                    <Btn variant="outline" className="text-xs py-1" onClick={() => handleReplace(key)}
                      disabled={updating === key}>
                      <Upload size={12} />
                      {updating === key ? 'Aguarde...' : 'Substituir'}
                    </Btn>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Docs adicionais */}
      <Card className="p-6">
        <SectionTitle>Documentos Adicionais</SectionTitle>
        {loading ? (
          <p className="text-sm text-brand-muted">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {['procuracao','procuracao_pj','procuracao_extrajudicial','procuracao_extrajudicial_pj','hipo'].map(key => {
              const tpl = templates[key] || {}
              return (
                <div key={key} className="flex items-center justify-between py-3 px-4 rounded-lg bg-brand-bg">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className={tpl.exists ? 'text-brand-gold' : 'text-gray-300'} />
                    <div>
                      <p className="text-sm font-semibold text-brand-dark">{TEMPLATE_LABELS[key]}</p>
                      <p className="text-xs text-brand-muted">{tpl.filename || 'Não configurado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {tpl.exists
                      ? <Badge color="green"><CheckCircle size={10} className="mr-1" />OK</Badge>
                      : <Badge color="red"><AlertCircle size={10} className="mr-1" />Ausente</Badge>}
                    <Btn variant="outline" className="text-xs py-1" onClick={() => handleReplace(key)}
                      disabled={updating === key}>
                      <Upload size={12} />
                      {updating === key ? 'Aguarde...' : 'Substituir'}
                    </Btn>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
