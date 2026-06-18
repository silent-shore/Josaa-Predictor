export default function LoadingSearch() {
  return (
    <div className="page-shell page-grid">
      <div className="h-12 w-72 animate-pulse rounded-md bg-[#e7ded1]" />
      <div className="surface grid gap-4 rounded-xl p-4 sm:p-5 lg:grid-cols-12">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="h-11 animate-pulse rounded-md bg-[#f4eee5] lg:col-span-3" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-[#f4eee5]" />
    </div>
  );
}
