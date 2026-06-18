import { cn } from "@/lib/utils";

const styles = {
  Safe: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Moderate: "bg-sky-50 text-sky-800 border-sky-200",
  Reach: "bg-amber-50 text-amber-800 border-amber-200"
};

export function RankBadge({ bucket }: { bucket: keyof typeof styles }) {
  return (
    <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-semibold", styles[bucket])}>
      {bucket}
    </span>
  );
}
