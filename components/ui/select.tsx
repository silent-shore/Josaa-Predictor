import { cn } from "@/lib/utils";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select
      className={cn(
        "focus-ring min-h-11 w-full rounded-md border border-[var(--border)] bg-[#fffdf9] px-3 py-2 text-sm font-medium text-[var(--foreground)]",
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
