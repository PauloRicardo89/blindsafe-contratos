// Componentes de UI reutilizáveis

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-brand-card rounded-xl border border-amber-200/60 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function SectionTitle({ children }) {
  return (
    <h2 className="text-sm font-bold text-brand-dark uppercase tracking-wider mb-4 flex items-center gap-2">
      <span className="w-1 h-4 bg-brand-gold rounded-full inline-block" />
      {children}
    </h2>
  )
}

export function Field({ label, required, children, hint, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-brand-dark/70 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-brand-muted">{hint}</p>}
    </div>
  )
}

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3 py-2 rounded-lg border border-amber-300/70 bg-white text-sm text-brand-dark
        focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold
        placeholder:text-gray-300 ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full px-3 py-2 rounded-lg border border-amber-300/70 bg-white text-sm text-brand-dark
        focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function Btn({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) {
  const base = 'px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary:  'bg-brand-gold hover:bg-brand-goldh text-white shadow',
    dark:     'bg-brand-dark hover:bg-brand-dark2 text-white shadow',
    outline:  'border border-brand-gold text-brand-gold hover:bg-brand-gold/10',
    danger:   'bg-red-500 hover:bg-red-600 text-white',
    ghost:    'text-brand-muted hover:text-brand-dark hover:bg-black/5',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

export function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 accent-brand-gold cursor-pointer"
      />
      <span className="text-sm text-brand-dark group-hover:text-brand-gold transition-colors">{label}</span>
    </label>
  )
}

export function Badge({ children, color = 'gold' }) {
  const colors = {
    gold:  'bg-brand-gold/10 text-brand-gold border-brand-gold/30',
    green: 'bg-green-50 text-green-700 border-green-200',
    red:   'bg-red-50 text-red-600 border-red-200',
    gray:  'bg-gray-100 text-gray-600 border-gray-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  )
}
