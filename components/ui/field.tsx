import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  children,
  className
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1.5 text-sm font-semibold text-[var(--foreground)]", className)}>
      <span className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-[var(--muted)]">{hint}</span> : null}
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
