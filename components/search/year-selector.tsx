"use client";

export function YearSelector({
  years,
  value,
  onChange
}: {
  years: number[];
  value?: string;
  onChange: (year: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Admission year</span>
      <select
        className="focus-ring min-h-12 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-black text-[var(--foreground)]"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}
