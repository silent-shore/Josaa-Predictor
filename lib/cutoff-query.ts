import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { cutoffsQuerySchema } from "@/lib/validators/cutoffs";
import { instituteTypesForExam, normalizeInstituteTypeFilter } from "@/lib/constants";

export type CutoffQuery = z.infer<typeof cutoffsQuerySchema>;

export type CutoffRow = {
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
  rank_suffix: string | null;
  rank_list_type: string | null;
  institutes?: { institute_type: string | null; state: string | null } | Array<{ institute_type: string | null; state: string | null }> | null;
};

export function effectiveInstituteTypes(filters: Pick<CutoffQuery, "exam_type" | "institute_type" | "quota">) {
  const examTypes = instituteTypesForExam(filters.exam_type);
  const selectedType =
    filters.institute_type && filters.institute_type !== "All"
      ? normalizeInstituteTypeFilter(filters.institute_type)
      : undefined;

  if (selectedType && examTypes && !examTypes.includes(selectedType)) {
    return ["__no_matching_institute_type__"];
  }

  if (selectedType) {
    return [selectedType];
  }

  if ((filters.quota === "HS" || filters.quota === "OS") && (!examTypes || examTypes.includes("National Institute of Technology"))) {
    return ["National Institute of Technology"];
  }

  return examTypes;
}

export function shouldApplyQuota(filters: Pick<CutoffQuery, "exam_type" | "institute_type" | "quota">) {
  if (!filters.quota || filters.quota === "All") {
    return false;
  }

  const instituteTypes = effectiveInstituteTypes(filters);
  if (
    instituteTypes?.length &&
    instituteTypes.every(
      (type) => type === "Indian Institute of Technology" || type === "Indian Institute of Information Technology"
    )
  ) {
    return false;
  }

  return true;
}

export function applyCutoffFilters(client: SupabaseClient, filters: CutoffQuery) {
  const instituteTypes = effectiveInstituteTypes(filters);
  const shouldFilterInstituteRelation =
    Boolean(filters.state) || Boolean(instituteTypes?.length);
  const instituteSelect = shouldFilterInstituteRelation
    ? "institutes!inner(institute_type,state)"
    : "institutes(institute_type,state)";

  let query = client
    .from("josaa_cutoffs")
    .select(
      `id,year,round,institute_name_raw,program_name_raw,quota,seat_type,gender,opening_rank_raw,closing_rank_raw,opening_rank_num,closing_rank_num,rank_suffix,rank_list_type,${instituteSelect}`,
      { count: "exact" }
    );

  if (filters.year) query = query.eq("year", filters.year);
  if (filters.round) query = query.eq("round", filters.round);
  if (instituteTypes?.length) {
    query = query.in("institutes.institute_type", instituteTypes);
  }
  if (filters.state) query = query.ilike("institutes.state", `%${filters.state}%`);
  if (filters.institute) query = query.ilike("institute_name_raw", `%${filters.institute}%`);
  if (filters.program) query = query.ilike("program_name_raw", `%${filters.program}%`);
  if (shouldApplyQuota(filters)) query = query.eq("quota", filters.quota);
  if (filters.seat_type && filters.seat_type !== "All") query = query.eq("seat_type", filters.seat_type);
  if (filters.gender && filters.gender !== "All") query = query.eq("gender", filters.gender);
  if (filters.rank_min) query = query.gte("closing_rank_num", filters.rank_min);
  if (filters.rank_max) query = query.lte("closing_rank_num", filters.rank_max);

  const ascending = !filters.sort.startsWith("-");
  const sortKey = filters.sort.replace("-", "");
  const sortMap: Record<string, string> = {
    closing_rank: "closing_rank_num",
    institute: "institute_name_raw",
    program: "program_name_raw",
    year: "year",
    round: "round"
  };

  query = query.order(sortMap[sortKey] ?? "closing_rank_num", { ascending, nullsFirst: false });

  const pageSize = Math.min(filters.page_size, 100);
  const from = (filters.page - 1) * pageSize;
  return query.range(from, from + pageSize - 1);
}
