"use client";

import { useState } from "react";
import { RankBadge } from "@/components/rank-badge";
import { Button } from "@/components/ui/button";
import { Field, OptionList } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { GENDER_OPTIONS, INSTITUTE_TYPE_OPTIONS, SEAT_TYPE_OPTIONS, usesCategoryRank } from "@/lib/constants";

type PredictionRow = {
  id: string;
  institute_name_raw: string;
  program_name_raw: string;
  closing_rank_raw: string;
  year: number;
  round: number;
  quota: string;
  seat_type: string;
  gender: string;
};

export function RankSearchMode({ year, round }: { year?: string; round?: string }) {
  const [seatType, setSeatType] = useState("OPEN");
  const [loading, setLoading] = useState(false);
  const [grouped, setGrouped] = useState<Record<string, PredictionRow[]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      const text = value.toString().trim();
      if (text && text !== "All") params.set(key, text);
    }
    if (year) params.set("year", year);
    if (round) params.set("round", round);

    const response = await fetch(`/api/predict?${params.toString()}`);
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(body.error ?? "Prediction failed");
      return;
    }
    setGrouped(body.grouped);
  }

  return (
    <section className="surface rounded-xl p-4">
      <div className="mb-4">
        <h2 className="text-lg font-black">Find colleges by my rank</h2>
        <p className="text-sm font-medium text-[var(--muted)]">Based on previous cutoff data. This is not an admission guarantee.</p>
      </div>
      <form action={submit} className="grid gap-3 md:grid-cols-5">
        <Field label="Rank" hint={usesCategoryRank(seatType) ? "Enter category rank for the selected category." : "Enter OPEN/CRL rank for OPEN seat type."}>
          <Input name="rank" required inputMode="numeric" placeholder="12000" />
        </Field>
        <Field label="Seat type">
          <Select name="seat_type" value={seatType} onChange={(event) => setSeatType(event.target.value)}>
            <OptionList options={SEAT_TYPE_OPTIONS} />
          </Select>
        </Field>
        <Field label="Gender">
          <Select name="gender" defaultValue="Gender-Neutral">
            <OptionList options={GENDER_OPTIONS} />
          </Select>
        </Field>
        <Field label="Institute type">
          <Select name="institute_type" defaultValue="All">
            <OptionList options={INSTITUTE_TYPE_OPTIONS.slice(0, 5)} />
          </Select>
        </Field>
        <Field label="Branch">
          <Input name="branch" placeholder="Computer" />
        </Field>
        <div className="md:col-span-5">
          <Button type="submit" disabled={loading}>{loading ? "Searching..." : "Find options"}</Button>
        </div>
      </form>
      {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-900">{error}</div> : null}
      {grouped ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {(["Safe", "Moderate", "Risky"] as const).map((bucket) => (
            <div key={bucket} className="rounded-xl border border-[var(--border)] bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <RankBadge bucket={bucket} />
                <span className="text-xs font-bold text-[var(--muted)]">{grouped[bucket]?.length ?? 0}</span>
              </div>
              <div className="grid gap-2">
                {(grouped[bucket] ?? []).slice(0, 8).map((row) => (
                  <div key={row.id} className="border-t border-[var(--border)] pt-2 text-sm">
                    <p className="font-black">{row.institute_name_raw}</p>
                    <p className="text-xs font-medium text-[var(--muted)]">{row.program_name_raw}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">Closing {row.closing_rank_raw} · R{row.round}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
