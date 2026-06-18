import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      className={cn(
        "focus-ring min-h-11 w-full rounded-md border border-[var(--border)] bg-[#fffdf9] px-3 py-2 text-sm font-medium text-[var(--foreground)] placeholder:text-slate-400",
        className
      )}
      {...rest}
    />
  );
}
