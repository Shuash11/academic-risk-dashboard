export function Nav({ active, onChange }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'performance', label: 'Performance' },
    { id: 'about', label: 'About' },
    { id: 'compare', label: 'Compare' },
  ]
  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`whitespace-nowrap px-4 py-3.5 text-sm font-semibold border-b-2 transition ${
                active === t.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
