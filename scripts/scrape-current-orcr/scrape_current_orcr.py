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


JOSAA_URL = "https://josaa.admissions.nic.in/Applicant/SeatAllotmentResult/CurrentORCR.aspx"
SCRIPTS_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(SCRIPTS_DIR / "clean-data"))
sys.path.append(str(SCRIPTS_DIR / "import-data"))

from josaa_importer import import_csv, result_to_dict
from normalize_orcr import normalize_file


async def select_by_label(page, selector: str, label: str) -> None:
    await page.locator(selector).select_option(label=label, force=True)
    await page.wait_for_timeout(800)


async def select_field(page, combo: dict[str, str], selector_key: str, label_text: str, value_key: str) -> None:
    value = combo[value_key]
    configured = combo.get(selector_key)
    selectors = [configured] if configured else []
    selectors.extend(
        [
            f"xpath=(//*[normalize-space()='{label_text}']/following::select)[1]",
            f"xpath=(//*[contains(normalize-space(), '{label_text}')]/following::select)[1]",
        ]
    )

    last_error: Exception | None = None
    for selector in [item for item in selectors if item]:
        try:
            await page.locator(selector).first.select_option(label=value, timeout=5_000, force=True)
            await page.wait_for_timeout(1_000)
            return
        except Exception as exc:  # Playwright exposes several selector/option errors here.
            last_error = exc

    raise RuntimeError(f"Could not select '{value}' for '{label_text}'. Last error: {last_error}")


async def scrape_combination(page, combo: dict[str, str]) -> list[dict[str, str]]:
    await select_field(page, combo, "round_selector", "Round No", "round")
    await select_field(page, combo, "institute_type_selector", "Institute Type", "institute_type")
    await select_field(page, combo, "institute_selector", "Institute Name", "institute")
    await select_field(page, combo, "program_selector", "Academic Program", "program")
    await select_field(page, combo, "seat_type_selector", "Seat Type / Category", "seat_type")
    await page.get_by_role("button", name="Submit").click()
    await page.wait_for_selector("table", timeout=20_000)

    table = await page.locator("table tr").evaluate_all(
        """trs => trs.map(tr => Array.from(tr.cells).map(td => td.innerText.trim()))"""
    )
    output: list[dict[str, str]] = []
    if not table:
        return output

    headers = [header.lower() for header in table[0]]

    def cell(cells: list[str], header: str, fallback: str = "") -> str:
        try:
            return cells[headers.index(header.lower())]
        except (ValueError, IndexError):
            return fallback

    for cells in table[1:]:
        if len(cells) < 2:
            continue
        output.append(
            {
                "year": combo["year"],
                "round": combo["round"],
                "institute_type": combo["institute_type"],
                "institute_name": cell(cells, "Institute", combo["institute"]),
                "program_name": cell(cells, "Academic Program Name", combo["program"]),
                "quota": cell(cells, "Quota"),
                "seat_type": cell(cells, "Seat Type", combo["seat_type"]),
                "gender": cell(cells, "Gender"),
                "opening_rank": cell(cells, "Opening Rank", cells[-2] if len(cells) >= 2 else ""),
                "closing_rank": cell(cells, "Closing Rank", cells[-1] if cells else ""),
                "source_url": JOSAA_URL,
            }
        )
    return output


async def detect_page_year(page) -> str:
    text = await page.locator("body").inner_text(timeout=10_000)
    match = re.search(r"Joint Seat Allocation Authority\s+(\d{4})", text)
    if match:
        return match.group(1)
    match = re.search(r"Academic Year\s+(\d{4})", text)
    if match:
        return match.group(1)
    raise RuntimeError("Could not detect JoSAA year from page header.")


async def launch_browser(playwright, *, headed: bool):
    try:
        return await playwright.chromium.launch(headless=not headed)
    except PlaywrightError:
        if headed:
            raise
        print("Headless Chromium failed to launch; retrying with a visible browser.", file=sys.stderr)
        return await playwright.chromium.launch(headless=False)


def read_existing_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_raw_rows(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
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
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def default_clean_path(output_dir: Path) -> Path:
    return Path("data/clean") / output_dir.name / "orcr_clean.csv"


def run_pipeline(args, raw_path: Path) -> dict[str, object]:
    if not raw_path.exists():
        raise FileNotFoundError(
            f"No raw JoSAA rows were created at {raw_path}. "
            "Check failure screenshots, selector labels, and combination option labels before importing."
        )

    clean_path = args.clean_output or default_clean_path(args.output_dir)
    normalize_summary = normalize_file(raw_path, clean_path, source_url=JOSAA_URL)
    if normalize_summary["total_rows"] == 0:
        summary = {
            "raw_path": str(raw_path),
            "clean_path": str(clean_path),
            "summary_path": str(args.output_dir / "import_summary.json"),
            "scrape_skipped": args.skip_scrape,
            "normalize": normalize_summary,
            "import": None,
            "error": "No OR-CR rows were scraped or found. Check failure screenshots and combination option labels.",
        }
        (args.output_dir / "import_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
        return summary

    if args.fail_on_invalid and normalize_summary["invalid_rows"]:
        import_result = import_csv(clean_path, dry_run=True, fail_on_invalid=True, source_name=args.source_name or raw_path.name)
        summary = {
            "raw_path": str(raw_path),
            "clean_path": str(clean_path),
            "summary_path": str(args.output_dir / "import_summary.json"),
            "scrape_skipped": args.skip_scrape,
            "normalize": normalize_summary,
            "import": result_to_dict(import_result),
        }
        (args.output_dir / "import_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
        return summary

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
        "scrape_skipped": args.skip_scrape,
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
    all_rows: list[dict[str, str]] = read_existing_rows(raw_path)

    if args.skip_scrape:
        if not raw_path.exists():
            raise FileNotFoundError(f"Cannot use --skip-scrape because {raw_path} does not exist.")
        summary = run_pipeline(args, raw_path)
        print(json.dumps(summary, indent=2))
        return 1 if summary.get("error") or (
            args.fail_on_invalid and (summary["normalize"]["invalid_rows"] or summary["import"]["invalid_rows"])
        ) else 0

    combos = json.loads(args.combinations.read_text())

    async with async_playwright() as p:
        browser = await launch_browser(p, headed=args.headed)
        page = await browser.new_page()
        await page.goto(JOSAA_URL, wait_until="domcontentloaded")
        detected_year = await detect_page_year(page)
        for combo in combos:
            combo["year"] = detected_year

        for index, combo in enumerate(combos):
            key = json.dumps(combo, sort_keys=True)
            if key in completed:
                continue
            for attempt in range(1, args.retries + 1):
                try:
                    rows = await scrape_combination(page, combo)
                    all_rows.extend(rows)
                    write_raw_rows(raw_path, all_rows)
                    completed.add(key)
                    cache_path.write_text(json.dumps(sorted(completed), indent=2))
                    break
                except (PlaywrightTimeoutError, RuntimeError) as exc:
                    screenshot = args.output_dir / f"failure-{index}-attempt-{attempt}.png"
                    await page.screenshot(path=str(screenshot), full_page=True)
                    failure_log = args.output_dir / "failures.jsonl"
                    failure_log.open("a", encoding="utf-8").write(
                        json.dumps(
                            {
                                "combination_index": index,
                                "attempt": attempt,
                                "error": str(exc),
                                "screenshot": str(screenshot),
                                "combo": combo,
                            }
                        )
                        + "\n"
                    )
                    await asyncio.sleep(min(60, 2**attempt) + random.random())
                    await page.goto(JOSAA_URL, wait_until="domcontentloaded")
            await asyncio.sleep(args.delay + random.random())

        await browser.close()

    write_raw_rows(raw_path, all_rows)
    summary = run_pipeline(args, raw_path)
    print(json.dumps(summary, indent=2))
    return 1 if summary.get("error") or (
        args.fail_on_invalid and (summary["normalize"]["invalid_rows"] or summary["import"]["invalid_rows"])
    ) else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Respectful JoSAA CurrentORCR scraper skeleton.")
    parser.add_argument("--combinations", type=Path, help="JSON list of dropdown combinations and selectors.")
    parser.add_argument("--output-dir", type=Path, default=Path("data/raw/josaa-current-orcr"))
    parser.add_argument("--clean-output", type=Path, default=None)
    parser.add_argument("--delay", type=float, default=3.0)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--import", dest="do_import", action="store_true", help="Import validated clean rows into Supabase.")
    parser.add_argument("--skip-scrape", action="store_true", help="Use existing raw_orcr_rows.csv in output-dir.")
    parser.add_argument("--fail-on-invalid", action="store_true", help="Exit non-zero when validation finds invalid rows.")
    parser.add_argument("--source-name", default=None)
    args = parser.parse_args()
    if not args.skip_scrape and not args.combinations:
        parser.error("--combinations is required unless --skip-scrape is used")
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    raise SystemExit(main())
