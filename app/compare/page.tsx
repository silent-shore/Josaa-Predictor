"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";
import { CutoffTable } from "@/components/cutoff-table";
import { Button } from "@/components/ui/button";
import { Field, OptionList } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EXAM_TYPE_OPTIONS, GENDER_OPTIONS, INSTITUTE_TYPE_OPTIONS, quotaOptionsForInstituteType, SEAT_TYPE_OPTIONS } from "@/lib/constants";
import type { CutoffRow } from "@/lib/cutoff-query";

export default function ComparePage() {
  const [rows, setRows] = useState<CutoffRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [instituteType, setInstituteType] = useState("All");
  const quotaOptions = quotaOptionsForInstituteType(instituteType);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function submit(formData: FormData) {
    setLoading(true);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      const text = value.toString().trim();
      if (text && text !== "All") params.set(key, text);
    }
    if (instituteType === "IIT" || instituteType === "IIIT") {
      params.delete("quota");
    }
    params.set("sort", "year");
    params.set("page_size", "100");
    const response = await fetch(`/api/cutoffs?${params.toString()}`);
    const body = await response.json();
    setRows(body.rows ?? []);
    setLoading(false);
  }

  const chartData = rows.map((row) => ({
    label: `${row.year} R${row.round}`,
    closing: row.closing_rank_num,
    institute: row.institute_name_raw
  }));

  return (
    <div className="page-shell page-grid">
      <div>
        <p className="eyebrow">Compare</p>
        <h1 className="mt-2 text-4xl font-black tracking-normal">Closing-rank trends</h1>
      </div>
      <form action={submit} className="surface grid gap-4 rounded-xl p-4 sm:p-5 lg:grid-cols-12">
        <Field label="Exam" className="lg:col-span-3">
          <Select name="exam_type" defaultValue="All">
            <option value="All">All exams</option>
            <OptionList options={EXAM_TYPE_OPTIONS} />
          </Select>
        </Field>
        <Field label="Institute" className="lg:col-span-4">
          <Input name="institute" placeholder="Bombay, Calicut, IIIT Hyderabad" />
        </Field>
        <Field label="Program" className="lg:col-span-5">
          <Input name="program" placeholder="Computer Science" />
        </Field>
        <Field label="Institute type" className="lg:col-span-4">
          <Select name="institute_type" value={instituteType} onChange={(event) => setInstituteType(event.target.value)}><OptionList options={INSTITUTE_TYPE_OPTIONS.slice(0, 5)} /></Select>
        </Field>
        <Field label="Seat type" className="lg:col-span-3">
          <Select name="seat_type" defaultValue="All"><OptionList options={SEAT_TYPE_OPTIONS} /></Select>
        </Field>
        <Field label="Gender" className="lg:col-span-3">
          <Select name="gender" defaultValue="All"><OptionList options={GENDER_OPTIONS} /></Select>
        </Field>
        <Field label="Quota" className="lg:col-span-2">
          <Select name="quota" defaultValue="All" key={instituteType}><OptionList options={quotaOptions} /></Select>
        </Field>
        <Field label="State" className="lg:col-span-2">
          <Input name="state" placeholder="Optional" />
        </Field>
        <div className="flex items-end lg:col-span-2">
          <Button type="submit" disabled={loading}>{loading ? "Loading..." : "Compare"}</Button>
        </div>
      </form>
      <section className="surface rounded-xl p-4">
        <h2 className="mb-4 text-lg font-black">Trend</h2>
        <div className="h-72">
          {mounted && rows.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="closing" stroke="#0f6b5b" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          ) : mounted ? (
            <div className="grid h-full place-items-center text-sm font-medium text-[var(--muted)]">Run a comparison to draw the trend.</div>
          ) : (
            <div className="h-full animate-pulse rounded bg-[#f4eee5]" />
          )}
        </div>
      </section>
      <CutoffTable rows={rows} />
    </div>
  );
}
