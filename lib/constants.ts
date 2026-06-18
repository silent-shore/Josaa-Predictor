export type Option = {
  value: string;
  label: string;
};

export const INSTITUTE_TYPE_OPTIONS: Option[] = [
  { value: "All", label: "All institute types" },
  { value: "IIT", label: "IIT" },
  { value: "NIT", label: "NIT" },
  { value: "IIIT", label: "IIIT" },
  { value: "GFTI", label: "GFTI" },
  { value: "Indian Institute of Technology", label: "Indian Institute of Technology" },
  { value: "National Institute of Technology", label: "National Institute of Technology" },
  { value: "Indian Institute of Information Technology", label: "Indian Institute of Information Technology" },
  { value: "Government Funded Technical Institutions", label: "Government Funded Technical Institutions" }
];

export const EXAM_TYPE_OPTIONS: Option[] = [
  { value: "JEE Main", label: "JEE Main" },
  { value: "JEE Advanced", label: "JEE Advanced" }
];

export const QUOTA_OPTIONS: Option[] = [
  { value: "All", label: "All quotas" },
  { value: "AI", label: "AI" },
  { value: "HS", label: "HS" },
  { value: "OS", label: "OS" },
  { value: "GO", label: "GO" },
  { value: "JK", label: "JK" },
  { value: "LA", label: "LA" }
];

export const ALL_QUOTA_ONLY_OPTIONS: Option[] = [{ value: "All", label: "All quotas" }];

export const GENERAL_QUOTA_OPTIONS: Option[] = [
  { value: "All", label: "All quotas" },
  { value: "AI", label: "AI" }
];

export const NIT_QUOTA_OPTIONS: Option[] = [
  { value: "All", label: "All quotas" },
  { value: "AI", label: "AI" },
  { value: "HS", label: "HS" },
  { value: "OS", label: "OS" }
];

export const GENDER_OPTIONS: Option[] = [
  { value: "All", label: "All gender pools" },
  { value: "Gender-Neutral", label: "Gender-Neutral" },
  { value: "Female-only", label: "Female-only" },
  { value: "Female-only (including Supernumerary)", label: "Female-only (including Supernumerary)" }
];

export const SEAT_TYPE_OPTIONS: Option[] = [
  { value: "All", label: "All seat types" },
  { value: "OPEN", label: "OPEN" },
  { value: "OPEN (PwD)", label: "OPEN (PwD)" },
  { value: "EWS", label: "EWS" },
  { value: "EWS (PwD)", label: "EWS (PwD)" },
  { value: "GEN-EWS", label: "GEN-EWS" },
  { value: "GEN-EWS (PwD)", label: "GEN-EWS (PwD)" },
  { value: "OBC-NCL", label: "OBC-NCL" },
  { value: "OBC-NCL (PwD)", label: "OBC-NCL (PwD)" },
  { value: "SC", label: "SC" },
  { value: "SC (PwD)", label: "SC (PwD)" },
  { value: "ST", label: "ST" },
  { value: "ST (PwD)", label: "ST (PwD)" }
];

export const INSTITUTE_TYPES = INSTITUTE_TYPE_OPTIONS.map((option) => option.value);
export const EXAM_TYPES = EXAM_TYPE_OPTIONS.map((option) => option.value);
export const QUOTAS = QUOTA_OPTIONS.map((option) => option.value);
export const GENDERS = GENDER_OPTIONS.map((option) => option.value);
export const SEAT_TYPES = SEAT_TYPE_OPTIONS.map((option) => option.value);

export const PREDICTOR_THRESHOLDS = {
  safe: 0.9,
  moderate: 1,
  risky: 1.1,
  veryRisky: 1.25
} as const;

export function normalizeInstituteTypeFilter(value: string | undefined) {
  const aliases: Record<string, string> = {
    IIT: "Indian Institute of Technology",
    NIT: "National Institute of Technology",
    IIIT: "Indian Institute of Information Technology",
    GFTI: "Government Funded Technical Institutions"
  };
  return value ? aliases[value] ?? value : value;
}

export function instituteTypesForExam(examType: string | undefined) {
  if (examType === "JEE Advanced") {
    return ["Indian Institute of Technology"];
  }

  if (examType === "JEE Main") {
    return [
      "National Institute of Technology",
      "Indian Institute of Information Technology",
      "Government Funded Technical Institutions"
    ];
  }

  return null;
}

export function usesCategoryRank(seatType: string | undefined) {
  if (!seatType || seatType === "All") {
    return false;
  }

  return seatType !== "OPEN" && seatType !== "OPEN (PwD)";
}

export function quotaOptionsForInstituteType(instituteType: string | undefined) {
  if (instituteType === "IIT" || instituteType === "IIIT") {
    return ALL_QUOTA_ONLY_OPTIONS;
  }

  if (instituteType === "NIT") {
    return NIT_QUOTA_OPTIONS;
  }

  return GENERAL_QUOTA_OPTIONS;
}
