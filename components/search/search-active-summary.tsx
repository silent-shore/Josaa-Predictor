"use client";

import { X } from "lucide-react";
import type { SearchFilters } from "@/components/search/types";

const labels: Partial<Record<keyof SearchFilters, string>> = {
  exam_type: "Exam",
  year: "Year",
  round: "Round",
  institute_type: "Type",
  institute_values: "Institute",
  program_values: "Program",
  quota: "Quota",
  seat_type: "Seat",
  gender: "Gender",
  institute: "Institute search",
  program: "Branch search",
  state: "State",
  opening_min: "Opening min",
  opening_max: "Opening max",
  sort: "Sort",
  page: "Page"
};

export function SearchActiveSummary({
  filters,
  total,
  lastUpdated,
  onRemove,
  onClear
}: {
  filters: SearchFilters;
  total: number;
  lastUpdated?: string | null;
  onRemove: (key: keyof SearchFilters, value?: string) => void;
  onClear: () => void;
}) {
  const chips: Array<{ key: keyof SearchFilters; value: string }> = [];
  for (const [key, value] of Object.entries(filters) as Array<[keyof SearchFilters, string | string[] | undefined]>) {
    if (!value || key === "page" || key === "sort" || key === "rank_min" || key === "rank_max") continue;
    if (Array.isArray(value)) {
      value.forEach((item) => chips.push({ key, value: item }));
    } else {
      chips.push({ key, value });
    }
  }

  return (
    <section className="sticky top-[112px] z-10 rounded-xl border border-[var(--border)] bg-[#fdfbf7]/95 p-3 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-lg font-black">{total.toLocaleString("en-IN")} results</p>
          {lastUpdated ? <p className="text-xs font-semibold text-[var(--muted)]">Last updated {new Date(lastUpdated).toLocaleString("en-IN")}</p> : null}
        </div>
        <button className="focus-ring rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-black hover:bg-[#f4eee5]" type="button" onClick={onClear}>
          Clear all filters
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.length ? (
          chips.map((chip) => (
            <button
              key={`${chip.key}:${chip.value}`}
              className="focus-ring inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-black hover:bg-[#f4eee5]"
              type="button"
              onClick={() => onRemove(chip.key, chip.value)}
            >
              {labels[chip.key]}: {chip.value}
              <X size={13} />
            </button>
          ))
        ) : (
          <p className="text-sm font-semibold text-[var(--muted)]">No filters applied beyond the selected year and round.</p>
        )}
      </div>
    </section>
  );
}
