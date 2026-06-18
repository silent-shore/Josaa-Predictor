"use client";

import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { FilterOption } from "@/components/search/types";

export function CheckboxFilterGroup({
  title,
  options,
  selected,
  onChange,
  maxVisible = 80
}: {
  title: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  maxVisible?: number;
}) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return options
      .filter((option) => (normalizedQuery ? option.value.toLowerCase().includes(normalizedQuery) : true))
      .sort((a, b) => Number(selectedSet.has(b.value)) - Number(selectedSet.has(a.value)) || b.count - a.count || a.value.localeCompare(b.value))
      .slice(0, maxVisible);
  }, [maxVisible, options, query, selectedSet]);

  function toggle(value: string) {
    if (selectedSet.has(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    onChange([...selected, value]);
  }

  return (
    <section className="border-b border-[var(--border)] py-4 last:border-b-0">
      <button
        type="button"
        className="focus-ring flex w-full items-center justify-between gap-3 rounded-md text-left"
        onClick={() => setOpen((current) => !current)}
      >
        <span>
          <span className="block text-sm font-black text-[var(--foreground)]">{title}</span>
          {selected.length ? <span className="text-xs font-semibold text-[var(--primary)]">{selected.length} selected</span> : null}
        </span>
        <ChevronDown size={18} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="mt-3 grid gap-3">
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[#fffdf9] px-3">
            <Search size={15} className="text-[var(--muted)]" />
            <input
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${title.toLowerCase()}`}
            />
          </label>
          <div className="flex gap-2">
            <button type="button" className="focus-ring rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-bold hover:bg-[#f4eee5]" onClick={() => onChange(visibleOptions.map((option) => option.value))}>
              Select visible
            </button>
            <button type="button" className="focus-ring rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-bold hover:bg-[#f4eee5]" onClick={() => onChange([])}>
              Clear
            </button>
          </div>
          <div className="grid max-h-72 gap-1 overflow-auto pr-1">
            {visibleOptions.map((option) => {
              const checked = selectedSet.has(option.value);
              return (
                <label
                  key={option.value}
                  className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition ${
                    checked ? "bg-[#eaf5f2] text-[var(--foreground)]" : "hover:bg-[#f7f1e8]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="size-4 rounded border-[var(--border)] accent-[var(--primary)]"
                    checked={checked}
                    onChange={() => toggle(option.value)}
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold" title={option.value}>
                    {option.value}
                  </span>
                  <span className="rounded bg-white px-1.5 py-0.5 text-xs font-bold text-[var(--muted)]">{option.count}</span>
                </label>
              );
            })}
            {!visibleOptions.length ? <p className="py-3 text-sm font-medium text-[var(--muted)]">No options available.</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
