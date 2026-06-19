"use client";

import { BarChart3, Check, Search, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { RankBadge } from "@/components/rank-badge";
import type { CutoffMeta } from "@/components/search/types";
import { Button } from "@/components/ui/button";
import { Field, OptionList } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BRANCH_GROUP_PREFIX, BRANCH_GROUPS, GENDER_OPTIONS, INDIA_STATE_OPTIONS, INSTITUTE_TYPE_OPTIONS, SEAT_TYPE_OPTIONS, usesCategoryRank } from "@/lib/constants";

type Result = {
  id: string;
  institute_name_raw: string;
  program_name_raw: string;
  year: number;
  round: number;
  closing_rank_raw: string;
  closing_rank_num: number;
  quota: string;
  seat_type: string;
  gender: string;
};

const buckets = ["Safe", "Moderate", "Risky"] as const;

function PreferenceFlyout({
  selected,
  onChange,
  options,
  loading,
  onOpen,
  placeholder,
  searchPlaceholder,
  loadingLabel,
  selectAllLabel,
  selectAllValues
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  options: Array<{ value: string; label: string; count?: number }>;
  loading: boolean;
  onOpen: () => void;
  placeholder: string;
  searchPlaceholder: string;
  loadingLabel: string;
  selectAllLabel?: string;
  selectAllValues?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()) || option.value.toLowerCase().includes(query.toLowerCase()));
  const label = selected.length ? `${selected.length} selected` : placeholder;

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) onOpen();
        }}
        className="focus-ring flex min-h-12 w-full items-center justify-between rounded-lg border border-[var(--border)] bg-white px-4 text-left text-sm font-semibold"
      >
        <span>{label}</span>
        <span className="text-xs font-black text-[var(--muted)]" aria-hidden>{open ? "^" : "v"}</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-2 w-full min-w-[20rem] rounded-xl border border-[var(--border)] bg-white p-3 shadow-2xl shadow-emerald-950/15">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} className="h-10 text-sm" />
          <div className="mt-3 max-h-64 overflow-auto pr-1">
            {filtered.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggle(option.value)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold leading-5 text-[var(--foreground)] hover:bg-emerald-50"
                >
                  <span className={`grid size-4 shrink-0 place-items-center rounded border ${checked ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white"}`}>
                    {checked ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.count !== undefined ? <span className="block text-[0.68rem] font-semibold text-[var(--muted)]">{option.count.toLocaleString("en-IN")} rows</span> : null}
                  </span>
                </button>
              );
            })}
            {loading ? <p className="px-2 py-3 text-xs font-bold text-[var(--muted)]">{loadingLabel}</p> : null}
          </div>
          <div className="mt-3 flex justify-between border-t border-[var(--border)] pt-3">
            {selectAllValues?.length ? (
              <button type="button" onClick={() => onChange(selectAllValues)} className="text-xs font-black text-[var(--primary)]">{selectAllLabel ?? "Select all"}</button>
            ) : <span />}
            <button type="button" onClick={() => onChange([])} className="text-xs font-black text-[var(--muted)]">Clear</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function PredictorPage() {
  const [examType, setExamType] = useState("JEE Main");
  const [seatType, setSeatType] = useState("OPEN");
  const [instituteType, setInstituteType] = useState("All");
  const [homeState, setHomeState] = useState("");
  const [colleges, setColleges] = useState<string[]>([]);
  const [collegeOptions, setCollegeOptions] = useState<Array<{ value: string; label: string; count?: number }>>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [exactBranchOptions, setExactBranchOptions] = useState<Array<{ value: string; label: string; count?: number }>>([]);
  const [preferenceOptionsLoading, setPreferenceOptionsLoading] = useState(false);
  const [grouped, setGrouped] = useState<Record<string, Result[]> | null>(null);
  const [groupedByYear, setGroupedByYear] = useState<Record<string, Record<string, Result[]>>>({});
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [expandedBuckets, setExpandedBuckets] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRank, setSubmittedRank] = useState<string | null>(null);
  const [predictionMeta, setPredictionMeta] = useState<{ history_years?: number[] } | null>(null);

  const typeOptions = useMemo(
    () =>
      examType === "JEE Advanced"
        ? INSTITUTE_TYPE_OPTIONS.filter((option) => option.value === "IIT")
        : INSTITUTE_TYPE_OPTIONS.filter((option) => ["All", "NIT", "IIIT", "GFTI"].includes(option.value)),
    [examType]
  );
  const homeStateEnabled = examType === "JEE Main" && (instituteType === "NIT" || instituteType === "All");
  const activeGrouped = selectedYear ? groupedByYear[selectedYear] : null;
  const branchOptions = useMemo(
    () => [
      ...BRANCH_GROUPS.map((branch) => ({ value: branch.value, label: branch.label })),
      ...exactBranchOptions
    ],
    [exactBranchOptions]
  );

  async function loadPreferenceOptions() {
    if (preferenceOptionsLoading || (exactBranchOptions.length && collegeOptions.length)) return;
    setPreferenceOptionsLoading(true);
    try {
      const params = new URLSearchParams({ exam_type: examType, page_size: "1" });
      if (instituteType !== "All") params.set("institute_type", instituteType);
      if (homeStateEnabled && homeState) params.set("state", homeState);
      const response = await fetch(`/api/cutoffs/meta?${params.toString()}`);
      if (response.ok) {
        const body = (await response.json()) as CutoffMeta;
        setCollegeOptions(
          (body.options.institute ?? [])
            .map((option) => ({ value: option.value, label: option.label ?? option.value, count: option.count }))
        );
        setExactBranchOptions(
          (body.options.program ?? [])
            .filter((option) => !option.value.startsWith(BRANCH_GROUP_PREFIX))
            .map((option) => ({ value: option.value, label: option.label ?? option.value, count: option.count }))
        );
      }
    } finally {
      setPreferenceOptionsLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setGrouped(null);
    setExpandedBuckets({});
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      const text = value.toString().trim();
      if (text && text !== "All") params.set(key, text);
    }
    params.set("exam_type", examType);
    if (instituteType !== "All") params.set("institute_type", instituteType);
    if (homeStateEnabled && homeState) params.set("state", homeState);
    if (colleges.length) params.set("institute_values", colleges.join("~"));
    if (branches.length) params.set("branch", branches.join("~"));
    setSubmittedRank(params.get("rank"));

    try {
      const response = await fetch(`/api/predict?${params.toString()}`);
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Prediction failed");
        return;
      }
      setGrouped(body.grouped);
      setGroupedByYear(body.grouped_by_year ?? {});
      setSelectedYear(body.history_years?.[0] ? String(body.history_years[0]) : "");
      setPredictionMeta({ history_years: body.history_years });
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
              Choose the correct exam first. JEE Main rank is used for NIT, IIIT and GFTI. JEE Advanced rank is used for IIT and IISc.
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

      <form onSubmit={submit} className="surface rounded-2xl p-5 shadow-2xl shadow-emerald-950/10 sm:p-7">
        <div className="rounded-xl border border-[var(--border)] bg-white/85 p-5 sm:p-6">
          <div className="grid gap-x-6 gap-y-6 xl:grid-cols-12">
        <Field label="Exam" className="xl:col-span-3">
          <Select
            name="exam_type"
            value={examType}
            onChange={(event) => {
              setExamType(event.target.value);
              setInstituteType(event.target.value === "JEE Advanced" ? "IIT" : "All");
              setHomeState("");
              setColleges([]);
              setCollegeOptions([]);
              setBranches([]);
              setExactBranchOptions([]);
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
          className="xl:col-span-3"
        >
          <Input name="rank" required inputMode="numeric" placeholder="12000" />
        </Field>
        <Field label="Seat type" className="xl:col-span-3">
          <Select name="seat_type" value={seatType} onChange={(event) => setSeatType(event.target.value)}>
            <OptionList options={SEAT_TYPE_OPTIONS} />
          </Select>
        </Field>
        <Field label="Gender" className="xl:col-span-3">
          <Select name="gender" defaultValue="Gender-Neutral">
            <OptionList options={GENDER_OPTIONS} />
          </Select>
        </Field>
        <div className="grid gap-2 xl:col-span-3">
          <span className="text-xs font-black text-[var(--muted)]">Institute type</span>
          <div className="flex min-h-12 overflow-hidden rounded-lg border border-[var(--border)] bg-white">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={examType === "JEE Advanced"}
                onClick={() => {
                  setInstituteType(option.value);
                  if (option.value !== "NIT" && option.value !== "All") setHomeState("");
                  setColleges([]);
                  setCollegeOptions([]);
                  setBranches([]);
                  setExactBranchOptions([]);
                }}
                className={`flex-1 border-r border-[var(--border)] px-3 text-xs font-black last:border-r-0 disabled:cursor-not-allowed ${instituteType === option.value ? "bg-[var(--primary)] text-white" : "hover:bg-emerald-50"}`}
              >
                {option.value}
              </button>
            ))}
          </div>
        </div>
        <Field label="Home State" className="xl:col-span-3">
          <Select
            value={homeState}
            onChange={(event) => {
              setHomeState(event.target.value);
              setColleges([]);
              setCollegeOptions([]);
            }}
            disabled={!homeStateEnabled}
          >
            <option value="">{homeStateEnabled ? "Optional NIT home state" : "Not applicable"}</option>
            {INDIA_STATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </Field>
        <Field label="Preferred college" className="xl:col-span-3">
          <PreferenceFlyout
            selected={colleges}
            onChange={setColleges}
            options={collegeOptions}
            loading={preferenceOptionsLoading}
            onOpen={loadPreferenceOptions}
            placeholder="All preferred colleges"
            searchPlaceholder="Search college"
            loadingLabel="Loading imported colleges..."
          />
        </Field>
        <Field label="Preferred branch" className="xl:col-span-3">
          <PreferenceFlyout
            selected={branches}
            onChange={setBranches}
            options={branchOptions}
            loading={preferenceOptionsLoading}
            onOpen={loadPreferenceOptions}
            placeholder="All preferred branches"
            searchPlaceholder="Search branch"
            loadingLabel="Loading exact imported branches..."
            selectAllLabel="Select all branch groups"
            selectAllValues={BRANCH_GROUPS.map((branch) => branch.value)}
          />
        </Field>
        <div className="flex items-end xl:col-span-12">
          <Button type="submit" disabled={loading} className="w-full">
            <Search size={18} />
            {loading ? "Checking..." : "Predict"}
          </Button>
        </div>
          </div>
        </div>
      </form>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div> : null}

      {grouped ? (
        <section className="grid gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-[var(--primary)]" />
            <h2 className="text-xl font-black">Prediction for rank {submittedRank}</h2>
          </div>
          {predictionMeta?.history_years?.length ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-white p-2">
              <span className="px-2 text-xs font-black uppercase tracking-wide text-[var(--muted)]">Cutoff year</span>
              {predictionMeta.history_years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(String(year))}
                  className={`focus-ring min-h-10 rounded-lg border px-4 text-sm font-black ${selectedYear === String(year) ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white hover:bg-emerald-50"}`}
                >
                  {year}
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            {buckets.map((bucket) => {
              const rows = activeGrouped?.[bucket] ?? [];
              const expanded = expandedBuckets[bucket];
              const visibleRows = expanded ? rows : rows.slice(0, 14);
              return (
                <section key={bucket} className="surface rounded-2xl p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <RankBadge bucket={bucket} />
                    <span className="text-sm font-bold text-[var(--muted)]">{rows.length} matches</span>
                  </div>
                  <div className="grid gap-3">
                    {visibleRows.map((row) => (
                      <div key={row.id} className="rounded-xl border border-[var(--border)] bg-white p-3 text-sm">
                        <p className="font-black">{row.institute_name_raw}</p>
                        <p className="mt-1 text-xs font-medium text-[var(--muted)]">{row.program_name_raw}</p>
                        <p className="mt-2 text-xs font-semibold text-[var(--muted)]">Closing {row.closing_rank_raw} · {row.year} R{row.round} · {row.seat_type} · {row.gender}</p>
                      </div>
                    ))}
                    {!rows.length ? (
                      <p className="rounded-xl border border-dashed border-[var(--border)] bg-white p-4 text-sm font-semibold text-[var(--muted)]">No {bucket.toLowerCase()} choices for this year and filter set.</p>
                    ) : null}
                  </div>
                  {rows.length > 14 ? (
                    <button
                      type="button"
                      onClick={() => setExpandedBuckets((current) => ({ ...current, [bucket]: !current[bucket] }))}
                      className="focus-ring mt-4 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-black text-[var(--primary)] hover:bg-emerald-50"
                    >
                      {expanded ? "Show fewer choices" : `View all ${rows.length} choices`}
                    </button>
                  ) : null}
                </section>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
