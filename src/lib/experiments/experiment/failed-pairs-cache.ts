import oldFs from "node:fs";
import fs from "node:fs/promises";
import logger from "../../logger";
import path from "node:path";
import { genNextFileIndex } from "./aux";

/**
 * Generate the next cache file name in the specified folder.
 * The file name is in the format "failed-XXX.json", where XXX is a zero-padded index.
 * @param folder - The folder where the cache files are stored.
 * @return The next available cache file name.
 * @throws Error if the folder does not exist or if there is an error accessing the file system.
 **/
export async function genNextCacheFileName(folder: string): Promise<string> {
  const fnIndex = await genNextFileIndex(folder, [
    /^(?:\d{3}-)?experiment\.json$/,
  ]);
  return path.join(
    folder,
    `${fnIndex.toString().padStart(3, "0")}-failed.json`
  );
}

/**
 * Get the last cache file name in the folder.
 * This is used to load the last failed pairs cache.
 * @param folder - The folder where the cache files are stored.
 * @return The last cache file name.
 * @throws Error if no cache files are found in the folder.
 */
export async function getLastCacheFileName(folder: string): Promise<string> {
  const files = await fs.readdir(folder);
  const cacheFiles = files.filter(
    f => f.startsWith("failed-") && f.endsWith(".json")
  );
  if (cacheFiles.length === 0) {
    throw new Error(`No cache files found in folder ${folder}`);
  }
  // sort by file name, which contains the index
  cacheFiles.sort((a, b) => a.localeCompare(b));
  return path.join(folder, cacheFiles[cacheFiles.length - 1]);
}

/* Interface for the failed pairs cache. */
export interface FailedPairsCache {
  // The folder where the cache is stored
  folder: string;

  // The date when the cache was created
  date: string;

  // The pairs of words that failed
  pairs: [string, string][][];
}

/**
 * Save the failed pairs cache to a file.
 * The file name is generated based on the folder and the next available index.
 * @param pairs - The pairs of words that failed.
 * @param folder - The folder where the cache will be saved.
 * @return The file name where the cache was saved.
 * @throws Error if the folder does not exist or if there is an error writing the file.
 **/
export async function saveFailedPairsCache(
  pairs: [string, string][][],
  folder: string
): Promise<string> {
  const cache: FailedPairsCache = {
    folder,
    date: new Date().toISOString(),
    pairs,
  };
  console.log("XXXXXXXXXXXXXXXXXXXXX", { cache });
  const fileName = await genNextCacheFileName(folder);
  console.log("XXXXXXXXXXXXXXXXXXXXX", { fileName });
  logger.warn(` 🚧 Saving failed pairs cache to ${fileName}`);
  await fs.writeFile(fileName, JSON.stringify(cache, null, 2), "utf-8");
  return fileName;
}

/**
 * Load the failed pairs cache from a file.
 * @param fileName - The file name where the cache is stored.
 * @return The failed pairs cache.
 * @throws Error if the file does not exist or if the cache format is invalid.
 */
export async function loadFailedPairsCache(
  fileName: string
): Promise<FailedPairsCache> {
  if (!oldFs.existsSync(fileName)) {
    throw new Error(`Failed pairs cache file ${fileName} does not exist.`);
  }
  const content = await fs.readFile(fileName, "utf-8");
  const cache: FailedPairsCache = JSON.parse(content);
  if (!cache.folder || !cache.date || !Array.isArray(cache.pairs)) {
    throw new Error(`Invalid failed pairs cache format in ${fileName} `);
  }
  return cache;
}
