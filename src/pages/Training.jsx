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
    what: 'The spreadsheet table of past student records \u2014 one row per student, and the only thing the models ever learn from.',
    tech: 'The raw study dataset: a structured table where each row is one student and each column is a feature (grades like GWA, failed and dropped courses, total units taken, year level) or a text field (course program, enrolment history, previous academic standing).',
    howLabel: 'How it works',
    how: [
      'The file is opened and read into memory as one table.',
      'Every later step reads from, checks or transforms this one table \u2014 nothing else enters the pipeline.',
    ],
    example: [
      ['Columns', '6 fields \u2014 one per student attribute'],
      ['attendance_rate', 'Number, 0\u2013100 \u2014 one 150 outlier, one missing cell'],
      ['prior_gpa', 'Number \u2014 one \u22121.0 impossible value'],
      ['gender', 'Text \u2014 a \u2018Female/male\u2019 case clash'],
      ['study_program', 'Text \u2014 Engineering / Arts / Science'],
      ['Labels', 'Not At Risk 19 \u00b7 At Risk 10'],
    ],
  },
  {
    n: '2',
    term: 'Datasets loading \u2014 loader.py',
    what: 'The opener script: it opens and reads the spreadsheet (CSV) file so the program can work with it.',
    tech: 'A file-reading script that parses the CSV (comma-separated values) text into an in-memory table the code can address by row and column. On a missing or unreadable file it raises an error and halts \u2014 it never fabricates rows.',
    howLabel: 'How it works',
    how: [
      'Opens the CSV file and splits each line at its commas.',
      'Builds the in-memory table every later script works with.',
      'On a missing or unreadable file it raises an error and halts \u2014 it never invents data.',
    ],
    example: [
      ['File', 'the study spreadsheet (CSV) on disk'],
      ['Read', 'line by line, split at commas'],
      ['Output', '30 rows \u00d7 6 columns in memory'],
      ['Missing file', 'stops with an error \u2014 never fabricates rows'],
    ],
  },
  {
    n: '3',
    term: 'Dataset inspection \u2014 inspector.py',
    what: 'The attendance-taker script: before anything is touched it counts rows and columns, and notes gaps and repeats.',
    tech: 'A read-only profiling script: counts rows and columns, reports each column\u2019s data type (numeric versus text), and lists missing values and duplicate rows. It writes a summary and changes nothing.',
    howLabel: 'How it checks',
    how: [
      'Counts rows and columns.',
      'Lists each column\u2019s data type \u2014 numeric versus text.',
      'Notes missing values and duplicate rows.',
      'Writes a summary \u2014 read-only, changes nothing.',
    ],
    example: [
      ['Rows', '30 students'],
      ['Columns', '6 fields'],
      ['attendance_rate', 'Number'],
      ['prior_gpa', 'Number'],
      ['Missing values', '1 empty attendance record'],
      ['Duplicates', '1 exact duplicate row (S001)'],
    ],
  },
  {
    n: '4',
    term: 'Quality checking \u2014 quality.py',
    what: 'The health-check script: it only REPORTS problems \u2014 repeated rows, blanks, impossible numbers, far-out values, and columns stuck on one value \u2014 and never deletes anything.',
    tech: 'An audit script that flags data-quality issues only: duplicate rows, missing values, impossible values, IQR outliers (values sitting far outside the middle 50% range of a column), and constant columns. It reports; it never deletes.',
    howLabel: 'How it checks',
    how: [
      'Flags exact duplicate rows and blank cells.',
      'Flags impossible values and IQR far-out values (far outside the middle 50% of a column).',
      'Flags columns stuck on one value.',
      'Reports only \u2014 a person decides every fix, nothing is deleted.',
    ],
    example: [
      ['Duplicates', '1 exact row (S001)'],
      ['Missing', '1 empty attendance cell'],
      ['Impossible', 'prior_gpa \u22121.0'],
      ['Far-out', 'attendance_rate 150'],
      ['Case clash', 'gender \u2018Female/male\u2019'],
      ['Action', 'a person decides every fix'],
    ],
  },
  {
    n: '5',
    term: 'Processing \u2014 processing.py',
    what: 'The translator script: it turns words into numbers (called encoding) for every model, and resizes numbers onto one shared scale (called scaling) for the points-based model only.',
    tech: 'A preprocessing script applying encoding (turning text categories into numbers \u2014 one-hot encoding gives each category its own 0/1 column) for every model, and scaling (StandardScaler: each numeric column is re-centred on a mean of 0 with spread 1) for the points-based model only.',
    howLabel: 'How it works',
    how: [
      'One-hot encoding: each text category gets its own 0/1 column \u2014 for every model.',
      'StandardScaler: each numeric column is re-centred on mean 0 with spread 1 \u2014 for the points-based model only.',
    ],
    example: [
      ['gender', '\u2018Female\u2019 and \u2018male\u2019 \u2192 separate 0/1 columns'],
      ['study_program', 'Engineering, Arts, Science \u2192 one 0/1 column each'],
      ['Numerics', 're-centred: mean 0, spread 1'],
      ['Output', 'number arrays shaped per model'],
    ],
  },
  {
    n: '6',
    term: 'Split dates \u2014 splitter.py',
    what: 'The divider script: it cuts the table in calendar order with no shuffling \u2014 the training years (2019\u20132023) for learning and tuning, versus the locked-away future years (2024\u20132025) saved for one final check.',
    tech: 'A chronological split: the table is divided by calendar year with no shuffling \u2014 training and tuning years 2019\u20132023 versus the locked-away final-check years 2024\u20132025, used once in step 15. The date order itself is the rule; no random seed is involved.',
    howLabel: 'How it works',
    how: [
      'Cuts the table in calendar order \u2014 no shuffling.',
      'Training and tuning years: 2019\u20132023.',
      'Final-check years: 2024\u20132025, locked away until step 15.',
    ],
    example: [
      ['Training years', '2019\u20132023 \u2014 learning and tuning'],
      ['Final-check years', '2024\u20132025 \u2014 locked away'],
      ['Shuffling', 'none \u2014 date order is the rule'],
      ['Random seed', 'not involved here'],
    ],
  },
  {
    n: '7',
    term: 'Practice rounds in 5 slices \u00b7 students kept together',
    what: 'Splits the training years (2019\u20132023) into 5 slices, grouped so no student appears in two slices; every model trains and is tested on the identical slices.',
    tech: 'The technical name is cross-validation with student-grouped folds: the training years are cut into 5 slices (folds) so no student appears in two slices, and every model trains and is scored on the identical slices, each round from a fresh, unfitted copy (seed 42 \u2014 a fixed shuffle number so reruns repeat).',
    howLabel: 'How it works',
    how: [
      'Cuts the 2019\u20132023 years into 5 slices grouped so no student appears in two slices.',
      'Every model trains and is tested on the identical slices (seed 42 \u2014 reruns repeat).',
      'Each round uses a fresh, unfitted copy \u2014 nothing is remembered.',
    ],
    example: [
      ['Slices', '5 \u2014 students kept together'],
      ['Seed', '42 \u2014 a fixed shuffle number'],
      ['Per model', 'each round: train on 4 slices, be tested on the 5th'],
      ['Output', '5 identical slice pairs, reused by steps 8\u201312'],
    ],
  },
  {
    n: '8',
    term: 'SMOTE',
    what: 'Creates extra synthetic copies of rare At-Risk rows inside the training slices only \u2014 never inside the slice being tested.',
    tech: 'SMOTE = Synthetic Minority Over-sampling Technique: it interpolates new minority samples between nearest neighbours in feature space. Here it runs with seed 42 and k = 1 \u2014 each synthetic At-Risk row is built from one nearest neighbour of a real At-Risk row. Blanks are filled first: median (the middle value) for numbers, most common (the top choice) for words.',
    howLabel: 'How it works',
    how: [
      'Fills blanks first: median (the middle value) for numbers, most common (the top choice) for words.',
      'Builds each synthetic At-Risk row from one nearest neighbour of a real At-Risk row (k = 1, seed 42).',
      'Runs inside the training slices only \u2014 never inside the slice being tested.',
      'Both ways run \u2014 no-SMOTE versus SMOTE; the final check uses no-SMOTE.',
    ],
    example: [
      ['Fill first', 'median for numbers, most common for words'],
      ['k = 1', 'each copy built from one nearest neighbour'],
      ['Seed', '42'],
      ['Where', 'training slices only \u2014 never the tested slice'],
      ['Both ways', 'no-SMOTE vs SMOTE \u00b7 final check: no-SMOTE'],
    ],
  },
  {
    n: '9',
    term: 'Trying every setting \u2014 grid search',
    what: 'Tries each model\u2019s settings on the training-year slices and keeps the best by F1 for the \u2018At Risk\u2019 label the models hunt for (F1 = one number balancing false alarms and misses \u2014 fully defined in the math section of entry 10) \u2014 one pass, before final scoring.',
    tech: 'GridSearchCV = exhaustive search over a parameter grid with cross-validated scoring: every combination in each model\u2019s grid is tried, each scored by F1 for the \u2018At Risk\u2019 label over the same grouped slices, and the best combination is kept \u2014 one pass, before final scoring.',
    howLabel: 'How it works',
    how: [
      'Tries every combination in each model\u2019s setting grid on the training-year slices.',
      'Scores each combination by F1 for the \u2018At Risk\u2019 label over the same grouped slices.',
      'Keeps the best combination per model \u2014 one pass, before final scoring.',
    ],
    example: [
      ['DT', 'max_depth = 10 \u2014 winning question depth limit'],
      ['RF', 'max_depth = 10 with 200 trees voting'],
      ['LR', 'C = 1.0 \u2014 winning mistake strictness level'],
      ['NB', 'var_smoothing = 1e-06 \u2014 tiny safety cushion'],
      ['Output', 'one winning setting per model \u2192 step 10 unchanged'],
    ],
  },
  {
    n: 'M',
    term: 'The 5 models \u2014 run between steps 9 and 10',
    what: 'Five predictors run between steps 9 and 10 \u2014 four contenders plus one baseline \u2014 each turning a student\u2019s data into a label plus a 0-to-1 risk score.',
    tech: 'Decision Tree, Random Forest (n_estimators = 200, seed 42), Logistic Regression, GaussianNB and DummyClassifier (stratified) \u2014 the five tuned models. A risk score means the model\u2019s 0-to-1 guess of how likely a student is At Risk.',
    howLabel: 'How it works',
    how: [
      'Decision Tree: a flowchart of yes/no questions about the student ending in a verdict plus a 0-to-1 risk score.',
      'Random Forest: 200 such flowcharts vote and the majority wins.',
      'Logistic Regression: every clue gets points and the total converts to a 0-to-1 risk score.',
      'GaussianNB: a detective combining how likely each clue is under each outcome into a 0-to-1 risk score.',
      'Dummy (Stratified): a weighted coin flip copying past At-Risk proportions \u2014 the baseline every real model must beat, never deployed, as Chapter 3 requires.',
    ],
    example: [
      ['Input', 'attendance 65 + GPA 2.1'],
      ['Decision Tree', 'follows its questions \u2192 At Risk verdict'],
      ['Random Forest', 'majority of 200 votes \u2192 At Risk'],
      ['Logistic Regression', 'clue points total \u2192 At Risk'],
      ['GaussianNB', 'clue likelihoods combined \u2192 At Risk'],
      ['Dummy', 'weighted coin flip \u2192 verdict by past proportions'],
    ],
  },
  {
    n: '10',
    term: 'Score every model',
    what: 'Records accuracy plus precision, recall, F1 and ROC-AUC per slice, with the \u2018At Risk\u2019 label the models hunt for as the target.',
    tech: 'Standard classification metrics computed per slice with the \u2018At Risk\u2019 label the models hunt for as the target. A threshold means the cutoff score above which a student is flagged; ROC-AUC is read across every threshold at once (TPR = share of at-risk students found; FPR = share of safe students wrongly flagged).',
    howLabel: 'How it works',
    how: [
      'Scores each model\u2019s predicted labels and predict_proba At-Risk scores (the 0-to-1 At-Risk guess) on every slice.',
      'Records accuracy plus precision, recall, F1 and ROC-AUC per slice.',
      'The paired slice-by-slice F1 scores become the Wilcoxon observations in step 13.',
    ],
    example: [
      ['Per slice', 'accuracy, precision, recall, F1, ROC-AUC'],
      ['Target', 'the \u2018At Risk\u2019 label the models hunt for'],
      ['Threshold', 'the cutoff score above which a student is flagged'],
      ['ROC-AUC', 'read across every threshold at once'],
      ['Output', 'paired slice-by-slice F1 \u2192 step 13\u2019s test'],
    ],
    math: [
      { eq: 'precision = TP ÷ (TP + FP)', ex: 'TP = truly at-risk students correctly flagged. FP = safe students wrongly flagged.' },
      { eq: 'recall = TP ÷ (TP + FN)', ex: 'FN = at-risk students missed — found ÷ all truly at-risk.' },
      { eq: 'F1 = 2 × (precision × recall) ÷ (precision + recall)', ex: 'The harmonic mean of precision and recall — a kind of average that punishes imbalance: if either is low, F1 is low. Worked example: precision 0.99, recall 0.70 → F1 = 2 × 0.693 ÷ 1.69 ≈ 0.82.' },
      { eq: 'ROC-AUC = area under the TPR-vs-FPR curve', ex: '0.5 = coin flip, 1.0 = perfect separation of at-risk from safe across every threshold.' },
    ],
  },
  {
    n: '11',
    term: 'Average the 5 scores',
    what: 'Averages each model\u2019s five slice scores into one trustworthy result per model.',
    tech: 'The arithmetic mean of each model\u2019s five slice scores per metric (sum ÷ 5) \u2014 one stable number per model, saved for the Wilcoxon test below.',
    howLabel: 'How it works',
    how: [
      'Adds up each model\u2019s five slice scores per metric.',
      'Divides by 5 \u2014 one stable number per model.',
      'Saved for the Wilcoxon test in step 13.',
    ],
    example: [
      ['Input', '5 slice scores per model'],
      ['Operation', 'sum ÷ 5, per metric'],
      ['Output', 'one averaged score per model'],
      ['Stored for', 'step 13\u2019s Wilcoxon test'],
    ],
  },
  {
    n: '12',
    term: 'Compare the models',
    what: 'Ranks the models on the identical slices, so each pair faced the same students.',
    tech: 'A paired ranking: all five models are ordered on the identical slices, so each pair of models faced the same students slice by slice \u2014 and the 6 model pairs it defines are what the Wilcoxon test checks.',
    howLabel: 'How it works',
    how: [
      'Ranks all five models on the identical slices.',
      'Each pair faced the same students, slice by slice.',
      'The 6 model pairs it defines go to the Wilcoxon test.',
    ],
    example: [
      ['Ranked', '5 models on identical slices'],
      ['Pairs', '6 model pairs (e.g. DT vs RF)'],
      ['Fairness', 'every pair faced the same students'],
      ['Output', 'ranking + 6 pairs \u2192 step 13'],
    ],
  },
  {
    n: '13',
    term: 'Wilcoxon test',
    what: 'A paired check \u2014 paired means slice by slice, same slice against same slice \u2014 of slice F1 scores across all 6 model pairs, with the Holm correction at \u03b1 = 0.05.',
    tech: 'Wilcoxon signed-rank = a non-parametric test on paired differences: it compares slice-by-slice F1 scores of all 6 model pairs (same slice against same slice). Holm = a step-down p-value adjustment controlling the family-wise error rate \u2014 a stricter bar because 6 pairs are tested at once.',
    howLabel: 'How it checks',
    how: [
      'Compares slice-by-slice F1 scores of all 6 model pairs \u2014 same slice against same slice.',
      'Asks whether a score gap is real or just luck of the split.',
      'Applies the Holm correction at \u03b1 = 0.05 \u2014 a stricter bar because 6 pairs are tested at once.',
    ],
    example: [
      ['Pairs tested', '6 \u2014 every model pair'],
      ['Correction', 'Holm \u2014 a stricter bar'],
      ['\u03b1', '0.05'],
      ['Result', '0 of 6 pairs significant'],
    ],
    math: [
      { eq: 'W = sum of signed ranks of the paired slice F1 differences', ex: 'For each slice, rank how far the two models\u2019 F1 scores differ, keep the sign, and add the ranks up. p-value = the chance of seeing a gap this big if the models were identical.' },
      { eq: 'Holm: sort p-values, compare smallest to α/6, next to α/5, …', ex: 'Family-wise α = 0.05, so the smallest p-value must beat 0.0083, the next 0.01, and so on — stricter than testing all 6 at once. Result here: 0 of 6 pairs significant.' },
    ],
  },
  {
    n: '14',
    term: 'Select the model',
    what: 'Picks the winner on the evidence, without retraining \u2014 here the winner is Random Forest (n_estimators = 200, seed 42), kept exactly as measured.',
    tech: 'Selection without retraining: the evidence-backed winner \u2014 Random Forest (n_estimators = 200, seed 42) \u2014 is carried forward exactly as tuned and measured; no extra fit is run to chase a better number.',
    howLabel: 'How it works',
    how: [
      'Picks the evidence-backed winner \u2014 no retraining, no extra fit.',
      'Carries it forward exactly as tuned and measured.',
    ],
    example: [
      ['Winner', 'Random Forest (n_estimators = 200, seed 42)'],
      ['Evidence', 'averaged scores, ranking, significance'],
      ['Retraining', 'none \u2014 kept exactly as measured'],
      ['Output', 'the frozen winner \u2192 step 15 unchanged'],
    ],
  },
  {
    n: '15',
    term: 'Final evaluation',
    what: 'Runs the frozen winner once on the locked-away future years (2024\u20132025), students never seen in training or tuning \u2014 with no-SMOTE.',
    tech: 'One single run of the frozen winner (loaded, not retrained) on the locked-away future years 2024\u20132025 \u2014 students never seen in training or tuning \u2014 with no-SMOTE. Run once, then scored.',
    howLabel: 'How it checks',
    how: [
      'Loads the frozen winner \u2014 never retrains it.',
      'Runs it once on the locked-away future years 2024\u20132025 with no-SMOTE.',
      'Scores the run and records it.',
    ],
    example: [
      ['Data', 'future years 2024\u20132025 \u2014 never seen in training or tuning'],
      ['SMOTE', 'none'],
      ['Runs', 'once, then scored'],
      ['One run (LR)', 'F1 0.8170 \u00b7 recall 0.6959 \u00b7 ROC-AUC 0.9339'],
    ],
  },
  {
    n: '16',
    term: 'Report results',
    what: 'Records the results for the thesis; each student\u2019s risk score is sorted into bands Low, Medium or High for action.',
    tech: 'Every student\u2019s risk score (the 0-to-1 guess that a student is At Risk) is sorted into deployment bands \u2014 probability cutoffs \u2014 for action, and all results are recorded for the thesis.',
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
      { eq: 'Low 0.00–0.39 · Medium 0.40–0.69 · High 0.70–1.00', ex: 'Deployment bands are probability cutoffs on the risk score (the 0-to-1 At-Risk guess): below 0.40 = Low, 0.40–0.69 = Medium, 0.70 and above = High.' },
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
