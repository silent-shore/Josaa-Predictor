export type PredictionBucket = "Safe" | "Moderate" | "Risky";

export type PredictionRow = {
  id: string;
  institute_name_raw: string;
  program_name_raw: string;
  year: number;
  round: number;
  opening_round?: number;
  closing_round?: number;
  opening_rank_raw: string | null;
  closing_rank_raw: string | null;
  opening_rank_num: number | null;
  closing_rank_num: number | null;
  quota: string | null;
  seat_type: string | null;
  gender: string | null;
  rank_list_type?: string | null;
  prediction_bucket?: PredictionBucket;
};

export type PredictResponse = {
  rows: PredictionRow[];
  grouped: Record<PredictionBucket, PredictionRow[]>;
  counts: Record<PredictionBucket, number>;
  page: number;
  page_size: number;
  bucket: PredictionBucket | null;
  cutoff_year: number;
  latest_round: number;
  available_years: number[];
  explanation: string;
};
