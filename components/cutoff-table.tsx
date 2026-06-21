import { InstituteLink } from "@/components/institute-link";
import type { CutoffRow } from "@/lib/cutoff-query";

export function CutoffTable({ rows }: { rows: CutoffRow[] }) {
  if (!rows.length) {
    return (
      <div className="surface rounded-xl border-dashed p-10 text-center">
        <p className="text-base font-bold text-[var(--foreground)]">No matching rows</p>
        <p className="mt-1 text-sm text-[var(--muted)]">Try a broader rank range, category, branch, or institute type.</p>
      </div>
    );
  }

  return (
    <div className="surface overflow-hidden rounded-xl">
      <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-[#f4eee5] text-xs uppercase text-[var(--muted)]">
          <tr>
            {["Year", "Round", "Institute", "Program", "Quota", "Seat Type", "Gender", "Opening Rank", "Closing Rank", "Rank List Type"].map((header) => (
              <th key={header} className="whitespace-nowrap px-4 py-3 font-black">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row) => (
            <tr key={row.id} className="bg-white hover:bg-[#fffaf3]">
              <td className="px-4 py-3 font-semibold">{row.year}</td>
              <td className="px-4 py-3">{row.round}</td>
              <td className="min-w-64 px-4 py-3 font-bold">
                <InstituteLink name={row.institute_name_raw} className="text-[var(--primary)] underline-offset-4 hover:underline" />
              </td>
              <td className="min-w-80 px-4 py-3 text-[var(--muted)]">{row.program_name_raw}</td>
              <td className="px-4 py-3">{row.quota ?? "-"}</td>
              <td className="px-4 py-3">{row.seat_type ?? "-"}</td>
              <td className="px-4 py-3">{row.gender ?? "-"}</td>
              <td className="px-4 py-3 tabular-nums">{row.opening_rank_raw ?? "-"}</td>
              <td className="px-4 py-3 tabular-nums text-base font-black text-[var(--primary)]">{row.closing_rank_raw ?? "-"}</td>
              <td className="px-4 py-3">{row.rank_list_type ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
