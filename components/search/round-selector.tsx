"use client";

export function RoundSelector({
  rounds,
  value,
  onChange
}: {
  rounds: number[];
  value?: string;
  onChange: (round: string) => void;
}) {
  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Round</span>
        <span className="text-xs font-semibold text-[var(--muted)]">{rounds.length} available</span>
      </div>
      <div className="flex gap-2 overflow-x-auto rounded-xl border border-[var(--border)] bg-white p-1">
        {rounds.map((round) => {
          const active = value === String(round);
          return (
            <button
              key={round}
              type="button"
              onClick={() => onChange(String(round))}
              className={`focus-ring min-h-10 shrink-0 rounded-lg px-4 text-sm font-black transition ${
                active ? "bg-[var(--primary)] text-white" : "text-[var(--muted)] hover:bg-[#f4eee5] hover:text-[var(--foreground)]"
              }`}
            >
              Round {round}
            </button>
          );
        })}
      </div>
    </section>
  );
}
