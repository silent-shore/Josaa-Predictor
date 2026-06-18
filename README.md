# JoSAA Rank Explorer

Production-shaped Next.js app for searching, filtering, comparing, and importing JoSAA Opening Rank / Closing Rank data.

This is an unofficial helper tool. Data is sourced from publicly available JoSAA OR-CR pages. Always verify final counselling decisions on the official JoSAA website.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Supabase Postgres and Supabase Auth
- Server-side API routes for filtering, prediction, status, and admin import
- Python import pipeline with Playwright scraper skeleton
- Zod validation, Recharts, focused unit tests

## Supabase Setup

1. Create a Supabase project.
2. In the SQL editor, run [supabase/migrations/001_initial_schema.sql](/Users/shashi/Desktop/Cutoff%20Compass/supabase/migrations/001_initial_schema.sql).
3. Optional local UI testing only: run [supabase/seed.sql](/Users/shashi/Desktop/Cutoff%20Compass/supabase/seed.sql). This data is fake and clearly marked.
4. Create an admin user through Supabase Auth.
5. Add that user's email to the server-only `ADMIN_EMAILS` environment variable.

## Environment

Copy [.env.example](/Users/shashi/Desktop/Cutoff%20Compass/.env.example) to `.env.local` and fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAILS=admin@example.com
JOSAA_SOURCE_URL=https://josaa.admissions.nic.in/Applicant/SeatAllotmentResult/CurrentORCR.aspx
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend code or Vercel public variables. If a service role key is ever shared in chat, logs, screenshots, or a browser, rotate it in Supabase and replace only the server-side environment value.

## Admin Access

Admin access is hidden from public navigation. Create a Supabase Auth user, then put that user's email in the server-only `ADMIN_EMAILS` env var:

```bash
ADMIN_EMAILS=admin@example.com,second-admin@example.com
```

The app compares the signed-in user's email to `ADMIN_EMAILS` on the server. It never renders the allowed admin email list or the service role key in the website UI.

Open `/admin/login` directly to sign in. `/admin/import` is a protected fallback CSV uploader; the preferred full import path is the CLI pipeline below.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Run tests:

```bash
npm test
```

## Import Data

Install Python requirements:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/import-data/requirements.txt
playwright install chromium
```

Scrape, normalize, and validate without importing:

```bash
python scripts/scrape-current-orcr/scrape_current_orcr.py \
  --combinations scripts/scrape-current-orcr/combinations.example.json \
  --output-dir data/raw/josaa-current-orcr \
  --delay 3
```

Scrape, normalize, validate, and import:

```bash
python scripts/scrape-current-orcr/scrape_current_orcr.py \
  --combinations scripts/scrape-current-orcr/combinations.example.json \
  --output-dir data/raw/josaa-current-orcr \
  --delay 3 \
  --import \
  --fail-on-invalid
```

Import from existing scraped files without scraping again:

```bash
python scripts/scrape-current-orcr/scrape_current_orcr.py \
  --skip-scrape \
  --output-dir data/raw/josaa-current-orcr \
  --import \
  --fail-on-invalid
```

The scraper writes raw rows, normalized CSV, cache files, screenshots on failures, and `import_summary.json` under `data/`. The importer upserts institutes and academic programs first, then upserts cutoff rows using the requested unique key. It creates `import_batches`, `import_errors`, and `data_snapshots` records.

You can still run the lower-level tools manually:

```bash
python scripts/clean-data/normalize_orcr.py data/raw/josaa-current-orcr/raw_orcr_rows.csv data/clean/josaa-current-orcr/orcr_clean.csv --source-url "$JOSAA_SOURCE_URL"
python scripts/import-data/import_to_supabase.py data/clean/josaa-current-orcr/orcr_clean.csv --dry-run
python scripts/import-data/import_to_supabase.py data/clean/josaa-current-orcr/orcr_clean.csv --fail-on-invalid
```

## Scraper Notes

The scraper imports into Supabase only when `--import` is present. Without that flag, it saves raw local files, normalizes them, validates them, and writes a summary.

```bash
python scripts/scrape-current-orcr/scrape_current_orcr.py \
  --combinations scripts/scrape-current-orcr/combinations.example.json \
  --output-dir data/raw/josaa-current-orcr \
  --delay 3
```

You will likely need to inspect the live JoSAA page and adjust dropdown selectors in the combinations JSON. Keep concurrency low, cache completed combinations, and use respectful delays.

## Deploy on Vercel

1. Push the project to a Git provider.
2. Import it in Vercel.
3. Add environment variables from `.env.example`.
4. Ensure only `NEXT_PUBLIC_*` values are public.
5. Deploy.

## Legal and Ethical Note

Do not overload JoSAA. Cache data locally, scrape slowly, retry with backoff, and avoid high-concurrency automation. This app should serve users from your own Supabase database and should not repeatedly scrape JoSAA during traffic-heavy counselling periods. Students must verify important decisions on the official JoSAA website.

## Manual Configuration Still Needed

- Create the Supabase project and run SQL migrations.
- Fill `.env.local`.
- Set `ADMIN_EMAILS` to at least one Supabase Auth user email.
- Rotate and set `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- Inspect the current JoSAA page selectors before running a full scrape.
- Import real cleaned JoSAA data before using the app for counselling decisions.
# Josaa-Predictor
