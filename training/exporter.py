"""Artifact export: metrics JSON, importance JSON, ONNX models + contracts.

Exports one ONNX graph per real model (Dummy has no converter) from the
recall-winning variant, rebuilt as a plain sklearn Pipeline
(preprocessor + classifier, SMOTE step dropped -- resampling is fit-time only
and never belongs in the serving graph).
"""

import json
import shutil
from datetime import datetime, timezone

import numpy as np
import onnxruntime as ort
from skl2onnx import to_onnx
from skl2onnx.common.data_types import FloatTensorType, StringTensorType
from sklearn.pipeline import Pipeline as SkPipeline

from config import (
    CATEGORICAL_FEATURES,
    CATEGORICAL_FEATURES_S,
    DASHBOARD_DIR,
    MODEL_SPECS,
    NUMERIC_FEATURES,
    NUMERIC_FEATURES_S,
    ONNX_OPSET,
    PARITY_N_ROWS,
    SELECTION_HIERARCHY,
    TARGET_COLUMN,
)

import os

LABELS = dict(MODEL_SPECS)
EXPORT_MODELS = [m for m, _ in MODEL_SPECS if m != "dummy"]


class OnnxExporter:
    """Converts winning pipelines to ONNX and checks sklearn-vs-ONNX parity."""

    def __init__(self, opset=ONNX_OPSET, n_rows=PARITY_N_ROWS, seed=42):
        self.opset = opset
        self.n_rows = n_rows
        self.seed = seed

    @staticmethod
    def serving_pipeline(fitted_imb_pipeline):
        steps = fitted_imb_pipeline.steps
        preprocess = dict(steps)["preprocess"]
        clf = dict(steps)["clf"]
        return SkPipeline([("preprocess", preprocess), ("clf", clf)])

    def _initial_types(self, X_sample):
        initial_types = []
        for col in NUMERIC_FEATURES_S:
            initial_types.append((col, FloatTensorType([None, 1])))
        for col in CATEGORICAL_FEATURES_S:
            initial_types.append((col, StringTensorType([None, 1])))
        return initial_types

    @staticmethod
    def _onnx_inputs(X_sample):
        # One tensor per raw feature; columns are pre-sanitized to match.
        feeds = {}
        for col in NUMERIC_FEATURES_S:
            feeds[col] = X_sample[col].to_numpy(dtype=np.float32).reshape(-1, 1)
        for col in CATEGORICAL_FEATURES_S:
            feeds[col] = X_sample[col].fillna("").astype(object).to_numpy().reshape(-1, 1)
        return feeds

    def export_model(self, serving_pipe, X_parity, model_dir, model_id):
        X_sample = X_parity.head(5)
        clf = serving_pipe.named_steps["clf"]
        onx = to_onnx(
            serving_pipe,
            X_sample,
            initial_types=self._initial_types(X_sample),
            options={type(clf): {"zipmap": False}},
            target_opset=self.opset,
        )
        out_path = os.path.join(model_dir, "%s.onnx" % model_id)
        with open(out_path, "wb") as fh:
            fh.write(onx.SerializeToString())

        # Parity on >= 1,000 untouched test rows.
        rng = np.random.RandomState(self.seed)
        idx = rng.choice(len(X_parity), size=min(self.n_rows, len(X_parity)), replace=False)
        X_check = X_parity.iloc[np.sort(idx)].reset_index(drop=True)
        feeds = self._onnx_inputs(X_check)
        sess = ort.InferenceSession(out_path, providers=["CPUExecutionProvider"])
        onnx_label, onnx_proba = sess.run(None, feeds)
        skl_pred = serving_pipe.predict(X_check)
        skl_proba = serving_pipe.predict_proba(X_check)
        onnx_proba = np.asarray(onnx_proba)
        pred_match = bool((np.asarray(onnx_label).ravel() == np.asarray(skl_pred).ravel()).all())
        max_diff = float(np.abs(onnx_proba - skl_proba).max())
        return {
            "n_rows": int(len(X_check)),
            "sklearn_pred": [int(v) for v in np.asarray(skl_pred).ravel()[:6]],
            "onnx_pred": [int(v) for v in np.asarray(onnx_label).ravel()[:6]],
            "pred_match": pred_match,
            "max_abs_proba_diff": max_diff,
            "proba_match_tol_1e5": bool(max_diff <= 1e-5),
            "status": "converted",
            "opset": self.opset,
        }, out_path


class ArtifactExporter:
    """Writes every dashboard artifact from computed results (no fabrication)."""

    def __init__(self, dashboard_dir=DASHBOARD_DIR):
        self.dashboard_dir = dashboard_dir
        self.model_dir = os.path.join(dashboard_dir, "models")
        self.public_model_dir = os.path.join(dashboard_dir, "public", "models")
        self.data_dir = os.path.join(dashboard_dir, "public", "data")

    # -- JSON artifacts -------------------------------------------------
    def export_metrics(self, payload):
        path = os.path.join(self.data_dir, "model_metrics.json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2)
        return path

    def export_importance(self, payload):
        path = os.path.join(self.data_dir, "feature_importance.json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2)
        return path

    def export_contract(self, name, payload):
        for directory in (self.model_dir, self.public_model_dir):
            os.makedirs(directory, exist_ok=True)
            with open(os.path.join(directory, name), "w", encoding="utf-8") as fh:
                json.dump(payload, fh, indent=2)

    def mirror_onnx(self, model_id, tmp_path):
        for directory in (self.model_dir, self.public_model_dir):
            os.makedirs(directory, exist_ok=True)
            shutil.copyfile(tmp_path, os.path.join(directory, "%s.onnx" % model_id))

    @staticmethod
    def timestamp():
        return datetime.now(timezone.utc).isoformat()
