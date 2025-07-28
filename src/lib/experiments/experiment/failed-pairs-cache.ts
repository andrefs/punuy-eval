import fs from "node:fs";

export function genNextCacheFileName(traceId: string): string {
  let n = 0;
  // increment n until we find a file that does not exist
  while (true) {
    const fnCandidate = `failed-${traceId}-${n.toString().padStart(3, "0")}.json`;
    if (!fs.existsSync(fnCandidate)) {
      return fnCandidate;
    }
    n++;
  }
}

export interface FailedPairsCache {
  traceId: string;
  date: string;
  pairs: [string, string][];
}

export function saveFailedPairsCache(
  pairs: [string, string][],
  traceId: string
): string {
  const cache: FailedPairsCache = {
    traceId,
    date: new Date(traceId).toISOString(),
    pairs,
  };
  const fileName = genNextCacheFileName(traceId);
  fs.writeFileSync(fileName, JSON.stringify(cache, null, 2));
  console.info(`Saved failed pairs cache to ${fileName}`);
  return fileName;
}
