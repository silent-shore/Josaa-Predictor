#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import os
import sys
from pathlib import Path
from urllib.parse import quote

sys.path.append(str(Path(__file__).resolve().parent))
from josaa_importer import supabase_rest_request


JOSAA_SOURCE_URL = "https://josaa.admissions.nic.in/Applicant/SeatAllotmentResult/CurrentORCR.aspx"
SOURCE_QUERY = quote(JOSAA_SOURCE_URL, safe="")


def count_rows(table: str, year: int) -> int:
    data = supabase_rest_request(
        table,
        query=f"?select=id&year=eq.{year}&source_url=eq.{SOURCE_QUERY}",
        prefer="count=exact",
        count_only=True,
    )
    return data


def patch_csv_year(path: Path, old_year: str, new_year: str) -> int:
    if not path.exists():
        return 0
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        fieldnames = list(reader.fieldnames or [])
    changed = 0
    for row in rows:
        if row.get("year") == old_year:
            row["year"] = new_year
            changed += 1
    if changed:
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description="Repair current JoSAA OR-CR rows imported with the wrong year.")
    parser.add_argument("--old-year", default="2025")
    parser.add_argument("--new-year", default="2026")
    parser.add_argument("--raw", type=Path, default=Path("data/raw/josaa-current-orcr/raw_orcr_rows.csv"))
    parser.add_argument("--clean", type=Path, default=Path("data/clean/josaa-current-orcr/orcr_clean.csv"))
    args = parser.parse_args()

    old_year = int(args.old_year)
    new_year = int(args.new_year)
    before_old = count_rows("josaa_cutoffs", old_year)
    before_new = count_rows("josaa_cutoffs", new_year)

    if before_old:
        supabase_rest_request(
            "josaa_cutoffs",
            method="PATCH",
            body={"year": new_year},
            query=f"?year=eq.{old_year}&source_url=eq.{SOURCE_QUERY}",
            prefer="return=minimal",
        )

    supabase_rest_request(
        "data_snapshots",
        method="PATCH",
        body={"year": new_year},
        query=f"?year=eq.{old_year}&source_url=eq.{SOURCE_QUERY}",
        prefer="return=minimal",
    )

    supabase_rest_request(
        "import_batches",
        method="PATCH",
        body={"year": new_year},
        query=f"?year=is.null&source_name=ilike.*current-orcr*",
        prefer="return=minimal",
    )

    raw_changed = patch_csv_year(args.raw, args.old_year, args.new_year)
    clean_changed = patch_csv_year(args.clean, args.old_year, args.new_year)
    after_old = count_rows("josaa_cutoffs", old_year)
    after_new = count_rows("josaa_cutoffs", new_year)

    print(
        {
            "before_old": before_old,
            "before_new": before_new,
            "after_old": after_old,
            "after_new": after_new,
            "raw_rows_changed": raw_changed,
            "clean_rows_changed": clean_changed,
            "supabase_url": os.environ.get("NEXT_PUBLIC_SUPABASE_URL"),
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
