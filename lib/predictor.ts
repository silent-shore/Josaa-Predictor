import { PREDICTOR_THRESHOLDS } from "@/lib/constants";

export type PredictionBucket = "Safe" | "Moderate" | "Reach";

export function classifyRank(userRank: number, closingRank: number): PredictionBucket | null {
  if (!Number.isFinite(userRank) || !Number.isFinite(closingRank) || userRank <= 0 || closingRank <= 0) {
    return null;
  }

  if (userRank <= closingRank * PREDICTOR_THRESHOLDS.safe) return "Safe";
  if (userRank <= closingRank * PREDICTOR_THRESHOLDS.moderate) return "Moderate";
  if (userRank <= closingRank * PREDICTOR_THRESHOLDS.reach) return "Reach";
  return null;
}
