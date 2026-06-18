"use client";

import { Search } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, OptionList } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EXAM_TYPE_OPTIONS, GENDER_OPTIONS, INSTITUTE_TYPE_OPTIONS, quotaOptionsForInstituteType, SEAT_TYPE_OPTIONS, usesCategoryRank } from "@/lib/constants";

export function SearchForm() {
  const router = useRouter();
  const [instituteType, setInstituteType] = useState("All");
  const [seatType, setSeatType] = useState("All");
  const quotaOptions = quotaOptionsForInstituteType(instituteType);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const rank = form.get("rank")?.toString();

    for (const [key, value] of form.entries()) {
      if (value && value !== "All" && key !== "rank") {
        params.set(key, value.toString());
      }
    }

    if (instituteType === "IIT" || instituteType === "IIIT") {
      params.delete("quota");
    }

    if (rank) params.set("rank_max", rank);
    router.push(`/search?${params.toString()}` as Route);
  }

  return (
    <form onSubmit={submit} className="surface grid gap-4 rounded-xl p-4 sm:p-5 lg:grid-cols-12">
      <Field label="Exam" className="lg:col-span-3">
        <Select name="exam_type" defaultValue="JEE Main">
          <OptionList options={EXAM_TYPE_OPTIONS} />
        </Select>
      </Field>
      <Field
        label="Rank"
        hint={usesCategoryRank(seatType) ? "Enter your category rank, not your OPEN/CRL rank." : "Filters rows with closing rank up to this value."}
        className="lg:col-span-3"
      >
        <Input name="rank" inputMode="numeric" placeholder="12000" />
      </Field>
      <Field label="Year" className="lg:col-span-2">
        <Input name="year" inputMode="numeric" placeholder="2026" />
      </Field>
      <Field label="Round" className="lg:col-span-2">
        <Input name="round" inputMode="numeric" placeholder="1" />
      </Field>
      <Field label="Type" className="lg:col-span-2">
        <Select name="institute_type" value={instituteType} onChange={(event) => setInstituteType(event.target.value)}>
          <OptionList options={INSTITUTE_TYPE_OPTIONS.slice(0, 5)} />
        </Select>
      </Field>
      <Field label="Seat type" className="lg:col-span-3">
        <Select name="seat_type" value={seatType} onChange={(event) => setSeatType(event.target.value)}>
          <OptionList options={SEAT_TYPE_OPTIONS} />
        </Select>
      </Field>
      <Field label="Gender" className="lg:col-span-3">
        <Select name="gender" defaultValue="All">
          <OptionList options={GENDER_OPTIONS} />
        </Select>
      </Field>
      <Field label="Quota" className="lg:col-span-2">
        <Select name="quota" defaultValue="All" key={instituteType}>
          <OptionList options={quotaOptions} />
        </Select>
      </Field>
      <Field label="Branch" className="lg:col-span-2">
        <Input name="program" placeholder="Computer" />
      </Field>
      <Field label="State" className="lg:col-span-2">
        <Input name="state" placeholder="Optional" />
      </Field>
      <div className="flex items-end lg:col-span-12">
        <Button type="submit" className="w-full sm:w-auto">
          <Search size={18} />
          Find possible colleges
        </Button>
      </div>
    </form>
  );
}
