import { SearchForm } from "@/components/search-form";

export default function HomePage() {
  return (
    <div className="page-shell">
      <section className="grid min-h-[calc(100vh-220px)] content-center gap-8 py-6">
        <div className="grid gap-4">
          <p className="eyebrow">Opening and closing ranks</p>
          <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-normal text-[var(--foreground)] sm:text-6xl">
            JoSAA Rank Explorer
          </h1>
          <p className="max-w-2xl text-lg font-medium leading-8 text-[var(--muted)]">
            Search imported JoSAA cutoff rows by rank, category, quota, institute type, branch, and round.
          </p>
        </div>
        <SearchForm />
      </section>
    </div>
  );
}
