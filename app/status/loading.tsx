export default function LoadingStatus() {
  return (
    <div className="page-shell max-w-5xl page-grid">
      <div className="h-12 w-72 animate-pulse rounded-md bg-[#e7ded1]" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface h-28 animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  );
}
