from __future__ import annotations

import csv
import json
import os
import re
import ssl
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

import certifi
from pydantic import BaseModel, Field, ValidationError


def load_local_env() -> None:
    """Load project .env files for local CLI jobs without echoing secrets."""
    root = Path(__file__).resolve().parents[2]
    for env_path in (root / ".env", root / ".env.local"):
        if not env_path.exists():
            continue
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


load_local_env()

EXCLUDED_PROGRAM_RE = re.compile(r"\b(architecture|planning)\b", re.IGNORECASE)


@dataclass
class ImportValidation:
    total_rows: int
    valid_rows: int
    invalid_rows: int
    errors: list[dict[str, Any]]


@dataclass
class ImportResult:
    dry_run: bool
    total_rows: int
    valid_rows: int
    invalid_rows: int
    inserted_rows: int = 0
    batch_id: str | None = None
    errors: list[dict[str, Any]] | None = None


class CutoffInput(BaseModel):
    year: int
    round: int
    institute_name: str = Field(min_length=1)
    institute_type: str = Field(min_length=1)
    program_name: str = Field(min_length=1)
    quota: str | None = None
    seat_type: str | None = None
    gender: str | None = None
    opening_rank: str | None = None
    closing_rank: str = Field(min_length=1)
    opening_rank_num: int | None = None
    closing_rank_num: int
    rank_suffix: str | None = None
    rank_list_type: str | None = None
    source_url: str | None = None
    source_hash: str | None = None


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return [
            row for row in csv.DictReader(handle)
            if not EXCLUDED_PROGRAM_RE.search(str(row.get("program_name", "")))
        ]


def validate_rows(raw_rows: list[dict[str, str]]) -> tuple[list[CutoffInput], ImportValidation]:
    valid: list[CutoffInput] = []
    errors: list[dict[str, Any]] = []

    for index, row in enumerate(raw_rows, start=2):
        try:
            valid.append(CutoffInput.model_validate(row))
        except ValidationError as exc:
            errors.append({"row_number": index, "raw_row": row, "error_message": str(exc)})

    return valid, ImportValidation(
        total_rows=len(raw_rows),
        valid_rows=len(valid),
        invalid_rows=len(errors),
        errors=errors,
    )


def validate_csv(path: Path) -> tuple[list[CutoffInput], ImportValidation]:
    return validate_rows(read_csv(path))


def supabase_rest_request(
    table: str,
    *,
    method: str = "GET",
    body: Any | None = None,
    query: str = "",
    prefer: str | None = None,
    count_only: bool = False,
) -> Any:
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    endpoint = f"{url}/rest/v1/{table}{query}"
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer

    request = Request(endpoint, data=payload, headers=headers, method=method)
    try:
        context = ssl.create_default_context(cafile=certifi.where())
        with urlopen(request, timeout=60, context=context) as response:
            if count_only:
                content_range = response.headers.get("content-range", "0-0/0")
                return int(content_range.rsplit("/", 1)[-1])
            text = response.read().decode("utf-8")
            return json.loads(text) if text else None
    except HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise RuntimeError(f"Supabase REST request failed for {table}: {exc.code} {detail}") from exc


def upsert_returning_id(table: str, payload: dict[str, Any], on_conflict: str) -> str:
    conflict = quote(on_conflict, safe=",")
    data = supabase_rest_request(
        table,
        method="POST",
        body=payload,
        query=f"?on_conflict={conflict}",
        prefer="resolution=merge-duplicates,return=representation",
    )
    if not data:
        raise RuntimeError(f"Supabase upsert returned no rows for {table}")
    return data[0]["id"]


def import_csv(
    path: Path,
    *,
    dry_run: bool,
    fail_on_invalid: bool = False,
    source_name: str | None = None,
) -> ImportResult:
    valid, validation = validate_csv(path)

    if dry_run:
        return ImportResult(
            dry_run=True,
            total_rows=validation.total_rows,
            valid_rows=validation.valid_rows,
            invalid_rows=validation.invalid_rows,
            errors=validation.errors[:50],
        )

    if validation.invalid_rows and fail_on_invalid:
        return ImportResult(
            dry_run=False,
            total_rows=validation.total_rows,
            valid_rows=validation.valid_rows,
            invalid_rows=validation.invalid_rows,
            errors=validation.errors[:50],
        )

    batch = supabase_rest_request(
        "import_batches",
        method="POST",
        body={
            "source_name": source_name or path.name,
            "status": "running",
            "total_rows": validation.total_rows,
            "invalid_rows": validation.invalid_rows,
        },
        prefer="return=representation",
    )[0]

    for item in validation.errors:
        supabase_rest_request(
            "import_errors",
            method="POST",
            body={"batch_id": batch["id"], **item},
            prefer="return=minimal",
        )

    institute_ids: dict[tuple[str, str], str] = {}
    program_ids: dict[str, str] = {}
    cutoff_rows: list[dict[str, Any]] = []

    for row in valid:
        institute_key = (row.institute_name, row.institute_type)
        if institute_key not in institute_ids:
            institute_ids[institute_key] = upsert_returning_id(
                "institutes",
                {
                    "name": row.institute_name,
                    "institute_type": row.institute_type,
                },
                "name,institute_type",
            )

        if row.program_name not in program_ids:
            program_ids[row.program_name] = upsert_returning_id(
                "academic_programs",
                {
                    "name": row.program_name,
                    "normalized_name": row.program_name.lower(),
                },
                "name",
            )

        cutoff_rows.append(
            {
                "year": row.year,
                "round": row.round,
                "institute_id": institute_ids[institute_key],
                "program_id": program_ids[row.program_name],
                "institute_name_raw": row.institute_name,
                "program_name_raw": row.program_name,
                "quota": row.quota,
                "seat_type": row.seat_type,
                "gender": row.gender,
                "opening_rank_raw": row.opening_rank,
                "closing_rank_raw": row.closing_rank,
                "opening_rank_num": row.opening_rank_num,
                "closing_rank_num": row.closing_rank_num,
                "rank_suffix": row.rank_suffix,
                "rank_list_type": row.rank_list_type,
                "source_url": row.source_url,
                "source_hash": row.source_hash,
            }
        )

    inserted = 0
    for start in range(0, len(cutoff_rows), 500):
        chunk = cutoff_rows[start : start + 500]
        supabase_rest_request(
            "josaa_cutoffs",
            method="POST",
            body=chunk,
            query="?on_conflict=year,round,institute_name_raw,program_name_raw,quota,seat_type,gender,opening_rank_raw,closing_rank_raw",
            prefer="resolution=merge-duplicates,return=minimal",
        )
        inserted += len(chunk)

    latest = max(valid, key=lambda item: (item.year, item.round), default=None)
    if latest:
        supabase_rest_request(
            "data_snapshots",
            method="POST",
            body={
                "year": latest.year,
                "round": latest.round,
                "total_rows": inserted,
                "source_url": latest.source_url,
            },
            prefer="return=minimal",
        )

    supabase_rest_request(
        "import_batches",
        method="PATCH",
        body={
            "status": "completed",
            "inserted_rows": inserted,
            "skipped_rows": 0,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        },
        query=f"?id=eq.{batch['id']}",
        prefer="return=minimal",
    )

    return ImportResult(
        dry_run=False,
        total_rows=validation.total_rows,
        valid_rows=validation.valid_rows,
        invalid_rows=validation.invalid_rows,
        inserted_rows=inserted,
        batch_id=batch["id"],
        errors=validation.errors[:50],
    )


def result_to_dict(result: ImportResult) -> dict[str, Any]:
    return asdict(result)
