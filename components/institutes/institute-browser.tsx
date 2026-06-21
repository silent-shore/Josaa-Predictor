"use client";

import { BookOpen, Building2, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { GENDER_OPTIONS, INSTITUTE_TYPE_OPTIONS, SEAT_TYPE_OPTIONS } from "@/lib/constants";

type Institute = {
  id: string;
  name: string;
  institute_type: string;
  short_type: string;
  state: string | null;
  city: string | null;
};

type CutoffRow = {
  id: string;
  year: number;
  round: number;
  institute_name_raw: string;
  program_name_raw: string;
  quota: string | null;
  seat_type: string | null;
  gender: string | null;
  opening_rank_raw: string | null;
  closing_rank_raw: string | null;
  opening_rank_num: number | null;
  closing_rank_num: number | null;
  rank_list_type: string | null;
};

type DetailResponse = {
  institute: Institute;
  years: number[];
  selected_year: number | null;
  rounds: number[];
  programs: string[];
  rows: CutoffRow[];
};

const typeFilters = INSTITUTE_TYPE_OPTIONS.filter((option) => ["All", "IIT", "NIT", "IIIT", "GFTI", "IISc"].includes(option.value));

function rank(value: string | null) {
  return value && value.trim() ? value : "-";
}

function compactType(value: string) {
  return value.replace(/\s*\(.+\)\s*$/, "");
}

export function InstituteBrowser() {
  const linkedInstituteName = useRef<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [type, setType] = useState("All");
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [programQuery, setProgramQuery] = useState("");
  const [seatType, setSeatType] = useState("All");
  const [gender, setGender] = useState("All");
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const institute = params.get("institute");
    if (!institute) return;
    linkedInstituteName.current = institute;
    setQuery(institute);
    setDebouncedQuery(institute);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    setListLoading(true);
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (type !== "All") params.set("type", type);
    fetch(`/api/institutes?${params.toString()}`)
      .then((response) => response.json())
      .then((body) => {
        if (!active) return;
        const nextInstitutes = body.institutes ?? [];
        const linkedInstitute = linkedInstituteName.current
          ? nextInstitutes.find((item: Institute) => item.name.toLowerCase() === linkedInstituteName.current?.toLowerCase())
          : null;
        setInstitutes(nextInstitutes);
        setSelectedInstitute((current) => current && nextInstitutes.some((item: Institute) => item.id === current.id) ? current : linkedInstitute ?? nextInstitutes[0] ?? null);
      })
      .catch(() => {
        if (active) setError("Could not load institutes.");
      })
      .finally(() => {
        if (active) setListLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedQuery, type]);

  useEffect(() => {
    if (!selectedInstitute) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    setError(null);
    const params = new URLSearchParams({ institute_id: selectedInstitute.id });
    if (year) params.set("year", String(year));
    if (seatType !== "All") params.set("seat_type", seatType);
    if (gender !== "All") params.set("gender", gender);
    if (programQuery.trim()) params.set("program", programQuery.trim());

    fetch(`/api/institutes/cutoffs?${params.toString()}`)
      .then((response) => response.json())
      .then((body) => {
        if (!active) return;
        if (body.error) throw new Error(body.error);
        setDetail(body);
        if (!year && body.selected_year) setYear(body.selected_year);
      })
      .catch((issue) => {
        if (active) setError(issue instanceof Error ? issue.message : "Could not load institute cutoffs.");
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedInstitute, year, seatType, gender, programQuery]);

  const groupedPrograms = useMemo(() => {
    const groups = new Map<string, CutoffRow[]>();
    for (const row of detail?.rows ?? []) {
      const key = row.program_name_raw;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [detail?.rows]);

  function chooseInstitute(institute: Institute) {
    window.history.replaceState(null, "", `/institutes?institute=${encodeURIComponent(institute.name)}`);
    linkedInstituteName.current = institute.name;
    setSelectedInstitute(institute);
    setDetail(null);
    setYear(null);
    setProgramQuery("");
  }

  return (
    <div className="min-h-screen bg-[#f7f3ec]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[1.4rem] border border-emerald-950/10 bg-white shadow-xl shadow-emerald-950/[0.06]">
          <div className="grid gap-5 border-b border-emerald-950/10 bg-[linear-gradient(135deg,#ffffff_0%,#fbfaf7_48%,#e4f5ef_100%)] px-5 py-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-7">
            <div>
              <p className="eyebrow">Institute explorer</p>
              <h1 className="mt-2 text-4xl font-black tracking-normal text-[#001d19] sm:text-5xl">Institute-wise cutoffs</h1>
              <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-[var(--muted)]">
                Pick any imported institute and inspect year-wise cutoffs across branches, categories, quotas, gender pools, and rounds.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-900/10 bg-white/90 p-4 text-sm font-bold text-[var(--muted)]">
              {detail?.rows?.length ? `${detail.rows.length.toLocaleString("en-IN")} cutoff rows shown` : "Search an institute to begin"}
            </div>
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div> : null}

        <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="rounded-[1.4rem] border border-emerald-950/10 bg-white p-4 shadow-xl shadow-emerald-950/[0.04] lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-[var(--primary)]">
                <Search size={18} />
              </span>
              <div>
                <h2 className="text-base font-black">Find institute</h2>
                <p className="text-xs font-semibold text-[var(--muted)]">Search by name or filter type.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search IIT Bombay, NIT..."
                  className="focus-ring min-h-11 w-full rounded-xl border border-[var(--border)] bg-[#fffdf9] pl-9 pr-3 text-sm font-bold outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {typeFilters.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={`focus-ring min-h-10 rounded-xl border px-3 text-sm font-black ${type === option.value ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-[#fffdf9] hover:bg-emerald-50"}`}
                  >
                    {option.value === "All" ? "All" : option.value}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 max-h-[34rem] overflow-auto pr-1">
              {listLoading ? (
                <div className="grid gap-2">
                  {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-[#fbfaf7]" />)}
                </div>
              ) : institutes.length ? (
                <div className="grid gap-2">
                  {institutes.map((institute) => (
                    <button
                      key={institute.id}
                      type="button"
                      onClick={() => chooseInstitute(institute)}
                      className={`focus-ring rounded-xl border p-3 text-left transition ${selectedInstitute?.id === institute.id ? "border-[var(--primary)] bg-emerald-50" : "border-[var(--border)] bg-[#fffdf9] hover:bg-emerald-50/70"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-black leading-5 text-[#001d19]">{institute.name}</p>
                        <span className="rounded-md bg-white px-2 py-1 text-[0.68rem] font-black text-[var(--primary)]">{institute.short_type}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{[institute.city, institute.state].filter(Boolean).join(", ") || compactType(institute.institute_type)}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-[var(--border)] bg-[#fbfaf7] p-4 text-center text-sm font-bold text-[var(--muted)]">No institutes found.</p>
              )}
            </div>
          </aside>

          <main className="grid gap-5">
            <section className="rounded-[1.4rem] border border-emerald-950/10 bg-white shadow-xl shadow-emerald-950/[0.04]">
              <div className="border-b border-[var(--border)] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-[var(--primary)]">
                      <Building2 size={19} />
                    </span>
                    <div>
                      <h2 className="text-xl font-black text-[#001d19]">{selectedInstitute?.name ?? "Select an institute"}</h2>
                      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                        {selectedInstitute ? [compactType(selectedInstitute.institute_type), selectedInstitute.state].filter(Boolean).join(" · ") : "Choose an institute from the list to view detailed cutoffs."}
                      </p>
                    </div>
                  </div>
                  {detailLoading ? <Loader2 size={20} className="animate-spin text-[var(--primary)]" /> : null}
                </div>
              </div>

              {selectedInstitute ? (
                <div className="grid gap-4 p-5">
                  <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[#fbfaf7] p-3 lg:grid-cols-[1fr_14rem_14rem] lg:items-end">
                    <div>
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--muted)]">Cutoff year</p>
                      <div className="flex flex-wrap gap-2">
                        {(detail?.years ?? []).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setYear(item)}
                            className={`focus-ring min-h-10 rounded-xl border px-4 text-sm font-black ${item === (detail?.selected_year ?? year) ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white hover:bg-emerald-50"}`}
                          >
                            {item}
                          </button>
                        ))}
                        {detailLoading && !detail?.years?.length ? <span className="inline-flex min-h-10 items-center text-sm font-bold text-[var(--muted)]">Loading years...</span> : null}
                      </div>
                    </div>
                    <label className="grid gap-2">
                      <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Seat type</span>
                      <select value={seatType} onChange={(event) => setSeatType(event.target.value)} className="focus-ring min-h-11 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-black">
                        {SEAT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Gender</span>
                      <select value={gender} onChange={(event) => setGender(event.target.value)} className="focus-ring min-h-11 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-black">
                        {GENDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2 lg:col-span-3">
                      <span className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Search branches inside this institute</span>
                      <input
                        value={programQuery}
                        onChange={(event) => setProgramQuery(event.target.value)}
                        placeholder="Computer Science, Mechanical, Electronics..."
                        className="focus-ring min-h-11 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold outline-none"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-[var(--primary)]">
                          <BookOpen size={16} />
                        </span>
                        <div>
                          <p className="text-sm font-black">All branches in depth</p>
                          <p className="text-xs font-semibold text-[var(--muted)]">
                            {(detail?.programs.length ?? 0).toLocaleString("en-IN")} programs · {(detail?.rounds.length ?? 0).toLocaleString("en-IN")} rounds
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[var(--primary)]">{(detail?.rows.length ?? 0).toLocaleString("en-IN")} rows</span>
                    </div>

                    {detailLoading ? (
                      <div className="grid gap-3">
                        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-[#fbfaf7]" />)}
                      </div>
                    ) : groupedPrograms.length ? (
                      <div className="grid gap-3">
                        {groupedPrograms.map(([program, rows]) => (
                          <section key={program} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[#fffdf9]">
                            <div className="flex flex-col gap-2 border-b border-[var(--border)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                              <h3 className="text-sm font-black leading-5 text-[#001d19]">{program}</h3>
                              <span className="rounded-full bg-[#f6f3ee] px-3 py-1 text-xs font-black text-[var(--muted)]">{rows.length} rows</span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-[820px] w-full text-left text-sm">
                                <thead className="bg-[var(--primary)] text-xs uppercase tracking-wide text-white">
                                  <tr>
                                    <th className="px-4 py-3">Round</th>
                                    <th className="px-4 py-3">Quota</th>
                                    <th className="px-4 py-3">Seat type</th>
                                    <th className="px-4 py-3">Gender</th>
                                    <th className="px-4 py-3">Opening</th>
                                    <th className="px-4 py-3">Closing</th>
                                    <th className="px-4 py-3">Rank list</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                  {rows.map((row) => (
                                    <tr key={row.id} className="bg-white/70 hover:bg-emerald-50/40">
                                      <td className="px-4 py-3 font-black text-[var(--primary)]">R{row.round}</td>
                                      <td className="px-4 py-3 font-bold">{row.quota ?? "-"}</td>
                                      <td className="px-4 py-3 font-bold">{row.seat_type ?? "-"}</td>
                                      <td className="px-4 py-3 font-bold">{row.gender ?? "-"}</td>
                                      <td className="px-4 py-3 font-black">{rank(row.opening_rank_raw)}</td>
                                      <td className="px-4 py-3 font-black text-[var(--primary)]">{rank(row.closing_rank_raw)}</td>
                                      <td className="px-4 py-3 font-bold text-[var(--muted)]">{row.rank_list_type ?? "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[#fbfaf7] px-5 py-10 text-center text-sm font-bold text-[var(--muted)]">
                        No cutoff rows found for this institute and filter set.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid place-items-center px-5 py-20 text-center">
                  <div>
                    <SlidersHorizontal size={28} className="mx-auto text-[var(--primary)]" />
                    <p className="mt-3 text-base font-black">Select an institute to view cutoffs.</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Use the search panel to find IITs, NITs, IIITs, GFTIs, or IISc.</p>
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
