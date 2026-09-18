import { PipelineFlow } from '../components/PipelineFlow.jsx'

const PHASES = [
  {
    n: '1',
    title: 'Data preparation',
    items: [
      'loader.py reads the study table (CSV / XLSX / XLS) — a missing file raises an error, data is never fabricated.',
      'inspector.py reports rows, columns, types, missing values and duplicates before anything is touched.',
      'quality.py flags duplicates, missing / impossible values, IQR outliers and constant columns — never deletes; a human decides fixes.',
      'preprocessing.py states what each algorithm needs — scaling for Logistic Regression only, encoding for all.',
    ],
  },
  {
    n: '2',
    title: 'Split + cross-validation',
    items: [
      'Development rows (2019–2023) feed CV and tuning; the 2024–2025 holdout is never touched until final evaluation.',
      'The table is cut into 5 stratified slices — the same At-Risk mix in each — shared by all four models so the comparison is fair.',
      'Each round: SMOTE invents synthetic At-Risk rows inside the training slices only (never the mini-test); missing values filled (median / most common), categories encoded, scaling for Logistic Regression.',
      'Every model is a fresh, unfitted copy each round — nothing is remembered from a previous fold.',
    ],
  },
  {
    n: '3',
    title: 'From models to report',
    items: [
      'Scores: accuracy, precision, recall, F1 and ROC-AUC with "At Risk" as the positive class, recorded per fold.',
      'Results are compared on identical folds, then the Wilcoxon test (Holm correction, α = 0.05) checks if differences are significant — in this study: 0 of 6.',
      'The winner (Random Forest, n_estimators = 200, seed 42) is selected without retraining.',
      'Final evaluation runs once on the holdout, then results are recorded for the thesis.',
    ],
  },
]

export function Training() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-[72ch]">
        <h1 className="text-[1.7rem] sm:text-2xl font-extrabold tracking-tight text-slate-900">How the model is trained</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-600">Before the data is fed to the models it must be cleaned first to avoid giving the models wrong data for training.</p>
      </div>

      <div className="mt-6">
        <PipelineFlow />
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-slate-900">The three phases, in plain words</h2>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {PHASES.map((p) => (
          <section key={p.n} className="rounded-2xl bg-white border border-slate-200 p-6">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">{p.n}</span>
              <h3 className="font-bold text-slate-900">{p.title}</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 list-disc pl-4">
              {p.items.map((item, idx) => (
                <li key={idx} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
