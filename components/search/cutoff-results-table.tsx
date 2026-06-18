"use client";

import { BarChart3, ChevronsUpDown } from "lucide-react";
import type { CutoffRow } from "@/lib/cutoff-query";

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-md border border-[var(--border)] bg-[#f7f1e8] px-2 py-1 text-xs font-black text-[var(--foreground)]">{children}</span>;
}

export function CutoffResultsTable({
  rows,
  sort,
  page,
  total,
  pageSize,
  onSort,
  onPage,
  onTrend
}: {
  rows: CutoffRow[];
  sort: string;
  page: number;
  total: number;
  pageSize: number;
  onSort: (sort: string) => void;
  onPage: (page: number) => void;
  onTrend: (row: CutoffRow) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (!rows.length) {
    return (
      <div className="surface rounded-xl p-10 text-center">
        <p className="text-lg font-black">No cutoffs found for these filters.</p>
        <p className="mt-2 text-sm font-medium text-[var(--muted)]">Remove one or more filters, try another round, choose another category, or broaden the institute type.</p>
      </div>
    );
  }

  function nextSort(key: "opening_rank" | "closing_rank") {
    return sort === key ? `-${key}` : key;
  }

  return (
    <section className="surface overflow-hidden rounded-xl">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-[#f4eee5] text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="min-w-64 px-3 py-3">Institute</th>
              <th className="min-w-80 px-3 py-3">Academic Program</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Quota</th>
              <th className="px-3 py-3">Seat</th>
              <th className="px-3 py-3">Gender</th>
              <th className="px-3 py-3">
                <button type="button" className="inline-flex items-center gap-1 font-black" onClick={() => onSort(nextSort("opening_rank"))}>
                  Opening <ChevronsUpDown size={13} />
                </button>
              </th>
              <th className="px-3 py-3">
                <button type="button" className="inline-flex items-center gap-1 font-black" onClick={() => onSort(nextSort("closing_rank"))}>
                  Closing <ChevronsUpDown size={13} />
                </button>
              </th>
              <th className="px-3 py-3">Round</th>
              <th className="px-3 py-3">Year</th>
              <th className="px-3 py-3">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => {
              const instituteType = Array.isArray(row.institutes) ? row.institutes[0]?.institute_type : row.institutes?.institute_type;
              return (
                <tr key={row.id} className="bg-white hover:bg-[#fffaf3]">
                  <td className="px-3 py-3 font-black text-[var(--foreground)]">{row.institute_name_raw}</td>
                  <td className="px-3 py-3 font-medium text-[var(--muted)]">{row.program_name_raw}</td>
                  <td className="px-3 py-3"><Badge>{instituteType?.replace("Indian Institute of ", "") ?? "-"}</Badge></td>
                  <td className="px-3 py-3"><Badge>{row.quota ?? "-"}</Badge></td>
                  <td className="px-3 py-3"><Badge>{row.seat_type ?? "-"}</Badge></td>
                  <td className="px-3 py-3"><Badge>{row.gender ?? "-"}</Badge></td>
                  <td className="px-3 py-3 tabular-nums">{row.opening_rank_raw ?? "-"}</td>
                  <td className="px-3 py-3 tabular-nums text-base font-black text-[var(--primary)]">{row.closing_rank_raw ?? "-"}</td>
                  <td className="px-3 py-3"><Badge>R{row.round}</Badge></td>
                  <td className="px-3 py-3 font-bold">{row.year}</td>
                  <td className="px-3 py-3">
                    <button type="button" className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-black hover:bg-[#f4eee5]" onClick={() => onTrend(row)}>
                      <BarChart3 size={14} />
                      View rounds
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 text-sm font-bold text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>
          Page {page} of {totalPages} · {total.toLocaleString("en-IN")} results
        </span>
        <div className="flex gap-2">
          <button className="focus-ring rounded-md border border-[var(--border)] bg-white px-3 py-2 disabled:opacity-40" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            Previous
          </button>
          <button className="focus-ring rounded-md border border-[var(--border)] bg-white px-3 py-2 disabled:opacity-40" type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
