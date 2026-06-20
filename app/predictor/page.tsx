"use client";

import { BarChart3, Check, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { RankBadge } from "@/components/rank-badge";
import type { CutoffMeta } from "@/components/search/types";
import { Button } from "@/components/ui/button";
import { Field, OptionList } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BRANCH_GROUPS, GENDER_OPTIONS, INDIA_STATE_OPTIONS, INSTITUTE_TYPE_OPTIONS, SEAT_TYPE_OPTIONS, usesCategoryRank } from "@/lib/constants";

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
  selectAllValues,
  showCounts = true
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
  showCounts?: boolean;
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
        className="focus-ring flex min-h-11 w-full items-center justify-between rounded-lg border border-[var(--border)] bg-white px-3 text-left text-sm font-bold shadow-sm shadow-black/[0.02] transition hover:border-emerald-800/25 hover:bg-emerald-50/30"
      >
        <span className="truncate">{label}</span>
        <span className="text-xs font-black text-[var(--muted)]" aria-hidden>{open ? "^" : "v"}</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-2 w-full min-w-[20rem] rounded-xl border border-emerald-900/10 bg-white p-3 shadow-2xl shadow-emerald-950/15">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} className="h-10 text-sm" />
          <div className="mt-3 max-h-72 overflow-auto pr-1">
            {filtered.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggle(option.value)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold leading-5 text-[var(--foreground)] hover:bg-emerald-50"
                >
                  <span className={`grid size-4 shrink-0 place-items-center rounded border ${checked ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white"}`}>
                    {checked ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {showCounts && option.count !== undefined ? <span className="block text-[0.68rem] font-semibold text-[var(--muted)]">{option.count.toLocaleString("en-IN")} rows</span> : null}
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
  const [preferenceOptionsLoading, setPreferenceOptionsLoading] = useState(false);
  const [grouped, setGrouped] = useState<Record<string, Result[]> | null>(null);
  const [groupedByYear, setGroupedByYear] = useState<Record<string, Record<string, Result[]>>>({});
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [expandedBuckets, setExpandedBuckets] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRank, setSubmittedRank] = useState<string | null>(null);
  const [predictionMeta, setPredictionMeta] = useState<{ history_years?: number[]; latest_round_by_year?: Record<string, number> } | null>(null);

  const typeOptions = useMemo(
    () =>
      examType === "JEE Advanced"
        ? INSTITUTE_TYPE_OPTIONS.filter((option) => option.value === "IIT")
        : INSTITUTE_TYPE_OPTIONS.filter((option) => ["All", "NIT", "IIIT", "GFTI"].includes(option.value)),
    [examType]
  );
  const homeStateEnabled = examType === "JEE Main" && (instituteType === "NIT" || instituteType === "All");
  const activeGrouped = selectedYear ? groupedByYear[selectedYear] : null;
  const activeResultCount = buckets.reduce((total, bucket) => total + (activeGrouped?.[bucket]?.length ?? 0), 0);
  const selectedLatestRound = selectedYear ? predictionMeta?.latest_round_by_year?.[selectedYear] : undefined;
  const branchOptions = useMemo(
    () => BRANCH_GROUPS.map((branch) => ({ value: branch.value, label: branch.label })),
    []
  );

  async function loadPreferenceOptions() {
    if (preferenceOptionsLoading || collegeOptions.length) return;
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
      setPredictionMeta({ history_years: body.history_years, latest_round_by_year: body.latest_round_by_year });
    } catch {
      setError("Prediction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f3ec]">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-2xl border border-emerald-950/10 bg-white shadow-xl shadow-emerald-950/[0.06]">
          <div className="border-b border-emerald-950/10 bg-[linear-gradient(135deg,#ffffff_0%,#fbfaf7_55%,#e4f4ee_100%)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="eyebrow">College predictor</p>
                <h1 className="mt-2 text-3xl font-black tracking-normal text-[#001d19] sm:text-4xl">Find colleges by rank</h1>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--muted)]">
                  JEE Main rank is used for NIT, IIIT and GFTI. JEE Advanced rank is used for IIT and IISc.
                </p>
              </div>
              <div className="lg:w-[15rem]">
                <div className="rounded-xl border border-emerald-900/10 bg-white/85 p-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[var(--primary)]" />
                    <p className="text-sm font-black">No admission guarantee</p>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Based on imported OR-CR data.</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-[var(--primary)]">
                  <SlidersHorizontal size={18} />
                </span>
                <div>
                  <p className="text-base font-black">Prediction inputs</p>
                  <p className="text-xs font-semibold text-[var(--muted)]">Choose exam, rank list, colleges and branch families.</p>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="min-h-10 w-full sm:w-auto sm:min-w-48">
                <Search size={17} />
                {loading ? "Checking..." : "Predict"}
              </Button>
            </div>

            <div className="grid gap-4 xl:grid-cols-12">
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
                <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Institute type</span>
                <div className="flex min-h-11 overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-sm shadow-black/[0.02]">
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
                  loading={false}
                  onOpen={() => undefined}
                  placeholder="All branch families"
                  searchPlaceholder="Search branch family"
                  loadingLabel=""
                  selectAllLabel="Select all branch families"
                  selectAllValues={BRANCH_GROUPS.map((branch) => branch.value)}
                  showCounts={false}
                />
              </Field>
            </div>
          </form>
        </section>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div> : null}

        {grouped ? (
          <section className="overflow-hidden rounded-2xl border border-emerald-950/10 bg-white shadow-xl shadow-emerald-950/[0.05]">
            <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-[var(--primary)]">
                  <BarChart3 size={19} />
                </span>
                <div>
                  <h2 className="text-lg font-black">Prediction for rank {submittedRank}</h2>
                  <p className="text-xs font-semibold text-[var(--muted)]">Based on selected exam, category, gender and preferences.</p>
                </div>
              </div>
              {predictionMeta?.history_years?.length ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[#fbfaf7] p-2">
                  <span className="px-2 text-xs font-black uppercase tracking-wide text-[var(--muted)]">Cutoff year</span>
                  {predictionMeta.history_years.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setSelectedYear(String(year))}
                      className={`focus-ring min-h-9 rounded-lg border px-3 text-sm font-black ${selectedYear === String(year) ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white hover:bg-emerald-50"}`}
                    >
                      {year}
                      {predictionMeta.latest_round_by_year?.[year] ? <span className="ml-1 text-xs opacity-80">R{predictionMeta.latest_round_by_year[year]}</span> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {selectedYear && activeResultCount === 0 ? (
              <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
                No imported choices match these filters for {selectedYear}{selectedLatestRound ? ` Round ${selectedLatestRound}` : ""}. Try clearing state/college filters, or import the missing archive rows for that year.
              </div>
            ) : null}

            <div className="grid gap-4 p-4 lg:grid-cols-3">
              {buckets.map((bucket) => {
                const rows = activeGrouped?.[bucket] ?? [];
                const expanded = expandedBuckets[bucket];
                const visibleRows = expanded ? rows : rows.slice(0, 12);
                return (
                  <section key={bucket} className="rounded-xl border border-[var(--border)] bg-[#fbfaf7] p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <RankBadge bucket={bucket} />
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-[var(--muted)]">{rows.length} matches</span>
                    </div>
                    <div className="grid gap-2">
                      {visibleRows.map((row) => (
                        <div key={row.id} className="rounded-lg border border-[var(--border)] bg-white p-3 text-sm shadow-sm shadow-black/[0.02]">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-black leading-5">{row.institute_name_raw}</p>
                            <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-[var(--primary)]">{row.closing_rank_raw}</span>
                          </div>
                          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">{row.program_name_raw}</p>
                          <p className="mt-2 text-[0.7rem] font-black uppercase tracking-wide text-[var(--muted)]">{row.year} R{row.round} · {row.seat_type} · {row.gender}</p>
                        </div>
                      ))}
                      {!rows.length ? (
                        <p className="rounded-lg border border-dashed border-[var(--border)] bg-white px-3 py-5 text-center text-sm font-semibold text-[var(--muted)]">No {bucket.toLowerCase()} choices for this year and filter set.</p>
                      ) : null}
                    </div>
                    {rows.length > 12 ? (
                      <button
                        type="button"
                        onClick={() => setExpandedBuckets((current) => ({ ...current, [bucket]: !current[bucket] }))}
                        className="focus-ring mt-3 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-black text-[var(--primary)] hover:bg-emerald-50"
                      >
                        {expanded ? "Show fewer choices" : `View all ${rows.length} choices`}
                      </button>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-emerald-950/15 bg-white/70 px-5 py-6 text-center">
            <p className="text-sm font-black text-[var(--foreground)]">Enter rank details and press Predict.</p>
          </section>
        )}
      </div>
    </div>
  );
}
