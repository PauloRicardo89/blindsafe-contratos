import { useState, useEffect } from 'react'
import { FolderOpen, Save } from 'lucide-react'
import { Card, SectionTitle, Field, Input, Btn } from './ui'

function pyapi(fn, ...args) {
  if (window.pywebview?.api) return window.pywebview.api[fn](...args)
  return Promise.resolve({ output_dir: 'C:/Contratos/Saida' })
}

export default function Settings() {
  const [outputDir, setOutputDir] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    pyapi('get_settings').then(r => {
      setOutputDir(r.output_dir || '')
    })
  }, [])

  const browseFolder = async () => {
    const res = await pyapi('browse_folder')
    if (res?.path) setOutputDir(res.path)
  }

  const save = async () => {
    await pyapi('save_settings', { output_dir: outputDir })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Configurações</h1>
        <p className="text-sm text-brand-muted mt-0.5">Preferências do aplicativo</p>
      </div>

      <Card className="p-6">
        <SectionTitle>Pasta de Saída</SectionTitle>
        <p className="text-sm text-brand-muted mb-4">
          Os documentos gerados serão salvos nesta pasta. Uma subpasta com o nome do cliente será criada automaticamente.
        </p>
        <Field label="Diretório de Saída">
          <div className="flex gap-2">
            <Input value={outputDir} onChange={e => setOutputDir(e.target.value)}
              placeholder="C:\Contratos\Saida" className="flex-1" />
            <Btn variant="outline" onClick={browseFolder}>
              <FolderOpen size={14} /> Procurar
            </Btn>
          </div>
        </Field>
      </Card>

      <Card className="p-6">
        <SectionTitle>Sobre</SectionTitle>
        <div className="space-y-2 text-sm text-brand-muted">
          <p><span className="font-semibold text-brand-dark">Aplicativo:</span> BLINDSAFE Contratos</p>
          <p><span className="font-semibold text-brand-dark">Versão:</span> 2.0</p>
          <p><span className="font-semibold text-brand-dark">Tecnologia:</span> Python + React + PyWebView</p>
        </div>
        <div className="mt-4 pt-4 border-t border-amber-200/60 text-xs text-brand-muted">
          Desenvolvido por <span className="font-semibold text-brand-dark">Paulo Ricardo</span> para{' '}
          <span className="font-semibold text-brand-dark">Blindsafe Soluções Financeiras</span>
        </div>
      </Card>

      <div className="flex justify-end">
        <Btn variant="dark" onClick={save} className="px-6">
          <Save size={14} />
          {saved ? 'Salvo!' : 'Salvar Configurações'}
        </Btn>
      </div>
    </div>
  )
}
