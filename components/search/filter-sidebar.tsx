"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { CheckboxFilterGroup } from "@/components/search/checkbox-filter-group";
import type { CutoffMeta, SearchFilters } from "@/components/search/types";

export function FilterSidebar({
  meta,
  filters,
  open,
  onOpenChange,
  onPatch
}: {
  meta: CutoffMeta | null;
  filters: SearchFilters;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatch: (patch: Partial<SearchFilters>) => void;
}) {
  const content = (
    <aside className="surface h-full overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} />
          <h2 className="font-black">Filters</h2>
        </div>
        <button className="focus-ring rounded-md p-2 lg:hidden" type="button" onClick={() => onOpenChange(false)} aria-label="Close filters">
          <X size={18} />
        </button>
      </div>
      <div className="max-h-[calc(100vh-170px)] overflow-y-auto px-4">
        <div className="grid gap-3 border-b border-[var(--border)] py-4">
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Institute search</span>
            <input
              className="focus-ring min-h-10 rounded-lg border border-[var(--border)] bg-[#fffdf9] px-3 text-sm font-semibold"
              value={filters.institute ?? ""}
              onChange={(event) => onPatch({ institute: event.target.value, page: "1" })}
              placeholder="Type institute keyword"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Branch search</span>
            <input
              className="focus-ring min-h-10 rounded-lg border border-[var(--border)] bg-[#fffdf9] px-3 text-sm font-semibold"
              value={filters.program ?? ""}
              onChange={(event) => onPatch({ program: event.target.value, page: "1" })}
              placeholder="CSE, AI, Mechanical"
            />
          </label>
        </div>
        <CheckboxFilterGroup title="Institute Type" options={meta?.options.institute_type ?? []} selected={filters.institute_type} onChange={(values) => onPatch({ institute_type: values, quota: values.includes("IIT") || values.includes("IIIT") ? [] : filters.quota, page: "1" })} />
        <CheckboxFilterGroup title="Institute Name" options={meta?.options.institute ?? []} selected={filters.institute_values} onChange={(values) => onPatch({ institute_values: values, page: "1" })} maxVisible={60} />
        <CheckboxFilterGroup title="Academic Program" options={meta?.options.program ?? []} selected={filters.program_values} onChange={(values) => onPatch({ program_values: values, page: "1" })} maxVisible={60} />
        <CheckboxFilterGroup title="Seat Type / Category" options={meta?.options.seat_type ?? []} selected={filters.seat_type} onChange={(values) => onPatch({ seat_type: values, page: "1" })} />
        <CheckboxFilterGroup title="Gender Pool" options={meta?.options.gender ?? []} selected={filters.gender} onChange={(values) => onPatch({ gender: values, page: "1" })} />
        <CheckboxFilterGroup title="Quota" options={meta?.options.quota ?? []} selected={filters.quota} onChange={(values) => onPatch({ quota: values, page: "1" })} />
        <div className="grid gap-3 py-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Opening min</span>
              <input className="focus-ring min-h-10 rounded-lg border border-[var(--border)] bg-[#fffdf9] px-3 text-sm font-semibold" value={filters.opening_min ?? ""} onChange={(event) => onPatch({ opening_min: event.target.value, page: "1" })} inputMode="numeric" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Opening max</span>
              <input className="focus-ring min-h-10 rounded-lg border border-[var(--border)] bg-[#fffdf9] px-3 text-sm font-semibold" value={filters.opening_max ?? ""} onChange={(event) => onPatch({ opening_max: event.target.value, page: "1" })} inputMode="numeric" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Closing min</span>
              <input className="focus-ring min-h-10 rounded-lg border border-[var(--border)] bg-[#fffdf9] px-3 text-sm font-semibold" value={filters.rank_min ?? ""} onChange={(event) => onPatch({ rank_min: event.target.value, page: "1" })} inputMode="numeric" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Closing max</span>
              <input className="focus-ring min-h-10 rounded-lg border border-[var(--border)] bg-[#fffdf9] px-3 text-sm font-semibold" value={filters.rank_max ?? ""} onChange={(event) => onPatch({ rank_max: event.target.value, page: "1" })} inputMode="numeric" />
            </label>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block">{content}</div>
      {open ? (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden">
          <div className="absolute inset-x-0 bottom-0 h-[88vh] rounded-t-2xl bg-[var(--background)] p-3">{content}</div>
        </div>
      ) : null}
    </>
  );
}
