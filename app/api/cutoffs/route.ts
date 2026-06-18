import { NextRequest, NextResponse } from "next/server";
import { applyCutoffFilters } from "@/lib/cutoff-query";
import { createClient } from "@/lib/supabase/server";
import { cutoffsQuerySchema } from "@/lib/validators/cutoffs";

function toCsv(rows: Record<string, unknown>[]) {
  const headers = ["year", "round", "institute_name_raw", "program_name_raw", "quota", "seat_type", "gender", "opening_rank_raw", "closing_rank_raw", "rank_list_type"];
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = cutoffsQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters", issues: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error, count } = await applyCutoffFilters(supabase, parsed.data);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (request.nextUrl.searchParams.get("format") === "csv") {
    return new NextResponse(toCsv((data ?? []) as Record<string, unknown>[]), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=josaa-cutoffs.csv"
      }
    });
  }

  return NextResponse.json({
    rows: data ?? [],
    total: count ?? 0,
    page: parsed.data.page,
    page_size: Math.min(parsed.data.page_size, 100)
  });
}
