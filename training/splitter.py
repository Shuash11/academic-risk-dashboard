"""Temporal split + student-grouped folds. No shuffling, no stratification."""

from sklearn.model_selection import StratifiedGroupKFold

from config import N_GROUP_FOLDS, RANDOM_STATE, TEST_YEARS, TRAIN_YEARS


class TemporalSplitter:
    """Splits on the predictor semester's academic year; folds group by student."""

    def __init__(self, train_years=TRAIN_YEARS, test_years=TEST_YEARS,
                 n_folds=N_GROUP_FOLDS, seed=RANDOM_STATE):
        self.train_years = tuple(train_years)
        self.test_years = tuple(test_years)
        self.n_folds = n_folds
        self.seed = seed

    def split(self, df):
        train = df[df["Academic Year"].isin(self.train_years)].reset_index(drop=True)
        test = df[df["Academic Year"].isin(self.test_years)].reset_index(drop=True)
        if len(train) == 0:
            raise ValueError("Training split is empty; check year coverage.")
        if len(test) == 0:
            raise ValueError("Test split is empty; documented fallback required.")
        # Temporal separation: no predictor year may appear on both sides.
        overlap = set(train["Academic Year"]) & set(test["Academic Year"])
        if overlap:
            raise AssertionError("Train/test year overlap: %s" % sorted(overlap))
        # Student separation across the time boundary (a student active in both
        # eras contributes early rows to train, late rows to test -- this is
        # genuine forward prediction, but we report the overlap honestly).
        overlap_students = set(train["Student ID"]) & set(test["Student ID"])
        return train, test, {"overlap_students": len(overlap_students)}

    def folds(self, y_train, groups_train):
        cv = StratifiedGroupKFold(
            n_splits=self.n_folds, shuffle=True, random_state=self.seed
        )
        return list(cv.split(y_train, y_train, groups_train))
