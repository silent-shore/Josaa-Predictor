#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import csv
import json
import random
import re
import sys
from pathlib import Path

from playwright.async_api import Error as PlaywrightError
from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright


ARCHIVE_URL = "https://josaa.admissions.nic.in/applicant/seatmatrix/openingclosingrankarchieve.aspx"
SCRIPTS_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(SCRIPTS_DIR / "clean-data"))
sys.path.append(str(SCRIPTS_DIR / "import-data"))

from josaa_importer import import_csv, result_to_dict
from normalize_orcr import normalize_file


INSTITUTE_TYPES = [
    "Indian Institute of Technology",
    "Indian Institute of Information Technology",
    "National Institute of Technology",
    "Government Funded Technical Institutions",
]

RAW_FIELDS = [
    "year",
    "round",
    "institute_type",
    "institute_name",
    "program_name",
    "quota",
    "seat_type",
    "gender",
    "opening_rank",
    "closing_rank",
    "source_url",
]


async def launch_browser(playwright, *, headed: bool):
    try:
        return await playwright.chromium.launch(headless=not headed)
    except PlaywrightError:
        if headed:
            raise
        print("Headless Chromium failed to launch; retrying with a visible browser.", file=sys.stderr)
        return await playwright.chromium.launch(headless=False)


async def select_field(page, selector_key: str, label_text: str, value: str, selectors: dict[str, str]) -> None:
    configured = selectors.get(selector_key)
    candidates = [configured] if configured else []
    candidates.extend(
        [
            f"xpath=(//*[normalize-space()='{label_text}']/following::select)[1]",
            f"xpath=(//*[contains(normalize-space(), '{label_text}')]/following::select)[1]",
        ]
    )

    last_error: Exception | None = None
    for selector in [item for item in candidates if item]:
        locator = page.locator(selector).first
        try:
            await locator.select_option(label=value, timeout=5_000, force=True)
            await page.wait_for_timeout(1_000)
            return
        except Exception as exc:
            last_error = exc
        try:
            await locator.select_option(value=value, timeout=5_000, force=True)
            await page.wait_for_timeout(1_000)
            return
        except Exception as exc:
            last_error = exc

    raise RuntimeError(f"Could not select '{value}' for '{label_text}'. Last error: {last_error}")


async def option_labels(page, selector: str) -> list[str]:
    labels = await page.locator(selector).first.locator("option").evaluate_all(
        """options => options.map(option => option.textContent.trim()).filter(Boolean)"""
    )
    return [
        label
        for label in labels
        if "--" not in label and "select" not in label.lower() and "required" not in label.lower()
    ]


def round_number(label: str) -> str:
    match = re.search(r"\d+", label)
    return match.group(0) if match else label.strip()


async def scrape_table(page, *, year: str, round_label: str, institute_type: str) -> list[dict[str, str]]:
    await page.get_by_role("button", name=re.compile("submit", re.I)).click()
    await page.wait_for_selector("table", timeout=30_000)
    table = await page.locator("table tr").evaluate_all(
        """trs => trs.map(tr => Array.from(tr.cells).map(td => td.innerText.trim()))"""
    )
    if not table:
        return []

    headers = [header.lower() for header in table[0]]

    def cell(cells: list[str], header: str, fallback: str = "") -> str:
        try:
            return cells[headers.index(header.lower())]
        except (ValueError, IndexError):
            return fallback

    rows: list[dict[str, str]] = []
    for cells in table[1:]:
        if len(cells) < 2:
            continue
        rows.append(
            {
                "year": year,
                "round": round_number(round_label),
                "institute_type": institute_type,
                "institute_name": cell(cells, "Institute", cell(cells, "Institute Name")),
                "program_name": cell(cells, "Academic Program Name", cell(cells, "Academic Program")),
                "quota": cell(cells, "Quota"),
                "seat_type": cell(cells, "Seat Type", cell(cells, "Seat Type / Category")),
                "gender": cell(cells, "Gender"),
                "opening_rank": cell(cells, "Opening Rank", cells[-2] if len(cells) >= 2 else ""),
                "closing_rank": cell(cells, "Closing Rank", cells[-1] if cells else ""),
                "source_url": ARCHIVE_URL,
            }
        )
    return rows


def read_existing_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_raw_rows(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=RAW_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def default_clean_path(output_dir: Path) -> Path:
    return Path("data/clean") / output_dir.name / "orcr_clean.csv"


def run_pipeline(args, raw_path: Path) -> dict[str, object]:
    if not raw_path.exists():
        raise FileNotFoundError(f"No raw archive rows were found at {raw_path}.")

    clean_path = args.clean_output or default_clean_path(args.output_dir)
    normalize_summary = normalize_file(raw_path, clean_path, source_url=ARCHIVE_URL)
    import_result = import_csv(
        clean_path,
        dry_run=not args.do_import,
        fail_on_invalid=args.fail_on_invalid,
        source_name=args.source_name or raw_path.name,
    )
    summary = {
        "raw_path": str(raw_path),
        "clean_path": str(clean_path),
        "summary_path": str(args.output_dir / "import_summary.json"),
        "normalize": normalize_summary,
        "import": result_to_dict(import_result),
    }
    (args.output_dir / "import_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


async def main_async(args) -> int:
    args.output_dir.mkdir(parents=True, exist_ok=True)
    raw_path = args.output_dir / "raw_orcr_rows.csv"
    cache_path = args.output_dir / "completed_combinations.json"
    completed = set(json.loads(cache_path.read_text())) if cache_path.exists() else set()
    all_rows = read_existing_rows(raw_path)

    if args.skip_scrape:
        summary = run_pipeline(args, raw_path)
        print(json.dumps(summary, indent=2))
        return 1 if args.fail_on_invalid and summary["import"]["invalid_rows"] else 0

    selectors = {
        "year": args.year_selector,
        "round": args.round_selector,
        "institute_type": args.institute_type_selector,
        "institute": args.institute_selector,
        "program": args.program_selector,
        "seat_type": args.seat_type_selector,
    }

    async with async_playwright() as p:
        browser = await launch_browser(p, headed=args.headed)
        page = await browser.new_page()

        for year in args.years:
            await page.goto(ARCHIVE_URL, wait_until="domcontentloaded")
            await select_field(page, "year", "Year", str(year), selectors)
            round_labels = args.rounds or await option_labels(page, selectors["round"])
            for round_label in round_labels:
                await select_field(page, "round", "Round No", str(round_label), selectors)
                for institute_type in args.institute_types:
                    key = json.dumps({"year": year, "round": round_label, "institute_type": institute_type}, sort_keys=True)
                    if key in completed:
                        continue
                    for attempt in range(1, args.retries + 1):
                        try:
                            await select_field(page, "institute_type", "Institute Type", institute_type, selectors)
                            await select_field(page, "institute", "Institute Name", "ALL", selectors)
                            await select_field(page, "program", "Academic Program", "ALL", selectors)
                            await select_field(page, "seat_type", "Seat Type / Category", "ALL", selectors)
                            rows = await scrape_table(page, year=str(year), round_label=str(round_label), institute_type=institute_type)
                            all_rows.extend(rows)
                            write_raw_rows(raw_path, all_rows)
                            completed.add(key)
                            cache_path.write_text(json.dumps(sorted(completed), indent=2), encoding="utf-8")
                            break
                        except (PlaywrightTimeoutError, RuntimeError) as exc:
                            screenshot = args.output_dir / f"failure-{year}-{round_number(str(round_label))}-{attempt}.png"
                            await page.screenshot(path=str(screenshot), full_page=True)
                            failure_log = args.output_dir / "failures.jsonl"
                            failure_log.open("a", encoding="utf-8").write(
                                json.dumps(
                                    {
                                        "year": year,
                                        "round": round_label,
                                        "institute_type": institute_type,
                                        "attempt": attempt,
                                        "error": str(exc),
                                        "screenshot": str(screenshot),
                                    }
                                )
                                + "\n"
                            )
                            await asyncio.sleep(min(60, 2**attempt) + random.random())
                            await page.goto(ARCHIVE_URL, wait_until="domcontentloaded")
                            await select_field(page, "year", "Year", str(year), selectors)
                            await select_field(page, "round", "Round No", str(round_label), selectors)
                    await asyncio.sleep(args.delay + random.random())

        await browser.close()

    write_raw_rows(raw_path, all_rows)
    summary = run_pipeline(args, raw_path)
    print(json.dumps(summary, indent=2))
    return 1 if args.fail_on_invalid and summary["import"]["invalid_rows"] else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Respectfully scrape JoSAA previous-year OR-CR archive data.")
    parser.add_argument("--years", nargs="+", type=int, default=[2025, 2024, 2023, 2022, 2021])
    parser.add_argument("--rounds", nargs="*", default=None, help="Optional round labels/numbers. By default, detected per selected year.")
    parser.add_argument("--institute-types", nargs="+", default=INSTITUTE_TYPES)
    parser.add_argument("--output-dir", type=Path, default=Path("data/raw/josaa-archive-2021-2025"))
    parser.add_argument("--clean-output", type=Path, default=None)
    parser.add_argument("--delay", type=float, default=3.0)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--import", dest="do_import", action="store_true")
    parser.add_argument("--skip-scrape", action="store_true")
    parser.add_argument("--fail-on-invalid", action="store_true")
    parser.add_argument("--source-name", default="josaa-archive-orcr")
    parser.add_argument("--year-selector", default="#ctl00_ContentPlaceHolder1_ddlYear")
    parser.add_argument("--round-selector", default="#ctl00_ContentPlaceHolder1_ddlroundno")
    parser.add_argument("--institute-type-selector", default="#ctl00_ContentPlaceHolder1_ddlInstype")
    parser.add_argument("--institute-selector", default="#ctl00_ContentPlaceHolder1_ddlInstitute")
    parser.add_argument("--program-selector", default="#ctl00_ContentPlaceHolder1_ddlBranch")
    parser.add_argument("--seat-type-selector", default="#ctl00_ContentPlaceHolder1_ddlSeattype")
    args = parser.parse_args()
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    raise SystemExit(main())
