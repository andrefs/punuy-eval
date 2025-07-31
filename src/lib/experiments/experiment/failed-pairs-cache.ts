import oldFs from "node:fs";
import fs from "node:fs/promises";
import logger from "../../logger";

export function genNextCacheFileName(traceId: string): string {
  let n = 0;
  // increment n until we find a file that does not exist
  while (true) {
    const fnCandidate = `${traceId}-failed-${n.toString().padStart(3, "0")}.json`;
    if (!oldFs.existsSync(fnCandidate)) {
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

export async function saveFailedPairsCache(
  pairs: [string, string][],
  traceId: string
): Promise<string> {
  const ts = traceId.replace(/^exp_/, "").replace(/_[^_]*$/, "");
  console.log("XXXXXXXXXXXXXXXXXXXXX", { traceId, ts });
  const cache: FailedPairsCache = {
    traceId,
    date: new Date(parseInt(ts, 10)).toISOString(),
    pairs,
  };
  console.log("XXXXXXXXXXXXXXXXXXXXX", { cache });
  const fileName = genNextCacheFileName(traceId);
  console.log("XXXXXXXXXXXXXXXXXXXXX", { fileName });
  logger.warn(` 🚧 Saving failed pairs cache to ${fileName}`);
  await fs.writeFile(fileName, JSON.stringify(cache, null, 2), "utf-8");
  return fileName;
}

export async function loadFailedPairsCache(
  fileName: string
): Promise<FailedPairsCache> {
  if (!oldFs.existsSync(fileName)) {
    throw new Error(`Failed pairs cache file ${fileName} does not exist.`);
  }
  const content = await fs.readFile(fileName, "utf-8");
  const cache: FailedPairsCache = JSON.parse(content);
  if (!cache.traceId || !cache.date || !Array.isArray(cache.pairs)) {
    throw new Error(`Invalid failed pairs cache format in ${fileName} `);
  }
  return cache;
}
