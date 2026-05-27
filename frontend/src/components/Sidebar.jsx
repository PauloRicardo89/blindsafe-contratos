import { Car, FileText, FolderOpen, Settings, TrendingUp } from 'lucide-react'

const items = [
  { id: 'form',     icon: FileText,   label: 'Novo Contrato'       },
  { id: 'veiculo',  icon: Car,        label: 'Compra de Veículo'   },
  { id: 'proposta', icon: TrendingUp, label: 'Prop. de Honorários' },
  { id: 'templates',icon: FolderOpen, label: 'Templates'           },
  { id: 'settings', icon: Settings,   label: 'Configurações'       },
]

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="w-56 bg-brand-dark flex flex-col h-screen shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <p className="text-brand-gold font-bold text-lg tracking-wide">BLINDSAFE</p>
        <p className="text-white/40 text-xs mt-0.5">Contratos</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-3">
        {items.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activePage === id
                ? 'bg-brand-gold text-white'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-white/25 text-xs">v3.0</p>
      </div>
    </aside>
  )
}
