"""Shared constants for the leakage-free t+1 retraining pipeline.

Prediction design (also exported into model_metrics.json):
  Predictors = information available at the end of semester t
  Target     = at-risk status observed in semester t+1.
"""

CSV_PATH = r"C:\Users\joashua\Downloads\cleaned_student_data_hya.csv"
DASHBOARD_DIR = r"C:\Users\joashua\Downloads\academic_risk_dashboard"

RANDOM_STATE = 42
THRESHOLD = 0.5  # classification threshold used for every reported metric
ONNX_OPSET = 14
PARITY_N_ROWS = 1500  # sklearn-vs-ONNX parity rows (>= 1,000 required)

# Target rule (OUTCOME-based, semester t+1 record):
#   at_risk_t1 = 1 iff (Number_of_Failed_Courses > 0 OR Number_of_Dropped_Courses > 0)
#   on the student's NEXT (t+1) record.
# Why not the t+1 Previous Academic Standing (the first candidate rule)?
# Verified data fact: standing_{t+1} is EXACTLY (failed_t > 0 OR dropped_t > 0)
# with 0 mismatches in 55,635 linked rows -- i.e. the institution writes the
# next standing as a deterministic admin function of the current semester's
# failures/drops. Using it as the target reproduces the original defect (a
# target forced by two predictors; DT/RF/LR all scored 1.0000 on it). The
# outcome-based target asks the genuinely uncertain forward question -- will
# the student fail/drop courses NEXT semester? -- from strictly semester-t
# information. Full audit trail is exported in model_metrics.json
# ("degenerate_target_audit").
AT_RISK_STANDINGS = frozenset({"With Failed Courses", "With Dropped Courses"})
NOT_AT_RISK_STANDINGS = frozenset({"Good Standing", "New/No Previous Record"})

# Temporal split on the PREDICTOR semester (t). 2018 exists in the data although
# the manuscript says 2019-2025; those 3,008 rows are strictly pre-test so they
# join training (documented as a data-vs-manuscript difference).
TRAIN_YEARS = (2018, 2019, 2020, 2021, 2022, 2023)
TEST_YEARS = (2024, 2025)
N_GROUP_FOLDS = 5

# Raw predictor columns (semester-t information ONLY). The t+1 standing that
# defines the target must NEVER appear here (enforced by leakage guards).
NUMERIC_FEATURES = [
    "GWA",
    "Number of Failed Courses",
    "Number of Dropped Courses",
    "Total Units Taken",
    "Year Level",
    "n_subjects_t",
    "mean_grade_t",
    "n_failed_grades_t",
]
CATEGORICAL_FEATURES = [
    "Course/Program Enrolled",
    "Enrollment History",
    "Previous Academic Standing",  # standing carried INTO semester t (row t's own field)
]
TARGET_COLUMN = "at_risk_t1"


def sanitize(name):
    """Graph-safe feature name: spaces/slashes become underscores."""
    return name.replace(" ", "_").replace("/", "_")


# Sanitized twins used as DataFrame columns when fitting pipelines, so the
# ColumnTransformer selectors match the ONNX initial_types exactly.
NUMERIC_FEATURES_S = [sanitize(c) for c in NUMERIC_FEATURES]
CATEGORICAL_FEATURES_S = [sanitize(c) for c in CATEGORICAL_FEATURES]
FEATURE_COLUMNS_S = NUMERIC_FEATURES_S + CATEGORICAL_FEATURES_S

# Philippine 1.0-5.0 scale verified from the data: values observed are
# 1.0..3.0 in 0.1 steps plus 5.0. Only 5.0 denotes a failed subject.
FAILING_GRADE = 5.0

SMOTE_K = 5

# Small, deliberate hyperparameter grids (runtime-safe on ~36k rows).
PARAM_GRIDS = {
    "decision_tree": {
        "clf__max_depth": [10, 20, None],
        "clf__min_samples_split": [2, 5],
    },
    "random_forest": {
        "clf__n_estimators": [100, 200],
        "clf__max_depth": [None, 20],
    },
    "logistic_regression": {
        "clf__C": [0.1, 1.0, 10.0],
    },
}

MODEL_SPECS = [
    ("dummy", "Dummy Classifier (stratified)"),
    ("decision_tree", "Decision Tree"),
    ("random_forest", "Random Forest"),
    ("logistic_regression", "Logistic Regression"),
    ("naive_bayes", "Naive Bayes"),
]

# Model-selection hierarchy per the thesis adviser:
# Primary = Recall; Secondary = Precision/F1/PR-AUC/ROC-AUC/Specificity/CM;
# Supporting = Accuracy.
SELECTION_HIERARCHY = (
    "Primary=Recall; Secondary=Precision/F1/PR-AUC/ROC-AUC/Specificity/CM; "
    "Supporting=Accuracy"
)
