import { useState } from 'react'
import Sidebar from './components/Sidebar'
import ContractForm from './components/ContractForm'
import TemplateManager from './components/TemplateManager'
import Settings from './components/Settings'

export default function App() {
  const [page, setPage] = useState('form')

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg">
      <Sidebar activePage={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto">
        {page === 'form'      && <ContractForm />}
        {page === 'templates' && <TemplateManager />}
        {page === 'settings'  && <Settings />}
      </main>
    </div>
  )
}
