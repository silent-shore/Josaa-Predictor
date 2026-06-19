export type Option = {
  value: string;
  label: string;
};

export const INSTITUTE_TYPE_OPTIONS: Option[] = [
  { value: "All", label: "All institute types" },
  { value: "IIT", label: "Indian Institute of Technology (IIT)" },
  { value: "NIT", label: "National Institute of Technology (NIT)" },
  { value: "IIIT", label: "Indian Institute of Information Technology (IIIT)" },
  { value: "GFTI", label: "Government Funded Technical Institutions (GFTI)" },
  { value: "IISc", label: "Indian Institute of Science (IISc)" },
  { value: "Indian Institute of Technology", label: "Indian Institute of Technology" },
  { value: "National Institute of Technology", label: "National Institute of Technology" },
  { value: "Indian Institute of Information Technology", label: "Indian Institute of Information Technology" },
  { value: "Government Funded Technical Institutions", label: "Government Funded Technical Institutions" },
  { value: "Indian Institute of Science", label: "Indian Institute of Science" }
];

export const EXAM_TYPE_OPTIONS: Option[] = [
  { value: "JEE Main", label: "JEE Main" },
  { value: "JEE Advanced", label: "JEE Advanced" }
];

export const QUOTA_OPTIONS: Option[] = [
  { value: "All", label: "All quotas" },
  { value: "AI", label: "All India (AI)" },
  { value: "OS", label: "Other State (OS)" },
  { value: "GO", label: "Goa (GO)" },
  { value: "JK", label: "Jammu & Kashmir (JK)" },
  { value: "LA", label: "Ladakh (LA)" }
];

export const ALL_QUOTA_ONLY_OPTIONS: Option[] = [{ value: "AI", label: "All India (AI)" }];

export const GENERAL_QUOTA_OPTIONS: Option[] = [
  { value: "All", label: "All quotas" },
  { value: "AI", label: "All India (AI)" }
];

export const NIT_QUOTA_OPTIONS: Option[] = [
  { value: "All", label: "All quotas" },
  { value: "AI", label: "All India (AI)" },
  { value: "OS", label: "Other State (OS)" }
];

export const NIT_HOME_STATE_QUOTA_OPTIONS: Option[] = [
  { value: "All", label: "All quotas" },
  { value: "AI", label: "All India (AI)" },
  { value: "OS", label: "Other State (OS)" }
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
  moderate: 1.05,
  risky: 1.2
} as const;

export const BRANCH_GROUP_PREFIX = "branch_group:";

export type BranchGroup = {
  value: string;
  label: string;
  keywords: string[];
};

function branchGroup(value: string, label: string, keywords: string[]): BranchGroup {
  return { value: `${BRANCH_GROUP_PREFIX}${value}`, label, keywords };
}

export const BRANCH_GROUPS: BranchGroup[] = [
  branchGroup("computer-ai-data-it", "CS / CSE / AI / Data Science / IT", [
    "Computer Science",
    "Computer Engineering",
    "CSE",
    "Information Technology",
    "Artificial Intelligence",
    "Artificial Intelligenece",
    "Artificial lntelligence",
    "Machine Learning",
    "AIML",
    "Computing",
    "Data Science",
    "Data Analytics",
    "Data Engineering",
    "Computational",
    "Cyber Security",
    "Internet of Things",
    "Block Chain",
    "Quantum Technologies",
    "Human Computer",
    "Gaming Technology",
    "Business Informatics"
  ]),
  branchGroup("electronics-communication", "ECE / Electronics / Communication / VLSI", [
    "Electronics",
    "Electronic",
    "Communication",
    "ECE",
    "VLSI",
    "Microelectronics",
    "Telecommunication",
    "Instrumentation",
    "Embedded",
    "Signal Processing",
    "Photonics"
  ]),
  branchGroup("electrical", "Electrical / EEE / Power", [
    "Electrical",
    "EEE",
    "Power",
    "Energy",
    "Control",
    "Instrumentation"
  ]),
  branchGroup("mechanical", "Mechanical / Manufacturing / Industrial", [
    "Mechanical",
    "Manufacturing",
    "Industrial",
    "Production",
    "Automobile",
    "Automotive",
    "Mechatronics",
    "Thermal"
  ]),
  branchGroup("civil", "Civil / Construction / Infrastructure", [
    "Civil",
    "Construction",
    "Infrastructure",
    "Transportation",
    "Environmental Engineering"
  ]),
  branchGroup("chemical", "Chemical / Biochemical / Process", [
    "Chemical",
    "Biochemical",
    "Process",
    "Petroleum",
    "Oil",
    "Polymer",
    "Plastic",
    "Food Process"
  ]),
  branchGroup("materials-metallurgy", "Materials / Metallurgy / Mining", [
    "Materials",
    "Metallurgical",
    "Metallurgy",
    "Mining",
    "Mineral",
    "Ceramic",
    "Textile"
  ]),
  branchGroup("biotech-bioengineering", "Biotechnology / Biomedical / Biosciences", [
    "Biotechnology",
    "Bio Technology",
    "Biomedical",
    "Bio Engineering",
    "Bioengineering",
    "Biological",
    "Bioscience",
    "Bio Science",
    "Life Science"
  ]),
  branchGroup("aerospace", "Aerospace / Aeronautical / Aviation", [
    "Aerospace",
    "Aeronautical",
    "Aviation",
    "Aircraft"
  ]),
  branchGroup("physics-math-science", "Physics / Mathematics / Sciences", [
    "Engineering Physics",
    "Physics",
    "Mathematics",
    "Statistics",
    "Chemistry",
    "Economics",
    "Quantitative",
    "Applied Geology",
    "Exploration Geophysics",
    "Earth Sciences"
  ]),
  branchGroup("marine-ocean", "Marine / Naval / Ocean", [
    "Marine",
    "Naval",
    "Ocean",
    "Ship"
  ])
];

export function branchGroupByValue(value: string | undefined) {
  return BRANCH_GROUPS.find((group) => group.value === value);
}

export function isBranchGroupValue(value: string | undefined) {
  return Boolean(value?.startsWith(BRANCH_GROUP_PREFIX));
}

export function isExcludedProgramName(value: string | undefined) {
  return /\b(architecture|planning)\b/i.test(value ?? "");
}

export function programMatchesBranchGroup(programName: string, group: BranchGroup) {
  const lower = programName.toLowerCase();
  return group.keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

export function branchGroupIndexForProgram(programName: string | undefined) {
  const value = programName ?? "";
  const index = BRANCH_GROUPS.findIndex((group) => programMatchesBranchGroup(value, group));
  return index === -1 ? BRANCH_GROUPS.length : index;
}

export function normalizeInstituteTypeFilter(value: string | undefined) {
  const aliases: Record<string, string> = {
    IIT: "Indian Institute of Technology",
    NIT: "National Institute of Technology",
    IIIT: "Indian Institute of Information Technology",
    GFTI: "Government Funded Technical Institutions",
    IISc: "Indian Institute of Science"
  };
  return value ? aliases[value] ?? value : value;
}

export function instituteTypesForExam(examType: string | undefined) {
  if (examType === "JEE Advanced") {
    return ["Indian Institute of Technology", "Indian Institute of Science"];
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

export function quotaOptionsForInstituteType(instituteType: string | undefined, hasState = false) {
  if (instituteType === "IIT" || instituteType === "IIIT" || instituteType === "IISc") {
    return ALL_QUOTA_ONLY_OPTIONS;
  }

  if (instituteType === "NIT") {
    return hasState ? NIT_HOME_STATE_QUOTA_OPTIONS : NIT_QUOTA_OPTIONS;
  }

  return GENERAL_QUOTA_OPTIONS;
}

export const NIT_STATE_PATTERNS: Record<string, string[]> = {
  "Andhra Pradesh": ["Andhra Pradesh"],
  "Arunachal Pradesh": ["Arunachal Pradesh"],
  Assam: ["Silchar"],
  Bihar: ["Patna"],
  Chhattisgarh: ["Raipur"],
  Delhi: ["Delhi"],
  Goa: ["Goa"],
  Gujarat: ["Surat", "SVNIT"],
  Haryana: ["Kurukshetra"],
  "Himachal Pradesh": ["Hamirpur"],
  "Jammu and Kashmir": ["Srinagar"],
  Jharkhand: ["Jamshedpur"],
  Karnataka: ["Surathkal", "Karnataka"],
  Kerala: ["Calicut"],
  "Madhya Pradesh": ["Bhopal"],
  Maharashtra: ["Nagpur"],
  Manipur: ["Manipur"],
  Meghalaya: ["Meghalaya"],
  Mizoram: ["Mizoram"],
  Nagaland: ["Nagaland"],
  Odisha: ["Rourkela"],
  Puducherry: ["Puducherry"],
  Punjab: ["Jalandhar"],
  Rajasthan: ["Jaipur"],
  Sikkim: ["Sikkim"],
  "Tamil Nadu": ["Tiruchirappalli", "Trichy"],
  Telangana: ["Warangal"],
  Tripura: ["Agartala"],
  Uttarakhand: ["Uttarakhand"],
  "Uttar Pradesh": ["Allahabad"],
  "West Bengal": ["Durgapur"]
};

export const INDIA_STATE_OPTIONS: Option[] = [
  { value: "Andhra Pradesh", label: "Andhra Pradesh" },
  { value: "Arunachal Pradesh", label: "Arunachal Pradesh" },
  { value: "Assam", label: "Assam" },
  { value: "Bihar", label: "Bihar" },
  { value: "Chhattisgarh", label: "Chhattisgarh" },
  { value: "Delhi", label: "Delhi" },
  { value: "Goa", label: "Goa" },
  { value: "Gujarat", label: "Gujarat" },
  { value: "Haryana", label: "Haryana" },
  { value: "Himachal Pradesh", label: "Himachal Pradesh" },
  { value: "Jammu and Kashmir", label: "Jammu and Kashmir" },
  { value: "Jharkhand", label: "Jharkhand" },
  { value: "Karnataka", label: "Karnataka" },
  { value: "Kerala", label: "Kerala" },
  { value: "Madhya Pradesh", label: "Madhya Pradesh" },
  { value: "Maharashtra", label: "Maharashtra" },
  { value: "Manipur", label: "Manipur" },
  { value: "Meghalaya", label: "Meghalaya" },
  { value: "Mizoram", label: "Mizoram" },
  { value: "Nagaland", label: "Nagaland" },
  { value: "Odisha", label: "Odisha" },
  { value: "Puducherry", label: "Puducherry" },
  { value: "Punjab", label: "Punjab" },
  { value: "Rajasthan", label: "Rajasthan" },
  { value: "Sikkim", label: "Sikkim" },
  { value: "Tamil Nadu", label: "Tamil Nadu" },
  { value: "Telangana", label: "Telangana" },
  { value: "Tripura", label: "Tripura" },
  { value: "Uttar Pradesh", label: "Uttar Pradesh" },
  { value: "Uttarakhand", label: "Uttarakhand" },
  { value: "West Bengal", label: "West Bengal" }
];
