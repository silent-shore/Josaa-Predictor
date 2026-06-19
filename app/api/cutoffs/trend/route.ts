import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const requiredParams = ["institute", "program", "seat_type", "gender"] as const;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const missing = requiredParams.filter((key) => !params.get(key));
  if (missing.length) {
    return NextResponse.json({ error: `Missing required parameters: ${missing.join(", ")}` }, { status: 400 });
  }

  const supabase = await createClient();
  let query = supabase
    .from("josaa_cutoffs")
    .select("id,year,round,institute_name_raw,program_name_raw,quota,seat_type,gender,opening_rank_raw,closing_rank_raw,opening_rank_num,closing_rank_num,rank_list_type")
    .eq("institute_name_raw", params.get("institute")!)
    .eq("program_name_raw", params.get("program")!)
    .eq("seat_type", params.get("seat_type")!)
    .eq("gender", params.get("gender")!)
    .order("year", { ascending: false })
    .order("round", { ascending: true });

  const quota = params.get("quota");
  if (quota && quota !== "AI") {
    query = query.eq("quota", quota);
  }

  const year = params.get("year");
  if (year) {
    const parsedYear = Number.parseInt(year, 10);
    if (!Number.isFinite(parsedYear)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
    query = query.eq("year", parsedYear);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] });
}
