import { NextRequest, NextResponse } from "next/server";
import { isExcludedProgramName } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

type CutoffRow = {
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
};

function splitValues(value: string | null) {
  return value
    ?.split("~")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const params = request.nextUrl.searchParams;
  const instituteId = params.get("institute_id");
  const year = Number.parseInt(params.get("year") ?? "", 10);
  const seatTypes = splitValues(params.get("seat_type"));
  const genders = splitValues(params.get("gender"));
  const programSearch = params.get("program")?.trim();

  if (!instituteId) {
    return NextResponse.json({ error: "Missing institute_id" }, { status: 400 });
  }

  try {
    const { data: institute, error: instituteError } = await supabase
      .from("institutes")
      .select("id,name,institute_type,state,city")
      .eq("id", instituteId)
      .maybeSingle();
    if (instituteError) throw instituteError;
    if (!institute) return NextResponse.json({ error: "Institute not found" }, { status: 404 });

    const yearRows: Array<{ year: number }> = [];
    const pageSize = 1000;
    for (let page = 0; page < 30; page += 1) {
      const from = page * pageSize;
      const { data: pageRows, error: yearsError } = await supabase
        .from("josaa_cutoffs")
        .select("year")
        .eq("institute_id", instituteId)
        .range(from, from + pageSize - 1);
      if (yearsError) throw yearsError;
      yearRows.push(...((pageRows ?? []) as Array<{ year: number }>));
      if (!pageRows || pageRows.length < pageSize) break;
    }

    const years = Array.from(new Set(yearRows.map((row) => row.year as number)))
      .filter(Boolean)
      .sort((a, b) => b - a);
    const selectedYear = Number.isFinite(year) && years.includes(year) ? year : years[0];
    if (!selectedYear) {
      return NextResponse.json({ institute, years: [], selected_year: null, rows: [], programs: [], rounds: [] });
    }

    const data: CutoffRow[] = [];
    for (let page = 0; page < 50; page += 1) {
      const from = page * pageSize;
      let query = supabase
        .from("josaa_cutoffs")
        .select("id,year,round,institute_name_raw,program_name_raw,quota,seat_type,gender,opening_rank_raw,closing_rank_raw,opening_rank_num,closing_rank_num,rank_list_type")
        .eq("institute_id", instituteId)
        .eq("year", selectedYear)
        .order("program_name_raw", { ascending: true })
        .order("seat_type", { ascending: true })
        .order("gender", { ascending: true })
        .order("quota", { ascending: true })
        .order("round", { ascending: true })
        .range(from, from + pageSize - 1);

      if (seatTypes?.length && !seatTypes.includes("All")) query = query.in("seat_type", seatTypes);
      if (genders?.length && !genders.includes("All")) query = query.in("gender", genders);
      if (programSearch) query = query.ilike("program_name_raw", `%${programSearch}%`);

      const { data: pageRows, error } = await query;
      if (error) throw error;
      data.push(...((pageRows ?? []) as CutoffRow[]));
      if (!pageRows || pageRows.length < pageSize) break;
    }

    const rows = data.filter((row) => !isExcludedProgramName(row.program_name_raw));
    const programs = Array.from(new Set(rows.map((row) => row.program_name_raw))).sort((a, b) => a.localeCompare(b));
    const rounds = Array.from(new Set(rows.map((row) => row.round))).sort((a, b) => a - b);

    return NextResponse.json({
      institute,
      years,
      selected_year: selectedYear,
      rounds,
      programs,
      rows
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load institute cutoffs" }, { status: 500 });
  }
}
