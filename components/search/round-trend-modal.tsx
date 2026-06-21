"use client";

import { X } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useMemo, useState } from "react";
import { InstituteLink } from "@/components/institute-link";
import type { CutoffRow } from "@/lib/cutoff-query";

export function RoundTrendModal({
  row,
  rows,
  loading,
  onClose
}: {
  row: CutoffRow | null;
  rows: CutoffRow[];
  loading: boolean;
  onClose: () => void;
}) {
  const years = useMemo(() => Array.from(new Set(rows.map((item) => item.year))).sort((a, b) => b - a), [rows]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const activeYear = selectedYear && years.includes(selectedYear) ? selectedYear : years[0] ?? row?.year ?? 0;
  const activeRows = rows.filter((item) => item.year === activeYear);
  const chartData = activeRows.map((item) => ({
    round: `R${item.round}`,
    closing: item.closing_rank_num,
    opening: item.opening_rank_num
  }));

  useEffect(() => {
    setSelectedYear(row?.year ?? null);
  }, [row?.id, row?.year]);

  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/35 p-3">
      <section className="surface mx-auto mt-10 max-h-[86vh] max-w-3xl overflow-y-auto rounded-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-[var(--border)] bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-black">Year and round-wise cutoff trend</h2>
            <p className="mt-1 text-sm font-medium">
              <InstituteLink name={row.institute_name_raw} className="text-[var(--primary)] underline-offset-4 hover:underline" />
            </p>
            <p className="text-sm text-[var(--muted)]">{row.program_name_raw}</p>
          </div>
          <button className="focus-ring rounded-md p-2 hover:bg-[#f4eee5]" type="button" onClick={onClose} aria-label="Close trend modal">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-5 p-5">
          {loading ? <div className="h-64 animate-pulse rounded-xl bg-[#f4eee5]" /> : null}
          {!loading && years.length ? (
            <div className="flex flex-wrap gap-2">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={`focus-ring min-h-10 rounded-lg border px-4 text-sm font-black ${activeYear === year ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-emerald-50"}`}
                >
                  {year}
                </button>
              ))}
            </div>
          ) : null}
          {!loading && activeRows.length <= 1 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[#fff8ef] p-4 text-sm font-semibold text-[var(--foreground)]">
              Only {activeRows[0] ? `Round ${activeRows[0].round}` : "one round"} data is available for {activeYear}.
            </div>
          ) : null}
          {!loading && activeRows.length > 1 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="round" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="closing" stroke="#0f6b5b" strokeWidth={3} />
                  <Line type="monotone" dataKey="opening" stroke="#b65f2a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          {!loading ? (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#f4eee5] text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-3">Round</th>
                    <th className="px-3 py-3">Opening Rank</th>
                    <th className="px-3 py-3">Closing Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-white">
                  {activeRows.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3 font-black">Round {item.round}</td>
                      <td className="px-3 py-3 tabular-nums">{item.opening_rank_raw}</td>
                      <td className="px-3 py-3 tabular-nums font-black text-[var(--primary)]">{item.closing_rank_raw}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
