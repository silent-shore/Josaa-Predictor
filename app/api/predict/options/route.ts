import { NextRequest, NextResponse } from "next/server";
import { effectiveInstituteTypes } from "@/lib/cutoff-query";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const params = request.nextUrl.searchParams;
  const year = Number.parseInt(params.get("year") ?? "", 10);
  const examType = params.get("exam_type") ?? undefined;
  const instituteType = params.get("institute_type") ?? undefined;

  if (!Number.isFinite(year)) {
    return NextResponse.json({ error: "Missing or invalid year" }, { status: 400 });
  }

  try {
    const { data: latestRoundRows, error: latestRoundError } = await supabase
      .from("josaa_cutoffs")
      .select("round")
      .eq("year", year)
      .order("round", { ascending: false })
      .limit(1);
    if (latestRoundError) throw latestRoundError;
    const round = latestRoundRows?.[0]?.round;
    if (!round) return NextResponse.json({ options: { institute: [] } });

    const instituteTypes = effectiveInstituteTypes({ exam_type: examType, institute_type: instituteType, quota: undefined });
    const instituteSelect = instituteTypes?.length ? "institutes!inner(institute_type,state)" : "institutes(institute_type,state)";
    const data: Array<{ institute_name_raw: string | null }> = [];
    const pageSize = 1000;

    for (let page = 0; page < 30; page += 1) {
      const from = page * pageSize;
      let query = supabase
        .from("josaa_cutoffs")
        .select(`institute_name_raw,${instituteSelect}`)
        .eq("year", year)
        .eq("round", round)
        .range(from, from + pageSize - 1);
      if (instituteTypes?.length) query = query.in("institutes.institute_type", instituteTypes);

      const { data: pageRows, error } = await query;
      if (error) throw error;
      data.push(...((pageRows ?? []) as Array<{ institute_name_raw: string | null }>));
      if (!pageRows || pageRows.length < pageSize) break;
    }

    const counts = new Map<string, number>();
    for (const row of data) {
      const name = row.institute_name_raw as string | null;
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    return NextResponse.json({
      round,
      options: {
        institute: Array.from(counts.entries())
          .map(([value, count]) => ({ value, label: value, count }))
          .sort((a, b) => a.value.localeCompare(b.value))
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load options" }, { status: 500 });
  }
}
