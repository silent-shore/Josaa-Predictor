import Link from "next/link";
import type { Route } from "next";

const labels: Record<string, string> = {
  exam_type: "Exam",
  year: "Year",
  round: "Round",
  institute_type: "Institute type",
  institute: "Institute",
  program: "Program",
  state: "State",
  quota: "Quota",
  seat_type: "Seat type",
  gender: "Gender",
  sort: "Sort"
};

export function ActiveFilterChips({
  params,
  basePath
}: {
  params: Record<string, string | undefined>;
  basePath: string;
}) {
  const hiddenKeys = new Set(["page", "page_size", "rank_min", "rank_max"]);
  const entries = Object.entries(params).filter(([key, value]) => !hiddenKeys.has(key) && value && value !== "All");

  if (!entries.length) {
    return <p className="text-sm font-medium text-[var(--muted)]">No filters applied.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-bold">Active filters</span>
      {entries.map(([key, value]) => (
        <span key={key} className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)]">
          {labels[key] ?? key}: {value}
        </span>
      ))}
      <Link href={basePath as Route} className="focus-ring rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--foreground)] hover:bg-[#f7f1e8]">
        Clear all
      </Link>
    </div>
  );
}
