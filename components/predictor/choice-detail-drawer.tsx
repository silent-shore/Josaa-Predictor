"use client";

import { ExternalLink, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { InstituteLink } from "@/components/institute-link";
import type { PredictionRow } from "@/components/predictor/types";
import { Button } from "@/components/ui/button";

type TrendRow = PredictionRow;

function encodeParams(row: PredictionRow) {
  const params = new URLSearchParams({
    institute: row.institute_name_raw,
    program: row.program_name_raw,
    seat_type: row.seat_type ?? "",
    gender: row.gender ?? "",
    quota: row.quota ?? ""
  });
  return params;
}

export function ChoiceDetailDrawer({
  row,
  onClose
}: {
  row: PredictionRow | null;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<TrendRow[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    let active = true;
    setLoading(true);
    setError(null);
    setRows([]);
    setSelectedYear(row.year);
    fetch(`/api/cutoffs/trend?${encodeParams(row).toString()}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load cutoff details");
        if (active) setRows(body.rows ?? []);
      })
      .catch((issue) => {
        if (active) setError(issue instanceof Error ? issue.message : "Could not load cutoff details");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [row]);

  const years = useMemo(() => Array.from(new Set(rows.map((item) => item.year))).sort((a, b) => b - a), [rows]);
  const visibleRows = rows.filter((item) => item.year === (selectedYear ?? row?.year)).sort((a, b) => a.round - b.round);
  const searchParams = row
    ? new URLSearchParams({
      year: String(row.year),
      round: String(row.round),
      institute_values: row.institute_name_raw,
      program_values: row.program_name_raw,
      quota: row.quota ?? "",
      seat_type: row.seat_type ?? "",
      gender: row.gender ?? ""
    })
    : null;

  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close cutoff details" onClick={onClose} className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-emerald-950/10 bg-[#fffdf9] shadow-2xl shadow-slate-950/20">
        <div className="border-b border-[var(--border)] bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Cutoff details</p>
              <h2 className="mt-1 text-xl font-black leading-7">
                <InstituteLink name={row.institute_name_raw} className="text-[#001d19] underline-offset-4 hover:text-[var(--primary)] hover:underline" />
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--muted)]">{row.program_name_raw}</p>
            </div>
            <button type="button" onClick={onClose} className="focus-ring grid size-10 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-white text-[var(--muted)] hover:bg-red-50 hover:text-red-700">
              <X size={18} />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[var(--primary)]">{row.quota}</span>
            <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-800">{row.seat_type}</span>
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-800">{row.gender}</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-5 py-5">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-black text-[var(--muted)]">
              <Loader2 size={18} className="animate-spin" />
              Loading year-wise cutoffs
            </div>
          ) : null}

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">{error}</div> : null}

          {!loading && !error ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-[var(--border)] bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-black">Choose cutoff year</p>
                  {searchParams ? (
                    <a href={`/search?${searchParams.toString()}`} className="focus-ring inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-black text-[var(--primary)] hover:bg-emerald-50">
                      Open in OR-CR <ExternalLink size={13} />
                    </a>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {years.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setSelectedYear(year)}
                      className={`focus-ring min-h-10 rounded-xl border px-4 text-sm font-black ${selectedYear === year ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-[#fffdf9] hover:bg-emerald-50"}`}
                    >
                      {year}
                    </button>
                  ))}
                  {!years.length ? <span className="text-sm font-semibold text-[var(--muted)]">No other year data found for this exact choice.</span> : null}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
                <div className="grid grid-cols-3 bg-[var(--primary)] px-4 py-3 text-xs font-black uppercase tracking-wide text-white">
                  <span>Round</span>
                  <span>Opening</span>
                  <span>Closing</span>
                </div>
                {visibleRows.map((item) => (
                  <div key={item.id} className="grid grid-cols-3 border-t border-[var(--border)] px-4 py-3 text-sm font-bold">
                    <span>Round {item.round}</span>
                    <span>{item.opening_rank_raw ?? "-"}</span>
                    <span className="text-[var(--primary)]">{item.closing_rank_raw ?? "-"}</span>
                  </div>
                ))}
                {!visibleRows.length ? (
                  <p className="px-4 py-8 text-center text-sm font-semibold text-[var(--muted)]">No round-wise rows found for this year.</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-[var(--border)] bg-white px-5 py-4">
          <Button type="button" onClick={onClose} className="w-full">Close details</Button>
        </div>
      </aside>
    </div>
  );
}
