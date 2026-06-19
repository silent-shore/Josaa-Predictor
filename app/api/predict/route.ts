import { NextRequest, NextResponse } from "next/server";
import { effectiveInstituteTypes, shouldApplyQuota } from "@/lib/cutoff-query";
import { NIT_STATE_PATTERNS } from "@/lib/constants";
import { classifyRank } from "@/lib/predictor";
import { createClient } from "@/lib/supabase/server";
import { predictQuerySchema } from "@/lib/validators/cutoffs";

function applyHomeStateInstituteFilter(query: any, state: string | undefined) {
  if (!state) return query;
  const patterns = NIT_STATE_PATTERNS[state] ?? [];
  if (!patterns.length) return query;
  return query.or(patterns.map((pattern) => `institute_name_raw.ilike.*${pattern}*`).join(","));
}

function median(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function strictnessLabel(yearMedian: number | null, overallMedian: number | null) {
  if (!yearMedian || !overallMedian) return "Insufficient data";
  const delta = ((yearMedian - overallMedian) / overallMedian) * 100;
  if (delta <= -5) return "Strict";
  if (delta >= 5) return "Relaxed";
  return "Near average";
}

export async function GET(request: NextRequest) {
  const parsed = predictQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters", issues: parsed.error.flatten() }, { status: 400 });
  }

  const filters = parsed.data;
  const supabase = await createClient();
  const yearSet = new Set<number>();
  const yearPageSize = 1000;
  for (let page = 0; page < 50; page += 1) {
    const { data: yearRows, error: yearError } = await supabase
      .from("josaa_cutoffs")
      .select("year")
      .order("year", { ascending: false })
      .range(page * yearPageSize, page * yearPageSize + yearPageSize - 1);
    if (yearError) return NextResponse.json({ error: yearError.message }, { status: 500 });
    (yearRows ?? []).forEach((row) => yearSet.add(row.year));
    if (!yearRows || yearRows.length < yearPageSize) break;
  }

  const availableYears = Array.from(yearSet).sort((a, b) => b - a);
  const predictionYear = filters.year ?? ((availableYears[0] ?? new Date().getFullYear()) + 1);
  const historyStartYear = predictionYear - 5;
  const historyEndYear = predictionYear - 1;
  const instituteTypes = effectiveInstituteTypes(filters);
  const shouldFilterInstituteRelation =
    Boolean(instituteTypes?.length);
  const instituteSelect = shouldFilterInstituteRelation
    ? "institutes!inner(institute_type,state)"
    : "institutes(institute_type,state)";
  let query = supabase
    .from("josaa_cutoffs")
    .select(`id,year,round,institute_name_raw,program_name_raw,quota,seat_type,gender,opening_rank_raw,closing_rank_raw,closing_rank_num,rank_list_type,${instituteSelect}`)
    .not("closing_rank_num", "is", null)
    .gte("year", historyStartYear)
    .lte("year", historyEndYear)
    .lte("closing_rank_num", Math.ceil(filters.rank * 1.25))
    .order("closing_rank_num", { ascending: false })
    .limit(1200);

  if (filters.round) query = query.eq("round", filters.round);
  if (instituteTypes?.length) query = query.in("institutes.institute_type", instituteTypes);
  if (filters.state) query = applyHomeStateInstituteFilter(query, filters.state);
  if (shouldApplyQuota(filters)) query = query.eq("quota", filters.quota);
  if (filters.seat_type && filters.seat_type !== "All") query = query.eq("seat_type", filters.seat_type);
  if (filters.gender && filters.gender !== "All") query = query.eq("gender", filters.gender);
  if (filters.branch) query = query.ilike("program_name_raw", `%${filters.branch}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped = { Safe: [], Moderate: [], Reach: [] } as Record<string, unknown[]>;
  const groupedByYear: Record<string, Record<string, unknown[]>> = {};
  for (const row of data ?? []) {
    const bucket = classifyRank(filters.rank, row.closing_rank_num as number);
    if (bucket) {
      grouped[bucket].push(row);
      const yearKey = String(row.year);
      groupedByYear[yearKey] ??= { Safe: [], Moderate: [], Reach: [] };
      groupedByYear[yearKey][bucket].push(row);
    }
  }

  const overallMedian = median((data ?? []).map((row) => row.closing_rank_num as number));
  const year_analysis = availableYears
    .filter((year) => year >= historyStartYear && year <= historyEndYear)
    .map((year) => {
      const yearRows = (data ?? []).filter((row) => row.year === year);
      const yearMedian = median(yearRows.map((row) => row.closing_rank_num as number));
      const deltaPercent = yearMedian && overallMedian ? Number((((yearMedian - overallMedian) / overallMedian) * 100).toFixed(1)) : null;
      return {
        year,
        median_closing_rank: yearMedian,
        comparison_median: overallMedian,
        delta_percent: deltaPercent,
        label: strictnessLabel(yearMedian, overallMedian),
        reason: yearMedian && overallMedian
          ? `${year} median closing rank was ${Math.abs(deltaPercent ?? 0)}% ${deltaPercent && deltaPercent < 0 ? "lower" : "higher"} than the five-year median, so this year looks ${strictnessLabel(yearMedian, overallMedian).toLowerCase()}.`
          : "Not enough matching rows to compare this year."
      };
    });

  return NextResponse.json({
    grouped,
    grouped_by_year: groupedByYear,
    year_analysis,
    prediction_year: predictionYear,
    history_years: availableYears.filter((year) => year >= historyStartYear && year <= historyEndYear),
    explanation: "This is based only on previous OR-CR data and cannot guarantee admission."
  });
}
