import Link from "next/link";
import type { Route } from "next";
import { ActiveFilterChips } from "@/components/filters/active-filter-chips";
import { CutoffTable } from "@/components/cutoff-table";
import { CutoffFilters } from "@/components/filters/cutoff-filters";
import { applyCutoffFilters, type CutoffRow } from "@/lib/cutoff-query";
import { createClient } from "@/lib/supabase/server";
import { cutoffsQuerySchema } from "@/lib/validators/cutoffs";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const rawParams = await searchParams;
  const flatParams = Object.fromEntries(
    Object.entries(rawParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
  );
  const parsed = cutoffsQuerySchema.safeParse(flatParams);
  const filters = parsed.success ? parsed.data : cutoffsQuerySchema.parse({});
  const supabase = await createClient();
  const { data, count, error } = await applyCutoffFilters(supabase, filters);
  const pageSize = Math.min(filters.page_size, 100);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  function pageHref(page: number): Route {
    const params = new URLSearchParams(flatParams as Record<string, string>);
    params.set("page", String(page));
    return `/search?${params.toString()}` as Route;
  }

  return (
    <div className="page-shell page-grid">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Cutoff search</p>
          <h1 className="mt-2 text-4xl font-black tracking-normal">Search OR-CR rows</h1>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-bold text-[var(--muted)]">
          {count ?? 0} results
        </div>
      </div>
      <ActiveFilterChips params={flatParams as Record<string, string | undefined>} basePath="/search" />
      <CutoffFilters />
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">{error.message}</div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm font-semibold text-[var(--muted)]">
            <span>Page {filters.page} of {totalPages}</span>
            <span>{pageSize} rows per page</span>
          </div>
          <CutoffTable rows={(data ?? []) as CutoffRow[]} />
          <div className="flex gap-2">
            <Link className="focus-ring rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-bold aria-disabled:pointer-events-none aria-disabled:opacity-50" href={pageHref(Math.max(1, filters.page - 1))} aria-disabled={filters.page <= 1}>
              Previous
            </Link>
            <Link className="focus-ring rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-bold aria-disabled:pointer-events-none aria-disabled:opacity-50" href={pageHref(Math.min(totalPages, filters.page + 1))} aria-disabled={filters.page >= totalPages}>
              Next
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
