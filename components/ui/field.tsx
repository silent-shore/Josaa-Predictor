import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  flyoutHint,
  children,
  className
}: {
  label: string;
  hint?: string;
  flyoutHint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("group relative grid gap-2 text-sm font-semibold text-[var(--foreground)]", className)}>
      <span className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-[var(--muted)]">{hint}</span> : null}
      {flyoutHint ? (
        <span className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden max-w-[20rem] rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-bold leading-5 text-amber-950 shadow-xl shadow-amber-900/10 group-focus-within:block group-hover:block">
          {flyoutHint}
        </span>
      ) : null}
    </label>
  );
}

export function OptionList({ options }: { options: Array<{ value: string; label: string }> }) {
  return (
    <>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </>
  );
}
