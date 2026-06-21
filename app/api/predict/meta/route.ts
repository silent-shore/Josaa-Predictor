import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

let cache: { at: number; years: number[] } | null = null;
const CACHE_MS = 5 * 60 * 1000;

export async function GET() {
  const supabase = await createClient();

  try {
    if (!cache || Date.now() - cache.at > CACHE_MS) {
      const currentYear = new Date().getFullYear();
      const candidateYears = Array.from({ length: currentYear - 2016 + 2 }, (_, index) => currentYear + 1 - index);
      const counts = await Promise.all(
        candidateYears.map(async (year) => {
          const { count, error } = await supabase.from("josaa_cutoffs").select("id", { count: "exact", head: true }).eq("year", year);
          if (error) throw error;
          return { year, count: count ?? 0 };
        })
      );
      cache = {
        at: Date.now(),
        years: counts.filter((item) => item.count > 0).map((item) => item.year).sort((a, b) => b - a)
      };
    }

    return NextResponse.json({ years: cache.years, latest_year: cache.years[0] ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load predictor metadata" }, { status: 500 });
  }
}
