#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from josaa_importer import import_csv, result_to_dict


def main() -> int:
    parser = argparse.ArgumentParser(description="Import normalized JoSAA OR-CR CSV into Supabase.")
    parser.add_argument("input", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--fail-on-invalid", action="store_true")
    parser.add_argument("--source-name", default=None)
    args = parser.parse_args()

    result = import_csv(
        args.input,
        dry_run=args.dry_run,
        fail_on_invalid=args.fail_on_invalid,
        source_name=args.source_name,
    )
    print(json.dumps(result_to_dict(result), indent=2))
    return 1 if result.invalid_rows and (args.dry_run or args.fail_on_invalid) else 0


if __name__ == "__main__":
    raise SystemExit(main())
