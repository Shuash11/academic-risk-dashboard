ACADEMIC RISK DASHBOARD — PROVISIONAL DEMO (static, no build step)
==============================================================================
PROVISIONAL — DEMO ONLY. Outputs are provisional and illustrative, NOT
study-validated. Supportive use only, never punitive. No retraining was
performed; no thesis claims are made. No data leaves the browser (all
inference runs locally via onnxruntime-web, CPU/WASM backend).

FILES (this folder)
------------------------------------------------------------------------------
index.html   Main page. Open it directly (see HOW TO OPEN below).
styles.css   Academic styling + responsive layout + print-friendly rules.
app.js       Dashboard logic (plain script, no modules, no build).
models/      4 provisional ONNX models (opset 14) + contracts:
               decision_tree.onnx        (~0.3 MB)
               random_forest.onnx        (~23 MB — slower to load)
               logistic_regression.onnx
               naive_bayes.onnx
               onnx_inputs.json          I/O contract (8 inputs, 2 outputs)
               onnx_parity.json          parity reference (pred exact,
                                         proba atol 1e-5, all 4 "converted")
README.txt   This file.

HOW TO OPEN
------------------------------------------------------------------------------
Option A (recommended): double-click index.html.
  - Firefox loads ./models/*.onnx via file:// without extra setup.
  - Chrome blocks file:// model fetch by default. If badges show "failed"
    with a fetch error: use Firefox, OR serve the folder locally:
      cd "<this folder>"
      python -m http.server 8000
      -> open http://localhost:8000/index.html
    OR launch Chrome with --allow-file-access-from-files (demo only).

Requirement: internet access on first load for the onnxruntime-web CDN
  (https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.min.js).
  Models themselves are local files; nothing is uploaded anywhere.

FEATURE MAP
------------------------------------------------------------------------------
Header banner .......... PROVISIONAL — DEMO ONLY + supportive-use notice.
Model selector ......... 4 models + compare-all. Sessions load lazily on Run
                         (badges show loading / loaded-CPU / failed).
CSV import ............. Real-schema headers accepted (case-insensitive):
                           GWA | Number of Failed Courses |
                           Number of Dropped Courses | Total Units Taken |
                           Year Level | Course/Program Enrolled |
                           Enrollment History | Previous Academic Standing
                         Ignored for inference (never fed to models):
                           Student ID (kept as display label only),
                           Academic Year, Semester, Final Grades, any
                           outcome/status/label columns.
                         Missing: numerics -> NaN (median-imputed in-graph),
                           categoricals -> "" (most-frequent fill in-graph).
                         Counts of missing/bad cells are reported.
Run-all ................ Batched per-model inference [N,1] tensors; outputs
                         label [N] + probabilities [N,2], class 1 =
                         provisional at-risk. Per-row label + P(at-risk) +
                         band per model.
Summary ................ Counts, predicted at-risk counts/rates, mean
                         P(at-risk), band distribution per model.
                         DESCRIPTIVE ONLY — not recall/precision/validation.
Charts ................. Band bar + P(at-risk) histogram, plain <canvas>,
                         no chart dependency. Follows the selected model
                         (compare-all shows Random Forest when available).
Drilldown .............. Click any result row: 8 feature values, per-model
                         outputs, and "top signals" heuristic notes, always
                         labeled association-only (NOT model explanations).
Export ................. Print / save-PDF (print stylesheet hides controls);
                         download predictions CSV; download report JSON.
                         Every export is stamped PROVISIONAL — DEMO ONLY.
Sample rows ............ "Load 3 synthetic demo rows" (SYN-DEMO-01..03,
                         always tagged SYNTHETIC; row 03 demos missing-value
                         imputation). "Download sample CSV" for the same rows.
Error states ........... CDN failure, missing/blocked .onnx (with file://
                         guidance), bad CSV (no/unrecognized headers, empty),
                         inference errors, and a CPU-only notice (WebGL is
                         intentionally never used; a WASM failure is reported
                         as CPU-backend failure, not silently retried on GPU).

RISK BANDS (on P(at-risk))  |  Low 0-0.39  |  Medium 0.40-0.69  |  High 0.70-1.00

VERIFICATION (done at build time, 2026-09-10, python onnxruntime CPU)
------------------------------------------------------------------------------
- All 4 sessions load; I/O names match the contract exactly:
    inputs  GWA, Number_of_Failed_Courses, Number_of_Dropped_Courses,
            Total_Units_Taken, Year_Level (float32 [N,1]),
            Course_Program_Enrolled, Enrollment_History,
            Previous_Academic_Standing (string [N,1])
    outputs label (int64 [N]), probabilities (float32 [N,2])
- Parity reference on file: all 4 models pred exact-match, max |dProba|
  within 1e-5 (see models/onnx_parity.json).
- Built-in demo rows re-ran in python (N=3 incl. NaN + ""):
    SYN-DEMO-01 (GWA 1.50, 0 fail, 0 drop, BSCS/Good Standing)
      -> label 0 on all 4 (DT 0.0000, RF 0.3133, LR 0.0374, NB 0.0004) = Low.
    SYN-DEMO-02 (GWA 2.75, 3 fail, 1 drop, With Failed Courses)
      -> label 1 on all 4 (proba ~1.0000) = High.
    SYN-DEMO-03 (missing GWA/categoricals -> in-graph impute)
      -> label 0 on all 4 (DT 0.0000, RF 0.0200, LR 0.1073, NB 0.0003) = Low.
  Missing-value path (NaN + "") executes without error on all 4 graphs,
  confirming the in-graph imputation the frontend relies on.

LIMITS
------------------------------------------------------------------------------
Demo UI only. Not a validation of the study models (see FINAL_TECHNICAL_
REPORT.md: sample-only demo, study target PENDING). Never use outputs
punitively or as final academic-standing decisions.
