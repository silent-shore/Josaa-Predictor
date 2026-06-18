import { createClient } from "@/lib/supabase/server";

export default async function StatusPage() {
  const supabase = await createClient();
  const [{ data: snapshot }, { count }] = await Promise.all([
    supabase.from("data_snapshots").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("josaa_cutoffs").select("id", { count: "exact", head: true })
  ]);

  const items = [
    ["Latest year", snapshot?.year ?? "Not imported"],
    ["Latest round", snapshot?.round ?? "Not imported"],
    ["Rows available", count ?? snapshot?.total_rows ?? 0],
    ["Last updated", snapshot?.created_at ? new Date(snapshot.created_at).toLocaleString("en-IN") : "Not imported"]
  ];

  return (
    <div className="page-shell max-w-5xl page-grid">
      <div>
        <p className="eyebrow">Data</p>
        <h1 className="mt-2 text-4xl font-black tracking-normal">Current import status</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="surface rounded-xl p-5">
            <dt className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{label}</dt>
            <dd className="mt-2 break-words text-2xl font-black">{String(value)}</dd>
          </div>
        ))}
      </div>
    </div>
  );
}
