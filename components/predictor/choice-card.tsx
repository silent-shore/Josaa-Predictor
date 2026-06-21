"use client";

import { ChevronRight } from "lucide-react";
import { InstituteLink } from "@/components/institute-link";
import { RankBadge } from "@/components/rank-badge";
import type { PredictionBucket, PredictionRow } from "@/components/predictor/types";

export function ChoiceCard({
  row,
  bucket,
  onOpen,
  compact = false
}: {
  row: PredictionRow;
  bucket: PredictionBucket;
  onOpen: (row: PredictionRow) => void;
  compact?: boolean;
}) {
  const openingRound = row.opening_round ?? 1;
  const closingRound = row.closing_round ?? row.round;

  return (
    <article
      className="focus-ring group w-full rounded-2xl border border-[var(--border)] bg-white p-4 text-left shadow-sm shadow-black/[0.02] transition hover:-translate-y-0.5 hover:border-emerald-900/20 hover:shadow-lg hover:shadow-emerald-950/[0.07]"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <RankBadge bucket={bucket} />
            <span className="rounded-md bg-[#f6f3ee] px-2 py-1 text-xs font-black text-[var(--muted)]">{row.year}</span>
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-[var(--primary)]">{row.quota}</span>
          </div>
          <h3 className="mt-3 text-sm font-black leading-5">
            <InstituteLink name={row.institute_name_raw} className="text-[#001d19] underline-offset-4 hover:text-[var(--primary)] hover:underline" />
          </h3>
          <p className={`mt-1 font-semibold leading-5 text-[var(--muted)] ${compact ? "line-clamp-2 text-xs" : "text-sm"}`}>
            {row.program_name_raw}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem] font-black uppercase tracking-wide text-[var(--muted)]">
            <span>{row.seat_type}</span>
            <span>{row.gender}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[#fbfaf7]">
          <div className="border-r border-[var(--border)] p-3">
            <p className="text-[0.68rem] font-black uppercase tracking-wide text-[var(--muted)]">Opening R{openingRound}</p>
            <p className="mt-1 text-lg font-black text-[#001d19]">{row.opening_rank_raw ?? "-"}</p>
          </div>
          <div className="p-3">
            <p className="text-[0.68rem] font-black uppercase tracking-wide text-[var(--muted)]">Closing R{closingRound}</p>
            <p className="mt-1 text-lg font-black text-[var(--primary)]">{row.closing_rank_raw ?? "-"}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpen(row)}
          className="focus-ring inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-black text-[var(--primary)] hover:bg-emerald-50"
        >
          Details
          <ChevronRight size={16} />
        </button>
      </div>
    </article>
  );
}
