import { NextRequest, NextResponse } from "next/server";
import { normalizeInstituteTypeFilter } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

type InstituteRow = {
  id: string;
  name: string;
  institute_type: string;
  state: string | null;
  city: string | null;
};

function shortInstituteType(value: string | null | undefined) {
  if (value === "Indian Institute of Technology") return "IIT";
  if (value === "National Institute of Technology") return "NIT";
  if (value === "Indian Institute of Information Technology") return "IIIT";
  if (value === "Government Funded Technical Institutions") return "GFTI";
  if (value === "Indian Institute of Science") return "IISc";
  return value ?? "Institute";
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const type = params.get("type")?.trim();

  try {
    let query = supabase
      .from("institutes")
      .select("id,name,institute_type,state,city")
      .order("name", { ascending: true })
      .limit(250);

    if (q) query = query.ilike("name", `%${q}%`);
    if (type && type !== "All") query = query.eq("institute_type", normalizeInstituteTypeFilter(type));

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      institutes: ((data ?? []) as InstituteRow[]).map((row) => ({
        ...row,
        short_type: shortInstituteType(row.institute_type)
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load institutes" }, { status: 500 });
  }
}
