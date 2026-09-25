"""CSV loading and basic validation. Single responsibility: read raw rows."""

import pandas as pd

from config import CSV_PATH


class DataLoader:
    """Loads the source student-semester CSV and checks its shape/contract."""

    REQUIRED_COLUMNS = [
        "Student ID",
        "Academic Year",
        "Semester",
        "Final Grades",
        "GWA",
        "Number of Failed Courses",
        "Number of Dropped Courses",
        "Course/Program Enrolled",
        "Year Level",
        "Enrollment History",
        "Total Units Taken",
        "Previous Academic Standing",
    ]

    def __init__(self, path=CSV_PATH):
        self.path = path

    def load(self):
        df = pd.read_csv(self.path)
        missing = [c for c in self.REQUIRED_COLUMNS if c not in df.columns]
        if missing:
            raise ValueError("CSV missing required columns: %s" % missing)
        return df
