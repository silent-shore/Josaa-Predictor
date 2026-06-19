import type { CutoffRow } from "@/lib/cutoff-query";

export type FilterOption = {
  value: string;
  label?: string;
  count: number;
};

export type SearchFilters = {
  exam_type?: string;
  year?: string;
  round?: string;
  institute_type: string[];
  institute_values: string[];
  program_values: string[];
  quota: string[];
  seat_type: string[];
  gender: string[];
  institute?: string;
  program?: string;
  state?: string;
  opening_min?: string;
  opening_max?: string;
  rank_min?: string;
  rank_max?: string;
  sort?: string;
  page?: string;
};

export type CutoffMeta = {
  years: number[];
  rounds: number[];
  latest_year: number | null;
  latest_round: number | null;
  last_updated: string | null;
  source_url: string | null;
  options: {
    institute_type: FilterOption[];
    institute: FilterOption[];
    program: FilterOption[];
    quota: FilterOption[];
    seat_type: FilterOption[];
    gender: FilterOption[];
    state: FilterOption[];
  };
};

export type CutoffResponse = {
  rows: CutoffRow[];
  total: number;
  page: number;
  page_size: number;
};
