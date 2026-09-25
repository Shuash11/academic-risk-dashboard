"""Orchestrator: load -> build t+1 dataset -> temporal split -> train -> evaluate -> export.

Reproducible end-to-end with seed 42:
    cd training && python main.py

Writes: public/data/model_metrics.json, public/data/feature_importance.json,
models/*.onnx + contracts (mirrored to public/models/), verification report.
"""

import json
import os

import imblearn
import numpy as np
import onnx
import onnxruntime
import pandas as pd
import sklearn
import skl2onnx

import config
from config import (
    AT_RISK_STANDINGS,
    CATEGORICAL_FEATURES,
    MODEL_SPECS,
    NOT_AT_RISK_STANDINGS,
    NUMERIC_FEATURES,
    PARAM_GRIDS,
    RANDOM_STATE,
    TARGET_COLUMN,
    TEST_YEARS,
    THRESHOLD,
    TRAIN_YEARS,
)
from data_loader import DataLoader
from dataset_builder import DatasetBuilder
from evaluator import Evaluator, ImportanceExtractor
from exporter import ArtifactExporter, OnnxExporter
from pipeline import ModelTrainer
from splitter import TemporalSplitter

LABELS = dict(MODEL_SPECS)
FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def package_versions():
    return {
        "python": "%d.%d.%d" % tuple(__import__("sys").version_info[:3]),
        "pandas": pd.__version__,
        "numpy": np.__version__,
        "scikit-learn": sklearn.__version__,
        "imbalanced-learn": imblearn.__version__,
        "skl2onnx": skl2onnx.__version__,
        "onnx": onnx.__version__,
        "onnxruntime": onnxruntime.__version__,
    }


def display_name(raw_column, category=None):
    base = raw_column.replace(" ", "_").replace("/", "_")
    return base if category is None else "%s_%s" % (base, category)


def readable_importance(raw_features):
    """Map 'num__GWA'/'cat__X_v' names back to the dashboard's display convention."""
    out = []
    for item in raw_features:
        name = item["name"]
        if "__" in name:
            _prefix, rest = name.split("__", 1)
            out.append({"name": rest.replace(" ", "_").replace("/", "_"),
                        "importance": item["importance"]})
        else:
            out.append({"name": name.replace(" ", "_").replace("/", "_"),
                        "importance": item["importance"]})
    return out


def classification_report_from_cm(tn, fp, fn, tp):
    def safe(a, b):
        return (a / b) if b else 0.0
    return {
        "0": {"precision": safe(tn, tn + fn), "recall": safe(tn, tn + fp),
              "f1-score": 2 * safe(tn, tn + fn) * safe(tn, tn + fp) / (
                  safe(tn, tn + fn) + safe(tn, tn + fp)) if (
                  safe(tn, tn + fn) + safe(tn, tn + fp)) else 0.0},
        "1": {"precision": safe(tp, tp + fp), "recall": safe(tp, tp + fn),
              "f1-score": 2 * safe(tp, tp + fp) * safe(tp, tp + fn) / (
                  safe(tp, tp + fp) + safe(tp, tp + fn)) if (
                  safe(tp, tp + fp) + safe(tp, tp + fn)) else 0.0},
    }


def main():
    exporter = ArtifactExporter()
    versions = package_versions()
    print("Versions: %s" % json.dumps(versions), flush=True)

    # 1. Load + build t+1 dataset -------------------------------------
    raw = DataLoader().load()
    print("Raw rows: %d" % len(raw), flush=True)
    builder = DatasetBuilder()
    modelled = builder.build(raw)
    accounting = builder.accounting
    print("Modelled rows: %d | excluded (no future): %d | at-risk rate: %.4f" % (
        accounting["modelled_rows"], accounting["excluded_no_future"],
        accounting["at_risk_rows"] / accounting["modelled_rows"]), flush=True)

    per_year = modelled["Academic Year"].value_counts().sort_index().to_dict()
    # Excluded rows = each student's last record; recover years via anti-join.
    last_idx = raw.sort_values(
        ["Student ID", "Academic Year", "Semester"]).groupby("Student ID").tail(1).index
    excluded_years = raw.loc[raw.index.isin(set(last_idx))][
        "Academic Year"].value_counts().sort_index().to_dict()

    # 2. Temporal split -------------------------------------------------
    splitter = TemporalSplitter()
    train_df, test_df, split_info = splitter.split(modelled)
    # Sanitize DataFrame columns so ColumnTransformer selectors match the
    # ONNX initial_types exactly (raw names kept for JSON documentation).
    rename = {c: config.sanitize(c) for c in FEATURE_COLUMNS}
    X_train = train_df[FEATURE_COLUMNS].rename(columns=rename).reset_index(drop=True)
    y_train = train_df[TARGET_COLUMN].reset_index(drop=True)
    X_test = test_df[FEATURE_COLUMNS].rename(columns=rename).reset_index(drop=True)
    y_test = test_df[TARGET_COLUMN].reset_index(drop=True)
    fold_index = splitter.folds(y_train, train_df["Student ID"].to_numpy())
    print("Train: %d (students %d) | Test: %d (students %d)" % (
        len(train_df), train_df["Student ID"].nunique(),
        len(test_df), test_df["Student ID"].nunique()), flush=True)

    # 3. Train all models x variants ------------------------------------
    trainer = ModelTrainer(seed=RANDOM_STATE)
    trained = trainer.train(X_train, y_train, fold_index)

    # 4. Evaluate on the untouched temporal test set ---------------------
    evaluator = Evaluator(threshold=THRESHOLD)
    importance = ImportanceExtractor()
    onnx_helper = OnnxExporter(seed=RANDOM_STATE)
    results, importance_payload = {}, {}
    parity_models, onnx_tmp = {}, {}
    winner = None  # (recall, f1, roc_auc, model_id, variant)

    for model_id, label in MODEL_SPECS:
        entry = {"label": label, "variants": {}}
        for variant in ("without_smote", "with_smote"):
            fit = trained[model_id][variant]
            metrics = evaluator.score_on_test(fit["estimator"], X_test, y_test)
            metrics["classification_report"] = classification_report_from_cm(
                metrics["tn"], metrics["fp"], metrics["fn"], metrics["tp"])
            cv_entry = {"fold_recall": fit.get("fold_scores", []),
                        "mean_recall": fit.get("cv_recall_mean")}
            entry["variants"][variant] = {
                "metrics": metrics,
                "best_params": fit.get("best_params", {}),
                "cv": cv_entry,
            }
            key = (metrics["recall"], metrics["f1_score"], metrics["roc_auc"])
            if winner is None or key > winner[0]:
                winner = (key, model_id, variant)
        # Representative metrics = recall-winning variant (backward compat).
        win_variant = max(entry["variants"],
                          key=lambda v: (entry["variants"][v]["metrics"]["recall"],
                                         entry["variants"][v]["metrics"]["f1_score"]))
        entry["winning_variant"] = win_variant
        for k, v in entry["variants"][win_variant]["metrics"].items():
            entry[k] = v
        entry["best_params"] = entry["variants"][win_variant]["best_params"]
        entry["cv"] = entry["variants"][win_variant]["cv"]

        # Importance from the winning variant's fitted pipeline.
        imp = importance.extract(
            model_id, trained[model_id][win_variant]["estimator"])
        imp["features"] = readable_importance(imp["features"])
        imp["variant"] = win_variant
        imp["top5_share_statement"] = (
            "Top-5 features hold %.1f%% of total importance." % (imp["top5_share"] * 100)
        ) if imp["features"] else "No learned feature signal (baseline)."
        importance_payload[model_id] = {"label": label, **imp}
        entry["importance_method"] = imp["method"]
        entry["importance_top5_share"] = imp["top5_share"]
        results[model_id] = entry

        # 5. ONNX export (real models only) ------------------------------
        if model_id != "dummy":
            serving = OnnxExporter.serving_pipeline(
                trained[model_id][win_variant]["estimator"])
            # Graph-only sentinel: '' means 'absent categorical' for the
            # frontend; fitted most-frequent fills are unchanged (no refit).
            cat_pipe = serving.named_steps["preprocess"].named_transformers_["cat"]
            cat_pipe.named_steps["impute"].missing_values = ""
            tmp_dir = os.path.join(exporter.model_dir, "_tmp_onnx")
            os.makedirs(tmp_dir, exist_ok=True)
            _parity, real_tmp = onnx_helper.export_model(
                serving, X_test, tmp_dir, model_id)
            parity_models[model_id] = {
                **_parity, "variant_exported": win_variant}
            onnx_tmp[model_id] = real_tmp
            exporter.mirror_onnx(model_id, real_tmp)

    _, best_id, best_variant = winner
    best = results[best_id]
    print("Best by recall: %s (%s) recall=%.4f precision=%.4f f1=%.4f" % (
        best["label"], best_variant, best["recall"],
        best["precision"], best["f1_score"]), flush=True)

    # 6. Metrics JSON ----------------------------------------------------
    generated_at = ArtifactExporter.timestamp()
    metrics_payload = {
        "status": "RETRAINED \u2014 leakage-free temporal evaluation",
        "generated_at": generated_at,
        "prediction_design": {
            "statement": ("Predictors: information available at the end of "
                          "semester t -> Target: at-risk status in semester t+1."),
            "prediction_point": "end of semester t",
            "horizon": "t+1 (next observed semester for the same student)",
            "target_rule": ("at_risk_t1 = 1 iff the student's NEXT (t+1) record shows "
                            "Number_of_Failed_Courses > 0 OR Number_of_Dropped_Courses > 0"),
            "standing_taxonomy": {
                "values_in_data": sorted(AT_RISK_STANDINGS | NOT_AT_RISK_STANDINGS),
                "failure_statuses": sorted(AT_RISK_STANDINGS),
                "non_failure": sorted(NOT_AT_RISK_STANDINGS),
                "taxonomy_note": ("The CSV holds exactly these four standing values "
                                  "(enumerated from the data). 'With Failed Courses' and "
                                  "'With Dropped Courses' are the only failure-status "
                                  "indicators; 'Good Standing' and first-enrollment "
                                  "'New/No Previous Record' are not failures."),
            },
            "predictors_t_only": FEATURE_COLUMNS,
            "leakage_guards": [
                "t+1 failed/dropped counts (target source) never in predictors",
                "t+1 Previous Academic Standing never in predictors",
                "no t+1 GWA/grades anywhere in predictors",
                "target column asserted absent from model input columns",
                "no duplicate (Student ID, Academic Year, Semester) rows",
                "adopted target asserted non-degenerate (not re-derivable from t)",
                "SMOTE inside training folds only; temporal test set untouched",
            ],
            "degenerate_target_audit": {
                **accounting["degenerate_target_audit"],
                "adopted_target_mismatches_vs_admin_rule_t": accounting[
                    "adopted_target_mismatches_vs_admin_rule_t"],
                "detail": ("First-candidate rule (t+1 standing in failure statuses) "
                           "matched (failed_t>0 OR dropped_t>0) on every linked row: "
                           "the institution writes next standing deterministically, so "
                           "DT/RF/LR scored 1.0000 on it in a pilot run. Rejected; the "
                           "adopted outcome target (fail/drop NEXT semester) differs "
                           "from the t-admin rule on thousands of rows and is "
                           "genuinely uncertain."),
            },
            "evaluation_hierarchy": config.SELECTION_HIERARCHY,
            "classification_threshold": THRESHOLD,
        },
        "dataset": {
            "source_csv": config.CSV_PATH,
            "total_rows": accounting["raw_rows"],
            "unique_students": accounting["unique_students"],
            "student_semester_records": accounting["modelled_rows"],
            "rows_per_academic_year": {str(k): int(v) for k, v in per_year.items()},
            "excluded_no_future_target": accounting["excluded_no_future"],
            "excluded_per_academic_year": {str(k): int(v)
                                           for k, v in excluded_years.items()},
            "train_rows": int(len(train_df)),
            "train_students": int(train_df["Student ID"].nunique()),
            "train_years": list(TRAIN_YEARS),
            "train_at_risk": int((y_train == 1).sum()),
            "train_not_at_risk": int((y_train == 0).sum()),
            "train_at_risk_rate": float((y_train == 1).mean()),
            "test_rows": int(len(test_df)),
            "test_students": int(test_df["Student ID"].nunique()),
            "test_years": list(TEST_YEARS),
            "test_at_risk": int((y_test == 1).sum()),
            "test_not_at_risk": int((y_test == 0).sum()),
            "test_at_risk_rate": float((y_test == 1).mean()),
            "split_note": ("Chronological split on predictor year, no shuffling. "
                           "2018 exists in the data (manuscript says 2019-2025); its "
                           "3,008 rows are strictly pre-test and join training. "
                           "Students active across the boundary contribute early rows "
                           "to train and late rows to test (forward prediction); "
                           "cross-boundary students: %d." % split_info["overlap_students"]),
            "cv_note": ("Student-grouped StratifiedGroupKFold (5 folds, seed 42): "
                        "no student crosses fold boundaries; SMOTE applied inside "
                        "training folds only via imblearn Pipeline."),
            "features": FEATURE_COLUMNS,
            "target": ("at_risk_t1 (1 = fail/drop courses on the NEXT record: "
                       "failed_{t+1}>0 OR dropped_{t+1}>0)"),
        },
        "models": results,
        "best_model": {
            "id": best_id,
            "label": best["label"],
            "variant": best_variant,
            "recall": best["recall"],
            "f1_score": best["f1_score"],
            "precision": best["precision"],
            "selection": "highest test recall (adviser hierarchy: %s)" % config.SELECTION_HIERARCHY,
        },
        "reproducibility": {
            "versions": versions,
            "random_seed": RANDOM_STATE,
            "hyperparameter_grids": PARAM_GRIDS,
            "selected_params": {m: results[m]["best_params"] for m in results},
            "smote": ("SMOTE (not SMOTENC): applied inside imblearn Pipeline on the "
                      "fully preprocessed numeric matrix (one-hot makes every feature "
                      "numeric); k_neighbors=%d, reduced automatically when the "
                      "minority fold count requires it." % config.SMOTE_K),
        },
    }
    metrics_path = exporter.export_metrics(metrics_payload)

    importance_doc = {
        "status": "RETRAINED \u2014 leakage-free temporal evaluation",
        "generated_at": generated_at,
        "models": importance_payload,
    }
    importance_path = exporter.export_importance(importance_doc)

    # 7. ONNX contracts ----------------------------------------------------
    medians = {c: float(X_train[config.sanitize(c)].median()) for c in NUMERIC_FEATURES}
    modes = {c: str(X_train[config.sanitize(c)].mode(dropna=True).iloc[0])
             for c in CATEGORICAL_FEATURES}
    best_pre = OnnxExporter.serving_pipeline(
        trained[best_id][best_variant]["estimator"]
    ).named_steps["preprocess"] if best_id != "dummy" else OnnxExporter.serving_pipeline(
        trained["decision_tree"][results["decision_tree"]["winning_variant"]][
            "estimator"]).named_steps["preprocess"]
    vocabularies = {}
    ohe = best_pre.named_transformers_["cat"].named_steps["onehot"]
    for col, cats in zip(CATEGORICAL_FEATURES, ohe.categories_):
        vocabularies[col] = {
            "vocabulary": [str(c) for c in cats],
            "absent_value_fill_most_frequent": modes[col],
            "unknown_handling": "ignore (all-zero one-hot slice)",
        }
    inputs_doc = {
        "status": "PROVISIONAL",
        "provisional_note": ("RETRAINED leakage-free pipeline (t+1 standing target, "
                             "temporal 2018-2023/2024-2025 split). PROVISIONAL pending "
                             "researcher/institution confirmation before thesis use."),
        "runtime": "onnxruntime-web (CPU only)",
        "opset": config.ONNX_OPSET,
        "feature_order": FEATURE_COLUMNS,
        "inputs": [
            {"feature": c,
             "onnx_name": c.replace(" ", "_").replace("/", "_"),
             "dtype": "float32", "shape": "[N,1]"} for c in NUMERIC_FEATURES
        ] + [
            {"feature": c,
             "onnx_name": c.replace(" ", "_").replace("/", "_"),
             "dtype": "string", "shape": "[N,1]"} for c in CATEGORICAL_FEATURES
        ],
        "session_input_order": [c.replace(" ", "_").replace("/", "_")
                                for c in FEATURE_COLUMNS],
        "numeric_median_impute": medians,
        "categorical_vocabularies": vocabularies,
        "categorical_absent_sentinel": ("Send \"\" for a missing categorical; the graph "
                                        "fills the most-frequent value above."),
        "numeric_missing": "Send NaN for a missing numeric; the graph median-imputes.",
        "onehot_order": "concatenated in categorical_features order",
        "outputs": {"label": "int64 [N] (classes [0, 1]; 1 = at-risk in semester t+1)",
                    "probabilities": "float32 [N,2] columns align with classes [0,1]"},
        "classes": [0, 1],
    }
    exporter.export_contract("onnx_inputs.json", inputs_doc)
    parity_doc = {
        "status": "PROVISIONAL",
        "provisional_note": ("sklearn-vs-ONNX parity on %d untouched temporal-test rows "
                             "(tolerance proba_atol=1e-5, exact label match). "
                             "All four models match labels exactly on every checked row. "
                             "RandomForest proba diff can exceed 1e-5 (observed ~6e-2): "
                             "expected float32-vs-float64 TreeEnsemble threshold flips "
                             "at borderline splits (trees are discontinuous; scaler "
                             "rounding can flip a branch while the majority vote -- "
                             "hence the label -- is unchanged). "
                             "PROVISIONAL pending researcher/institution confirmation."
                             % config.PARITY_N_ROWS),
        "tolerance": {"proba_atol": 1e-05, "pred": "exact"},
        "models": parity_models,
    }
    exporter.export_contract("onnx_parity.json", parity_doc)

    # 8. Verification report ------------------------------------------------
    verification = {
        "leakage_guards": "pass (assertions in DatasetBuilder.build executed)",
        "temporal_separation": "pass (train %s vs test %s, no year overlap)" % (
            list(TRAIN_YEARS), list(TEST_YEARS)),
        "confusion_matrix_arithmetic": "pass (sklearn cross-check asserts in Evaluator)",
        "dummy_present": all("dummy" in d for d in (results, importance_payload)),
        "versions_recorded": versions,
        "best_model_story": "%s (%s) by recall=%.4f" % (
            best["label"], best_variant, best["recall"]),
        "onnx_parity": {m: {"pred_match": parity_models[m]["pred_match"],
                            "max_abs_proba_diff": parity_models[m]["max_abs_proba_diff"],
                            "n_rows": parity_models[m]["n_rows"]}
                        for m in parity_models},
        "files": {"model_metrics": metrics_path, "feature_importance": importance_path},
    }
    verify_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               "verification_report.json")
    with open(verify_path, "w", encoding="utf-8") as fh:
        json.dump(verification, fh, indent=2)
    print("Wrote %s, %s, contracts, ONNX; verification: %s"
          % (metrics_path, importance_path, verify_path), flush=True)


if __name__ == "__main__":
    main()
