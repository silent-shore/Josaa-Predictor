from __future__ import annotations

import csv
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "scripts" / "clean-data"))
sys.path.append(str(ROOT / "scripts" / "import-data"))


class ImportPipelineTest(unittest.TestCase):
    @unittest.skipIf(importlib.util.find_spec("pydantic") is None, "pydantic is not installed")
    def test_normalize_and_dry_run_validate_fake_rows(self) -> None:
        from josaa_importer import import_csv
        from normalize_orcr import normalize_file

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            raw = tmp_path / "raw.csv"
            clean = tmp_path / "clean.csv"
            with raw.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(
                    handle,
                    fieldnames=[
                        "year",
                        "round",
                        "institute_name",
                        "institute_type",
                        "program_name",
                        "quota",
                        "seat_type",
                        "gender",
                        "opening_rank",
                        "closing_rank",
                    ],
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "year": "2025",
                        "round": "1",
                        "institute_name": "Fake Institute",
                        "institute_type": "NIT",
                        "program_name": "Fake Program",
                        "quota": "AI",
                        "seat_type": "OPEN",
                        "gender": "Gender-Neutral",
                        "opening_rank": "1,000",
                        "closing_rank": "5,000",
                    }
                )

            normalize_summary = normalize_file(raw, clean, source_url="fake-source")
            import_summary = import_csv(clean, dry_run=True)

            self.assertEqual(normalize_summary["normalized_rows"], 1)
            self.assertEqual(normalize_summary["invalid_rows"], 0)
            self.assertTrue(import_summary.dry_run)
            self.assertEqual(import_summary.valid_rows, 1)
            self.assertEqual(import_summary.invalid_rows, 0)


if __name__ == "__main__":
    unittest.main()
