import { PredictorResultsClient } from "@/components/predictor/predictor-results-client";

type SearchParams = Record<string, string | string[] | undefined>;

function toQueryString(searchParams: SearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  if (!params.get("bucket")) params.set("bucket", "Safe");
  if (!params.get("page")) params.set("page", "1");
  if (!params.get("page_size")) params.set("page_size", "24");
  return params.toString();
}

export default async function PredictorResultsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  return <PredictorResultsClient initialQuery={toQueryString(resolvedSearchParams)} />;
}
