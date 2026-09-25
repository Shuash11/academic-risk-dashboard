ACADEMIC RISK DASHBOARD — RETRAINED PIPELINE (Vite + React build)
==============================================================================
Supportive use only, never punitive. Models were retrained on a leakage-free
t+1 target (at-risk on the student's NEXT record) over a chronological
temporal split (train 2018-2023 / test 2024-2025); see model_metrics.json
for the full prediction design, leakage guards and degenerate-target audit.
No data leaves the browser (all inference runs locally via onnxruntime-web,
CPU/WASM backend).

FILES (this folder)
------------------------------------------------------------------------------
index.html        Vite entry point (serves src/ in dev, dist/ after build).
models/           4 retrained ONNX models (opset 14) + contracts:
                    decision_tree.onnx        (~42 KB)
                    random_forest.onnx        (~56.3 MB — slower to load;
                                               measured 59,075,606 B = 56.34 MB.
                                               GitHub flags files >50 MB (push +
                                               Pages deploy succeeded). Kept as-is:
                                               pruning/compressing would change the
                                               verified metrics; LFS not adopted
                                               (Pages serving of LFS binaries is
                                               unverified — test before any move))
                    logistic_regression.onnx  (~4 KB)
                    naive_bayes.onnx          (~6 KB)
                    onnx_inputs.json          I/O contract (11 inputs, 2 outputs)
                    onnx_parity.json          parity reference (n=1,500 rows,
                                              labels exact on every row;
                                              RF proba diff ~6e-2 explained)
public/data/      model_metrics.json (dataset, prediction design, leakage
                  guards, degenerate-target audit, per-model metrics),
                  feature_importance.json (per-model method + top-5 share).
src/              React app (App.jsx + components/ + lib/ + pages/).
README.txt        This file.
training/         The leakage-free retraining pipeline (Python source +
                  verification_report.json).

HOW TO OPEN
------------------------------------------------------------------------------
Option A (recommended): serve the app.
  npm install
  npm run dev          -> http://localhost:5173
  or: npm run build && npm run preview -> http://localhost:4173

Option B: open the built dist/index.html directly.
  - Firefox loads ./models/*.onnx via file:// without extra setup.
  - Chrome blocks file:// model fetch by default. If badges show "failed"
    with a fetch error: use Firefox, OR serve the folder locally:
      cd "<this folder>"
      python -m http.server 8000
      -> open http://localhost:8000/ (dist/) or run npm run dev
    OR launch Chrome with --allow-file-access-from-files.

Requirement: internet access on first load for the onnxruntime-web CDN
  (https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.min.js).
  Models themselves are local files; nothing is uploaded anywhere.

FEATURE MAP
------------------------------------------------------------------------------
Header banner .......... On-device · Private + supportive-use notice.
Model selector ......... 4 models + compare-all. Sessions load lazily on Run
                         (badges show loading / loaded-CPU / failed).
CSV import ............. Real-schema headers accepted (case-insensitive):
                           GWA | Number of Failed Courses |
                           Number of Dropped Courses | Total Units Taken |
                           Year Level | Course/Program Enrolled |
                           Enrollment History | Previous Academic Standing |
                           Final Grades
                         PARSED for the three grade aggregates (never
                         ignored): the Final Grades string is split on ";"
                         and each trailing grade matched, giving
                           n_subjects_t     (count of parsed values),
                           mean_grade_t     (their mean),
                           n_failed_grades_t (values exactly equal to 5.0 —
                                              only 5.0 fails on the Philippine
                                              1.0-5.0 scale).
                         Unparseable grade tokens are skipped and counted.
                         Display-only (never fed to models):
                           Student ID (kept as display label only),
                           Academic Year, Semester, any outcome/status/label
                           columns.
                         Missing: numerics -> NaN (median-imputed in-graph),
                           categoricals -> "" (most-frequent fill in-graph).
                         Counts of missing/bad cells and skipped grade
                         tokens are reported.
Run-all ................ Batched per-model inference [N,1] tensors; outputs
                         label [N] + probabilities [N,2], class 1 = at-risk
                         on the student's NEXT record. Per-row label +
                         P(at-risk) + band per model.
Summary ................ Counts, predicted at-risk counts/rates, mean
                         P(at-risk), band distribution per model.
                         DESCRIPTIVE ONLY — not recall/precision/validation.
Charts ................. Band bar + P(at-risk) histogram, plain <canvas>,
                         no chart dependency. Follows the selected model
                         (compare-all shows Random Forest when available).
Drilldown .............. Click any result row: 11 feature values (incl.
                         n_subjects_t, mean_grade_t, n_failed_grades_t),
                         per-model outputs, and "top signals" heuristic
                         notes, always labeled association-only (NOT model
                         explanations).
Export ................. Print / save-PDF (print stylesheet hides controls);
                         download predictions CSV; download report JSON.
Sample rows ............ None — import your own CSV to begin.
Error states ........... CDN failure, missing/blocked .onnx (with file://
                         guidance), bad CSV (no/unrecognized headers, empty),
                         inference errors, and a CPU-only notice (WebGL is
                         intentionally never used; a WASM failure is reported
                         as CPU-backend failure, not silently retried on GPU).

RISK BANDS (on P(at-risk))  |  Low 0-0.39  |  Medium 0.40-0.69  |  High 0.70-1.00
  The bands are presentation cutoffs, not validated institutional risk
  thresholds; live RF probabilities can differ from scikit-learn by up to
  ~0.06 at borderline splits (see models/onnx_parity.json).

VERIFICATION (retrained pipeline; see training/verification_report.json)
------------------------------------------------------------------------------
- All 4 sessions load; I/O names match the contract exactly (11 inputs,
  session_input_order):
    inputs  GWA, Number_of_Failed_Courses, Number_of_Dropped_Courses,
            Total_Units_Taken, Year_Level (float32 [N,1]),
            n_subjects_t, mean_grade_t, n_failed_grades_t (float32 [N,1]),
            Course_Program_Enrolled, Enrollment_History,
            Previous_Academic_Standing (string [N,1])
    outputs label (int64 [N]), probabilities (float32 [N,2])
- Parity reference on file (n=1,500 untouched temporal-test rows): all 4
  models label exact-match; max |dProba| within 1e-5 for DT, LR and NB;
  RandomForest can exceed 1e-5 (observed ~6e-2) — expected float32-vs-float64
  TreeEnsemble threshold flips at borderline splits (labels unchanged). See
  models/onnx_parity.json.
- Missing-value path (NaN + "" for the three grade aggregates) executes
  without error on all 4 graphs, confirming the in-graph median imputation
  the frontend relies on (train medians: n_subjects_t 9.0, mean_grade_t
  ~1.7333, n_failed_grades_t 0.0).

LIMITS
------------------------------------------------------------------------------
Dashboard UI only. Not a validation of the study models (see
training/verification_report.json). Never use outputs punitively or as final
academic-standing decisions.
