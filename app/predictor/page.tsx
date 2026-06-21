"use client";

import { Check, ChevronDown, GraduationCap, Loader2, Search, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChoiceCard } from "@/components/predictor/choice-card";
import { ChoiceDetailDrawer } from "@/components/predictor/choice-detail-drawer";
import type { PredictResponse, PredictionBucket, PredictionRow } from "@/components/predictor/types";
import { Button } from "@/components/ui/button";
import { Field, OptionList } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BRANCH_GROUPS, GENDER_OPTIONS, INDIA_STATE_OPTIONS, INSTITUTE_TYPE_OPTIONS, SEAT_TYPE_OPTIONS, usesCategoryRank } from "@/lib/constants";

const buckets: PredictionBucket[] = ["Safe", "Moderate", "Risky"];

function OptionFlyout({
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
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) onOpen();
        }}
        className="focus-ring flex min-h-12 w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[#fffdf9] px-4 text-left text-sm font-black shadow-sm shadow-black/[0.02] transition hover:border-emerald-800/25 hover:bg-emerald-50/30"
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={16} className={`shrink-0 text-[var(--muted)] transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-2 w-full min-w-full rounded-2xl border border-emerald-900/10 bg-white p-3 shadow-2xl shadow-emerald-950/15 sm:min-w-[21rem]">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} className="h-10 text-sm" />
          <div className="mt-3 max-h-72 overflow-auto pr-1">
            {filtered.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggle(option.value)}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left text-xs font-bold leading-5 text-[var(--foreground)] hover:bg-emerald-50"
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
            {!loading && !filtered.length ? <p className="px-2 py-3 text-xs font-bold text-[var(--muted)]">No matching options.</p> : null}
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

function instituteTypeLabel(value: string) {
  return INSTITUTE_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export default function PredictorPage() {
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [examType, setExamType] = useState("JEE Main");
  const [rank, setRank] = useState("");
  const [seatType, setSeatType] = useState("OPEN");
  const [gender, setGender] = useState("Gender-Neutral");
  const [instituteType, setInstituteType] = useState("All");
  const [homeState, setHomeState] = useState("");
  const [colleges, setColleges] = useState<string[]>([]);
  const [collegeOptions, setCollegeOptions] = useState<Array<{ value: string; label: string; count?: number }>>([]);
  const [collegeOptionsKey, setCollegeOptionsKey] = useState("");
  const [collegeOptionsLoading, setCollegeOptionsLoading] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [activePreviewBucket, setActivePreviewBucket] = useState<PredictionBucket>("Safe");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<PredictionRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/predict/meta")
      .then((response) => response.json())
      .then((body) => {
        if (!active) return;
        const years = body.years ?? [];
        setAvailableYears(years);
        setSelectedYear(years[0] ?? "");
      })
      .catch(() => setError("Could not load imported cutoff years."))
      .finally(() => {
        if (active) setMetaLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const typeOptions = useMemo(
    () =>
      examType === "JEE Advanced"
        ? INSTITUTE_TYPE_OPTIONS.filter((option) => option.value === "IIT")
        : INSTITUTE_TYPE_OPTIONS.filter((option) => ["All", "NIT", "IIIT", "GFTI"].includes(option.value)),
    [examType]
  );
  const homeStateEnabled = examType === "JEE Main" && (instituteType === "NIT" || instituteType === "All");
  const branchOptions = useMemo(() => BRANCH_GROUPS.map((branch) => ({ value: branch.value, label: branch.label })), []);
  const activeQuery = buildQueryString();

  function buildQueryString(extra?: Record<string, string>) {
    const params = new URLSearchParams();
    if (rank.trim()) params.set("rank", rank.trim());
    params.set("exam_type", examType);
    if (selectedYear) params.set("year", String(selectedYear));
    if (seatType && seatType !== "All") params.set("seat_type", seatType);
    if (gender && gender !== "All") params.set("gender", gender);
    if (instituteType !== "All") params.set("institute_type", instituteType);
    if (homeStateEnabled && homeState) params.set("state", homeState);
    if (colleges.length) params.set("institute_values", colleges.join("~"));
    if (branches.length) params.set("branch", branches.join("~"));
    for (const [key, value] of Object.entries(extra ?? {})) params.set(key, value);
    return params.toString();
  }

  async function loadCollegeOptions() {
    if (!selectedYear) return;
    const key = [selectedYear, examType, instituteType].join("|");
    if (collegeOptionsKey === key && collegeOptions.length) return;
    setCollegeOptionsLoading(true);
    try {
      const params = new URLSearchParams({ year: String(selectedYear), exam_type: examType });
      if (instituteType !== "All") params.set("institute_type", instituteType);
      const response = await fetch(`/api/predict/options?${params.toString()}`);
      if (response.ok) {
        const body = await response.json();
        setCollegeOptions(body.options?.institute ?? []);
        setCollegeOptionsKey(key);
      }
    } finally {
      setCollegeOptionsLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rank.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const query = buildQueryString({ page_size: "5" });
    setSubmittedQuery(buildQueryString());

    try {
      const response = await fetch(`/api/predict?${query}`);
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Prediction failed");
        return;
      }
      const nextResult = body as PredictResponse;
      setResult(nextResult);
      setActivePreviewBucket(buckets.find((bucket) => (nextResult.counts[bucket] ?? 0) > 0) ?? "Safe");
    } catch {
      setError("Prediction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f3ec]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[1.4rem] border border-emerald-950/10 bg-white shadow-xl shadow-emerald-950/[0.06]">
          <div className="grid gap-6 border-b border-emerald-950/10 bg-[linear-gradient(135deg,#ffffff_0%,#fbfaf7_50%,#e1f4ee_100%)] px-5 py-6 lg:grid-cols-[1fr_22rem] lg:items-center lg:px-7">
            <div>
              <p className="eyebrow">College predictor</p>
              <h1 className="mt-2 text-4xl font-black tracking-normal text-[#001d19] sm:text-5xl">Find colleges by rank</h1>
              <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-[var(--muted)]">
                Search like a rank engine: choose the cutoff year, enter your rank, then narrow by exam, category, institute type, college, and branch.
              </p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-2xl border border-emerald-900/10 bg-white/90 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={17} className="text-[var(--primary)]" />
                  <p className="text-sm font-black">No admission guarantee</p>
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">Predictions are based on imported JoSAA OR-CR cutoffs.</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-950">
                {usesCategoryRank(seatType) ? "Use your category rank for the selected seat type." : "Use your OPEN / CRL rank for OPEN choices."}
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="grid gap-5 p-5 lg:p-7">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex-1">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--muted)]">{usesCategoryRank(seatType) ? "Category rank" : "OPEN / CRL rank"}</span>
                <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[#fffdf9] px-4 shadow-inner shadow-black/[0.02]">
                  <Search size={22} className="shrink-0 text-[var(--primary)]" />
                  <input
                    value={rank}
                    onChange={(event) => setRank(event.target.value)}
                    inputMode="numeric"
                    required
                    placeholder="Enter rank, e.g. 12000"
                    className="h-14 min-w-0 flex-1 bg-transparent text-2xl font-black text-[#001d19] outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading || metaLoading || !selectedYear} className="min-h-16 rounded-2xl px-8 text-base">
                {loading ? <Loader2 size={19} className="animate-spin" /> : <Sparkles size={19} />}
                {loading ? "Searching..." : "Predict"}
              </Button>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[#fbfaf7] p-3">
              <div className="mb-3 flex items-center gap-2 px-1">
                <GraduationCap size={16} className="text-[var(--primary)]" />
                <p className="text-sm font-black">Cutoff year</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setSelectedYear(year);
                      setColleges([]);
                      setCollegeOptions([]);
                    }}
                    className={`focus-ring min-h-11 rounded-xl border px-4 text-sm font-black ${selectedYear === year ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white hover:bg-emerald-50"}`}
                  >
                    {year}
                  </button>
                ))}
                {metaLoading ? <span className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-bold text-[var(--muted)]"><Loader2 size={15} className="animate-spin" /> Loading years</span> : null}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-12">
              <Field label="Exam" className="lg:col-span-3">
                <Select
                  value={examType}
                  onChange={(event) => {
                    const next = event.target.value;
                    setExamType(next);
                    setInstituteType(next === "JEE Advanced" ? "IIT" : "All");
                    setHomeState("");
                    setColleges([]);
                    setCollegeOptions([]);
                  }}
                >
                  <option value="JEE Main">JEE Main</option>
                  <option value="JEE Advanced">JEE Advanced</option>
                </Select>
              </Field>
              <Field label="Seat type" className="lg:col-span-3">
                <Select value={seatType} onChange={(event) => setSeatType(event.target.value)}>
                  <OptionList options={SEAT_TYPE_OPTIONS} />
                </Select>
              </Field>
              <Field label="Gender" className="lg:col-span-3">
                <Select value={gender} onChange={(event) => setGender(event.target.value)}>
                  <OptionList options={GENDER_OPTIONS} />
                </Select>
              </Field>
              <Field label="Home state" className="lg:col-span-3">
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

              <div className="grid gap-2 lg:col-span-12">
                <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Institute type</span>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
                      }}
                      className={`focus-ring min-h-14 rounded-2xl border px-4 text-left text-sm font-black transition disabled:cursor-not-allowed ${instituteType === option.value ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white hover:bg-emerald-50"}`}
                    >
                      {option.value === "All" ? "All eligible institutes" : instituteTypeLabel(option.value)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 lg:col-span-6">
                <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Preferred college</span>
                <OptionFlyout
                  selected={colleges}
                  onChange={setColleges}
                  options={collegeOptions}
                  loading={collegeOptionsLoading}
                  onOpen={loadCollegeOptions}
                  placeholder="All matching colleges"
                  searchPlaceholder="Search colleges"
                  loadingLabel="Loading colleges..."
                />
              </div>
              <div className="grid gap-2 lg:col-span-6">
                <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Preferred branch</span>
                <OptionFlyout
                  selected={branches}
                  onChange={setBranches}
                  options={branchOptions}
                  loading={false}
                  onOpen={() => undefined}
                  placeholder="All branch families"
                  searchPlaceholder="Search branch families"
                  loadingLabel=""
                  selectAllLabel="Select all branch families"
                  selectAllValues={BRANCH_GROUPS.map((branch) => branch.value)}
                  showCounts={false}
                />
              </div>
            </div>
          </form>
        </section>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div> : null}

        {result ? (
          <section className="overflow-hidden rounded-[1.4rem] border border-emerald-950/10 bg-white shadow-xl shadow-emerald-950/[0.05]">
            <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-[var(--primary)]">
                  <SlidersHorizontal size={18} />
                </span>
                <div>
                  <h2 className="text-lg font-black">Prediction preview for rank {rank}</h2>
                  <p className="text-xs font-semibold text-[var(--muted)]">Using {result.cutoff_year} cutoff data. Open full results for sorting and pagination.</p>
                </div>
              </div>
              <a href={`/predictor/results?${submittedQuery || activeQuery}`} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-black text-white hover:bg-[var(--primary-dark)]">
                Open full results
              </a>
            </div>
            <div className="grid gap-4 p-4">
              <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[#fbfaf7]">
                {buckets.map((bucket) => (
                  <button
                    key={bucket}
                    type="button"
                    onClick={() => setActivePreviewBucket(bucket)}
                    className={`focus-ring min-h-12 border-r border-[var(--border)] px-3 text-sm font-black last:border-r-0 ${activePreviewBucket === bucket ? "bg-[var(--primary)] text-white" : "hover:bg-emerald-50"}`}
                  >
                    {bucket}
                    <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-xs text-[var(--foreground)]">{(result.counts[bucket] ?? 0).toLocaleString("en-IN")}</span>
                  </button>
                ))}
              </div>

              <section className="rounded-2xl border border-[var(--border)] bg-[#fbfaf7] p-3">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black">{activePreviewBucket} choices</p>
                    <p className="text-xs font-semibold text-[var(--muted)]">Opening and closing ranks are both taken from the latest available round for the selected cutoff year.</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[var(--muted)]">{(result.counts[activePreviewBucket] ?? 0).toLocaleString("en-IN")} matches</span>
                </div>
                <div className="grid gap-2">
                  {(result.grouped[activePreviewBucket] ?? []).map((row) => (
                    <ChoiceCard key={row.id} row={row} bucket={activePreviewBucket} onOpen={setSelectedChoice} compact />
                  ))}
                  {!(result.grouped[activePreviewBucket] ?? []).length ? (
                    <p className="rounded-xl border border-dashed border-[var(--border)] bg-white px-4 py-6 text-center text-sm font-semibold text-[var(--muted)]">
                      No {activePreviewBucket.toLowerCase()} choices for this filter set.
                    </p>
                  ) : null}
                </div>
                {(result.counts[activePreviewBucket] ?? 0) > (result.grouped[activePreviewBucket]?.length ?? 0) ? (
                  <a href={`/predictor/results?${submittedQuery || activeQuery}&bucket=${activePreviewBucket}`} className="focus-ring mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-black text-[var(--primary)] hover:bg-emerald-50">
                    View all {activePreviewBucket.toLowerCase()} choices
                  </a>
                ) : null}
              </section>
            </div>
          </section>
        ) : (
          <section className="rounded-[1.4rem] border border-dashed border-emerald-950/15 bg-white/75 px-5 py-8 text-center">
            <p className="text-sm font-black text-[var(--foreground)]">Enter a rank and press Predict to see a fast preview.</p>
          </section>
        )}
      </div>
      <ChoiceDetailDrawer row={selectedChoice} onClose={() => setSelectedChoice(null)} />
    </div>
  );
}
