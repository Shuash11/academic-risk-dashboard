"""Metrics recomputed from confusion matrices + per-model feature importance.

Every reported metric derives from TP/TN/FP/FN at the fixed threshold (0.5),
so the JSON can be re-verified with plain arithmetic. Importance methods:
  DT/RF -> impurity-based (Gini) feature_importances_
  LR     -> normalized absolute coefficients
  NB     -> normalized absolute class-conditional mean differences
  Dummy  -> none (no learned signal)
"""

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

from config import THRESHOLD


class Evaluator:
    def __init__(self, threshold=THRESHOLD):
        self.threshold = threshold

    def score_on_test(self, estimator, X_test, y_test):
        proba = estimator.predict_proba(X_test)[:, 1]
        pred = (proba >= self.threshold).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_test, pred, labels=[0, 1]).ravel()
        tn, fp, fn, tp = int(tn), int(fp), int(fn), int(tp)
        total = tp + tn + fp + fn
        accuracy = (tp + tn) / total if total else 0.0
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        specificity = tn / (tn + fp) if (tn + fp) else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
        roc_auc = float(roc_auc_score(y_test, proba))
        pr_auc = float(average_precision_score(y_test, proba))
        # Cross-check against sklearn helpers (must match to 4 decimals).
        assert round(accuracy, 4) == round(accuracy_score(y_test, pred), 4)
        assert round(precision, 4) == round(
            precision_score(y_test, pred, zero_division=0), 4
        )
        assert round(recall, 4) == round(recall_score(y_test, pred, zero_division=0), 4)
        assert round(f1, 4) == round(f1_score(y_test, pred, zero_division=0), 4)
        return {
            "accuracy": accuracy,
            "precision": precision,
            "recall": recall,
            "specificity": specificity,
            "f1_score": f1,
            "roc_auc": roc_auc,
            "pr_auc": pr_auc,
            "threshold": self.threshold,
            "confusion_matrix": [[tn, fp], [fn, tp]],
            "tp": tp,
            "tn": tn,
            "fp": fp,
            "fn": fn,
        }


class ImportanceExtractor:
    """Per-model importance over the fitted preprocessor's output features."""

    METHODS = {
        "decision_tree": "impurity-based (Gini) feature_importances_",
        "random_forest": "impurity-based (Gini) feature_importances_",
        "logistic_regression": "normalized absolute coefficients |coef|",
        "naive_bayes": "normalized absolute class-conditional mean difference",
        "dummy": "none (baseline learns no feature signal)",
    }

    def extract(self, model_id, fitted_pipeline):
        if model_id == "dummy":
            return {"method": self.METHODS[model_id], "features": [], "top5_share": 0.0}
        preprocess = fitted_pipeline.named_steps["preprocess"]
        names = list(preprocess.get_feature_names_out())
        clf = fitted_pipeline.named_steps["clf"]
        if model_id in ("decision_tree", "random_forest"):
            raw = np.asarray(clf.feature_importances_, dtype=float)
        elif model_id == "logistic_regression":
            raw = np.abs(np.asarray(clf.coef_, dtype=float)).ravel()
        elif model_id == "naive_bayes":
            raw = np.abs(clf.theta_[1] - clf.theta_[0])
        else:
            raise ValueError("Unknown model: %s" % model_id)
        total = float(raw.sum())
        normed = (raw / total) if total > 0 else np.zeros_like(raw)
        order = np.argsort(-normed, kind="stable")
        features = [
            {"name": names[i], "importance": float(normed[i])} for i in order
        ]
        top5_share = float(sum(f["importance"] for f in features[:5]))
        return {
            "method": self.METHODS[model_id],
            "features": features,
            "top5_share": top5_share,
        }
