"""Training pipeline: preprocess -> (SMOTE) -> classifier, per model x variant.

SMOTE lives INSIDE the imblearn Pipeline so resampling fits on training folds
only and never touches the temporal test set. SMOTE (not SMOTENC) is used on
the fully preprocessed numeric matrix: after one-hot encoding every feature is
numeric, which keeps one pipeline shape for all five models.
"""

from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import GridSearchCV
from sklearn.naive_bayes import GaussianNB
from sklearn.pipeline import Pipeline as SkPipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression

from config import (
    CATEGORICAL_FEATURES_S,
    MODEL_SPECS,
    NUMERIC_FEATURES_S,
    PARAM_GRIDS,
    RANDOM_STATE,
    SMOTE_K,
)


class PreprocessorFactory:
    """Median/scale numerics; most-frequent/one-hot categoricals."""

    @staticmethod
    def make():
        numeric = SkPipeline(
            steps=[
                ("impute", SimpleImputer(strategy="median")),
                ("scale", StandardScaler()),
            ]
        )
        categorical = SkPipeline(
            steps=[
                ("impute", SimpleImputer(strategy="most_frequent")),
                ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
            ]
        )
        return ColumnTransformer(
            transformers=[
                ("num", numeric, NUMERIC_FEATURES_S),
                ("cat", categorical, CATEGORICAL_FEATURES_S),
            ]
        )


class ModelTrainer:
    """Fits every model with and without SMOTE; tunes via grouped CV."""

    def __init__(self, seed=RANDOM_STATE):
        self.seed = seed
        self.preprocessor_factory = PreprocessorFactory()

    @staticmethod
    def _classifier(model_id, seed):
        if model_id == "dummy":
            return DummyClassifier(strategy="stratified", random_state=seed)
        if model_id == "decision_tree":
            return DecisionTreeClassifier(random_state=seed)
        if model_id == "random_forest":
            return RandomForestClassifier(random_state=seed, n_jobs=-1)
        if model_id == "logistic_regression":
            return LogisticRegression(max_iter=2000, random_state=seed)
        if model_id == "naive_bayes":
            return GaussianNB()
        raise ValueError("Unknown model: %s" % model_id)

    def _pipeline(self, model_id, use_smote, minority_count):
        steps = [("preprocess", self.preprocessor_factory.make())]
        if use_smote:
            # Guard tiny minorities: k must be < minority count.
            k = max(1, min(SMOTE_K, int(minority_count) - 1))
            steps.append(("smote", SMOTE(k_neighbors=k, random_state=self.seed)))
        steps.append(("clf", self._classifier(model_id, self.seed)))
        return ImbPipeline(steps=steps)

    def train(self, X_train, y_train, fold_index):
        """Returns {model_id: {'without_smote': fit, 'with_smote': fit, ...}}."""
        minority_count = int((y_train == 1).sum())
        results = {}
        for model_id, _label in MODEL_SPECS:
            entry = {}
            for variant, use_smote in (("without_smote", False), ("with_smote", True)):
                pipe = self._pipeline(model_id, use_smote, minority_count)
                grid = PARAM_GRIDS.get(model_id)
                if grid:
                    search = GridSearchCV(
                        pipe, grid, cv=fold_index, scoring="recall", n_jobs=-1
                    )
                    search.fit(X_train, y_train)
                    entry[variant] = {
                        "estimator": search.best_estimator_,
                        "best_params": search.best_params_,
                        "cv_recall_mean": float(search.best_score_),
                        "fold_scores": self._fold_recalls(search, len(fold_index)),
                    }
                else:
                    pipe.fit(X_train, y_train)
                    entry[variant] = {"estimator": pipe, "best_params": {}}
            results[model_id] = entry
        return results

    @staticmethod
    def _fold_recalls(search, n_splits):
        # Per-fold recall of the winning hyperparameters, straight from the
        # grid-search results (same fits that chose the winner; no refit).
        return [
            float(search.cv_results_["split%d_test_score" % i][search.best_index_])
            for i in range(n_splits)
        ]
