"use client";

import { BarChart3, Search, ShieldCheck } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { RankBadge } from "@/components/rank-badge";
import { Button } from "@/components/ui/button";
import { Field, OptionList } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { GENDER_OPTIONS, INSTITUTE_TYPE_OPTIONS, SEAT_TYPE_OPTIONS, usesCategoryRank } from "@/lib/constants";

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

const buckets = ["Safe", "Moderate", "Reach"] as const;

export default function PredictorPage() {
  const [examType, setExamType] = useState("JEE Main");
  const [seatType, setSeatType] = useState("OPEN");
  const [instituteType, setInstituteType] = useState("All");
  const [grouped, setGrouped] = useState<Record<string, Result[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRank, setSubmittedRank] = useState<string | null>(null);
  const [predictionMeta, setPredictionMeta] = useState<{ prediction_year?: number; history_years?: number[] } | null>(null);

  const typeOptions = useMemo(
    () =>
      examType === "JEE Advanced"
        ? INSTITUTE_TYPE_OPTIONS.filter((option) => ["All", "IIT", "IISc"].includes(option.value))
        : INSTITUTE_TYPE_OPTIONS.filter((option) => ["All", "NIT", "IIIT", "GFTI"].includes(option.value)),
    [examType]
  );

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
    params.set("exam_type", examType);
    if (instituteType !== "All") params.set("institute_type", instituteType);
    setSubmittedRank(params.get("rank"));

    try {
      const response = await fetch(`/api/predict?${params.toString()}`);
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Prediction failed");
        return;
      }
      setGrouped(body.grouped);
      setPredictionMeta({ prediction_year: body.prediction_year, history_years: body.history_years });
    } catch {
      setError("Prediction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell grid gap-6">
      <section className="surface overflow-hidden rounded-2xl">
        <div className="grid gap-6 bg-gradient-to-br from-white via-[#fbfaf7] to-[#e7f5f1] p-6 lg:grid-cols-[1fr_360px] lg:p-8">
          <div>
            <p className="eyebrow">College predictor</p>
            <h1 className="mt-3 text-4xl font-black tracking-normal text-[#001d19] sm:text-5xl">Find colleges by rank</h1>
            <p className="mt-4 max-w-2xl text-lg font-medium leading-8 text-[var(--muted)]">
              Choose the correct exam first. JEE Main rank is used for NIT, IIIT and GFTI. JEE Advanced rank is used for IIT and IISc. Predictions use the latest five relevant historical years.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-900/10 bg-white/80 p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-[var(--primary)] text-white"><ShieldCheck size={20} /></span>
              <p className="text-sm font-bold text-[var(--foreground)]">
                Based on imported cutoff data only.<br />
                <span className="font-medium text-[var(--muted)]">No admission guarantee is made.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="surface grid gap-x-6 gap-y-6 rounded-2xl p-6 sm:p-7 xl:grid-cols-12">
        <Field label="Exam" className="xl:col-span-4">
          <Select
            name="exam_type"
            value={examType}
            onChange={(event) => {
              setExamType(event.target.value);
              setInstituteType("All");
            }}
            required
          >
            <option value="JEE Main">JEE Main</option>
            <option value="JEE Advanced">JEE Advanced</option>
          </Select>
        </Field>
        <Field
          label={usesCategoryRank(seatType) ? "Category rank" : "OPEN / CRL rank"}
          flyoutHint={usesCategoryRank(seatType)
            ? "For GEN-EWS, OBC-NCL, SC, ST or PwD seat types, use your category rank from the scorecard."
            : "For OPEN seat type, use your OPEN / CRL rank. This keeps comparisons aligned with the cutoff list."
          }
          className="xl:col-span-4"
        >
          <Input name="rank" required inputMode="numeric" placeholder="12000" />
        </Field>
        <Field label="Seat type" className="xl:col-span-4">
          <Select name="seat_type" value={seatType} onChange={(event) => setSeatType(event.target.value)}>
            <OptionList options={SEAT_TYPE_OPTIONS} />
          </Select>
        </Field>
        <Field label="Gender" className="xl:col-span-3">
          <Select name="gender" defaultValue="Gender-Neutral">
            <OptionList options={GENDER_OPTIONS} />
          </Select>
        </Field>
        <Field label="Institute type" className="xl:col-span-3">
          <Select value={instituteType} onChange={(event) => setInstituteType(event.target.value)}>
            {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </Field>
        <Field label="Target year" flyoutHint="Example: target year 2027 uses the 2022-2026 cutoff window." className="xl:col-span-2">
          <Input name="year" inputMode="numeric" placeholder="2027" />
        </Field>
        <Field label="Round" className="xl:col-span-2">
          <Input name="round" inputMode="numeric" placeholder="1" />
        </Field>
        <Field label="Preferred branch" className="xl:col-span-2">
          <Input name="branch" placeholder="Computer, AI, Mechanical" />
        </Field>
        <div className="flex items-end xl:col-span-12">
          <Button type="submit" disabled={loading} className="w-full">
            <Search size={18} />
            {loading ? "Checking..." : "Predict"}
          </Button>
        </div>
      </form>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div> : null}

      {grouped ? (
        <section className="grid gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-[var(--primary)]" />
            <h2 className="text-xl font-black">Prediction for rank {submittedRank}</h2>
          </div>
          {predictionMeta ? (
            <p className="text-sm font-semibold text-[var(--muted)]">
              Target year {predictionMeta.prediction_year}; using historical years {(predictionMeta.history_years ?? []).join(", ") || "not yet available"}.
            </p>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-3">
            {buckets.map((bucket) => (
              <section key={bucket} className="surface rounded-2xl p-4">
                <div className="mb-3 flex items-center justify-between">
                  <RankBadge bucket={bucket} />
                  <span className="text-sm font-bold text-[var(--muted)]">{grouped[bucket]?.length ?? 0} matches</span>
                </div>
                <div className="grid gap-3">
                  {(grouped[bucket] ?? []).slice(0, 14).map((row) => (
                    <div key={row.id} className="rounded-xl border border-[var(--border)] bg-white p-3 text-sm">
                      <p className="font-black">{row.institute_name_raw}</p>
                      <p className="mt-1 text-xs font-medium text-[var(--muted)]">{row.program_name_raw}</p>
                      <p className="mt-2 text-xs font-semibold text-[var(--muted)]">Closing {row.closing_rank_raw} · {row.year} R{row.round} · {row.seat_type} · {row.gender}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
