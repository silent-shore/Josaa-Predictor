#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))
from utils.rank_utils import parse_rank


REQUIRED = ["year", "round", "institute_name", "institute_type", "program_name", "quota", "seat_type", "gender", "opening_rank", "closing_rank"]


def normalized_program(name: str) -> str:
    return " ".join(name.lower().replace(",", " ").split())


def read_rows(path: Path) -> list[dict[str, str]]:
    if path.suffix.lower() == ".json":
        return json.loads(path.read_text())
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def normalize_file(input_path: Path, output_path: Path, *, source_url: str = "") -> dict[str, object]:
    rows = read_rows(input_path)
    output_fields = [
        *REQUIRED,
        "opening_rank_num",
        "closing_rank_num",
        "rank_suffix",
        "rank_list_type",
        "normalized_program_name",
        "source_url",
        "source_hash",
    ]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    invalid = 0
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=output_fields)
        writer.writeheader()
        for row in rows:
            missing = [field for field in REQUIRED if not str(row.get(field, "")).strip()]
            if missing:
                invalid += 1
                continue

            opening = parse_rank(row["opening_rank"])
            closing = parse_rank(row["closing_rank"])
            if closing.numeric is None:
                invalid += 1
                continue

            stable_payload = json.dumps(row, sort_keys=True, ensure_ascii=False)
            writer.writerow(
                {
                    **{field: str(row.get(field, "")).strip() for field in REQUIRED},
                    "opening_rank_num": opening.numeric or "",
                    "closing_rank_num": closing.numeric,
                    "rank_suffix": closing.suffix or opening.suffix or "",
                    "rank_list_type": str(row.get("rank_list_type") or row.get("seat_type") or "").strip(),
                    "normalized_program_name": normalized_program(str(row.get("program_name", ""))),
                    "source_url": str(row.get("source_url") or source_url).strip(),
                    "source_hash": hashlib.sha256(stable_payload.encode("utf-8")).hexdigest(),
                }
            )

    return {
        "input": str(input_path),
        "output": str(output_path),
        "total_rows": len(rows),
        "normalized_rows": len(rows) - invalid,
        "invalid_rows": invalid,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize raw JoSAA OR-CR rows into import-ready CSV.")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--source-url", default="")
    args = parser.parse_args()

    summary = normalize_file(args.input, args.output, source_url=args.source_url)
    print(
        f"normalized={summary['normalized_rows']} invalid={summary['invalid_rows']} output={summary['output']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
