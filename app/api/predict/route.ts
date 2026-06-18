import { NextRequest, NextResponse } from "next/server";
import { effectiveInstituteTypes, shouldApplyQuota } from "@/lib/cutoff-query";
import { classifyRank } from "@/lib/predictor";
import { createClient } from "@/lib/supabase/server";
import { predictQuerySchema } from "@/lib/validators/cutoffs";

export async function GET(request: NextRequest) {
  const parsed = predictQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters", issues: parsed.error.flatten() }, { status: 400 });
  }

  const filters = parsed.data;
  const supabase = await createClient();
  const instituteTypes = effectiveInstituteTypes(filters);
  const shouldFilterInstituteRelation =
    Boolean(filters.state) || Boolean(instituteTypes?.length);
  const instituteSelect = shouldFilterInstituteRelation
    ? "institutes!inner(institute_type,state)"
    : "institutes(institute_type,state)";
  let query = supabase
    .from("josaa_cutoffs")
    .select(`id,year,round,institute_name_raw,program_name_raw,quota,seat_type,gender,opening_rank_raw,closing_rank_raw,closing_rank_num,rank_list_type,${instituteSelect}`)
    .not("closing_rank_num", "is", null)
    .lte("closing_rank_num", Math.ceil(filters.rank * 1.25))
    .order("closing_rank_num", { ascending: false })
    .limit(250);

  if (filters.year) query = query.eq("year", filters.year);
  if (filters.round) query = query.eq("round", filters.round);
  if (instituteTypes?.length) query = query.in("institutes.institute_type", instituteTypes);
  if (filters.state) query = query.ilike("institutes.state", `%${filters.state}%`);
  if (shouldApplyQuota(filters)) query = query.eq("quota", filters.quota);
  if (filters.seat_type && filters.seat_type !== "All") query = query.eq("seat_type", filters.seat_type);
  if (filters.gender && filters.gender !== "All") query = query.eq("gender", filters.gender);
  if (filters.branch) query = query.ilike("program_name_raw", `%${filters.branch}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped = { Safe: [], Moderate: [], Risky: [], "Very Risky": [] } as Record<string, unknown[]>;
  for (const row of data ?? []) {
    const bucket = classifyRank(filters.rank, row.closing_rank_num as number);
    if (bucket) grouped[bucket].push(row);
  }

  return NextResponse.json({
    grouped,
    explanation: "This is based only on previous OR-CR data and cannot guarantee admission."
  });
}
