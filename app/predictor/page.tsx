"use client";

import { RotateCcw } from "lucide-react";
import { FormEvent, useState } from "react";
import { RankBadge } from "@/components/rank-badge";
import { Button } from "@/components/ui/button";
import { Field, OptionList } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EXAM_TYPE_OPTIONS, GENDER_OPTIONS, INSTITUTE_TYPE_OPTIONS, quotaOptionsForInstituteType, SEAT_TYPE_OPTIONS, usesCategoryRank } from "@/lib/constants";

type Result = {
  id: string;
  institute_name_raw: string;
  program_name_raw: string;
  year: number;
  round: number;
  closing_rank_raw: string;
  quota: string;
  seat_type: string;
  gender: string;
};

export default function PredictorPage() {
  const [grouped, setGrouped] = useState<Record<string, Result[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Array<[string, string]>>([]);
  const [instituteType, setInstituteType] = useState("All");
  const [seatType, setSeatType] = useState("All");
  const quotaOptions = quotaOptionsForInstituteType(instituteType);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setGrouped(null);
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      const text = value.toString().trim();
      if (text && text !== "All") params.set(key, text);
    }
    if (instituteType === "IIT" || instituteType === "IIIT") {
      params.delete("quota");
    }
    setActiveFilters(Array.from(params.entries()));
    try {
      const response = await fetch(`/api/predict?${params.toString()}`);
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Prediction failed");
        return;
      }
      setGrouped(body.grouped);
    } catch {
      setError("Prediction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell page-grid">
      <div>
        <p className="eyebrow">Rank predictor</p>
        <h1 className="mt-2 text-4xl font-black tracking-normal">Group possible options</h1>
      </div>
      <form onSubmit={submit} className="surface grid gap-4 rounded-xl p-4 sm:p-5 lg:grid-cols-12">
        <Field label="Exam" className="lg:col-span-3">
          <Select name="exam_type" defaultValue="All">
            <option value="All">All exams</option>
            <OptionList options={EXAM_TYPE_OPTIONS} />
          </Select>
        </Field>
        <Field
          label="Rank"
          hint={usesCategoryRank(seatType) ? "Enter your category rank, not your OPEN/CRL rank." : "Use OPEN/CRL rank when seat type is OPEN."}
          className="lg:col-span-3"
        >
          <Input name="rank" required inputMode="numeric" placeholder="12000" />
        </Field>
        <Field label="Seat type" className="lg:col-span-3">
          <Select name="seat_type" value={seatType} onChange={(event) => setSeatType(event.target.value)}><OptionList options={SEAT_TYPE_OPTIONS} /></Select>
        </Field>
        <Field label="Gender pool" className="lg:col-span-3">
          <Select name="gender" defaultValue="All"><OptionList options={GENDER_OPTIONS} /></Select>
        </Field>
        <Field label="Quota" className="lg:col-span-3">
          <Select name="quota" defaultValue="All" key={instituteType}><OptionList options={quotaOptions} /></Select>
        </Field>
        <Field label="Institute type" className="lg:col-span-3">
          <Select name="institute_type" value={instituteType} onChange={(event) => setInstituteType(event.target.value)}><OptionList options={INSTITUTE_TYPE_OPTIONS.slice(0, 5)} /></Select>
        </Field>
        <Field label="Year" className="lg:col-span-2">
          <Input name="year" inputMode="numeric" placeholder="2026" />
        </Field>
        <Field label="Round" className="lg:col-span-2">
          <Input name="round" inputMode="numeric" placeholder="1" />
        </Field>
        <Field label="State" className="lg:col-span-2">
          <Input name="state" placeholder="Optional" />
        </Field>
        <Field label="Branch" className="lg:col-span-3">
          <Input name="branch" placeholder="Computer" />
        </Field>
        <div className="flex flex-wrap items-end gap-2 lg:col-span-12">
          <Button type="submit" disabled={loading}>{loading ? "Checking..." : "Predict"}</Button>
          <button
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-bold text-[var(--foreground)] hover:bg-[#f7f1e8]"
            type="button"
            onClick={() => {
              setActiveFilters([]);
              setGrouped(null);
              setError(null);
              setInstituteType("All");
              setSeatType("All");
            }}
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        {activeFilters.length ? (
          <>
            <span className="text-sm font-bold">Active filters</span>
            {activeFilters.map(([key, value]) => (
              <span key={key} className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)]">
                {key}: {value}
              </span>
            ))}
          </>
        ) : (
          <p className="text-sm font-medium text-[var(--muted)]">Enter a rank to classify matching rows.</p>
        )}
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div>}
      {grouped && (
        <div className="grid gap-4 lg:grid-cols-2">
          {(["Safe", "Moderate", "Risky", "Very Risky"] as const).map((bucket) => (
            <section key={bucket} className="surface rounded-xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <RankBadge bucket={bucket} />
                <span className="text-sm text-[var(--muted)]">{grouped[bucket]?.length ?? 0} matches</span>
              </div>
              <div className="space-y-3">
                {(grouped[bucket] ?? []).slice(0, 20).map((row) => (
                  <div key={row.id} className="border-t border-[var(--border)] pt-3 text-sm">
                    <p className="font-bold">{row.institute_name_raw}</p>
                    <p className="text-[var(--muted)]">{row.program_name_raw}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">Closing {row.closing_rank_raw} · {row.year} R{row.round} · {row.quota} · {row.seat_type} · {row.gender}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <p className="text-sm font-medium text-[var(--muted)]">Prediction buckets are only a historical-data comparison and do not guarantee admission.</p>
    </div>
  );
}
