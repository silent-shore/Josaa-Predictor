"use client";

import { Download, RotateCcw, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, OptionList } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EXAM_TYPE_OPTIONS, GENDER_OPTIONS, INSTITUTE_TYPE_OPTIONS, quotaOptionsForInstituteType, SEAT_TYPE_OPTIONS } from "@/lib/constants";

function currentValue(params: URLSearchParams, key: string) {
  return params.get(key) ?? "";
}

export function CutoffFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [instituteType, setInstituteType] = useState(currentValue(params, "institute_type") || "All");
  const quotaOptions = quotaOptionsForInstituteType(instituteType);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      const text = value.toString().trim();
      if (text && text !== "All") next.set(key, text);
    }
    if (instituteType === "IIT" || instituteType === "IIIT") {
      next.delete("quota");
    }
    next.set("page", "1");
    router.push(`${pathname}?${next.toString()}` as Route);
  }

  function exportCsv() {
    const url = `/api/cutoffs?${params.toString()}&format=csv&page_size=1000`;
    window.location.href = url;
  }

  return (
    <form onSubmit={submit} className="surface grid gap-4 rounded-xl p-4 sm:p-5 lg:grid-cols-12">
      <Field label="Exam" className="lg:col-span-3">
        <Select name="exam_type" defaultValue={currentValue(params, "exam_type") || "All"}>
          <option value="All">All exams</option>
          <OptionList options={EXAM_TYPE_OPTIONS} />
        </Select>
      </Field>
      <Field label="Year" className="lg:col-span-2">
        <Input name="year" placeholder="2026" defaultValue={currentValue(params, "year")} />
      </Field>
      <Field label="Round" className="lg:col-span-2">
        <Input name="round" placeholder="1" defaultValue={currentValue(params, "round")} />
      </Field>
      <Field label="Institute type" className="lg:col-span-2">
        <Select name="institute_type" value={instituteType} onChange={(event) => setInstituteType(event.target.value)}>
          <OptionList options={INSTITUTE_TYPE_OPTIONS.slice(0, 5)} />
        </Select>
      </Field>
      <Field label="Institute name" className="lg:col-span-3">
        <Input name="institute" placeholder="Institute keyword" defaultValue={currentValue(params, "institute")} />
      </Field>
      <Field label="Academic program" className="lg:col-span-4">
        <Input name="program" placeholder="Program keyword" defaultValue={currentValue(params, "program")} />
      </Field>
      <Field label="Quota" className="lg:col-span-2">
        <Select name="quota" defaultValue={currentValue(params, "quota") || "All"} key={instituteType}>
          <OptionList options={quotaOptions} />
        </Select>
      </Field>
      <Field label="Seat type" className="lg:col-span-3">
        <Select name="seat_type" defaultValue={currentValue(params, "seat_type") || "All"}>
          <OptionList options={SEAT_TYPE_OPTIONS} />
        </Select>
      </Field>
      <Field label="Gender pool" className="lg:col-span-3">
        <Select name="gender" defaultValue={currentValue(params, "gender") || "All"}>
          <OptionList options={GENDER_OPTIONS} />
        </Select>
      </Field>
      <Field label="State" className="lg:col-span-2">
        <Input name="state" placeholder="Optional" defaultValue={currentValue(params, "state")} />
      </Field>
      <Field label="Sort results" className="lg:col-span-3">
        <Select name="sort" defaultValue={currentValue(params, "sort") || "closing_rank"}>
          <option value="closing_rank">Closing rank ascending</option>
          <option value="-closing_rank">Closing rank descending</option>
          <option value="institute">Institute</option>
          <option value="program">Program</option>
          <option value="-year">Latest year</option>
          <option value="-round">Latest round</option>
        </Select>
      </Field>
      <div className="flex flex-wrap items-end gap-2 lg:col-span-5">
        <Button type="submit">
          <Search size={16} />
          Search
        </Button>
        <Button type="button" className="border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[#f7f1e8]" onClick={exportCsv}>
          <Download size={16} />
          CSV
        </Button>
        <Link href="/search" className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-bold text-[var(--foreground)] hover:bg-[#f7f1e8]">
          <RotateCcw size={16} />
          Reset
        </Link>
      </div>
    </form>
  );
}
