import { NextRequest, NextResponse } from "next/server";
import { effectiveInstituteTypes, shouldApplyQuota, splitFilterValues } from "@/lib/cutoff-query";
import { BRANCH_GROUPS, branchGroupByValue, branchGroupIndexForProgram, isBranchGroupValue, isExcludedProgramName, NIT_STATE_PATTERNS, programMatchesBranchGroup } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { cutoffsQuerySchema } from "@/lib/validators/cutoffs";

type OptionCount = {
  value: string;
  label?: string;
  count: number;
};

function countBy(rows: Array<Record<string, unknown>>, key: string): OptionCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function shortInstituteType(value: string | undefined) {
  if (value === "Indian Institute of Technology") return "IIT";
  if (value === "National Institute of Technology") return "NIT";
  if (value === "Indian Institute of Information Technology") return "IIIT";
  if (value === "Government Funded Technical Institutions") return "GFTI";
  return value;
}

function applyHomeStateInstituteFilter(query: any, state: string | undefined) {
  if (!state) return query;
  const patterns = NIT_STATE_PATTERNS[state] ?? [];
  if (!patterns.length) return query;
  return query.or(patterns.map((pattern) => `institute_name_raw.ilike.*${pattern}*`).join(","));
}

function applyProgramValueFilter(query: any, selectedPrograms: string[] | undefined) {
  if (!selectedPrograms?.length) return query;
  const groupedKeywords = selectedPrograms.flatMap((value) => isBranchGroupValue(value) ? branchGroupByValue(value)?.keywords ?? [] : []);
  const exactPrograms = selectedPrograms.filter((value) => !isBranchGroupValue(value));

  if (groupedKeywords.length && !exactPrograms.length) {
    return query.or(groupedKeywords.map((keyword) => `program_name_raw.ilike.*${keyword}*`).join(","));
  }

  if (!groupedKeywords.length) {
    return query.in("program_name_raw", exactPrograms);
  }

  const exactKeywords = exactPrograms
    .map((program) => program.split("(", 1)[0].trim())
    .filter(Boolean);
  const keywords = [...groupedKeywords, ...exactKeywords];
  return query.or(keywords.map((keyword) => `program_name_raw.ilike.*${keyword}*`).join(","));
}

function branchGroupOptions(rows: Array<Record<string, unknown>>): OptionCount[] {
  return BRANCH_GROUPS.map((group) => ({
    value: group.value,
    label: group.label,
    count: rows.filter((row) => typeof row.program_name_raw === "string" && programMatchesBranchGroup(row.program_name_raw, group)).length
  })).filter((option) => option.count > 0);
}

export async function GET(request: NextRequest) {
  const parsed = cutoffsQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters", issues: parsed.error.flatten() }, { status: 400 });
  }

  const filters = parsed.data;
  const supabase = await createClient();
  const [{ data: snapshotYearRows }, { data: snapshotRoundRows }, { data: snapshot }] = await Promise.all([
    supabase.from("data_snapshots").select("year").order("year", { ascending: false }),
    supabase.from("data_snapshots").select("year,round").order("year", { ascending: false }),
    supabase.from("data_snapshots").select("created_at,source_url").order("created_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  const currentYear = new Date().getFullYear();
  const candidateYears = Array.from({ length: currentYear - 2016 + 2 }, (_, index) => currentYear + 1 - index);
  const cutoffYearCounts = await Promise.all(
    candidateYears.map(async (year) => {
      const { count, error } = await supabase.from("josaa_cutoffs").select("id", { count: "exact", head: true }).eq("year", year);
      if (error) throw error;
      return { year, count: count ?? 0 };
    })
  ).catch((error: Error) => error);

  if (cutoffYearCounts instanceof Error) {
    return NextResponse.json({ error: cutoffYearCounts.message }, { status: 500 });
  }

  const years = Array.from(new Set([...(snapshotYearRows ?? []).map((row) => row.year), ...cutoffYearCounts.filter((row) => row.count > 0).map((row) => row.year)])).filter(Boolean).sort((a, b) => b - a);
  const roundSourceYear = filters.year ?? years[0];
  const candidateRounds = Array.from({ length: 15 }, (_, index) => index + 1);
  const roundCounts = await Promise.all(
    candidateRounds.map(async (round) => {
      const { count, error } = await supabase
        .from("josaa_cutoffs")
        .select("id", { count: "exact", head: true })
        .eq("year", roundSourceYear)
        .eq("round", round);
      if (error) throw error;
      return { round, count: count ?? 0 };
    })
  ).catch((error: Error) => error);

  if (roundCounts instanceof Error) {
    return NextResponse.json({ error: roundCounts.message }, { status: 500 });
  }
  const rounds = Array.from(
    new Set(
      [...(snapshotRoundRows ?? []), ...roundCounts.filter((row) => row.count > 0).map((row) => ({ year: roundSourceYear, round: row.round }))]
        .filter((row) => row.year === roundSourceYear)
        .map((row) => row.round)
    )
  )
    .filter(Boolean)
    .sort((a, b) => a - b);
  const instituteTypes = effectiveInstituteTypes(filters);
  const instituteSelect = instituteTypes?.length ? "institutes!inner(institute_type,state)" : "institutes(institute_type,state)";

  const selectedInstitutes = splitFilterValues(filters.institute_values);
  const selectedPrograms = splitFilterValues(filters.program_values);
  const selectedQuotas = splitFilterValues(filters.quota);
  const selectedSeatTypes = splitFilterValues(filters.seat_type);
  const selectedGenders = splitFilterValues(filters.gender);

  function buildRowsQuery(from: number, to: number) {
    let query = supabase
      .from("josaa_cutoffs")
      .select(`year,round,institute_name_raw,program_name_raw,quota,seat_type,gender,opening_rank_num,closing_rank_num,${instituteSelect}`)
      .range(from, to);

    if (filters.year) query = query.eq("year", filters.year);
    if (filters.round) query = query.eq("round", filters.round);
    if (instituteTypes?.length) query = query.in("institutes.institute_type", instituteTypes);
    if (filters.state) query = applyHomeStateInstituteFilter(query, filters.state);
    if (filters.institute) query = query.ilike("institute_name_raw", `%${filters.institute}%`);
    if (filters.program) query = query.ilike("program_name_raw", `%${filters.program}%`);
    if (selectedInstitutes?.length) query = query.in("institute_name_raw", selectedInstitutes);
    query = applyProgramValueFilter(query, selectedPrograms);
    if (shouldApplyQuota(filters) && selectedQuotas?.length) query = query.in("quota", selectedQuotas);
    if (selectedSeatTypes?.length && !selectedSeatTypes.includes("All")) query = query.in("seat_type", selectedSeatTypes);
    if (selectedGenders?.length && !selectedGenders.includes("All")) query = query.in("gender", selectedGenders);
    if (filters.opening_min) query = query.gte("opening_rank_num", filters.opening_min);
    if (filters.opening_max) query = query.lte("opening_rank_num", filters.opening_max);
    if (filters.rank_min) query = query.gte("closing_rank_num", filters.rank_min);
    if (filters.rank_max) query = query.lte("closing_rank_num", filters.rank_max);
    return query;
  }

  const rows: Array<Record<string, unknown>> = [];
  const pageSize = 1000;
  for (let page = 0; page < 8; page += 1) {
    const from = page * pageSize;
    const { data, error } = await buildRowsQuery(from, from + pageSize - 1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    rows.push(...((data ?? []) as Array<Record<string, unknown>>).filter((row) => !isExcludedProgramName(row.program_name_raw as string)));
    if (!data || data.length < pageSize) break;
  }

  return NextResponse.json({
    years,
    rounds,
    latest_year: years[0] ?? null,
    latest_round: rounds.at(-1) ?? null,
    last_updated: snapshot?.created_at ?? null,
    source_url: snapshot?.source_url ?? null,
    options: {
      institute_type: countBy(
        rows.map((row) => ({
          institute_type: shortInstituteType(
            Array.isArray(row.institutes) ? row.institutes[0]?.institute_type : (row.institutes as { institute_type?: string } | null)?.institute_type
          )
        })),
        "institute_type"
      ),
      institute: countBy(rows, "institute_name_raw"),
      program: [
        ...branchGroupOptions(rows),
        ...countBy(rows, "program_name_raw")
          .filter((option) => !isExcludedProgramName(option.value))
          .sort((a, b) => branchGroupIndexForProgram(a.value) - branchGroupIndexForProgram(b.value) || a.value.localeCompare(b.value))
      ],
      quota: countBy(rows, "quota"),
      seat_type: countBy(rows, "seat_type"),
      gender: countBy(rows, "gender"),
      state: countBy(
        rows.map((row) => ({
          state: Array.isArray(row.institutes) ? row.institutes[0]?.state : (row.institutes as { state?: string } | null)?.state
        })),
        "state"
      )
    }
  });
}
