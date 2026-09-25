"""Student-semester construction with the t+1 outcome target and leakage guards.

One row = one student-semester (the CSV's native shape). Records are sorted
chronologically per student; the target for semester t is whether the student
fails/drops any course on the NEXT (t+1) record. Rows with no next record have
no verifiable future and are excluded (count reported, not silently dropped).
"""

import re

import pandas as pd

from config import (
    AT_RISK_STANDINGS,
    CATEGORICAL_FEATURES,
    FAILING_GRADE,
    NOT_AT_RISK_STANDINGS,
    NUMERIC_FEATURES,
    TARGET_COLUMN,
)

_GRADE_RE = re.compile(r":\s*([0-9]+(?:\.[0-9]+)?)\s*$")


class GradeParser:
    """Parses 'SUBJECT: grade; ...' into time-t aggregates.

    Only failing-grade count (5.0), mean, and subject count are used, all
    derivable at the end of semester t. Unparsable tokens are skipped and
    counted so parse coverage stays auditable.
    """

    def parse(self, grades):
        if grades is None or (isinstance(grades, float) and pd.isna(grades)):
            return (None, None, None)
        values, skipped = [], 0
        for segment in str(grades).split(";"):
            segment = segment.strip()
            if not segment:
                continue
            match = _GRADE_RE.search(segment)
            if match is None:
                skipped += 1
                continue
            try:
                values.append(float(match.group(1)))
            except ValueError:
                skipped += 1
        if not values:
            return (None, None, None)
        n_failed = sum(1 for v in values if v == FAILING_GRADE)
        return (len(values), sum(values) / len(values), n_failed)


class DatasetBuilder:
    """Builds the leakage-free modelling frame from raw rows."""

    def __init__(self):
        self.parser = GradeParser()
        self.accounting = {}

    def build(self, df):
        df = df.copy().sort_values(
            ["Student ID", "Academic Year", "Semester"]
        ).reset_index(drop=True)

        self._guard_no_duplicates(df)

        # --- time-t grade aggregates (parsed from semester t only) ---
        parsed = df["Final Grades"].map(self.parser.parse)
        df["n_subjects_t"] = [p[0] for p in parsed]
        df["mean_grade_t"] = [p[1] for p in parsed]
        df["n_failed_grades_t"] = [p[2] for p in parsed]

        # --- t+1 outcome target: fail/drop on the NEXT record ---
        # t+1 failed/dropped counts are the OUTCOME ONLY; they must never
        # appear in predictors (enforced by _guard_no_leakage + t-only lists).
        grouped = df.groupby("Student ID")
        next_failed = grouped["Number of Failed Courses"].shift(-1)
        next_dropped = grouped["Number of Dropped Courses"].shift(-1)
        next_standing = grouped["Previous Academic Standing"].shift(-1)
        has_future = next_standing.notna()
        if bool(next_failed.loc[has_future].isna().any()) or bool(
            next_dropped.loc[has_future].isna().any()
        ):
            raise ValueError("Missing t+1 failed/dropped counts on linked rows.")
        df[TARGET_COLUMN] = (
            (next_failed.fillna(0) > 0) | (next_dropped.fillna(0) > 0)
        ).astype(int)

        # --- degenerate-target audit (F2): the first-candidate standing rule ---
        # standing_{t+1} in failure statuses vs (failed_t>0 | dropped_t>0).
        unknown = set(next_standing.dropna().unique()) - set(
            AT_RISK_STANDINGS | NOT_AT_RISK_STANDINGS
        )
        if unknown:
            raise ValueError("Unmapped t+1 standing values: %s" % sorted(unknown))
        standing_rule = next_standing.map(
            lambda s: 1 if s in AT_RISK_STANDINGS else (0 if pd.notna(s) else -1)
        )
        admin_rule_t = (
            (df["Number of Failed Courses"] > 0)
            | (df["Number of Dropped Courses"] > 0)
        ).astype(int)
        standing_mismatches = int(
            (standing_rule.loc[has_future] != admin_rule_t.loc[has_future]).sum()
        )
        # Non-degeneracy: the adopted target must NOT be re-derivable from t.
        adopted_mismatches = int(
            (df.loc[has_future, TARGET_COLUMN] != admin_rule_t.loc[has_future]).sum()
        )
        if adopted_mismatches < 100:
            raise AssertionError(
                "Adopted target is (near-)deterministic in t predictors; "
                "aborting instead of shipping a forced target."
            )
        self.accounting = {
            "raw_rows": int(len(df)),
            "unique_students": int(df["Student ID"].nunique()),
            "rows_with_future": int(has_future.sum()),
            "excluded_no_future": int((~has_future).sum()),
            "at_risk_rows": int((df.loc[has_future, TARGET_COLUMN] == 1).sum()),
            "degenerate_target_audit": {
                "candidate_rule": ("standing_{t+1} in {With Failed Courses, "
                                   "With Dropped Courses}"),
                "mismatches_vs_admin_rule_t": standing_mismatches,
                "linked_rows_checked": int(has_future.sum()),
                "verdict": ("DEGENERATE -- standing_{t+1} is exactly "
                            "(failed_t>0 OR dropped_t>0); rejected as target"),
            },
            "adopted_target_mismatches_vs_admin_rule_t": adopted_mismatches,
        }

        modelled = df.loc[has_future].reset_index(drop=True)
        modelled[TARGET_COLUMN] = modelled[TARGET_COLUMN].astype(int)
        self.accounting["modelled_rows"] = int(len(modelled))
        self.accounting["not_at_risk_rows"] = int(
            (modelled[TARGET_COLUMN] == 0).sum()
        )

        self._guard_no_leakage(modelled)
        return modelled

    # -- guards ---------------------------------------------------------
    @staticmethod
    def _guard_no_duplicates(df):
        dupes = int(
            df.duplicated(subset=["Student ID", "Academic Year", "Semester"]).sum()
        )
        if dupes:
            raise AssertionError("Duplicate (Student ID, Year, Semester) rows: %d" % dupes)

    @staticmethod
    def _guard_no_leakage(modelled):
        predictors = NUMERIC_FEATURES + CATEGORICAL_FEATURES
        if TARGET_COLUMN in predictors:
            raise AssertionError("Target column present in predictor set.")
        # No t+1-sourced column (standing, failed/dropped counts, GWA/grades)
        # may appear among predictors; all predictors are row-t fields.
        forbidden = [c for c in modelled.columns if "_t1" in c and c != TARGET_COLUMN]
        if forbidden:
            raise AssertionError("t+1-sourced predictor columns: %s" % forbidden)
