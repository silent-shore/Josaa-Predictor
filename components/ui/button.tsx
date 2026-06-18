import { cn } from "@/lib/utils";

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;
  return (
    <button
      className={cn(
        "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...rest}
    />
  );
}
