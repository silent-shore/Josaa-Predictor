import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const [{ data: latestSnapshot, error: snapshotError }, { count, error: countError }] = await Promise.all([
    supabase.from("data_snapshots").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("josaa_cutoffs").select("id", { count: "exact", head: true })
  ]);

  if (snapshotError || countError) {
    return NextResponse.json({ error: snapshotError?.message ?? countError?.message }, { status: 500 });
  }

  return NextResponse.json({
    latest_imported_year: latestSnapshot?.year ?? null,
    latest_imported_round: latestSnapshot?.round ?? null,
    total_rows: count ?? latestSnapshot?.total_rows ?? 0,
    last_import_time: latestSnapshot?.created_at ?? null,
    source_url: latestSnapshot?.source_url ?? process.env.JOSAA_SOURCE_URL ?? null,
    source_note: "Data is sourced from publicly available JoSAA OR-CR pages.",
    disclaimer: "This is an unofficial helper tool. Always verify final counselling decisions on the official JoSAA website."
  });
}
