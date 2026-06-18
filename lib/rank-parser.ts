export type ParsedRank = {
  raw: string;
  numeric: number | null;
  suffix: string | null;
};

export function parseRank(rawValue: unknown): ParsedRank {
  const raw = String(rawValue ?? "").trim();
  if (!raw || raw === "-" || raw.toLowerCase() === "na") {
    return { raw, numeric: null, suffix: null };
  }

  const compact = raw.replaceAll(",", "").trim();
  const match = compact.match(/^(\d+)\s*([A-Za-z]+)?$/);
  if (!match) {
    return { raw, numeric: null, suffix: null };
  }

  return {
    raw,
    numeric: Number.parseInt(match[1], 10),
    suffix: match[2] ?? null
  };
}
