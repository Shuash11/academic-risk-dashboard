import { PipelineFlow } from '../components/PipelineFlow.jsx'

function MicroLabel({ children }) {
  return <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-400">{children}</p>
}

function Part({ label, tone = 'text-slate-700', lines, children }) {
  return (
    <div className="mt-2.5">
      <MicroLabel>{label}</MicroLabel>
      {lines ? (
        <ul className="mt-0.5 space-y-0.5">
          {lines.map((l, i) => (
            <li key={i} className={`text-sm leading-relaxed ${tone} break-words`}>{l}</li>
          ))}
        </ul>
      ) : (
        <p className={`mt-0.5 text-sm leading-relaxed ${tone}`}>{children}</p>
      )}
    </div>
  )
}

function ExampleRow({ pairs }) {
  return (
    <div className="mt-2.5">
      <MicroLabel>Example</MicroLabel>
      <ul className="mt-0.5 space-y-0.5">
        {pairs.map(([k, v], i) => (
          <li key={i} className="text-[0.8rem] leading-relaxed text-slate-600 break-words">
            <span className="font-semibold text-slate-700">{k}:</span> {v}
          </li>
        ))}
      </ul>
    </div>
  )
}

function MathRow({ items }) {
  return (
    <div className="mt-2.5">
      <MicroLabel>Math explained</MicroLabel>
      <div className="mt-1 space-y-2">
        {items.map((m, i) => (
          <div key={i}>
            <p className="inline-block max-w-full rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-800 break-words">{m.eq}</p>
            <p className="mt-0.5 text-[0.8rem] leading-relaxed text-slate-600">{m.ex}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const GLOSSARY = [
  {
    n: '1',
    term: 'Student data',
    what: 'The study spreadsheet (CSV) of past student records — 71,036 rows covering 15,401 unique students. One row is one student-semester, and it is the only thing the models ever learn from.',
    tech: 'The raw study dataset: 71,036 rows · 55,635 student-semester records for 15,401 unique students. Each row is one student-semester (a student\u2019s record in one semester), not one student. Twelve required columns: identifiers (Student ID, Academic Year, Semester), the Final Grades text field, and the predictor fields (GWA, failed and dropped courses, course program, year level, enrolment history, total units taken, previous academic standing).',
    howLabel: 'How it works',
    how: [
      'The file is opened and read into memory as one table.',
      'Every later step reads from, checks or transforms this one table \u2014 nothing else enters the pipeline.',
    ],
    example: [
      ['Rows', '71,036 records · 15,401 unique students · 55,635 student-semester records'],
      ['Row shape', 'one student-semester — not one student'],
      ['Columns', '12 required fields (the 11 predictors are derived from these)'],
      ['Grade scale', 'Philippine 1.0–5.0 — only exactly 5.0 is a failed subject'],
    ],
  },
  {
    n: '2',
    term: 'Datasets loading \u2014 loader.py',
    what: 'The opener script: it opens and reads the spreadsheet (CSV) file so the program can work with it.',
    tech: 'A file-reading script that parses the CSV (comma-separated values) text into an in-memory table and asserts the twelve required columns. On a missing file or missing columns it raises an error and halts \u2014 it never fabricates rows.',
    howLabel: 'How it works',
    how: [
      'Opens the CSV file and splits each line at its commas.',
      'Asserts the twelve required columns are present.',
      'On a missing or unreadable file it raises an error and halts \u2014 it never invents data.',
    ],
    example: [
      ['File', 'the study spreadsheet (CSV) on disk'],
      ['Read', 'line by line, split at commas'],
      ['Output', '71,036 rows in memory'],
      ['Missing file or columns', 'stops with an error — never fabricates rows'],
    ],
  },
  {
    n: '3',
    term: 'Student-semester records \u2014 dataset_builder.py',
    what: 'Turns the raw table into one row per student-semester, sorted in calendar order per student, and parses each Final Grades string into three number summaries.',
    tech: 'Records are sorted chronologically per student (Student ID, Academic Year, Semester). The Final Grades text field ("SUBJECT: grade; …") is parsed into three aggregates: n_subjects_t (how many subjects), mean_grade_t (their mean), n_failed_grades_t (how many are exactly 5.0 — only 5.0 fails on the Philippine 1.0–5.0 scale). Unparsable grade tokens are skipped and counted; a cell with no parsable grades becomes NaN for all three, which the in-graph median imputation fills (train medians: 9 subjects, ~1.733 mean, 0 failed).',
    howLabel: 'How it works',
    how: [
      'Sorts records per student in calendar order.',
      'Parses Final Grades into n_subjects_t, mean_grade_t and n_failed_grades_t.',
      'Skips and counts unparsable grade tokens — NaN cells are imputed in-graph.',
    ],
    example: [
      ['Row', 'one student-semester'],
      ['Final Grades', '"GE CONWOR: 2.5; CRIM 1: 5;" → n_subjects_t 2 · mean_grade_t 3.75 · n_failed_grades_t 1'],
      ['Only 5.0 fails', '4.9 and 3.0 are passing on the Philippine scale'],
      ['Unparseable', 'skipped + counted → in-graph median imputation'],
    ],
  },
  {
    n: '4',
    term: 'Define the prediction date',
    what: 'Fixes the moment the models predict from: the end of semester t. Predictors may use only information available by then.',
    tech: 'The prediction point is the end of semester t (the row\u2019s own semester). Every predictor is a row-t field — nothing from the future may hint at the target. This is the first leakage guard: it defines WHAT information is allowed in.',
    howLabel: 'How it works',
    how: [
      'Fixes the prediction point: end of semester t.',
      'Predictors = information available at the end of semester t only.',
      'Nothing from the future enters the predictor set.',
    ],
    example: [
      ['Prediction point', 'end of semester t'],
      ['Allowed', 'row-t fields — GWA, failed/dropped, units, year, program, standing, grade aggregates'],
      ['Not allowed', 'anything from semester t+1'],
    ],
  },
  {
    n: '5',
    term: 'Define the future target',
    what: 'Asks the forward question: will the student fail or drop courses on their NEXT record? The first candidate rule was audited, found degenerate, and rejected.',
    tech: 'Adopted target: at_risk_t1 = 1 iff the student\u2019s NEXT (t+1) record shows failed > 0 OR dropped > 0. The first candidate (t+1 academic standing in failure statuses) matched (failed_t > 0 OR dropped_t > 0) on every one of 55,635 linked rows — the institution writes the next standing deterministically — so it was degenerate and rejected. The adopted target differs from the same-semester admin rule on 7,206 of the linked rows, so it is genuinely uncertain. Records with no next record (15,401) are excluded and counted, never silently dropped.',
    howLabel: 'How it works',
    how: [
      'Adopted rule: failed(t+1) > 0 OR dropped(t+1) > 0 on the NEXT record.',
      'Audited the first candidate (t+1 standing): 0 mismatches in 55,635 linked rows — degenerate, rejected.',
      'Excludes and counts 15,401 rows with no next record.',
    ],
    example: [
      ['Adopted rule', 'failed(t+1) > 0 OR dropped(t+1) > 0'],
      ['Rejected rule', 't+1 standing in failure statuses — exactly re-derivable from t (degenerate)'],
      ['Excluded', '15,401 rows with no future record — counted'],
      ['Genuinely uncertain', 'differs from the t-rule on 7,206 rows'],
    ],
  },
  {
    n: '6',
    term: 'Remove leakage variables',
    what: 'Keeps t+1 outcomes, t+1 standing and t+1 grades out of the predictors, so the models cannot shortcut the target.',
    tech: 'Leakage guards: t+1 failed/dropped counts (the target source) never in predictors; t+1 Previous Academic Standing never in predictors; no t+1 GWA/grades anywhere in predictors; the target column asserted absent from model input columns; no duplicate (Student ID, Academic Year, Semester) rows — duplicates abort the build. Result: a target the models genuinely cannot re-derive from the predictors.',
    howLabel: 'How it works',
    how: [
      't+1 failed/dropped counts (target source) never in predictors.',
      't+1 standing and t+1 GWA/grades never in predictors.',
      'Target column asserted absent; duplicate (ID, Year, Semester) rows abort the build.',
    ],
    example: [
      ['Never in predictors', 't+1 failed/dropped · t+1 standing · t+1 GWA/grades'],
      ['Asserted', 'target absent from inputs · no duplicate (ID, Year, Semester) rows'],
      ['Result', 'the models cannot shortcut the target'],
    ],
  },
  {
    n: '7',
    term: 'Temporal split \u2014 splitter.py',
    what: 'Cuts the table in calendar order with no shuffling — training years 2018–2023 for learning and tuning, versus the locked-away future years 2024–2025 saved for the final check.',
    tech: 'A chronological split on the predictor year, no shuffling: train 2018–2023 — 36,190 rows · 8,812 students · 11.2% at-risk (4,041 at-risk); held-out test 2024–2025 — 19,445 rows · 8,613 students · 7.6% at-risk (1,469 at-risk). 2018 exists in the data (the manuscript says 2019–2025); its rows are strictly pre-test so they join training. 4,572 students span the boundary — early rows train, late rows test (forward prediction). The date order itself is the rule; no random seed is involved.',
    howLabel: 'How it works',
    how: [
      'Cuts the table in calendar order — no shuffling.',
      'Training years 2018–2023: 36,190 rows · 8,812 students · 11.2% at-risk.',
      'Held-out test 2024–2025: 19,445 rows · 8,613 students · 7.6% at-risk — locked away.',
    ],
    example: [
      ['Training', '2018–2023 — 36,190 rows · 8,812 students · 11.2% at-risk'],
      ['Held-out test', '2024–2025 — 19,445 rows · 8,613 students · 7.6% at-risk'],
      ['Boundary-spanning', '4,572 students — early rows train, late rows test'],
      ['Shuffling', 'none — date order is the rule'],
    ],
  },
  {
    n: '8',
    term: 'Preprocessing \u2014 pipeline.py',
    what: 'Prepares every column for the models: numbers are filled and re-centred, words are filled and turned into 0/1 columns.',
    tech: 'Median/most-frequent imputation fills blanks first (median for numbers, most common for words). StandardScaler re-centres each numeric column on mean 0 with spread 1. One-hot encoding gives each text category its own 0/1 column (unknown categories are ignored — an all-zero slice). One pipeline shape fits all five models; the preprocessing is fitted inside every cross-validation fold so it never learns from the tested slice.',
    howLabel: 'How it works',
    how: [
      'Fills blanks first: median for numbers, most common for words.',
      'StandardScaler: numerics re-centred on mean 0, spread 1.',
      'One-hot: each category gets its own 0/1 column — unknowns ignored.',
      'Fitted inside every fold — never learns from the tested slice.',
    ],
    example: [
      ['Programs', 'BS CRIM, BSED-MATH, … → one 0/1 column each'],
      ['Standing', 'Good Standing / New/No Previous Record / With Failed Courses / With Dropped Courses → 0/1 columns'],
      ['Failure statuses', 'only "With Failed Courses" and "With Dropped Courses" are failures — the other two are not'],
      ['Numerics', 're-centred: mean 0, spread 1'],
      ['Output', 'one fully numeric matrix per fold'],
    ],
  },
  {
    n: '9',
    term: 'Practice rounds in 5 slices \u00b7 students kept together',
    what: 'Splits the training years into 5 slices, grouped so no student appears in two slices; every model trains and is scored on the identical slices.',
    tech: 'Student-grouped StratifiedGroupKFold (5 folds, seed 42): the training years are cut into 5 slices so no student crosses fold boundaries, and every model trains and is scored on the identical slices, each round from a fresh, unfitted copy (seed 42 — a fixed shuffle number so reruns repeat).',
    howLabel: 'How it works',
    how: [
      'Cuts the training years into 5 slices grouped so no student appears in two slices.',
      'Every model trains and is scored on the identical slices (seed 42 — reruns repeat).',
      'Each round uses a fresh, unfitted copy — nothing is remembered.',
    ],
    example: [
      ['Slices', '5 — students kept together'],
      ['Seed', '42 — a fixed shuffle number'],
      ['Per model', 'each round: train on 4 slices, be tested on the 5th'],
      ['Output', 'identical slice pairs, reused by the tuning step'],
    ],
  },
  {
    n: '10',
    term: 'SMOTE',
    what: 'Creates extra synthetic copies of rare at-risk rows inside the training slices only — never inside the slice being tested.',
    tech: 'SMOTE = Synthetic Minority Over-sampling Technique: it interpolates new minority samples between nearest neighbours in feature space. Here it runs with seed 42 and k_neighbors = 5, reduced automatically when a small minority fold requires it. Blanks are filled first: median (the middle value) for numbers, most common (the top choice) for words. SMOTE lives INSIDE the training pipeline so resampling fits on training folds only and never touches the temporal test set. Both variants run — no-SMOTE versus SMOTE — and BOTH are scored on the held-out test.',
    howLabel: 'How it works',
    how: [
      'Fills blanks first: median (the middle value) for numbers, most common (the top choice) for words.',
      'Builds each synthetic at-risk row between k_neighbors = 5 nearest neighbours (auto-reduced on small folds; seed 42).',
      'Runs inside the training folds only — never the tested slice or the temporal test set.',
      'Both variants run — no-SMOTE vs SMOTE; both scored on the final test.',
    ],
    example: [
      ['Fill first', 'median for numbers, most-frequent for words'],
      ['k_neighbors = 5', 'auto-reduced when the minority fold is small'],
      ['Seed', '42'],
      ['Where', 'training folds only — never the temporal test set'],
      ['Both ways', 'no-SMOTE vs SMOTE · both scored on the final test'],
    ],
  },
  {
    n: '11',
    term: 'Trying every setting \u2014 grid search',
    what: 'Tries each model\u2019s settings on the training-year slices and keeps the best by RECALL for the at-risk label — the share of at-risk students found (the primary metric) — one pass, before final scoring.',
    tech: 'GridSearchCV = exhaustive search over a parameter grid with cross-validated scoring: every combination in each model\u2019s grid is tried, each scored by RECALL for the at-risk label over the same grouped slices (scoring="recall" in pipeline.py), and the best combination is kept — one pass, before final scoring. Recall is the primary metric: the objective is early identification, so missing at-risk students costs more than false alarms.',
    howLabel: 'How it works',
    how: [
      'Tries every combination in each model\u2019s setting grid on the training-year slices.',
      'Scores each combination by RECALL for the at-risk label over the same grouped slices.',
      'Keeps the best combination per model — one pass, before final scoring.',
    ],
    example: [
      ['DT', 'max_depth = 10 · min_samples_split = 2 — winning setting'],
      ['RF', 'max_depth = 20 with 200 trees voting'],
      ['LR', 'C = 10.0 — winning mistake strictness level'],
      ['NB', 'no grid — fitted as-is (GaussianNB)'],
      ['Output', 'one winning setting per model → step 12 unchanged'],
    ],
  },
  {
    n: 'M',
    term: 'The 5 models \u2014 run between steps 11 and 12',
    what: 'Five predictors run between steps 11 and 12 — four contenders plus one baseline — each turning a student-semester\u2019s data into a label plus a 0-to-1 risk score.',
    tech: 'Decision Tree, Random Forest (n_estimators = 200, seed 42), Logistic Regression, GaussianNB and DummyClassifier (stratified) — the five models, each with and without SMOTE. A risk score means the model\u2019s 0-to-1 guess of how likely a student is at-risk on their NEXT record.',
    howLabel: 'How it works',
    how: [
      'Decision Tree: a flowchart of yes/no questions about the student ending in a verdict plus a 0-to-1 risk score.',
      'Random Forest: 200 such flowcharts vote and the majority wins.',
      'Logistic Regression: every clue gets points and the total converts to a 0-to-1 risk score.',
      'GaussianNB: a detective combining how likely each clue is under each outcome into a 0-to-1 risk score.',
      'Dummy (Stratified): a weighted coin flip copying past at-risk proportions — the baseline every real model must beat, never deployed.',
    ],
    example: [
      ['Input', '11 predictors from one student-semester (e.g. GWA 2.75 · 1 drop · grades parsed)'],
      ['Decision Tree', 'follows its questions \u2192 at-risk verdict'],
      ['Random Forest', 'majority of 200 votes \u2192 at-risk'],
      ['Logistic Regression', 'clue points total \u2192 at-risk'],
      ['GaussianNB', 'clue likelihoods combined \u2192 at-risk'],
      ['Dummy', 'weighted coin flip \u2192 verdict by past proportions'],
    ],
  },
  {
    n: '12',
    term: 'Score & evaluate every model',
    what: 'Scores every model — with and without SMOTE — once on the locked-away future years (2024–2025), students never seen in training or tuning, at threshold 0.5.',
    tech: 'One final evaluation of every model × variant (loaded, not retrained) on the held-out temporal test — 19,445 rows · 8,613 students, never seen in training or tuning. Classification threshold 0.5 for every reported metric. Records accuracy, precision, recall (primary), F1, ROC-AUC, PR-AUC, specificity and the confusion matrix per model × variant.',
    howLabel: 'How it checks',
    how: [
      'Loads every model — never retrains it.',
      'Runs each model × variant once on the locked-away future years (2024–2025).',
      'Scores at threshold 0.5: accuracy, precision, recall (primary), F1, ROC-AUC, PR-AUC, specificity, confusion matrix.',
    ],
    example: [
      ['Data', 'future years 2024–2025 — 19,445 rows, never seen in training or tuning'],
      ['Variants', 'both — with-SMOTE and no-SMOTE, scored side by side'],
      ['Threshold', '0.5 for every reported metric'],
      ['Metrics', 'recall (primary) · precision · F1 · ROC-AUC · PR-AUC · specificity · CM'],
    ],
    math: [
      { eq: 'precision = TP ÷ (TP + FP)', ex: 'TP = truly at-risk students correctly flagged. FP = safe students wrongly flagged.' },
      { eq: 'recall = TP ÷ (TP + FN)', ex: 'FN = at-risk students missed — found ÷ all truly at-risk. The primary metric: early identification is the objective.' },
      { eq: 'F1 = 2 × (precision × recall) ÷ (precision + recall)', ex: 'The harmonic mean of precision and recall — a secondary metric here, never the selection metric.' },
      { eq: 'specificity = TN ÷ (TN + FP)', ex: 'Share of safe students correctly left alone. Over-flagging lowers it — outputs stay supplementary.' },
      { eq: 'ROC-AUC = area under the TPR-vs-FPR curve', ex: '0.5 = coin flip, 1.0 = perfect separation of at-risk from safe across every threshold.' },
    ],
  },
  {
    n: '13',
    term: 'Select the model',
    what: 'Picks the winner on the evidence, without retraining — here the winner is Naive Bayes + SMOTE, selected by the highest recall (0.8114) — the primary metric.',
    tech: 'Selection without retraining: the evidence-backed winner — Naive Bayes + SMOTE, highest test recall 0.8114 — is carried forward exactly as tuned and measured; no extra fit is run to chase a better number. The adviser hierarchy: Primary = Recall; Secondary = Precision/F1/PR-AUC/ROC-AUC/Specificity/CM; Supporting = Accuracy.',
    howLabel: 'How it works',
    how: [
      'Picks the evidence-backed winner — no retraining, no extra fit.',
      'Winner: Naive Bayes + SMOTE — highest test recall (0.8114), the primary metric.',
      'Carries it forward exactly as tuned and measured.',
    ],
    example: [
      ['Winner', 'Naive Bayes + SMOTE (recall 0.8114 — primary metric)'],
      ['Evidence', 'highest test recall — adviser hierarchy: Primary=Recall'],
      ['Retraining', 'none — kept exactly as measured'],
      ['Output', 'the frozen winner → step 14 unchanged'],
    ],
  },
  {
    n: '14',
    term: 'Export the artifacts',
    what: 'Records the retrained results and ships the deployment artifacts: metrics, feature importance, and the four ONNX models with their contracts.',
    tech: 'The pipeline exports model_metrics.json (dataset composition, prediction design, leakage guards, degenerate-target audit, per-model × variant metrics), feature_importance.json (per-model method and top-5 share), and the four ONNX models + contracts (onnx_inputs.json, onnx_parity.json) that the dashboard runs in-browser.',
    howLabel: 'How it works',
    how: [
      'Exports model_metrics.json — dataset, prediction design, leakage guards, audit, per-model metrics.',
      'Exports feature_importance.json — per-model method and top-5 share.',
      'Exports the 4 ONNX models + contracts (opset 14).',
    ],
    example: [
      ['model_metrics.json', 'dataset · prediction design · leakage guards · audit · metrics'],
      ['feature_importance.json', 'per-model method · top-5 share'],
      ['ONNX', '4 models + contracts (opset 14)'],
      ['Consumer', 'the dashboard runs them in-browser (CPU/WASM)'],
    ],
  },
  {
    n: '15',
    term: 'Report results',
    what: 'Records the results for the thesis; each student\u2019s risk score is sorted into bands Low, Medium or High for action.',
    tech: 'Every student\u2019s risk score (the 0-to-1 guess that a student is at-risk on their NEXT record) is sorted into deployment bands — probability cutoffs — for action, and all results are recorded for the thesis. The bands are presentation cutoffs, not validated institutional risk thresholds.',
    howLabel: 'How it works',
    how: [
      'Sorts every student\u2019s risk score into bands Low, Medium or High for action.',
      'Records all results for the thesis.',
    ],
    example: [
      ['Low', '0.00\u20130.39 \u2014 watch'],
      ['Medium', '0.40\u20130.69 \u2014 support'],
      ['High', '0.70\u20131.00 \u2014 intervene'],
      ['Recorded', 'for the thesis'],
    ],
    math: [
      { eq: 'Low 0.00–0.39 · Medium 0.40–0.69 · High 0.70–1.00', ex: 'Deployment bands are probability cutoffs on the risk score (the 0-to-1 at-risk guess): below 0.40 = Low, 0.40–0.69 = Medium, 0.70 and above = High. Presentation cutoffs only — not validated institutional risk thresholds.' },
    ],
  },
]

export function Training() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-[72ch]">
        <h1 className="text-[1.7rem] sm:text-2xl font-extrabold tracking-tight text-slate-900">How the model is trained</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-600">The retrained pipeline prevents leakage before anything is fed to the models: predictors use end-of-semester-t information only, and the target asks about the student's NEXT record (t+1).</p>
      </div>

      <div className="mt-6">
        <PipelineFlow />
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-slate-900">What each step means, in plain words</h2>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GLOSSARY.map((g) => (
          <section key={g.n + g.term} className="flex flex-col rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">{g.n}</span>
              <h3 className="font-bold text-slate-900">{g.term}</h3>
            </div>
            <Part label="Meaning">{g.what}</Part>
            <Part label="Technical meaning">{g.tech}</Part>
            <Part label={g.howLabel} lines={g.how} />
            <ExampleRow pairs={g.example} />
            {g.math && <MathRow items={g.math} />}
          </section>
        ))}
      </div>
    </div>
  )
}
