"use client";

import { Check, ExternalLink, RotateCcw, Search, X } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { RoundTrendModal } from "@/components/search/round-trend-modal";
import type { CutoffMeta, CutoffResponse, SearchFilters } from "@/components/search/types";
import { Button } from "@/components/ui/button";
import type { CutoffRow } from "@/lib/cutoff-query";
import { EXAM_TYPE_OPTIONS, GENDER_OPTIONS, INDIA_STATE_OPTIONS, INSTITUTE_TYPE_OPTIONS, quotaOptionsForInstituteType, SEAT_TYPE_OPTIONS } from "@/lib/constants";

const arrayKeys = ["institute_type", "institute_values", "program_values", "quota", "seat_type", "gender"] as const;

function splitParam(value: string | null) {
  return value ? value.split("~").filter(Boolean) : [];
}

function filtersFromParams(params: URLSearchParams): SearchFilters {
  return {
    exam_type: params.get("exam_type") ?? "JEE Main",
    year: params.get("year") ?? undefined,
    round: params.get("round") ?? undefined,
    institute_type: splitParam(params.get("institute_type")),
    institute_values: splitParam(params.get("institute_values")),
    program_values: splitParam(params.get("program_values")),
    quota: splitParam(params.get("quota")),
    seat_type: splitParam(params.get("seat_type")),
    gender: splitParam(params.get("gender")),
    program: params.get("program") ?? undefined,
    state: params.get("state") ?? undefined,
    sort: params.get("sort") ?? "closing_rank",
    page: params.get("page") ?? "1"
  };
}

function filtersToParams(filters: SearchFilters, pageSize = 25) {
  const params = new URLSearchParams();
  for (const key of arrayKeys) {
    const value = filters[key];
    if (value.length) params.set(key, value.join("~"));
  }
  for (const key of ["exam_type", "year", "round", "institute", "program", "state", "sort", "page"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  params.set("page_size", String(pageSize));
  return params;
}

function firstValue(values: string[], fallback = "All") {
  return values[0] ?? fallback;
}

function compactLabel(value: string) {
  return value
    .replace("Indian Institute of Technology", "IIT")
    .replace("National Institute of Technology", "NIT")
    .replace("Indian Institute of Information Technology", "IIIT")
    .replace("Government Funded Technical Institutions", "GFTI");
}

function isHiddenBranch(value: string) {
  return /\b(architecture|planning)\b/i.test(value);
}

function ToggleMark({ checked }: { checked: boolean }) {
  return (
    <span className={`grid size-5 shrink-0 place-items-center rounded-md border ${checked ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white text-transparent"}`}>
      <Check size={14} strokeWidth={3} />
    </span>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-full border border-emerald-900/10 bg-emerald-50 px-4 text-sm font-black text-[var(--primary)]"
    >
      {label}
      {onRemove ? <X size={14} /> : <Check size={14} />}
    </button>
  );
}

function OptionFlyout({
  id,
  label,
  valueLabel,
  options,
  selected,
  onChange,
  openId,
  setOpenId,
  disabled = false,
  searchable = true
}: {
  id: string;
  label: string;
  valueLabel: string;
  options: Array<{ value: string; label?: string; count?: number }>;
  selected: string[];
  onChange: (next: string[]) => void;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  disabled?: boolean;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  const open = openId === id;
  const selectedSet = new Set(selected);
  const visibleOptions = options
    .filter((option) => option.value.toLowerCase().includes(query.toLowerCase()) || option.label?.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 120);

  function toggle(value: string) {
    if (disabled) return;
    onChange(selectedSet.has(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpenId(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, setOpenId]);

  return (
    <div ref={ref} className="relative grid gap-2">
      <span className="text-xs font-black text-[var(--muted)]">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpenId(open ? null : id)}
        className="focus-ring flex min-h-12 items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-white px-3 text-left text-[0.95rem] font-black disabled:cursor-not-allowed disabled:bg-emerald-50 disabled:text-[var(--primary)]"
      >
        <span className="truncate">{valueLabel}</span>
      </button>
      {open && !disabled ? (
        <div className="absolute left-0 top-full z-40 mt-2 w-full min-w-[20rem] overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-2xl shadow-emerald-950/15">
          {searchable ? (
            <div className="border-b border-[var(--border)] p-3">
              <input
                className="focus-ring min-h-10 w-full rounded-lg border border-[var(--border)] bg-[#fffdf9] px-3 text-[0.85rem] font-semibold"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${label.toLowerCase()}`}
              />
            </div>
          ) : null}
          <div className="max-h-80 overflow-y-auto p-2">
            {visibleOptions.map((option) => {
              const checked = selectedSet.has(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggle(option.value)}
                  className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[0.84rem] hover:bg-emerald-50"
                >
                  <ToggleMark checked={checked} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-black">{option.label ?? option.value}</span>
                    {option.count !== undefined ? <span className="text-xs font-semibold text-[var(--muted)]">{option.count.toLocaleString("en-IN")} rows</span> : null}
                  </span>
                </button>
              );
            })}
            {!visibleOptions.length ? <div className="px-3 py-8 text-center text-sm font-semibold text-[var(--muted)]">No options found.</div> : null}
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border)] bg-[#fbfaf7] p-2">
            <button type="button" onClick={() => onChange([])} className="rounded-lg px-3 py-2 text-xs font-black text-[var(--primary)] hover:bg-emerald-50">Clear</button>
            <button type="button" onClick={() => setOpenId(null)} className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-black text-white">Done</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CutoffExplorer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<SearchFilters>(() => filtersFromParams(searchParams));
  const [submittedFilters, setSubmittedFilters] = useState<SearchFilters | null>(null);
  const [meta, setMeta] = useState<CutoffMeta | null>(null);
  const [result, setResult] = useState<CutoffResponse>({ rows: [], total: 0, page: 1, page_size: 8 });
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [fullView, setFullView] = useState(false);
  const [trendRow, setTrendRow] = useState<CutoffRow | null>(null);
  const [trendRows, setTrendRows] = useState<CutoffRow[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [openFlyout, setOpenFlyout] = useState<string | null>(null);

  const selectedTypes = filters.exam_type === "JEE Advanced" ? ["IIT"] : filters.institute_type;
  const selectedType = firstValue(selectedTypes);
  const aiOnlyTypes = ["IIT", "IIIT", "IISc"];
  const hasNit = selectedTypes.includes("NIT");
  const quotaLockedToAI = filters.exam_type === "JEE Advanced" || (selectedTypes.length > 0 && selectedTypes.every((type) => aiOnlyTypes.includes(type)));
  const quotaOptions = quotaLockedToAI ? quotaOptionsForInstituteType("IIT") : hasNit ? quotaOptionsForInstituteType("NIT", Boolean(filters.state)) : quotaOptionsForInstituteType(selectedTypes.length === 1 ? selectedType : undefined, Boolean(filters.state));
  const homeStateMessage = hasNit
    ? "Home State applies to NITs in the selected state."
    : "Home State is unavailable for IIT, IIIT and GFTI-only selections; those options use All India style quotas.";
  const typeOptions = filters.exam_type === "JEE Advanced"
    ? INSTITUTE_TYPE_OPTIONS.filter((option) => option.value === "IIT")
    : INSTITUTE_TYPE_OPTIONS.filter((option) => ["NIT", "IIIT", "GFTI"].includes(option.value));
  const pageSize = fullView ? 25 : 8;
  const metaQueryString = useMemo(() => {
    const metaFilters: SearchFilters = {
      exam_type: filters.exam_type,
      year: filters.year,
      round: filters.round,
      institute_type: filters.institute_type,
      institute_values: [],
      program_values: [],
      quota: [],
      seat_type: [],
      gender: [],
      state: filters.state,
      sort: "closing_rank",
      page: "1"
    };
    return filtersToParams(metaFilters, 1).toString();
  }, [filters.exam_type, filters.year, filters.round, filters.institute_type, filters.state]);
  const submittedQueryString = useMemo(() => (submittedFilters ? filtersToParams(submittedFilters, pageSize).toString() : ""), [submittedFilters, pageSize]);

  function patch(patchValue: Partial<SearchFilters>) {
    setFilters((current) => ({ ...current, ...patchValue, page: "1" }));
  }

  function patchExam(examType: string) {
    setFilters((current) => ({
      ...current,
      exam_type: examType,
      institute_type: examType === "JEE Advanced" ? ["IIT"] : [],
      quota: examType === "JEE Advanced" ? ["AI"] : [],
      state: undefined,
      page: "1"
    }));
  }

  function patchInstituteTypes(nextTypes: string[]) {
    const nextQuotaLockedToAI = nextTypes.length > 0 && nextTypes.every((type) => aiOnlyTypes.includes(type));
    const nextHasNit = nextTypes.includes("NIT");
    const nextQuota = nextQuotaLockedToAI
      ? ["AI"]
      : nextHasNit && nextTypes.includes("IIIT")
        ? ["AI", "OS"]
        : filters.quota.filter((quota) => (quota !== "HS" || (nextHasNit && filters.state)) && (quota !== "OS" || nextHasNit));
    patch({ institute_type: nextTypes, quota: nextQuota, state: nextHasNit ? filters.state : undefined });
  }

  useEffect(() => {
    setFilters(filtersFromParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (filters.exam_type === "JEE Advanced" && (filters.institute_type.length !== 1 || filters.institute_type[0] !== "IIT")) {
      setFilters((current) => ({ ...current, institute_type: ["IIT"], quota: ["AI"], page: "1" }));
    }
  }, [filters.exam_type, filters.institute_type]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setMetaLoading(true);
      const metaResponse = await fetch(`/api/cutoffs/meta?${metaQueryString}`, { signal: controller.signal });
      if (!metaResponse.ok) {
        setMetaLoading(false);
        return;
      }
      const nextMeta = (await metaResponse.json()) as CutoffMeta;
      setMeta(nextMeta);
      setMetaLoading(false);

      if (!filters.year && nextMeta.latest_year) {
        setFilters((current) => ({ ...current, year: String(nextMeta.latest_year), round: nextMeta.latest_round ? String(nextMeta.latest_round) : current.round }));
      } else if (filters.year && !filters.round && nextMeta.latest_round) {
        setFilters((current) => ({ ...current, round: String(nextMeta.latest_round) }));
      }
    }, 160);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [filters.year, filters.round, metaQueryString]);

  useEffect(() => {
    if (!submittedQueryString) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const rowsResponse = await fetch(`/api/cutoffs?${submittedQueryString}`, { signal: controller.signal });
      if (!rowsResponse.ok) {
        setLoading(false);
        return;
      }
      const nextRows = (await rowsResponse.json()) as CutoffResponse;
      setResult(nextRows);
      setLoading(false);
    }, 120);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [submittedQueryString]);

  function submitSearch() {
    const nextFilters = { ...filters, page: "1" };
    setSubmittedFilters(nextFilters);
    setFullView(false);
    const params = filtersToParams(nextFilters, 8);
    router.replace(`${pathname}?${params.toString()}` as Route, { scroll: false });
  }

  function clearAll() {
    setFilters({
      exam_type: "JEE Main",
      year: filters.year,
      round: filters.round,
      institute_type: [],
      institute_values: [],
      program_values: [],
      quota: [],
      seat_type: [],
      gender: [],
      state: undefined,
      sort: "closing_rank",
      page: "1"
    });
    setSubmittedFilters(null);
    setResult({ rows: [], total: 0, page: 1, page_size: 8 });
  }

  async function openTrend(row: CutoffRow) {
    setTrendRow(row);
    setTrendLoading(true);
    const params = new URLSearchParams({
      institute: row.institute_name_raw,
      program: row.program_name_raw,
      quota: row.quota ?? "",
      seat_type: row.seat_type ?? "",
      gender: row.gender ?? ""
    });
    const response = await fetch(`/api/cutoffs/trend?${params.toString()}`);
    const body = await response.json();
    setTrendRows(body.rows ?? []);
    setTrendLoading(false);
  }

  const chips = [
    filters.year ? { key: "year", label: `Year: ${filters.year}` } : null,
    filters.round ? { key: "round", label: `Round: ${filters.round}` } : null,
    filters.program_values.length ? { key: "program", label: `Branch: ${filters.program_values.length} selected` } : null,
    selectedTypes.length ? { key: "type", label: `Type: ${selectedTypes.map(compactLabel).join(", ")}` } : null,
    firstValue(filters.quota) !== "All" ? { key: "quota", label: `Quota: ${firstValue(filters.quota)}` } : null
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  return (
    <div className="min-h-screen bg-[#fbfaf7]">
      <main className="page-shell grid gap-6">
        <section className="surface overflow-hidden rounded-2xl">
          <div className="bg-gradient-to-br from-white via-[#fbfaf7] to-[#e7f5f1] p-6 lg:p-8">
            <div>
              <p className="eyebrow">Opening and closing ranks</p>
              <h1 className="mt-3 text-4xl font-black tracking-normal text-[#001d19] sm:text-5xl">JoSAA Rank Explorer</h1>
            </div>
          </div>
        </section>

        <section className="surface rounded-2xl p-5 shadow-2xl shadow-emerald-950/10 sm:p-7">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-black">Active filters</span>
              {chips.length ? chips.map((chip) => <Chip key={chip.key} label={chip.label} />) : <Chip label="Ready to search" />}
            </div>
            <button type="button" onClick={clearAll} className="focus-ring inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-black text-[var(--primary)] hover:bg-emerald-50">
              Clear all
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-white/85 p-5 sm:p-6">
            <div className="grid gap-x-6 gap-y-6 xl:grid-cols-12">
              <label className="grid gap-2 xl:col-span-3">
                <span className="text-xs font-black text-[var(--muted)]">Exam</span>
                <select className="focus-ring min-h-12 rounded-lg border border-[var(--border)] bg-white px-3 font-black" value={filters.exam_type ?? "JEE Main"} onChange={(event) => patchExam(event.target.value)}>
                  {EXAM_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="grid gap-2 xl:col-span-3">
                <span className="text-xs font-black text-[var(--muted)]">Year</span>
                <select className="focus-ring min-h-12 rounded-lg border border-[var(--border)] bg-white px-3 font-black" value={filters.year ?? ""} onChange={(event) => patch({ year: event.target.value, round: undefined })}>
                  {(meta?.years ?? (filters.year ? [Number(filters.year)] : [])).map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>
              <div className="grid gap-2 xl:col-span-6">
                <span className="text-xs font-black text-[var(--muted)]">Round</span>
                <div className="flex overflow-hidden rounded-lg border border-[var(--border)] bg-white">
                  {(meta?.rounds ?? (filters.round ? [Number(filters.round)] : [])).map((round) => (
                    <button key={round} type="button" onClick={() => patch({ round: String(round) })} className={`min-h-12 flex-1 border-r border-[var(--border)] px-3 text-sm font-black last:border-r-0 ${filters.round === String(round) ? "bg-[var(--primary)] text-white" : "hover:bg-emerald-50"}`}>
                      {round}
                    </button>
                  ))}
                </div>
              </div>

              <div className="xl:col-span-12">
                <div className="h-px bg-[var(--border)]" />
              </div>

              <div className="xl:col-span-3">
                <OptionFlyout
                  id="institute-type"
                  label="Institute type"
                  valueLabel={selectedTypes.length ? selectedTypes.map(compactLabel).join(", ") : "Institute types"}
                  options={typeOptions}
                  selected={selectedTypes}
                  onChange={patchInstituteTypes}
                  openId={openFlyout}
                  setOpenId={setOpenFlyout}
                  disabled={filters.exam_type === "JEE Advanced"}
                  searchable={false}
                />
              </div>
              <div className="xl:col-span-3">
                <OptionFlyout
                  id="seat-type"
                  label="Seat type"
                  valueLabel={filters.seat_type.length ? filters.seat_type.join(", ") : "All seat types"}
                  options={SEAT_TYPE_OPTIONS.filter((option) => option.value !== "All")}
                  selected={filters.seat_type}
                  onChange={(next) => patch({ seat_type: next })}
                  openId={openFlyout}
                  setOpenId={setOpenFlyout}
                  searchable={false}
                />
              </div>
              <div className="xl:col-span-3">
                <OptionFlyout
                  id="gender"
                  label="Gender"
                  valueLabel={filters.gender.length ? filters.gender.join(", ") : "All gender pools"}
                  options={GENDER_OPTIONS.filter((option) => option.value !== "All")}
                  selected={filters.gender}
                  onChange={(next) => patch({ gender: next })}
                  openId={openFlyout}
                  setOpenId={setOpenFlyout}
                  searchable={false}
                />
              </div>
              <div className="xl:col-span-3">
                <OptionFlyout
                  id="quota"
                  label="Quota"
                  valueLabel={quotaLockedToAI ? "All India (AI)" : filters.quota.length ? filters.quota.join(", ") : "All quotas"}
                  options={quotaOptions}
                  selected={quotaLockedToAI ? ["AI"] : filters.quota}
                  onChange={(next) => patch({ quota: quotaLockedToAI ? ["AI"] : next.filter((item) => item !== "All") })}
                  openId={openFlyout}
                  setOpenId={setOpenFlyout}
                  disabled={quotaLockedToAI}
                  searchable={false}
                />
              </div>

              <label className="grid gap-2 xl:col-span-3">
                <span className="text-xs font-black text-[var(--muted)]">State</span>
                <select disabled={!hasNit} className="focus-ring min-h-12 rounded-lg border border-[var(--border)] bg-white px-3 font-black disabled:cursor-not-allowed disabled:bg-emerald-50 disabled:text-[var(--muted)]" value={hasNit ? filters.state ?? "" : ""} onChange={(event) => patch({ state: event.target.value || undefined, quota: event.target.value ? filters.quota : filters.quota.filter((quota) => quota !== "HS") })}>
                  <option value="">{hasNit ? "Select NIT home state" : "Select NIT to use HS quota"}</option>
                  {INDIA_STATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <span className="text-xs font-semibold text-[var(--muted)]">{homeStateMessage}</span>
              </label>
              <div className="xl:col-span-3">
                <OptionFlyout
                  id="branches"
                  label="Branches"
                  valueLabel={filters.program_values.length ? `${filters.program_values.length} selected` : metaLoading ? "Loading branches..." : "All matching branches"}
                  options={(meta?.options.program ?? []).filter((option) => !isHiddenBranch(option.value)).map((option) => ({ value: option.value, label: option.value, count: option.count }))}
                  selected={filters.program_values}
                  onChange={(next) => patch({ program_values: next, program: undefined })}
                  openId={openFlyout}
                  setOpenId={setOpenFlyout}
                />
              </div>
              <div className="xl:col-span-3">
                <OptionFlyout
                  id="institutes"
                  label="Institutes"
                  valueLabel={filters.institute_values.length ? `${filters.institute_values.length} selected` : "All matching institutes"}
                  options={(meta?.options.institute ?? []).map((option) => ({ value: option.value, label: option.value, count: option.count }))}
                  selected={filters.institute_values}
                  onChange={(next) => patch({ institute_values: next, institute: undefined })}
                  openId={openFlyout}
                  setOpenId={setOpenFlyout}
                />
              </div>
              <div className="flex items-end xl:col-span-3">
                <Button type="button" className="w-full" onClick={submitSearch}>
                  <Search size={18} />
                  Find colleges
                </Button>
              </div>
            </div>
          </div>
        </section>

        {submittedFilters ? (
        <section className="grid gap-3 rounded-2xl bg-white/75 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black">Results preview</h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-[var(--primary)]">{loading ? "Loading..." : `${result.total.toLocaleString("en-IN")} matches found`}</span>
            </div>
              <button type="button" onClick={() => setFullView(true)} className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-white px-4 text-sm font-black hover:bg-emerald-50">
                {fullView ? "Full results shown" : "View full results"}
                <ExternalLink size={15} />
              </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--primary)] text-xs uppercase text-white">
                <tr>
                  {["Institute", "Program", "Seat Type", "Gender", "Quota", "Round", "Opening Rank", "Closing Rank", "Trend"].map((heading) => <th key={heading} className="px-4 py-3 font-black">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-white">
                {result.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-emerald-50/40">
                    <td className="min-w-72 px-4 py-3 font-black">{row.institute_name_raw}</td>
                    <td className="min-w-72 px-4 py-3 text-[var(--muted)]">{row.program_name_raw}</td>
                    <td className="px-4 py-3">{row.seat_type}</td>
                    <td className="px-4 py-3">{row.gender}</td>
                    <td className="px-4 py-3">{row.quota}</td>
                    <td className="px-4 py-3">{row.round}</td>
                    <td className="px-4 py-3 tabular-nums text-[var(--primary)]">{row.opening_rank_raw}</td>
                    <td className="px-4 py-3 tabular-nums font-black text-[var(--primary)]">{row.closing_rank_raw}</td>
                    <td className="px-4 py-3"><button type="button" className="font-black text-[var(--primary)]" onClick={() => openTrend(row)}>Rounds</button></td>
                  </tr>
                ))}
                {!loading && !result.rows.length ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center font-semibold text-[var(--muted)]">No cutoffs found for these filters. Try another round, category, branch, or institute type.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-emerald-900/20 bg-white/70 p-8 text-center">
            <p className="text-lg font-black">Set your filters, then press Search.</p>
          </section>
        )}
      </main>
      <RoundTrendModal row={trendRow} rows={trendRows} loading={trendLoading} onClose={() => setTrendRow(null)} />
    </div>
  );
}
