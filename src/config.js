export const AppConfig = {
  ortCdn: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.min.js',
  wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/',
  models: [
    { id: 'decision_tree', file: './models/decision_tree.onnx', label: 'Decision Tree', short: 'DT' },
    { id: 'random_forest', file: './models/random_forest.onnx', label: 'Random Forest', short: 'RF' },
    { id: 'logistic_regression', file: './models/logistic_regression.onnx', label: 'Log. Regression', short: 'LR' },
    { id: 'naive_bayes', file: './models/naive_bayes.onnx', label: 'Naive Bayes', short: 'NB' },
  ],
  // 11 model inputs in exact session_input_order (models/onnx_inputs.json):
  // 8 numeric float32 [N,1] — 5 legacy numerics + 3 parsed from the Final Grades
  // column — plus 3 categorical string [N,1]. dtype drives tensor type in OnnxRunner.
  inputFeeds: [
    { name: 'GWA', key: 'gwa', dtype: 'float32' },
    { name: 'Number_of_Failed_Courses', key: 'failed', dtype: 'float32' },
    { name: 'Number_of_Dropped_Courses', key: 'dropped', dtype: 'float32' },
    { name: 'Total_Units_Taken', key: 'units', dtype: 'float32' },
    { name: 'Year_Level', key: 'year', dtype: 'float32' },
    { name: 'n_subjects_t', key: 'nSubjects', dtype: 'float32' },
    { name: 'mean_grade_t', key: 'meanGrade', dtype: 'float32' },
    { name: 'n_failed_grades_t', key: 'nFailedGrades', dtype: 'float32' },
    { name: 'Course_Program_Enrolled', key: 'program', dtype: 'string' },
    { name: 'Enrollment_History', key: 'enrollHist', dtype: 'string' },
    { name: 'Previous_Academic_Standing', key: 'prevStanding', dtype: 'string' },
  ],
  get inputNames() {
    return this.inputFeeds.map((f) => f.name)
  },
  outputLabel: 'label',
  outputProba: 'probabilities',
  atRiskClass: 1,
  bands: [
    { name: 'Low', min: 0.0, max: 0.39, css: 'band-low' },
    { name: 'Medium', min: 0.4, max: 0.69, css: 'band-medium' },
    { name: 'High', min: 0.7, max: 1.0, css: 'band-high' },
  ],
  imputeReference: {
    numericMedian: { gwa: 1.759, failed: 0, dropped: 0, units: 25, year: 2, nSubjects: 9, meanGrade: 1.7333333333333334, nFailedGrades: 0 },
    categoricalMode: { program: 'BS CRIM', enrollHist: 'Enrollment #1', prevStanding: 'Good Standing' },
  },
  maxRows: 5000,
  reportTitle: 'Academic Risk Report',
}
