import { NextRequest, NextResponse } from "next/server";
import { effectiveInstituteTypes, shouldApplyQuota } from "@/lib/cutoff-query";
import { branchGroupByValue, isBranchGroupValue, isExcludedProgramName, NIT_STATE_PATTERNS, PREDICTOR_THRESHOLDS } from "@/lib/constants";
import { classifyRank } from "@/lib/predictor";
import { createClient } from "@/lib/supabase/server";
import { predictQuerySchema } from "@/lib/validators/cutoffs";

function applyHomeStateInstituteFilter(query: any, state: string | undefined) {
  if (!state) return query;
  const patterns = NIT_STATE_PATTERNS[state] ?? [];
  if (!patterns.length) return query;
  return query.or(patterns.map((pattern) => `institute_name_raw.ilike.*${pattern}*`).join(","));
}

function applyBranchFilter(query: any, branch: string | undefined) {
  if (!branch) return query;
  const branches = branch
    .split("~")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!branches.length) return query;
  const groupedKeywords = branches.flatMap((item) => isBranchGroupValue(item) ? branchGroupByValue(item)?.keywords ?? [] : []);
  const exactPrograms = branches.filter((item) => !isBranchGroupValue(item));
  if (!groupedKeywords.length && exactPrograms.length === 1) return query.ilike("program_name_raw", `%${exactPrograms[0]}%`);
  if (!groupedKeywords.length) return query.in("program_name_raw", exactPrograms);
  const exactKeywords = exactPrograms
    .map((program) => program.split("(", 1)[0].trim())
    .filter(Boolean);
  const keywords = [...groupedKeywords, ...exactKeywords];
  if (keywords.length === 1) return query.ilike("program_name_raw", `%${keywords[0]}%`);
  return query.or(keywords.map((item) => `program_name_raw.ilike.*${item}*`).join(","));
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
  const historyYears = availableYears.filter((year) => year >= historyStartYear && year <= historyEndYear);
  const latestRoundByYear: Record<number, number> = {};
  for (const year of historyYears) {
    const { data: latestRoundRows, error: latestRoundError } = await supabase
      .from("josaa_cutoffs")
      .select("round")
      .eq("year", year)
      .order("round", { ascending: false })
      .limit(1);
    if (latestRoundError) return NextResponse.json({ error: latestRoundError.message }, { status: 500 });
    if (latestRoundRows?.[0]?.round) latestRoundByYear[year] = latestRoundRows[0].round;
  }

  const instituteTypes = effectiveInstituteTypes(filters);
  const shouldFilterInstituteRelation =
    Boolean(instituteTypes?.length);
  const instituteSelect = shouldFilterInstituteRelation
    ? "institutes!inner(institute_type,state)"
    : "institutes(institute_type,state)";
  const minimumNearbyClosingRank = Math.floor(filters.rank / PREDICTOR_THRESHOLDS.risky);

  function buildRowsQuery(year: number, round: number, from: number, to: number) {
    let query = supabase
      .from("josaa_cutoffs")
      .select(`id,year,round,institute_name_raw,program_name_raw,quota,seat_type,gender,opening_rank_raw,closing_rank_raw,closing_rank_num,rank_list_type,${instituteSelect}`)
      .not("closing_rank_num", "is", null)
      .eq("year", year)
      .eq("round", round)
      .gte("closing_rank_num", minimumNearbyClosingRank)
      .order("closing_rank_num", { ascending: true })
      .range(from, to);

    if (instituteTypes?.length) query = query.in("institutes.institute_type", instituteTypes);
    if (filters.state) query = applyHomeStateInstituteFilter(query, filters.state);
    if (filters.institute_values) query = query.in("institute_name_raw", filters.institute_values.split("~").filter(Boolean));
    if (shouldApplyQuota(filters)) query = query.eq("quota", filters.quota);
    if (filters.seat_type && filters.seat_type !== "All") query = query.eq("seat_type", filters.seat_type);
    if (filters.gender && filters.gender !== "All") query = query.eq("gender", filters.gender);
    return applyBranchFilter(query, filters.branch);
  }

  const data: any[] = [];
  const pageSize = 1000;
  for (const year of historyYears) {
    const latestRound = latestRoundByYear[year];
    if (!latestRound) continue;
    for (let page = 0; page < 8; page += 1) {
      const from = page * pageSize;
      const { data: rows, error } = await buildRowsQuery(year, latestRound, from, from + pageSize - 1);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      data.push(...(rows ?? []));
      if (!rows || rows.length < pageSize) break;
    }
  }

  const grouped = { Safe: [], Moderate: [], Risky: [] } as Record<string, unknown[]>;
  const groupedByYear: Record<string, Record<string, unknown[]>> = {};
  for (const row of data) {
    if (isExcludedProgramName(row.program_name_raw as string)) continue;
    const bucket = classifyRank(filters.rank, row.closing_rank_num as number);
    if (bucket) {
      grouped[bucket].push(row);
      const yearKey = String(row.year);
      groupedByYear[yearKey] ??= { Safe: [], Moderate: [], Risky: [] };
      groupedByYear[yearKey][bucket].push(row);
    }
  }

  return NextResponse.json({
    grouped,
    grouped_by_year: groupedByYear,
    prediction_year: predictionYear,
    latest_round_by_year: latestRoundByYear,
    history_years: historyYears,
    explanation: "This is based only on previous OR-CR data and cannot guarantee admission."
  });
}
