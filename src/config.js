export const AppConfig = {
  ortCdn: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.min.js',
  wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/',
  models: [
    { id: 'decision_tree', file: './models/decision_tree.onnx', label: 'Decision Tree', short: 'DT' },
    { id: 'random_forest', file: './models/random_forest.onnx', label: 'Random Forest', short: 'RF' },
    { id: 'logistic_regression', file: './models/logistic_regression.onnx', label: 'Log. Regression', short: 'LR' },
    { id: 'naive_bayes', file: './models/naive_bayes.onnx', label: 'Naive Bayes', short: 'NB' },
  ],
  inputNames: [
    'GWA',
    'Number_of_Failed_Courses',
    'Number_of_Dropped_Courses',
    'Total_Units_Taken',
    'Year_Level',
    'Course_Program_Enrolled',
    'Enrollment_History',
    'Previous_Academic_Standing',
  ],
  outputLabel: 'label',
  outputProba: 'probabilities',
  atRiskClass: 1,
  bands: [
    { name: 'Low', min: 0.0, max: 0.39, css: 'band-low' },
    { name: 'Medium', min: 0.4, max: 0.69, css: 'band-medium' },
    { name: 'High', min: 0.7, max: 1.0, css: 'band-high' },
  ],
  imputeReference: {
    numericMedian: { gwa: 1.75, failed: 0, dropped: 0, units: 25, year: 2 },
    categoricalMode: { program: 'BS CRIM', enrollHist: 'Enrollment #2', prevStanding: 'Good Standing' },
  },
  maxRows: 5000,
  reportTitle: 'Academic Risk Report',
}
