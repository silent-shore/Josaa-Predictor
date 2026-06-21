import { NextRequest, NextResponse } from "next/server";
import { effectiveInstituteTypes } from "@/lib/cutoff-query";
import { branchGroupByValue, isBranchGroupValue, isExcludedProgramName, NIT_STATE_PATTERNS } from "@/lib/constants";
import { classifyRank } from "@/lib/predictor";
import { createClient } from "@/lib/supabase/server";
import { predictQuerySchema } from "@/lib/validators/cutoffs";

type Bucket = "Safe" | "Moderate" | "Risky";
type InstituteRelation = { institute_type: string | null; state: string | null };
type RawCutoffRow = {
  id: string;
  year: number;
  round: number;
  institute_name_raw: string;
  program_name_raw: string;
  quota: string | null;
  seat_type: string | null;
  gender: string | null;
  opening_rank_raw: string | null;
  closing_rank_raw: string | null;
  opening_rank_num: number | null;
  closing_rank_num: number | null;
  rank_list_type: string | null;
  institutes?: InstituteRelation | InstituteRelation[] | null;
};
type ChoiceRow = RawCutoffRow & {
  opening_round: number;
  closing_round: number;
  prediction_bucket?: Bucket;
};

let yearsCache: { at: number; years: number[] } | null = null;
const YEARS_CACHE_MS = 5 * 60 * 1000;

function applyBranchFilter(query: any, branch: string | undefined) {
  if (!branch) return query;
  const branches = branch
    .split("~")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!branches.length) return query;

  const groupedKeywords = branches.flatMap((item) => (isBranchGroupValue(item) ? branchGroupByValue(item)?.keywords ?? [] : []));
  const exactPrograms = branches.filter((item) => !isBranchGroupValue(item));
  if (!groupedKeywords.length && exactPrograms.length === 1) return query.ilike("program_name_raw", `%${exactPrograms[0]}%`);
  if (!groupedKeywords.length) return query.in("program_name_raw", exactPrograms);

  const exactKeywords = exactPrograms
    .map((program) => program.split("(", 1)[0].trim())
    .filter(Boolean);
  const keywords = [...groupedKeywords, ...exactKeywords];
  return query.or(keywords.map((item) => `program_name_raw.ilike.*${item}*`).join(","));
}

async function availableCutoffYears(supabase: Awaited<ReturnType<typeof createClient>>) {
  if (yearsCache && Date.now() - yearsCache.at < YEARS_CACHE_MS) return yearsCache.years;

  const currentYear = new Date().getFullYear();
  const candidateYears = Array.from({ length: currentYear - 2016 + 2 }, (_, index) => currentYear + 1 - index);
  const counts = await Promise.all(
    candidateYears.map(async (year) => {
      const { count, error } = await supabase.from("josaa_cutoffs").select("id", { count: "exact", head: true }).eq("year", year);
      if (error) throw error;
      return { year, count: count ?? 0 };
    })
  );
  const years = counts.filter((item) => item.count > 0).map((item) => item.year).sort((a, b) => b - a);
  yearsCache = { at: Date.now(), years };
  return years;
}

async function latestRoundForYear(supabase: Awaited<ReturnType<typeof createClient>>, year: number) {
  const { data, error } = await supabase
    .from("josaa_cutoffs")
    .select("round")
    .eq("year", year)
    .order("round", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.round as number | undefined;
}

function splitValues(value: string | undefined) {
  return value
    ?.split("~")
    .map((item) => item.trim())
    .filter(Boolean);
}

function instituteRelation(row: RawCutoffRow) {
  return Array.isArray(row.institutes) ? row.institutes[0] : row.institutes;
}

function inferredInstituteType(row: RawCutoffRow) {
  const name = row.institute_name_raw.toLowerCase();
  if (name.includes("indian institute of information technology")) return "Indian Institute of Information Technology";
  if (name.includes("indian institute of technology")) return "Indian Institute of Technology";
  if (name.includes("indian institute of science")) return "Indian Institute of Science";
  if (name.includes("national institute of technology") || name.includes("motilal nehru national institute")) {
    return "National Institute of Technology";
  }
  return instituteRelation(row)?.institute_type ?? "Government Funded Technical Institutions";
}

function isHomeStateNit(row: RawCutoffRow, state: string | undefined) {
  if (!state) return false;
  const relationState = instituteRelation(row)?.state;
  if (relationState === state) return true;
  const institute = row.institute_name_raw.toLowerCase();
  return (NIT_STATE_PATTERNS[state] ?? []).some((pattern) => institute.includes(pattern.toLowerCase()));
}

function allowedPredictorQuota(row: RawCutoffRow, homeState: string | undefined) {
  const quota = row.quota?.toUpperCase();
  const type = inferredInstituteType(row);

  if (type === "National Institute of Technology") {
    return quota === "OS" || (quota === "HS" && isHomeStateNit(row, homeState));
  }

  if (
    type === "Indian Institute of Technology" ||
    type === "Indian Institute of Information Technology" ||
    type === "Indian Institute of Science"
  ) {
    return quota === "AI";
  }

  return quota === "AI";
}

export async function GET(request: NextRequest) {
  const parsed = predictQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters", issues: parsed.error.flatten() }, { status: 400 });
  }

  const filters = parsed.data;
  const supabase = await createClient();

  try {
    const years = await availableCutoffYears(supabase);
    const selectedYear = filters.year && years.includes(filters.year) ? filters.year : years[0];
    if (!selectedYear) {
      return NextResponse.json({ error: "No cutoff data has been imported yet." }, { status: 404 });
    }

    const instituteTypes = effectiveInstituteTypes(filters);
    const instituteSelect = instituteTypes?.length ? "institutes!inner(institute_type,state)" : "institutes(institute_type,state)";
    const pageSize = Math.min(filters.page_size, 60);
    const requestedBucket = filters.bucket as Bucket | undefined;
    const buckets: Bucket[] = requestedBucket ? [requestedBucket] : ["Safe", "Moderate", "Risky"];
    const latestRound = await latestRoundForYear(supabase, selectedYear) ?? 0;
    if (!latestRound) {
      return NextResponse.json({ error: `No round data found for ${selectedYear}.` }, { status: 404 });
    }

    function baseRowsQuery(from: number, to: number) {
      let query = supabase
        .from("josaa_cutoffs")
        .select(`id,year,round,institute_name_raw,program_name_raw,quota,seat_type,gender,opening_rank_raw,closing_rank_raw,opening_rank_num,closing_rank_num,rank_list_type,${instituteSelect}`)
        .not("closing_rank_num", "is", null)
        .eq("year", selectedYear)
        .eq("round", latestRound)
        .order("closing_rank_num", { ascending: true, nullsFirst: false })
        .range(from, to);

      if (instituteTypes?.length) query = query.in("institutes.institute_type", instituteTypes);
      const selectedInstitutes = splitValues(filters.institute_values);
      if (selectedInstitutes?.length) query = query.in("institute_name_raw", selectedInstitutes);
      if (filters.seat_type && filters.seat_type !== "All") query = query.eq("seat_type", filters.seat_type);
      if (filters.gender && filters.gender !== "All") query = query.eq("gender", filters.gender);
      return applyBranchFilter(query, filters.branch);
    }

    const choiceRows: ChoiceRow[] = [];
    const fetchPageSize = 1000;
    for (let page = 0; page < 80; page += 1) {
      const from = page * fetchPageSize;
      const { data, error } = await baseRowsQuery(from, from + fetchPageSize - 1);
      if (error) throw error;
      choiceRows.push(
        ...((data ?? []) as RawCutoffRow[])
          .filter((row) => !isExcludedProgramName(row.program_name_raw))
          .filter((row) => allowedPredictorQuota(row, filters.state))
          .map((row) => ({
            ...row,
            opening_round: latestRound,
            closing_round: latestRound
          }))
      );
      if (!data || data.length < fetchPageSize) break;
    }

    const grouped: Record<Bucket, ChoiceRow[]> = { Safe: [], Moderate: [], Risky: [] };
    for (const row of choiceRows) {
      const bucket = classifyRank(filters.rank, row.closing_rank_num ?? 0);
      if (!bucket) continue;
      grouped[bucket].push({ ...row, prediction_bucket: bucket });
    }

    for (const bucket of Object.keys(grouped) as Bucket[]) {
      grouped[bucket].sort(
        (a, b) =>
          (a.closing_rank_num ?? Number.MAX_SAFE_INTEGER) - (b.closing_rank_num ?? Number.MAX_SAFE_INTEGER) ||
          a.institute_name_raw.localeCompare(b.institute_name_raw) ||
          a.program_name_raw.localeCompare(b.program_name_raw)
      );
    }

    const counts = {
      Safe: grouped.Safe.length,
      Moderate: grouped.Moderate.length,
      Risky: grouped.Risky.length
    };

    const rows: ChoiceRow[] = [];
    const previewSize = pageSize;
    for (const bucket of buckets) {
      const from = requestedBucket ? (filters.page - 1) * pageSize : 0;
      const to = requestedBucket ? from + pageSize : previewSize;
      rows.push(...grouped[bucket].slice(from, to));
    }

    const previewGrouped: Record<Bucket, ChoiceRow[]> = { Safe: [], Moderate: [], Risky: [] };
    for (const bucket of Object.keys(previewGrouped) as Bucket[]) {
      previewGrouped[bucket] = requestedBucket ? [] : grouped[bucket].slice(0, previewSize);
    }
    if (requestedBucket) {
      previewGrouped[requestedBucket] = rows;
    }

    return NextResponse.json({
      rows,
      grouped: previewGrouped,
      counts,
      page: filters.page,
      page_size: pageSize,
      bucket: requestedBucket ?? null,
      cutoff_year: selectedYear,
      latest_round: latestRound,
      available_years: years,
      explanation: "This is based only on previous OR-CR data and cannot guarantee admission."
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Prediction failed" }, { status: 500 });
  }
}
