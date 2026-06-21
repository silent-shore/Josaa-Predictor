"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ChoiceCard } from "@/components/predictor/choice-card";
import { ChoiceDetailDrawer } from "@/components/predictor/choice-detail-drawer";
import type { PredictResponse, PredictionBucket, PredictionRow } from "@/components/predictor/types";

const buckets: PredictionBucket[] = ["Safe", "Moderate", "Risky"];

function cloneParams(params: URLSearchParams) {
  return new URLSearchParams(params.toString());
}

function filterLabel(params: URLSearchParams) {
  const labels = [
    params.get("exam_type"),
    params.get("seat_type"),
    params.get("gender"),
    params.get("institute_type"),
    params.get("state")
  ].filter(Boolean);
  return labels.length ? labels.join(" · ") : "All eligible choices";
}

export function PredictorResultsClient({ initialQuery }: { initialQuery: string }) {
  const [params, setParams] = useState(() => new URLSearchParams(initialQuery));
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<PredictionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeBucket = (params.get("bucket") as PredictionBucket | null) ?? "Safe";
  const page = Number.parseInt(params.get("page") ?? "1", 10) || 1;
  const pageSize = Number.parseInt(params.get("page_size") ?? "24", 10) || 24;
  const rows = result?.rows ?? [];
  const total = result?.counts?.[activeBucket] ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchQuery = useMemo(() => {
    const next = cloneParams(params);
    next.set("bucket", activeBucket);
    next.set("page", String(page));
    next.set("page_size", String(pageSize));
    return next.toString();
  }, [params, activeBucket, page, pageSize]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/predict?${fetchQuery}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load prediction results");
        if (active) setResult(body);
      })
      .catch((issue) => {
        if (active) setError(issue instanceof Error ? issue.message : "Could not load prediction results");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchQuery]);

  function updateParams(updater: (next: URLSearchParams) => void) {
    const next = cloneParams(params);
    updater(next);
    window.history.replaceState(null, "", `/predictor/results?${next.toString()}`);
    setParams(next);
  }

  function setBucket(bucket: PredictionBucket) {
    updateParams((next) => {
      next.set("bucket", bucket);
      next.set("page", "1");
    });
  }

  function setYear(year: number) {
    updateParams((next) => {
      next.set("year", String(year));
      next.set("page", "1");
    });
  }

  function setPage(nextPage: number) {
    updateParams((next) => next.set("page", String(Math.min(Math.max(1, nextPage), totalPages))));
  }

  return (
    <div className="min-h-screen bg-[#f7f3ec]">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[1.4rem] border border-emerald-950/10 bg-white p-5 shadow-xl shadow-emerald-950/[0.05] lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <a href={`/predictor?${params.toString()}`} className="focus-ring mb-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-black text-[var(--primary)] hover:bg-emerald-50">
                <ArrowLeft size={16} />
                Refine predictor
              </a>
              <p className="eyebrow">Full prediction results</p>
              <h1 className="mt-2 text-3xl font-black text-[#001d19] sm:text-4xl">Choices for rank {params.get("rank")}</h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">{filterLabel(params)}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[#fbfaf7] p-4">
              <p className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Cutoff year</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(result?.available_years ?? [params.get("year")].filter(Boolean).map(Number)).map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setYear(year)}
                    className={`focus-ring min-h-10 rounded-xl border px-4 text-sm font-black ${String(year) === params.get("year") || (!params.get("year") && year === result?.cutoff_year) ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white hover:bg-emerald-50"}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.4rem] border border-emerald-950/10 bg-white shadow-xl shadow-emerald-950/[0.05]">
          <div className="border-b border-[var(--border)] p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[#fbfaf7]">
                {buckets.map((bucket) => (
                  <button
                    key={bucket}
                    type="button"
                    onClick={() => setBucket(bucket)}
                    className={`focus-ring min-h-12 border-r border-[var(--border)] px-3 text-sm font-black last:border-r-0 ${activeBucket === bucket ? "bg-[var(--primary)] text-white" : "hover:bg-emerald-50"}`}
                  >
                    {bucket}
                    <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-xs text-[var(--foreground)]">{(result?.counts?.[bucket] ?? 0).toLocaleString("en-IN")}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[#fbfaf7] px-4 py-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Showing</p>
                  <p className="text-sm font-black">{total.toLocaleString("en-IN")} {activeBucket.toLowerCase()} choices</p>
                </div>
                {loading ? <Loader2 size={18} className="animate-spin text-[var(--primary)]" /> : <Search size={18} className="text-[var(--primary)]" />}
              </div>
            </div>
          </div>

          {error ? <div className="m-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div> : null}

          <div className="grid gap-3 p-4">
            {loading ? (
              Array.from({ length: 9 }, (_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-2xl border border-[var(--border)] bg-[#fbfaf7]" />
              ))
            ) : rows.length ? (
              rows.map((row) => (
                <ChoiceCard key={row.id} row={row} bucket={activeBucket} onOpen={setSelectedChoice} />
              ))
            ) : (
              <div className="col-span-full rounded-2xl border border-dashed border-[var(--border)] bg-[#fbfaf7] px-5 py-12 text-center">
                <p className="text-base font-black">No {activeBucket.toLowerCase()} choices found.</p>
                <p className="mt-2 text-sm font-semibold text-[var(--muted)]">Try a different year, category, institute type, college, or branch family.</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-[var(--muted)]">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1 || loading}
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages || loading}
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>
      <ChoiceDetailDrawer row={selectedChoice} onClose={() => setSelectedChoice(null)} />
    </div>
  );
}
