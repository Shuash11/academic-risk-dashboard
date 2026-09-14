# AGENTS.md

Vite + React 18 JSX + Tailwind 3. `src/main.jsx` → `src/App.jsx` runs 4 ONNX models in-browser via `onnxruntime-web@1.22.0` CPU/WASM (npm). `README.txt` is feature/verification doc; `models/onnx_inputs.json` + `models/onnx_parity.json` are the contract (opset 14). `public/models/` is served at build (keep in sync with `models/`). *2026-09 redesign: provisional/demo banners removed per owner request — UI is now clean/production-style.*

## Run / build / deploy
- Install: `npm ci` (Node 20). Dev: `npm run dev` → `http://localhost:5173`. Build: `npm run build` → `dist/` (base `./` for Pages). Preview: `npm run preview`.
- First load needs internet for pinned `onnxruntime-web@1.22.0` WASM CDN (`src/config.js:2-3` `ortCdn`+`wasmPaths` must match `src/lib/onnxRunner.js:12` `wasmPaths`/`numThreads`); `.onnx` local in `public/models/`. `random_forest.onnx` ~23 MB, slow.
- Push to `main` → `.github/workflows/pages.yml` runs `npm ci && npm run build` and publishes `dist/` to GitHub Pages. No `python -m http.server` needed.

## Architecture
- Entry: `index.html` (root `#root`) + `src/index.css` (Tailwind base). No legacy `app.js`/`styles.css` IIFE — deleted.
- Config single source: `src/config.js` `AppConfig` (models, `inputNames`/`outputLabel`/`outputProba`, `bands`, `maxRows:5000`, `reportTitle`). Keep in sync with `models/onnx_inputs.json` `session_input_order` and `public/models/*.onnx`.
- Lib parity: `src/lib/csvParser.js`, `featureMapper.js:10` `ALIASES`, `riskBands.js`, `signalNotes.js`, `reportExporter.js`, `onnxRunner.js:33` `executionProviders: ["wasm"]` — exact ports of original `app.js` logic.
- UI: `src/components/Header.jsx` (badges), `Controls.jsx`, `StatusLog.jsx`, `Summary.jsx`, `Charts.jsx` (plain `<canvas>`), `ResultsTable.jsx` + drilldown, `ExportSection.jsx`. `src/App.jsx` holds all state and is the only orchestrator (mirrors old `DashboardApp`).
- Models: keep `models/*.onnx` + `public/models/*` in sync (both at repo root and `public/`). Vite serves `public/` at `/`.

## Hard rules
- CPU/WASM only: `src/lib/onnxRunner.js:33` `["wasm"]`, `numThreads=1`. Never add WebGL.
- `.gitignore` forbids `e2e/`, `tests/e2e/`, Playwright/Cypress configs, `*.spec.*` — never commit test-runner artifacts. Do not add another framework/bundler beyond Vite+React+Tailwind.
- Tailwind classes replace `styles.css` tokens (`status-ok/warn/err`, `band-low/medium/high`, `summary-chip`, `row-selected` now in JSX) — keep visual parity if renaming.

## ONNX contract (verify against `models/`)
- 8 inputs exact session order: 5× `float32 [N,1]` — `GWA`, `Number_of_Failed_Courses`, `Number_of_Dropped_Courses`, `Total_Units_Taken`, `Year_Level`; then 3× `string [N,1]` — `Course_Program_Enrolled`, `Enrollment_History`, `Previous_Academic_Standing`.
- Missing numerics → `NaN`, missing categoricals → `""` (never `null`/`NaN` in string tensors). Imputation in-graph (`numeric_median_impute` / `absent_value_fill_most_frequent`), not in JS.
- Outputs: `label` `int64 [N]`, `probabilities` `float32 [N,2]`; class 1 = at-risk. Bands on `P(at-risk)`: Low 0–0.39, Medium 0.40–0.69, High 0.70–1.00.
- CSV import uses tolerant `FeatureMapper.ALIASES` (`src/lib/featureMapper.js:10`) and ignores ID/outcome/status cols (Student ID display only); rows truncate at `AppConfig.maxRows` (5000).
