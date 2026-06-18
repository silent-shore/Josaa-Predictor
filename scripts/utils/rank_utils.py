from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class ParsedRank:
    raw: str
    numeric: int | None
    suffix: str | None


def parse_rank(value: object) -> ParsedRank:
    raw = str(value or "").strip()
    if not raw or raw in {"-", "NA", "N/A"}:
        return ParsedRank(raw=raw, numeric=None, suffix=None)

    compact = raw.replace(",", "").strip()
    match = re.match(r"^(\d+)\s*([A-Za-z]+)?$", compact)
    if not match:
        return ParsedRank(raw=raw, numeric=None, suffix=None)

    return ParsedRank(raw=raw, numeric=int(match.group(1)), suffix=match.group(2))
